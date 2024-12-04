export interface Message {
  text: string;
  isUser: boolean;
  action?: string;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  mode: 'chat' | 'calendar';
  created_at: string;
  updated_at: string;
}