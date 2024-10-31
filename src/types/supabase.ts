export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          first_name?: string;
          last_name?: string;
          student_id?: string;
          major?: string;
          avatar_url?: string;
          theme_color?: string;
          setup_completed?: boolean;
          google_calendar_token?: string;
          created_at: string;
          updated_at: string;
          last_seen?: string;
        };
        Insert: {
          id: string;
          email: string;
          first_name?: string;
          last_name?: string;
          student_id?: string;
          major?: string;
          avatar_url?: string;
          theme_color?: string;
          setup_completed?: boolean;
          google_calendar_token?: string;
          created_at?: string;
          updated_at?: string;
          last_seen?: string;
        };
        Update: {
          id?: string;
          email?: string;
          first_name?: string;
          last_name?: string;
          student_id?: string;
          major?: string;
          avatar_url?: string;
          theme_color?: string;
          setup_completed?: boolean;
          google_calendar_token?: string;
          created_at?: string;
          updated_at?: string;
          last_seen?: string;
        };
      };
      assignments: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description?: string;
          course: string;
          due_date: string;
          progress: number;
          status: 'pending' | 'in_progress' | 'completed' | 'late';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string;
          course: string;
          due_date: string;
          progress?: number;
          status?: 'pending' | 'in_progress' | 'completed' | 'late';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string;
          course?: string;
          due_date?: string;
          progress?: number;
          status?: 'pending' | 'in_progress' | 'completed' | 'late';
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}