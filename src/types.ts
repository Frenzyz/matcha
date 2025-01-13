// Remove ScholarshipOwl related types and references
export interface UserProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  student_id?: string;
  major?: string;
  avatar_url?: string;
  theme_color?: string;
  setup_completed?: boolean;
  academic_info?: AcademicInfo;
  personal_info?: PersonalInfo;
  created_at: string;
  last_seen?: string;
}
