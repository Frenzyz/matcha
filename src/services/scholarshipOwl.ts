import { supabase } from '../config/supabase';

const API_URL = 'https://api.business.scholarshipowl.com';

export class ScholarshipOwlService {
  static async connect(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/api/user/me`, {
        headers: {
          'SCHOLARSHIP-APP-API-Key': apiKey
        }
      });

      if (!response.ok) {
        throw new Error('Invalid API key');
      }

      return true;
    } catch (error) {
      console.error('ScholarshipOwl connection error:', error);
      throw error;
    }
  }

  static async disconnect(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ scholarship_owl_token: null })
        .eq('id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('ScholarshipOwl disconnection error:', error);
      throw error;
    }
  }

  static async isConnected(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('scholarship_owl_token')
        .single();

      if (error) throw error;
      return !!data?.scholarship_owl_token;
    } catch (error) {
      console.error('ScholarshipOwl status check error:', error);
      return false;
    }
  }

  static async syncUserData(userId: string): Promise<void> {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('scholarship_owl_token')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;
      if (!profile?.scholarship_owl_token) return;

      const response = await fetch(`${API_URL}/api/user/me?include=organisations`, {
        headers: {
          'SCHOLARSHIP-APP-API-Key': profile.scholarship_owl_token
        }
      });

      if (!response.ok) throw new Error('Failed to fetch ScholarshipOwl data');

      const data = await response.json();
      
      // Update profile with ScholarshipOwl data
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          first_name: data.data.attributes.name.split(' ')[0],
          last_name: data.data.attributes.name.split(' ').slice(1).join(' '),
          email: data.data.attributes.email,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) throw updateError;
    } catch (error) {
      console.error('ScholarshipOwl sync error:', error);
      throw error;
    }
  }
}