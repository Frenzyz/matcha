import { supabase } from '../config/supabase';

interface UploadResult {
  url: string;
  path: string;
}

export const uploadUserFile = async (
  userId: string, 
  file: File, 
  folder: string = 'documents'
): Promise<UploadResult> => {
  const timestamp = Date.now();
  const filename = `${timestamp}-${file.name}`;
  const path = `${userId}/${folder}/${filename}`;

  try {
    const { error: uploadError, data } = await supabase.storage
      .from('user-files')
      .upload(path, file);

    if (uploadError) throw uploadError;
    if (!data) throw new Error('Upload failed');

    const { data: { publicUrl } } = supabase.storage
      .from('user-files')
      .getPublicUrl(data.path);

    return { url: publicUrl, path: data.path };
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error('Failed to upload file');
  }
};

export const deleteUserFile = async (path: string): Promise<void> => {
  try {
    const { error } = await supabase.storage
      .from('user-files')
      .remove([path]);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting file:', error);
    throw new Error('Failed to delete file');
  }
};

export const getUserFiles = async (
  userId: string, 
  folder: string = 'documents'
): Promise<UploadResult[]> => {
  try {
    const { data, error } = await supabase.storage
      .from('user-files')
      .list(`${userId}/${folder}`);

    if (error) throw error;
    if (!data) return [];

    return Promise.all(data.map(async (file) => {
      const path = `${userId}/${folder}/${file.name}`;
      const { data: { publicUrl } } = supabase.storage
        .from('user-files')
        .getPublicUrl(path);

      return {
        url: publicUrl,
        path
      };
    }));
  } catch (error) {
    console.error('Error listing files:', error);
    throw new Error('Failed to list files');
  }
};

export const getFileUrl = async (path: string): Promise<string> => {
  try {
    const { data: { publicUrl } } = supabase.storage
      .from('user-files')
      .getPublicUrl(path);

    return publicUrl;
  } catch (error) {
    console.error('Error getting file URL:', error);
    throw new Error('Failed to get file URL');
  }
};