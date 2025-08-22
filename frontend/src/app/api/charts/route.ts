import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zsevvvaakunsspxpplbh.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json(
        { error: 'fileId parameter is required' },
        { status: 400 }
      );
    }

    // Get the file record from Supabase
    const { data: file, error: fetchError } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (fetchError || !file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    const rows = file.rows || 0;
    const columns = file.columns || 0;

    // Generate sample chart data based on file characteristics
    const chartsData = {
      // Time series data (if applicable)
      timeSeries: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
          {
            label: 'Monthly Trend',
            data: Array.from({ length: 6 }, () => Math.floor(Math.random() * 1000) + 100),
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)'
          }
        ]
      },

      // Distribution chart
      distribution: {
        labels: ['0-100', '101-200', '201-300', '301-400', '401-500'],
        datasets: [
          {
            label: 'Value Distribution',
            data: Array.from({ length: 5 }, () => Math.floor(Math.random() * 100) + 10),
            backgroundColor: [
              'rgba(255, 99, 132, 0.8)',
              'rgba(54, 162, 235, 0.8)',
              'rgba(255, 206, 86, 0.8)',
              'rgba(75, 192, 192, 0.8)',
              'rgba(153, 102, 255, 0.8)'
            ]
          }
        ]
      },

      // Correlation matrix
      correlation: {
        labels: Array.from({ length: Math.min(columns, 8) }, (_, i) => `Col_${i + 1}`),
        datasets: Array.from({ length: Math.min(columns, 8) }, (_, i) => ({
          label: `Col_${i + 1}`,
          data: Array.from({ length: Math.min(columns, 8) }, () => Math.random() * 2 - 1)
        }))
      },

      // Bar chart for categorical data
      categorical: {
        labels: ['Category A', 'Category B', 'Category C', 'Category D', 'Category E'],
        datasets: [
          {
            label: 'Count by Category',
            data: Array.from({ length: 5 }, () => Math.floor(Math.random() * 500) + 50),
            backgroundColor: 'rgba(34, 197, 94, 0.8)'
          }
        ]
      },

      // Scatter plot data
      scatter: {
        datasets: [
          {
            label: 'Data Points',
            data: Array.from({ length: Math.min(rows, 100) }, () => ({
              x: Math.random() * 1000,
              y: Math.random() * 1000
            })),
            backgroundColor: 'rgba(147, 51, 234, 0.6)'
          }
        ]
      },

      // Summary statistics
      summary: {
        totalRows: rows,
        totalColumns: columns,
        dataTypes: {
          numerical: Math.floor(columns * 0.4),
          categorical: Math.floor(columns * 0.4),
          text: Math.max(0, columns - Math.floor(columns * 0.8))
        },
        qualityMetrics: {
          completeness: `${Math.floor(Math.random() * 20) + 80}%`,
          accuracy: `${Math.floor(Math.random() * 15) + 85}%`,
          consistency: `${Math.floor(Math.random() * 10) + 90}%`
        }
      }
    };

    return NextResponse.json({
      success: true,
      chartsData,
      message: 'Chart data generated successfully'
    });

  } catch (error: any) {
    console.error('Charts generation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate chart data',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  return NextResponse.json({
    service: 'charts-generation',
    status: 'operational',
    methods: ['GET'],
    description: 'Generates chart-ready data for data visualization'
  });
} 