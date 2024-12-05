import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate';
  data: any;
  from: string;
  to: string;
  roomId: string;
}

class SignalingService {
  private static instance: SignalingService;
  private subscriptions: Map<string, () => void> = new Map();

  private constructor() {}

  static getInstance(): SignalingService {
    if (!SignalingService.instance) {
      SignalingService.instance = new SignalingService();
    }
    return SignalingService.instance;
  }

  async sendSignal(signal: SignalingMessage): Promise<void> {
    try {
      const { error } = await supabase
        .from('webrtc_signals')
        .insert([{
          type: signal.type,
          data: signal.data,
          from_user_id: signal.from,
          to_user_id: signal.to,
          room_id: signal.roomId,
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;
    } catch (error) {
      logger.error('Error sending WebRTC signal:', error);
      throw error;
    }
  }

  subscribeToSignals(roomId: string, userId: string, onSignal: (signal: SignalingMessage) => void): () => void {
    const channel = supabase.channel(`webrtc:${roomId}:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'webrtc_signals',
          filter: `room_id=eq.${roomId} AND to_user_id=eq.${userId}`
        },
        (payload) => {
          const signal = {
            type: payload.new.type,
            data: payload.new.data,
            from: payload.new.from_user_id,
            to: payload.new.to_user_id,
            roomId: payload.new.room_id
          } as SignalingMessage;
          onSignal(signal);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.info('Subscribed to WebRTC signals');
        }
      });

    const cleanup = () => {
      channel.unsubscribe();
      this.subscriptions.delete(roomId);
    };

    this.subscriptions.set(roomId, cleanup);
    return cleanup;
  }

  cleanup(roomId: string): void {
    const cleanup = this.subscriptions.get(roomId);
    if (cleanup) {
      cleanup();
    }
  }
}

export const signalingService = SignalingService.getInstance();