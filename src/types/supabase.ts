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
          theme_color?: string;
          setup_completed?: boolean;
          created_at?: string;
          last_seen?: string;
        };
      };
      calendar_events: {
        Row: {
          id: string;
          user_id: string;
          google_event_id?: string;
          title: string;
          description?: string;
          location?: string;
          start_time: string;
          end_time: string;
          type: 'career' | 'academic' | 'wellness';
          attendees: number;
          is_recurring: boolean;
          recurrence_rule?: string;
          source: 'manual' | 'google' | 'canvas';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          google_event_id?: string;
          title: string;
          description?: string;
          location?: string;
          start_time: string;
          end_time: string;
          type: 'career' | 'academic' | 'wellness';
          attendees?: number;
          is_recurring?: boolean;
          recurrence_rule?: string;
          source?: 'manual' | 'google' | 'canvas';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          google_event_id?: string;
          title?: string;
          description?: string;
          location?: string;
          start_time?: string;
          end_time?: string;
          type?: 'career' | 'academic' | 'wellness';
          attendees?: number;
          is_recurring?: boolean;
          recurrence_rule?: string;
          source?: 'manual' | 'google' | 'canvas';
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}