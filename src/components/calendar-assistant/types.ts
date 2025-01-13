import { Chat, Message } from '../../types/chat';

export interface CalendarAssistantChatRef {
  loadChat: (chat: Chat) => void;
}

export interface CalendarMessage extends Message {
  timestamp: string;
  status: 'sending' | 'sent' | 'error';
}

export interface CalendarCommand {
  type: 'add' | 'view' | 'update' | 'delete' | 'query';
  action: string;
  parameters?: Record<string, any>;
}

export interface CalendarChatState {
  messages: CalendarMessage[];
  activeChatId: string | null;
}
