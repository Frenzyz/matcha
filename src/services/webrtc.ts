import { io, Socket } from 'socket.io-client';
import { logger } from '../utils/logger';

interface SignalData {
  type: string;
  data: any;
  from: string;
  to: string;
  roomId: string;
}

class WebRTCService {
  private static instance: WebRTCService;
  private socket: Socket | null = null;
  private callbacks = new Map<string, (signal: SignalData) => void>();

  private constructor() {
    this.connect();
  }

  static getInstance(): WebRTCService {
    if (!WebRTCService.instance) {
      WebRTCService.instance = new WebRTCService();
    }
    return WebRTCService.instance;
  }

  private connect() {
    this.socket = io({
      transports: ['websocket'],
      autoConnect: true,
      path: '/socket.io'
    });

    this.socket.on('connect', () => {
      logger.info('Connected to signaling server');
    });

    this.socket.on('disconnect', () => {
      logger.info('Disconnected from signaling server');
    });

    this.socket.on('signal', (signal: SignalData) => {
      const callback = this.callbacks.get(signal.to);
      if (callback) {
        callback(signal);
      }
    });

    this.socket.on('error', (error: Error) => {
      logger.error('Socket error:', error);
    });
  }

  async sendSignal(signal: SignalData): Promise<void> {
    if (!this.socket?.connected) {
      throw new Error('Not connected to signaling server');
    }

    this.socket.emit('signal', signal);
  }

  joinRoom(roomId: string, userId: string): void {
    if (!this.socket?.connected) {
      throw new Error('Not connected to signaling server');
    }

    this.socket.emit('join', { roomId, userId });
  }

  leaveRoom(roomId: string, userId: string): void {
    if (!this.socket?.connected) return;

    this.socket.emit('leave', { roomId, userId });
  }

  subscribeToSignals(roomId: string, userId: string, onSignal: (signal: SignalData) => void): () => void {
    this.callbacks.set(userId, onSignal);

    return () => {
      this.callbacks.delete(userId);
      this.leaveRoom(roomId, userId);
    };
  }
}

export const webRTCService = WebRTCService.getInstance();
