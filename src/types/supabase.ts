export interface Database {
  public: {
    Tables: {
      calendar_events: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description?: string;
          location?: string;
          start_time: string;
          end_time: string;
          type: string;
          status: string;
          attendees?: number;
          is_recurring?: boolean;
          recurrence_rule?: string;
          source: string;
          category_id?: string;
          color?: string;
          created_at?: string;
          updated_at?: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string;
          location?: string;
          start_time: string;
          end_time: string;
          type?: string;
          status?: string;
          attendees?: number;
          is_recurring?: boolean;
          recurrence_rule?: string;
          source?: string;
          category_id?: string;
          color?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string;
          location?: string;
          start_time?: string;
          end_time?: string;
          type?: string;
          status?: string;
          attendees?: number;
          is_recurring?: boolean;
          recurrence_rule?: string;
          source?: string;
          category_id?: string;
          color?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
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
    };
  };
}