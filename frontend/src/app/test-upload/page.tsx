'use client';

import React, { useState } from 'react';
import { uploadDocument } from '@/lib/firebase/document-storage';
import { useAuth } from '@/hooks/useAuth';

const TestUploadPage: React.FC = () => {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const handleTestUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    setError('');
    setResult(null);

    try {
      console.log('Test: Starting upload...');
      const document = await uploadDocument(file, user.uid);
      console.log('Test: Upload successful:', document);
      setResult(document);
    } catch (err: any) {
      console.error('Test: Upload failed:', err);
      setError(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  if (!user) {
    return <div>Please log in to test upload</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Upload Test Page</h1>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Test File Upload:
          </label>
          <input
            type="file"
            onChange={handleTestUpload}
            disabled={isUploading}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        {isUploading && (
          <div className="text-blue-600">Uploading...</div>
        )}

        {error && (
          <div className="text-red-600 p-3 bg-red-50 rounded">
            Error: {error}
          </div>
        )}

        {result && (
          <div className="text-green-600 p-3 bg-green-50 rounded">
            <h3 className="font-semibold">Upload Successful!</h3>
            <pre className="text-sm mt-2 overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        <div className="text-sm text-gray-600">
          <p><strong>User ID:</strong> {user.uid}</p>
          <p><strong>Email:</strong> {user.email}</p>
        </div>
      </div>
    </div>
  );
};

export default TestUploadPage;