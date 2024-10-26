import React, { useCallback } from 'react';
import { Upload, X } from 'lucide-react';
import { useStorage } from '../hooks/useStorage';

interface FileUploadProps {
  onUploadComplete?: (url: string, path: string) => void;
  onError?: (error: string) => void;
  folder?: string;
  accept?: string;
  maxSize?: number;
}

export default function FileUpload({
  onUploadComplete,
  onError,
  folder = 'documents',
  accept = '*/*',
  maxSize = 5 * 1024 * 1024 // 5MB default
}: FileUploadProps) {
  const { uploadFile, loading, error } = useStorage();

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) await handleFile(file);
  }, []);

  const handleFile = async (file: File) => {
    if (file.size > maxSize) {
      onError?.(`File size exceeds ${maxSize / 1024 / 1024}MB limit`);
      return;
    }

    try {
      const result = await uploadFile(file, folder);
      onUploadComplete?.(result.url, result.path);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className={`relative border-2 border-dashed rounded-lg p-6 text-center ${
        loading ? 'opacity-50' : ''
      }`}
    >
      <input
        type="file"
        accept={accept}
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={loading}
      />
      
      <div className="space-y-2">
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <div className="text-sm text-gray-600">
          <span className="font-medium text-emerald-600">
            Click to upload
          </span>{' '}
          or drag and drop
        </div>
        <p className="text-xs text-gray-500">
          Maximum file size: {maxSize / 1024 / 1024}MB
        </p>
      </div>

      {error && (
        <div className="mt-2 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      )}
    </div>
  );
}