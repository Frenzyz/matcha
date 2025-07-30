import React, { useState, useRef, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { Loader2 } from 'lucide-react';
import { logger } from '../../../utils/logger';
import { supabase } from '../../../config/supabase';

interface Message {
  id: string;
  content: string;
  senderId: string;
  timestamp: string;
  userName?: string;
  avatarUrl?: string;
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

  // Load previous messages when component mounts
  useEffect(() => {
    loadPreviousMessages();
  }, [roomId]);

  // Setup socket connection
  useEffect(() => {
    const webrtcServerUrl = import.meta.env.VITE_WEBRTC_SERVER_URL || 'http://localhost:3001';
    socketRef.current = io(webrtcServerUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000
    });

    socketRef.current.on('connect', () => {
      setConnected(true);
      setError(null);
      logger.info('Chat connected to WebRTC server');
      socketRef.current?.emit('join-room', { roomId, userId, userName: 'User' });
    });

    socketRef.current.on('room-message', (data: { userId: string; message: string; timestamp: number }) => {
      const newMessage: Message = {
        id: `${data.timestamp}-${data.userId}`,
        content: data.message,
        senderId: data.userId,
        timestamp: new Date(data.timestamp).toISOString(),
        userName: data.userId === userId ? 'You' : 'User'
      };
      
      setMessages(prev => {
        // Check if message already exists to avoid duplicates
        const exists = prev.find(msg => msg.id === newMessage.id);
        if (exists) return prev;
        return [...prev, newMessage];
      });
    });

    socketRef.current.on('connect_error', (err) => {
      setError('Failed to connect to chat server');
      logger.error('Chat socket connection error:', err);
    });

    socketRef.current.on('disconnect', () => {
      setConnected(false);
      logger.info('Chat disconnected from server');
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave-room', { roomId, userId });
        socketRef.current.disconnect();
      }
    };
  }, [roomId, userId]);

  const loadPreviousMessages = async () => {
    try {
      const { data, error } = await supabase.rpc('get_room_messages', {
        target_room_id: roomId,
        message_limit: 50
      });

      if (error) throw error;

      if (data) {
        const formattedMessages: Message[] = data.map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          senderId: msg.user_id,
          timestamp: msg.created_at,
          userName: msg.user_name || 'User',
          avatarUrl: msg.avatar_url
        })).reverse(); // Reverse to show oldest first

        setMessages(formattedMessages);
      }
    } catch (err) {
      logger.error('Failed to load previous messages:', err);
    }
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending || !connected) return;

    try {
      setSending(true);
      const messageContent = newMessage.trim();
      
      // Store message in Supabase
      const { error: dbError } = await supabase
        .from('chat_messages')
        .insert([{
          room_id: roomId,
          user_id: userId,
          content: messageContent,
          message_type: 'text'
        }]);

      if (dbError) {
        throw dbError;
      }

      const timestamp = Date.now();
      
      // Send message via socket for real-time delivery
      socketRef.current?.emit('room-message', {
        roomId,
        userId,
        message: messageContent,
        timestamp
      });

      // Also add to local state immediately for better UX (will dedupe if server sends back)
      const localMessage: Message = {
        id: `${timestamp}-${userId}`,
        content: messageContent,
        senderId: userId,
        timestamp: new Date(timestamp).toISOString(),
        userName: 'You'
      };
      
      setMessages(prev => {
        // Check if message already exists to avoid duplicates
        const exists = prev.find(msg => msg.id === localMessage.id);
        if (exists) return prev;
        return [...prev, localMessage];
      });

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
