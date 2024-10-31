import React from 'react';
import { useDropzone } from 'react-dropzone';
import { User, Upload, Loader2 } from 'lucide-react';
import { ProfileService } from '../services/profile';
import { useAuth } from '../context/AuthContext';

interface ProfilePictureProps {
  avatarUrl?: string;
  onUpdate: (url: string) => void;
}

export default function ProfilePicture({ avatarUrl, onUpdate }: ProfilePictureProps) {
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const { user } = useAuth();

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif']
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    onDrop: async (acceptedFiles) => {
      if (!user || acceptedFiles.length === 0) return;

      try {
        setUploading(true);
        setError(null);
        const file = acceptedFiles[0];
        const url = await ProfileService.uploadAvatar(user.id, file);
        onUpdate(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to upload image');
      } finally {
        setUploading(false);
      }
    }
  });

  return (
    <div className="relative">
      <div
        {...getRootProps()}
        className={`relative w-24 h-24 rounded-full overflow-hidden cursor-pointer border-2 ${
          isDragActive 
            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' 
            : 'border-gray-200 dark:border-gray-700'
        }`}
      >
        <input {...getInputProps()} />
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Profile"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <User className="w-12 h-12 text-gray-400" />
          </div>
        )}
        
        {uploading ? (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-black/0 hover:bg-black/50 transition-colors flex items-center justify-center">
            <Upload className="w-6 h-6 text-white opacity-0 hover:opacity-100 transition-opacity" />
          </div>
        )}
      </div>

      {error && (
        <div className="absolute top-full left-0 right-0 mt-2 text-xs text-red-500">
          {error}
        </div>
      )}
    </div>
  );
}