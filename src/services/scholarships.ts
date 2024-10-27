import { supabase } from '../config/supabase';
import { Scholarship } from '../types';

export class ScholarshipService {
  static async fetchScholarships(major?: string): Promise<Scholarship[]> {
    try {
      let query = supabase
        .from('scholarships')
        .select('*')
        .order('deadline', { ascending: true });

      if (major) {
        query = query.contains('majors', [major]);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching scholarships:', error);
      throw error;
    }
  }

  static async addScholarshipDeadline(scholarship: Scholarship, userId: string): Promise<void> {
    try {
      const event = {
        id: crypto.randomUUID(),
        user_id: userId,
        title: `Deadline: ${scholarship.title}`,
        description: `Scholarship deadline for ${scholarship.title} - ${scholarship.amount}`,
        start_time: new Date(scholarship.deadline).toISOString(),
        end_time: new Date(scholarship.deadline).toISOString(),
        type: 'academic',
        source: 'manual'
      };

      const { error } = await supabase
        .from('calendar_events')
        .insert([event]);

      if (error) throw error;
    } catch (error) {
      console.error('Error adding scholarship deadline:', error);
      throw error;
    }
  }
}