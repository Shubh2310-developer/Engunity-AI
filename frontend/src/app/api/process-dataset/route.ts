import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zsevvvaakunsspxpplbh.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileId = formData.get('fileId') as string;
    const projectId = formData.get('projectId') as string;
    const storagePath = formData.get('storagePath') as string;

    if (!file || !fileId || !projectId) {
      return NextResponse.json(
        { error: 'Missing required fields: file, fileId, projectId' },
        { status: 400 }
      );
    }

    // If storagePath is not provided, we can still process the file from form-data
    const safeStoragePath = storagePath || `${projectId}/${Date.now()}_${file.name}`;

    // Process the file to extract metadata
    let rows = 0;
    let columns = 0;
    let metadata: any = {};

    try {
      // Read file content for analysis
      const fileContent = await file.text();
      
      if (file.name.endsWith('.csv')) {
        // Parse CSV to count rows and columns
        const lines = fileContent.split('\n').filter(line => line.trim());
        rows = lines.length - 1; // Exclude header
        columns = lines[0]?.split(',').length || 0;
        
        // Basic CSV metadata
        metadata = {
          format: 'CSV',
          delimiter: ',',
          hasHeader: true,
          encoding: 'UTF-8'
        };
      } else if (file.name.endsWith('.json')) {
        // Parse JSON to count rows and columns
        try {
          const jsonData = JSON.parse(fileContent);
          if (Array.isArray(jsonData)) {
            rows = jsonData.length;
            columns = jsonData[0] ? Object.keys(jsonData[0]).length : 0;
          } else {
            rows = 1;
            columns = Object.keys(jsonData).length;
          }
          
          metadata = {
            format: 'JSON',
            encoding: 'UTF-8',
            isArray: Array.isArray(jsonData)
          };
        } catch (jsonError) {
          throw new Error('Invalid JSON format');
        }
      } else if (file.name.endsWith('.xlsx')) {
        // For Excel files, we'll estimate based on file size
        // In production, you'd use a library like xlsx to parse this
        rows = Math.floor(file.size / 1024); // Rough estimate
        columns = 10; // Default estimate
        
        metadata = {
          format: 'Excel',
          encoding: 'binary',
          sheets: 1
        };
      } else if (file.name.endsWith('.parquet')) {
        // For Parquet files, we'll estimate
        rows = Math.floor(file.size / 512); // Rough estimate
        columns = 8; // Default estimate
        
        metadata = {
          format: 'Parquet',
          encoding: 'binary',
          compression: 'unknown'
        };
      }

      // Add file-specific metadata
      metadata = {
        ...metadata,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        uploadDate: new Date().toISOString(),
        projectId: projectId,
        storagePath: safeStoragePath
      };

    } catch (processingError) {
      console.error('File processing error:', processingError);
      // Return basic metadata if processing fails
      rows = 0;
      columns = 0;
      metadata = {
        error: 'File processing failed',
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type
      };
    }

    // Update the file record in Supabase with processed metadata
    const { error: updateError } = await supabase
      .from('files')
      .update({
        rows: rows,
        columns: columns,
        metadata: metadata,
        status: 'ready',
        updated_at: new Date().toISOString()
      })
      .eq('id', fileId);

    if (updateError) {
      console.error('Error updating file record:', updateError);
      return NextResponse.json(
        { error: 'Failed to update file metadata' },
        { status: 500 }
      );
    }

    // Return processed dataset information
    return NextResponse.json({
      success: true,
      fileId: fileId,
      rows: rows,
      columns: columns,
      metadata: metadata,
      processingTime: Date.now(),
      message: 'Dataset processed successfully'
    });

  } catch (error: any) {
    console.error('Dataset processing error:', error);
    return NextResponse.json(
      { 
        error: 'Dataset processing failed',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'dataset-processing',
    status: 'operational',
    supported_formats: ['CSV', 'JSON', 'XLSX', 'Parquet'],
    methods: ['POST']
  });
} 