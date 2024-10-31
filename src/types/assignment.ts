export interface Assignment {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  course: string;
  due_date: string;
  progress: number;
  status: 'pending' | 'in_progress' | 'completed' | 'late';
  created_at?: string;
  updated_at?: string;
}