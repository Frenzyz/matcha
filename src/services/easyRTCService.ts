// EasyRTC Service for Matcha Study Platform
import { logger } from '../utils/logger';

// Define global easyrtc object
declare global {
  interface Window {
    easyrtc: any;
  }
}

export interface ParticipantStream {
  userId: string;
  stream: MediaStream;
  videoElement?: HTMLVideoElement;
}

export interface EasyRTCConfig {
  roomId: string;
  userId: string;
  userName: string;
  authToken?: string;
}

export class EasyRTCService {
  private localStream: MediaStream | null = null;
  private participants: Map<string, ParticipantStream> = new Map();
  private onStreamAddedCallback?: (participant: ParticipantStream) => void;
  private onStreamRemovedCallback?: (userId: string) => void;
  private onParticipantJoinedCallback?: (userId: string, userName: string) => void;
  private onParticipantLeftCallback?: (userId: string) => void;
  private config: EasyRTCConfig | null = null;
  private isInitialized: boolean = false;
  private isConnected: boolean = false;

  constructor() {
    // EasyRTC will be loaded via script tag
  }

  async initialize(config: EasyRTCConfig): Promise<boolean> {
    try {
      this.config = config;

      // Wait for EasyRTC to be available
      if (!window.easyrtc) {
        throw new Error('EasyRTC library not loaded. Please include easyrtc.js');
      }

      logger.info('🚀 Initializing EasyRTC service');

      // Configure EasyRTC server URL
      const serverUrl = import.meta.env.PROD 
        ? 'https://matcha-0jcn.onrender.com' 
        : 'http://localhost:3001';

      // Set up EasyRTC callbacks
      this.setupEasyRTCCallbacks();

      // Connect to EasyRTC server
      window.easyrtc.setSocketUrl(serverUrl);
      
      // Set credentials for authentication
      window.easyrtc.setCredential({
        username: config.userName,
        roomId: config.roomId,
        userId: config.userId
      });

      // Initialize EasyRTC
      await new Promise<void>((resolve, reject) => {
        window.easyrtc.initConnection(
          config.userId,
          (easyrtcid: string) => {
            logger.info(`✅ EasyRTC connected with ID: ${easyrtcid}`);
            this.isConnected = true;
            this.isInitialized = true;
            resolve();
          },
          (errorCode: string, message: string) => {
            logger.error('❌ EasyRTC connection failed:', { errorCode, message });
            reject(new Error(`EasyRTC connection failed: ${message}`));
          }
        );
      });

      // Join the room
      await this.joinRoom();

      return true;
    } catch (error) {
      logger.error('Failed to initialize EasyRTC:', error);
      return false;
    }
  }

  private setupEasyRTCCallbacks() {
    if (!window.easyrtc) return;

    // Called when another user initiates a call to us
    window.easyrtc.setCallCancelled((easyrtcid: string) => {
      logger.info(`📞 Call cancelled by ${easyrtcid}`);
    });

    // Called when we receive a call
    window.easyrtc.setStreamAcceptor((easyrtcid: string, stream: MediaStream) => {
      logger.info(`📺 Received stream from ${easyrtcid}`);
      
      const participant: ParticipantStream = {
        userId: easyrtcid,
        stream: stream
      };
      
      this.participants.set(easyrtcid, participant);
      this.onStreamAddedCallback?.(participant);
    });

    // Called when a user's stream is removed
    window.easyrtc.setOnStreamClosed((easyrtcid: string) => {
      logger.info(`📺 Stream closed from ${easyrtcid}`);
      
      this.participants.delete(easyrtcid);
      this.onStreamRemovedCallback?.(easyrtcid);
    });

    // Called when a user connects to the room
    window.easyrtc.setRoomOccupantListener((roomName: string, data: any, isPrimary: boolean) => {
      logger.info('👥 Room occupants changed:', { roomName, data, isPrimary });
      
      // Handle new users joining
      for (const easyrtcid in data) {
        if (easyrtcid !== window.easyrtc.myEasyrtcid && !this.participants.has(easyrtcid)) {
          logger.info(`🎉 New user joined: ${easyrtcid}`);
          this.onParticipantJoinedCallback?.(easyrtcid, data[easyrtcid].username || easyrtcid);
          
          // Automatically call the new user if we have a local stream
          if (this.localStream) {
            this.initiateCall(easyrtcid);
          }
        }
      }
      
      // Handle users leaving
      this.participants.forEach((participant, participantId) => {
        if (!data[participantId]) {
          logger.info(`👋 User left: ${participantId}`);
          this.participants.delete(participantId);
          this.onParticipantLeftCallback?.(participantId);
          this.onStreamRemovedCallback?.(participantId);
        }
      });
    });

    // Called when connection is lost
    window.easyrtc.setDisconnectListener(() => {
      logger.warn('🔌 EasyRTC disconnected from server');
      this.isConnected = false;
    });

    // Error handler
    window.easyrtc.setOnError((errorCode: string, message: string) => {
      logger.error('❌ EasyRTC error:', { errorCode, message });
    });
  }

  async startLocalStream(video: boolean = true, audio: boolean = true): Promise<MediaStream | null> {
    try {
      if (!window.easyrtc || !this.isInitialized) {
        throw new Error('EasyRTC not initialized');
      }

      logger.info('🎥 Starting local media stream');

      // Configure media constraints
      const mediaConstraints = {
        audio: audio ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } : false,
        video: video ? {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          facingMode: 'user'
        } : false
      };

      // Get user media through EasyRTC
      await new Promise<void>((resolve, reject) => {
        window.easyrtc.initMediaSource(
          () => {
            logger.info('✅ Local media stream started');
            this.localStream = window.easyrtc.getLocalStream();
            resolve();
          },
          (errorCode: string, message: string) => {
            logger.error('❌ Failed to get local media:', { errorCode, message });
            reject(new Error(`Media access failed: ${message}`));
          },
          mediaConstraints
        );
      });

      return this.localStream;
    } catch (error) {
      logger.error('Failed to start local stream:', error);
      return null;
    }
  }

  async startScreenShare(): Promise<MediaStream | null> {
    try {
      if (!window.easyrtc || !this.isInitialized) {
        throw new Error('EasyRTC not initialized');
      }

      logger.info('🖥️ Starting screen share');

      // EasyRTC screen sharing
      await new Promise<void>((resolve, reject) => {
        window.easyrtc.initDesktopSource(
          () => {
            logger.info('✅ Screen share started');
            this.localStream = window.easyrtc.getLocalStream();
            resolve();
          },
          (errorCode: string, message: string) => {
            logger.error('❌ Failed to start screen share:', { errorCode, message });
            reject(new Error(`Screen share failed: ${message}`));
          }
        );
      });

      return this.localStream;
    } catch (error) {
      logger.error('Failed to start screen share:', error);
      return null;
    }
  }

  private async joinRoom(): Promise<void> {
    if (!this.config || !window.easyrtc || !this.isConnected) {
      throw new Error('Cannot join room: not properly initialized');
    }

    return new Promise<void>((resolve, reject) => {
      window.easyrtc.joinRoom(
        this.config!.roomId,
        null, // Room parameters
        () => {
          logger.info(`🚪 Successfully joined room: ${this.config!.roomId}`);
          resolve();
        },
        (errorCode: string, message: string) => {
          logger.error('❌ Failed to join room:', { errorCode, message });
          reject(new Error(`Room join failed: ${message}`));
        }
      );
    });
  }

  private async initiateCall(easyrtcid: string): Promise<void> {
    if (!window.easyrtc || !this.localStream) {
      logger.warn('Cannot initiate call: no local stream or EasyRTC not ready');
      return;
    }

    try {
      logger.info(`📞 Initiating call to ${easyrtcid}`);

      window.easyrtc.call(
        easyrtcid,
        (easyrtcid: string, mediaType: string) => {
          logger.info(`✅ Call accepted by ${easyrtcid} for ${mediaType}`);
        },
        (errorCode: string, message: string) => {
          logger.error('❌ Call failed:', { easyrtcid, errorCode, message });
        },
        (wasAccepted: boolean, easyrtcid: string) => {
          if (wasAccepted) {
            logger.info(`📞 Call to ${easyrtcid} was accepted`);
          } else {
            logger.info(`📞 Call to ${easyrtcid} was rejected`);
          }
        }
      );
    } catch (error) {
      logger.error('Failed to initiate call:', error);
    }
  }

  toggleVideo(enabled: boolean): void {
    if (!window.easyrtc) return;

    try {
      window.easyrtc.enableVideo(enabled);
      logger.info(`🎥 Video ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      logger.error('Failed to toggle video:', error);
    }
  }

  toggleAudio(enabled: boolean): void {
    if (!window.easyrtc) return;

    try {
      window.easyrtc.enableAudio(enabled);
      logger.info(`🎤 Audio ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      logger.error('Failed to toggle audio:', error);
    }
  }

  async sendMessage(message: string): Promise<void> {
    if (!window.easyrtc || !this.config) return;

    try {
      // Send message to all participants in the room
      this.participants.forEach((participant) => {
        window.easyrtc.sendDataWS(participant.userId, 'message', {
          text: message,
          from: this.config!.userId,
          timestamp: Date.now()
        });
      });

      logger.info('💬 Message sent to all participants');
    } catch (error) {
      logger.error('Failed to send message:', error);
    }
  }

  leaveRoom(): void {
    try {
      if (window.easyrtc && this.config) {
        logger.info(`🚪 Leaving room: ${this.config.roomId}`);
        window.easyrtc.leaveRoom(this.config.roomId);
      }

      // Clean up local resources
      this.participants.clear();
      
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
        this.localStream = null;
      }
    } catch (error) {
      logger.error('Error leaving room:', error);
    }
  }

  destroy(): void {
    try {
      this.leaveRoom();
      
      if (window.easyrtc) {
        window.easyrtc.disconnect();
      }
      
      this.isInitialized = false;
      this.isConnected = false;
      
      logger.info('🔌 EasyRTC service destroyed');
    } catch (error) {
      logger.error('Error destroying EasyRTC service:', error);
    }
  }

  // Event handlers
  onStreamAdded(callback: (participant: ParticipantStream) => void): void {
    this.onStreamAddedCallback = callback;
  }

  onStreamRemoved(callback: (userId: string) => void): void {
    this.onStreamRemovedCallback = callback;
  }

  onParticipantJoined(callback: (userId: string, userName: string) => void): void {
    this.onParticipantJoinedCallback = callback;
  }

  onParticipantLeft(callback: (userId: string) => void): void {
    this.onParticipantLeftCallback = callback;
  }

  getParticipants(): ParticipantStream[] {
    return Array.from(this.participants.values());
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  isReady(): boolean {
    return this.isInitialized && this.isConnected;
  }
}

// Export singleton instance
export const easyRTCService = new EasyRTCService();