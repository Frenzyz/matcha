import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '../utils/logger';

interface ChatMessage {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
}

export function useEasyRTCChat(roomId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const easyrtcRef = useRef<any>(null);
  const selfIdRef = useRef<string | null>(null);

  useEffect(() => {
    const initializeEasyRTC = async () => {
      try {
        // Wait for EasyRTC to be available
        while (!window.easyrtc) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        const easyrtc = window.easyrtc;
        easyrtcRef.current = easyrtc;

        // Configure EasyRTC
        easyrtc.enableDebug(false);
        easyrtc.enableDataChannels(true);
        easyrtc.setSocketUrl('/');

        // Set up message handling
        easyrtc.setPeerListener((easyrtcid: string, msgType: string, content: any) => {
          if (msgType === 'chat') {
            const message: ChatMessage = {
              id: crypto.randomUUID(),
              senderId: easyrtcid,
              content,
              timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, message]);
          }
        });

        // Connect to server
        easyrtc.connect('matcha-app', 
          (easyrtcid: string) => {
            selfIdRef.current = easyrtcid;
            logger.info('Connected with ID:', easyrtcid);
            
            // Join room
            easyrtc.joinRoom(roomId, null,
              () => {
                setConnected(true);
                setError(null);
              },
              (errorCode: string, errorText: string) => {
                setError(`Failed to join room: ${errorText}`);
                logger.error('Room join error:', { errorCode, errorText });
              }
            );
          },
          (errorCode: string, errorText: string) => {
            setError(`Connection failed: ${errorText}`);
            logger.error('Connection error:', { errorCode, errorText });
          }
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to initialize chat';
        setError(message);
        logger.error('Chat initialization error:', err);
      }
    };

    initializeEasyRTC();

    return () => {
      if (easyrtcRef.current) {
        easyrtcRef.current.disconnect();
      }
    };
  }, [roomId]);

  const sendMessage = useCallback(async (content: string) => {
    if (!connected || !easyrtcRef.current) {
      throw new Error('Not connected to chat');
    }

    try {
      const peersInRoom = easyrtcRef.current.getRoomOccupantsAsArray(roomId);
      
      // Send to all peers in room
      await Promise.all(peersInRoom.map(peerId => 
        new Promise((resolve, reject) => {
          easyrtcRef.current.sendDataWS(peerId, 'chat', content,
            () => resolve(undefined),
            (err: any) => reject(err)
          );
        })
      ));

      // Add own message to list
      const message: ChatMessage = {
        id: crypto.randomUUID(),
        senderId: 'self',
        content,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, message]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send message';
      logger.error('Error sending message:', err);
      throw new Error(message);
    }
  }, [connected, roomId]);

  return {
    messages,
    connected,
    error,
    sendMessage
  };
}
