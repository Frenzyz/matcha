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
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const initializeEasyRTC = async () => {
      try {
        // Set a timeout for EasyRTC loading
        let loadingTimedOut = false;
        loadTimeoutRef.current = setTimeout(() => {
          loadingTimedOut = true;
          setError('EasyRTC failed to load. Using limited functionality.');
          logger.error('EasyRTC timed out loading');
        }, 5000); // 5 second timeout

        // Try to wait for EasyRTC to be available
        let retries = 0;
        const maxRetries = 10;
        
        while (!window.easyrtc && !loadingTimedOut && retries < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 500));
          retries++;
        }
        
        // Clear the timeout if we didn't time out
        if (loadTimeoutRef.current) {
          clearTimeout(loadTimeoutRef.current);
          loadTimeoutRef.current = null;
        }
        
        // If EasyRTC is not available, set up a basic fallback
        if (!window.easyrtc) {
          logger.warn('EasyRTC not available, setting up fallback implementation');
          setupFallbackChat();
          return;
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
    
    const setupFallbackChat = () => {
      // Simple fallback that just allows local messages without real peer connection
      setConnected(true);
      setError('Using local-only chat (no peer connections)');
      logger.warn('Using fallback chat implementation');
    };

    initializeEasyRTC();

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
      if (easyrtcRef.current) {
        try {
          easyrtcRef.current.disconnect();
        } catch (err) {
          logger.error('Error disconnecting:', err);
        }
      }
    };
  }, [roomId]);

  const sendMessage = useCallback(async (content: string) => {
    if (!connected) {
      throw new Error('Not connected to chat');
    }

    try {
      // If we have EasyRTC reference, use it to send to peers
      if (easyrtcRef.current) {
        const peersInRoom = easyrtcRef.current.getRoomOccupantsAsArray(roomId);
        
        // Send to all peers in room
        await Promise.all(peersInRoom.map((peerId: string) => 
          new Promise((resolve, reject) => {
            easyrtcRef.current.sendDataWS(peerId, 'chat', content,
              () => resolve(undefined),
              (err: any) => reject(err)
            );
          })
        ));
      }

      // Add own message to list (always do this, even in fallback mode)
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
