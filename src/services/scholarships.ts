import { supabase } from '../config/supabase';
import { Scholarship } from '../types/index';

export class ScholarshipService {
  static async fetchScholarships(major?: string): Promise<Scholarship[]> {
    try {
      // Query cached scholarships
      let query = supabase
        .from('cached_scholarships')
        .select('*')
        .gte('deadline', new Date().toISOString())
        .order('deadline', { ascending: true });

      if (major) {
        query = query.contains('majors', [major]);
      }

      const { data: scholarships, error } = await query;

      if (error) throw error;
      return scholarships || this.getDemoScholarships();
    } catch (error) {
      console.error('Error fetching scholarships:', error);
      return this.getDemoScholarships();
    }
  }

  private static getDemoScholarships(): Scholarship[] {
    return [
      {
        id: '1',
        title: 'UNCC Academic Excellence Scholarship',
        description: 'Awarded to students demonstrating exceptional academic achievement.',
        amount: 5000,
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        type: 'merit',
        awards: 10,
        organization: 'UNCC Foundation',
        majors: ['Computer Science', 'Engineering', 'Mathematics'],
        requirements: {
          gpa: 3.5,
          yearInSchool: ['Junior', 'Senior'],
          firstGeneration: false,
          needBased: false
        },
        url: 'https://uncc.edu/scholarships'
      },
      {
        id: '2',
        title: 'First Generation Student Scholarship',
        description: 'Supporting first-generation college students in their academic journey.',
        amount: 3000,
        deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
        type: 'need-based',
        awards: 5,
        organization: 'UNCC Student Success',
        majors: ['All'],
        requirements: {
          firstGeneration: true,
          needBased: true
        },
        url: 'https://uncc.edu/first-gen'
      },
      {
        id: '3',
        title: 'Research Innovation Grant',
        description: 'Supporting innovative research projects in STEM fields.',
        amount: 7500,
        deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        type: 'research',
        awards: 3,
        organization: 'UNCC Research Department',
        majors: ['Computer Science', 'Engineering', 'Physics', 'Chemistry'],
        requirements: {
          gpa: 3.0,
          yearInSchool: ['Junior', 'Senior', 'Graduate'],
          researchProposal: true
        },
        url: 'https://uncc.edu/research-grants'
      }
    ];
  }

  static async addToCalendar(scholarship: Scholarship, userId: string): Promise<void> {
    try {
      const event = {
        id: crypto.randomUUID(),
        user_id: userId,
        title: `Deadline: ${scholarship.title}`,
        description: `Scholarship deadline for ${scholarship.title} - $${scholarship.amount}`,
        start_time: new Date(scholarship.deadline).toISOString(),
        end_time: new Date(scholarship.deadline).toISOString(),
        type: 'financial',
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

  static async saveUserScholarship(scholarship: Scholarship, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_scholarships')
        .insert([{
          user_id: userId,
          scholarship_id: scholarship.id,
          status: 'saved',
          saved_at: new Date().toISOString()
        }]);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving scholarship:', error);
      throw error;
    }
  }
}
