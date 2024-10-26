import { useState, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { useAuth } from '../context/AuthContext';

export function useStorage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const uploadFile = useCallback(async (file: File, folder: string = 'documents') => {
    if (!user) {
      throw new Error('User must be authenticated to upload files');
    }

    setLoading(true);
    setError(null);

    try {
      const timestamp = Date.now();
      const filename = `${timestamp}-${file.name}`;
      const path = `${user.id}/${folder}/${filename}`;

      const { error: uploadError, data } = await supabase.storage
        .from('user-files')
        .upload(path, file);

      if (uploadError) throw uploadError;
      if (!data) throw new Error('Upload failed');

      const { data: { publicUrl } } = supabase.storage
        .from('user-files')
        .getPublicUrl(data.path);

      return { url: publicUrl, path: data.path };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const deleteFile = useCallback(async (path: string) => {
    if (!user) {
      throw new Error('User must be authenticated to delete files');
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.storage
        .from('user-files')
        .remove([path]);

      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete file');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const listFiles = useCallback(async (folder: string = 'documents') => {
    if (!user) {
      throw new Error('User must be authenticated to list files');
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.storage
        .from('user-files')
        .list(`${user.id}/${folder}`);

      if (error) throw error;
      if (!data) return [];

      return Promise.all(data.map(async (file) => {
        const path = `${user.id}/${folder}/${file.name}`;
        const { data: { publicUrl } } = supabase.storage
          .from('user-files')
          .getPublicUrl(path);

        return {
          url: publicUrl,
          path
        };
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to list files');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const getUrl = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data: { publicUrl } } = supabase.storage
        .from('user-files')
        .getPublicUrl(path);

      return publicUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get file URL');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    uploadFile,
    deleteFile,
    listFiles,
    getUrl,
    loading,
    error
  };
}