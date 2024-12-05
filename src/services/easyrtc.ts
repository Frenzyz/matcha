import { io } from 'socket.io-client';
import { logger } from '../utils/logger';

declare global {
  interface Window {
    easyrtc: any;
    io: typeof io;
  }
}

export class EasyRTCService {
  private static instance: EasyRTCService;
  private easyrtc: any;
  private socket: ReturnType<typeof io> | null = null;
  private connected = false;
  private messageCallbacks = new Map<string, (senderId: string, msgType: string, data: any) => void>();

  private constructor() {
    if (typeof window !== 'undefined') {
      this.socket = window.io('/', {
        path: '/socket.io',
        transports: ['websocket']
      });
    }
  }

  static getInstance(): EasyRTCService {
    if (!EasyRTCService.instance) {
      EasyRTCService.instance = new EasyRTCService();
    }
    return EasyRTCService.instance;
  }

  async connect(roomId: string): Promise<string> {
    if (!this.socket) {
      throw new Error('Socket.IO not initialized');
    }

    return new Promise((resolve, reject) => {
      try {
        this.socket!.on('connect', () => {
          logger.info('Connected to signaling server');
          this.connected = true;
          
          this.socket!.emit('join', { roomId }, (response: any) => {
            if (response.error) {
              reject(new Error(response.error));
            } else {
              resolve(response.clientId);
            }
          });
        });

        this.socket!.on('disconnect', () => {
          logger.info('Disconnected from signaling server');
          this.connected = false;
        });

        this.socket!.on('message', (data: any) => {
          const callback = this.messageCallbacks.get(data.type);
          if (callback) {
            callback(data.from, data.type, data.data);
          }
        });

        this.socket!.on('error', (error: Error) => {
          logger.error('Socket error:', error);
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  async sendMessage(targetId: string | null, msgType: string, data: any): Promise<void> {
    if (!this.connected || !this.socket) {
      throw new Error('Not connected to server');
    }

    return new Promise((resolve, reject) => {
      this.socket!.emit('message', {
        to: targetId,
        type: msgType,
        data
      }, (response: any) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve();
        }
      });
    });
  }

  onMessage(msgType: string, callback: (senderId: string, msgType: string, data: any) => void): void {
    this.messageCallbacks.set(msgType, callback);
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.messageCallbacks.clear();
    }
  }
}

export const easyrtcService = EasyRTCService.getInstance();