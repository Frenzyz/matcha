import { supabase } from '../config/supabase';

export const uploadAvatar = async (
  userId: string,
  file: File
): Promise<string> => {
  try {
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const allowedTypes = ['jpg', 'jpeg', 'png', 'gif'];
    
    if (!fileExt || !allowedTypes.includes(fileExt)) {
      throw new Error('Invalid file type. Please upload a JPG, PNG, or GIF image.');
    }

    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    // Update profile with new avatar URL
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        avatar_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) throw updateError;

    return publicUrl;
  } catch (error) {
    console.error('Error uploading avatar:', error);
    throw error;
  }
};

export const deleteAvatar = async (userId: string, url: string): Promise<void> => {
  try {
    const path = url.split('/').pop();
    if (!path) throw new Error('Invalid avatar URL');

    const { error: deleteError } = await supabase.storage
      .from('avatars')
      .remove([`${userId}/${path}`]);

    if (deleteError) throw deleteError;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        avatar_url: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) throw updateError;
  } catch (error) {
    console.error('Error deleting avatar:', error);
    throw error;
  }
};