export interface Scholarship {
  id: string;
  title: string;
  description: string;
  amount: number;
  deadline: string;
  type: 'merit' | 'need-based' | 'research' | 'general';
  awards: number;
  organization: string;
  majors?: string[];
  requirements?: string[];
  url: string | null;
}

export interface UserScholarship {
  id: string;
  user_id: string;
  scholarship_id: string;
  status: 'saved' | 'applied' | 'completed';
  saved_at: string;
  applied_at?: string;
  completed_at?: string;
  notes?: string;
}
