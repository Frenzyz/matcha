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
          canvas_calendar_url?: string;
          theme_color?: string;
          setup_completed?: boolean;
          created_at: string;
          last_seen?: string;
        };
        Insert: {
          id: string;
          email: string;
          first_name?: string;
          last_name?: string;
          student_id?: string;
          canvas_calendar_url?: string;
          theme_color?: string;
          setup_completed?: boolean;
          created_at?: string;
          last_seen?: string;
        };
        Update: {
          id?: string;
          email?: string;
          first_name?: string;
          last_name?: string;
          student_id?: string;
          canvas_calendar_url?: string;
          theme_color?: string;
          setup_completed?: boolean;
          created_at?: string;
          last_seen?: string;
        };
      };
      events: {
        Row: {
          id: string;
          title: string;
          location: string;
          start_time: string;
          end_time: string;
          type: 'career' | 'academic' | 'wellness';
          attendees: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          location: string;
          start_time: string;
          end_time: string;
          type: 'career' | 'academic' | 'wellness';
          attendees?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          location?: string;
          start_time?: string;
          end_time?: string;
          type?: 'career' | 'academic' | 'wellness';
          attendees?: number;
          created_at?: string;
        };
      };
      assignments: {
        Row: {
          id: string;
          user_id: string;
          course: string;
          title: string;
          due_date: string;
          progress: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course: string;
          title: string;
          due_date: string;
          progress?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          course?: string;
          title?: string;
          due_date?: string;
          progress?: number;
          created_at?: string;
        };
      };
    };
  };
}