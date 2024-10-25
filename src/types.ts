export interface Event {
  id: string;
  title: string;
  location: string;
  startTime: string;
  endTime: string;
  type: 'career' | 'academic' | 'wellness';
  attendees: number;
}

export interface Assignment {
  id: string;
  course: string;
  title: string;
  dueDate: string;
  progress: number;
}