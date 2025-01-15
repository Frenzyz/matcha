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
              beta_features?: {
                groupStudy: boolean;
              };
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
              beta_features?: {
                groupStudy: boolean;
              };
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
              beta_features?: {
                groupStudy: boolean;
              };
            };
          };
          user_budgets: {
            Row: {
              user_id: string;
              monthly_budget: number | null;
              rollover_amount: number | null;
              transactions: any | null;
              created_at: string | null;
              updated_at: string | null;
            };
            Insert: {
              user_id: string;
              monthly_budget?: number | null;
              rollover_amount?: number | null;
              transactions?: any | null;
              created_at?: string | null;
              updated_at?: string | null;
            };
            Update: {
              user_id?: string;
              monthly_budget?: number | null;
              rollover_amount?: number | null;
              transactions?: any | null;
              created_at?: string | null;
              updated_at?: string | null;
            };
          };
        };
      };
    }
