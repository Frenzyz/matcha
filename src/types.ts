// Remove ScholarshipOwl related types and references
export interface PersonalInfo {
  first_name?: string;
  last_name?: string;
  phone?: string;
  date_of_birth?: string;
}

export interface AcademicInfo {
  major?: string;
  year?: string;
  gpa?: number;
  expected_graduation?: string;
}

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
