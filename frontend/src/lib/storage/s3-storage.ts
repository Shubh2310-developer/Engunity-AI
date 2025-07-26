/**
 * S3-Compatible Storage Service for Supabase
 * Handles file uploads to Supabase S3-compatible storage
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// S3 Configuration
const s3Config = {
  region: process.env.SUPABASE_S3_REGION || 'ap-south-1',
  endpoint: process.env.SUPABASE_S3_ENDPOINT || 'https://zsevvvaakunsspxpplbh.supabase.co/storage/v1/s3',
  credentials: {
    accessKeyId: process.env.SUPABASE_S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.SUPABASE_S3_SECRET_ACCESS_KEY || '',
  },
  forcePathStyle: true, // Required for Supabase S3
};

const s3Client = new S3Client(s3Config);

const BUCKET_NAME = 'documents';

export interface S3UploadResult {
  key: string;
  url: string;
  etag?: string | undefined;
}

/**
 * Upload file to S3-compatible storage
 */
export async function uploadFileToS3(
  file: File, 
  userId: string,
  folder: string = 'documents'
): Promise<S3UploadResult> {
  try {
    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const fileExtension = file.name.split('.').pop();
    const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const uniqueFilename = `${timestamp}_${randomId}_${baseName}.${fileExtension}`;
    const key = `${folder}/${userId}/${uniqueFilename}`;

    console.log('Uploading to S3:', key);

    // Convert File to Buffer
    const buffer = await file.arrayBuffer();

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: new Uint8Array(buffer),
      ContentType: file.type,
      ContentLength: file.size,
      Metadata: {
        'original-name': file.name,
        'user-id': userId,
        'upload-timestamp': timestamp.toString(),
      },
    });

    const result = await s3Client.send(command);
    
    // Generate public URL
    const publicUrl = `${process.env.SUPABASE_S3_ENDPOINT?.replace('/s3', '')}/object/public/${BUCKET_NAME}/${key}`;

    console.log('S3 upload successful:', { key, publicUrl, etag: result.ETag });

    return {
      key,
      url: publicUrl,
      etag: result.ETag,
    };
  } catch (error) {
    console.error('S3 upload error:', error);
    throw new Error(`S3 upload failed: ${error}`);
  }
}

/**
 * Delete file from S3-compatible storage
 */
export async function deleteFileFromS3(key: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
    console.log('S3 file deleted:', key);
  } catch (error) {
    console.error('S3 delete error:', error);
    throw new Error(`S3 delete failed: ${error}`);
  }
}

/**
 * Generate presigned URL for secure file access
 */
export async function generatePresignedUrl(
  key: string, 
  expiresIn: number = 3600
): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    return presignedUrl;
  } catch (error) {
    console.error('S3 presigned URL error:', error);
    throw new Error(`Failed to generate presigned URL: ${error}`);
  }
}

/**
 * Extract S3 key from URL
 */
export function extractS3KeyFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const bucketIndex = pathParts.findIndex(part => part === BUCKET_NAME);
    
    if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
      return pathParts.slice(bucketIndex + 1).join('/');
    }
    
    return null;
  } catch {
    return null;
  }
}

export default {
  uploadFileToS3,
  deleteFileFromS3,
  generatePresignedUrl,
  extractS3KeyFromUrl,
};