import React, { useState, useRef, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { Loader2 } from 'lucide-react';
import { logger } from '../../../utils/logger';

interface Message {
  id: string;
  content: string;
  senderId: string;
  timestamp: string;
}

interface ChatRoomProps {
  roomId: string;
  userId: string;
}

export default function ChatRoom({ roomId, userId }: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const socketRef = useRef<Socket>();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    socketRef.current = io('/', {
      path: '/socket.io'
    });

    socketRef.current.on('connect', () => {
      setConnected(true);
      setError(null);
      socketRef.current?.emit('join-chat', { roomId, userId });
    });

    socketRef.current.on('chat-message', (message: Message) => {
      setMessages(prev => [...prev, message]);
    });

    socketRef.current.on('error', (err: Error) => {
      setError(err.message);
      logger.error('Chat socket error:', err);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [roomId, userId]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending || !connected) return;

    try {
      setSending(true);
      const message: Message = {
        id: crypto.randomUUID(),
        content: newMessage.trim(),
        senderId: userId,
        timestamp: new Date().toISOString()
      };

      socketRef.current?.emit('send-message', { roomId, message });
      setMessages(prev => [...prev, message]);
      setNewMessage('');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      setError(errorMessage);
      logger.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500 text-center">
          <p>Failed to connect to chat</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        {!connected ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-4 text-gray-500 dark:text-gray-400">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessage
              key={message.id}
              content={message.content}
              timestamp={message.timestamp}
              isCurrentUser={message.senderId === userId}
              senderName={message.senderId !== userId ? `User ${message.senderId.slice(0, 8)}` : undefined}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t dark:border-gray-700">
        <ChatInput
          value={newMessage}
          onChange={setNewMessage}
          onSend={handleSendMessage}
          onKeyPress={handleKeyPress}
          disabled={!connected}
          loading={sending}
        />
      </div>
    </div>
  );
}
