// Modern WebRTC Service using PeerJS
import Peer, { DataConnection, MediaConnection } from 'peerjs';
import { io, Socket } from 'socket.io-client';
import { logger } from '../utils/logger';

export interface ParticipantStream {
  userId: string;
  stream: MediaStream;
  connection?: MediaConnection;
}

export interface WebRTCConfig {
  roomId: string;
  userId: string;
  userName: string;
}

export class ModernWebRTCService {
  private peer: Peer | null = null;
  private socket: Socket | null = null;
  private localStream: MediaStream | null = null;
  private participants: Map<string, ParticipantStream> = new Map();
  private onStreamAddedCallback?: (participant: ParticipantStream) => void;
  private onStreamRemovedCallback?: (userId: string) => void;
  private onParticipantJoinedCallback?: (userId: string, userName: string) => void;
  private onParticipantLeftCallback?: (userId: string) => void;
  private config: WebRTCConfig | null = null;

  constructor() {
    // Initialize socket connection
    this.initializeSocket();
  }

  private initializeSocket() {
    try {
      // Connect to WebRTC server using environment variable
      const webrtcServerUrl = import.meta.env.VITE_WEBRTC_SERVER_URL || 'http://localhost:3001';
      this.socket = io(webrtcServerUrl, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true
      });

      this.socket.on('connect', () => {
        logger.info('Socket connected for WebRTC');
      });

      this.socket.on('disconnect', () => {
        logger.info('Socket disconnected');
      });

      this.socket.on('connect_error', (error) => {
        logger.error('Socket connection error:', error);
      });

      this.socket.on('user-joined', (data: { userId: string; userName: string }) => {
        logger.info('User joined room:', data);
        this.onParticipantJoinedCallback?.(data.userId, data.userName);
        this.initiateCall(data.userId);
      });

      this.socket.on('user-left', (data: { userId: string }) => {
        logger.info('User left room:', data);
        this.handleParticipantLeft(data.userId);
      });

      this.socket.on('offer', (data: { from: string; offer: any }) => {
        this.handleOffer(data.from, data.offer);
      });

      this.socket.on('answer', (data: { from: string; answer: any }) => {
        this.handleAnswer(data.from, data.answer);
      });

    } catch (error) {
      logger.error('Failed to initialize socket:', error);
    }
  }

  async initialize(config: WebRTCConfig): Promise<boolean> {
    try {
      this.config = config;

      // Initialize PeerJS with public cloud service for development
      this.peer = new Peer(config.userId, {
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
          ]
        }
      });

      return new Promise((resolve, reject) => {
        if (!this.peer) {
          reject(new Error('Failed to create peer'));
          return;
        }

        this.peer.on('open', (id) => {
          logger.info('Peer connection opened with ID:', id);
          this.joinRoom();
          resolve(true);
        });

        this.peer.on('error', (error) => {
          logger.error('Peer error:', error);
          reject(error);
        });

        this.peer.on('call', (call) => {
          this.handleIncomingCall(call);
        });

        this.peer.on('connection', (conn) => {
          this.handleDataConnection(conn);
        });

        // Timeout after 10 seconds
        setTimeout(() => {
          reject(new Error('Peer connection timeout'));
        }, 10000);
      });

    } catch (error) {
      logger.error('Failed to initialize WebRTC:', error);
      return false;
    }
  }

  async startLocalStream(video: boolean = true, audio: boolean = true): Promise<MediaStream | null> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: video ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } : false,
        audio: audio ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } : false
      });

      this.localStream = stream;
      return stream;
    } catch (error) {
      logger.error('Failed to access media devices:', error);
      return null;
    }
  }

  async startScreenShare(): Promise<MediaStream | null> {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: true
      });

      return stream;
    } catch (error) {
      logger.error('Failed to start screen share:', error);
      return null;
    }
  }

  private joinRoom() {
    if (!this.socket || !this.config) return;

    this.socket.emit('join-room', {
      roomId: this.config.roomId,
      userId: this.config.userId,
      userName: this.config.userName
    });
  }

  private async initiateCall(userId: string) {
    if (!this.peer || !this.localStream) return;

    try {
      const call = this.peer.call(userId, this.localStream);
      this.handleOutgoingCall(call, userId);
    } catch (error) {
      logger.error('Failed to initiate call:', error);
    }
  }

  private handleIncomingCall(call: MediaConnection) {
    if (!this.localStream) return;

    call.answer(this.localStream);
    this.handleCallStream(call);
  }

  private handleOutgoingCall(call: MediaConnection, userId: string) {
    this.handleCallStream(call);
  }

  private handleCallStream(call: MediaConnection) {
    call.on('stream', (remoteStream) => {
      const participant: ParticipantStream = {
        userId: call.peer,
        stream: remoteStream,
        connection: call
      };

      this.participants.set(call.peer, participant);
      this.onStreamAddedCallback?.(participant);
    });

    call.on('close', () => {
      this.handleParticipantLeft(call.peer);
    });

    call.on('error', (error) => {
      logger.error('Call error:', error);
      this.handleParticipantLeft(call.peer);
    });
  }

  private handleDataConnection(conn: DataConnection) {
    conn.on('data', (data) => {
      logger.info('Received data:', data);
    });

    conn.on('open', () => {
      logger.info('Data connection opened with:', conn.peer);
    });
  }

  private async handleOffer(from: string, offer: any) {
    // Handle WebRTC offer if needed for custom signaling
  }

  private async handleAnswer(from: string, answer: any) {
    // Handle WebRTC answer if needed for custom signaling
  }

  private handleParticipantLeft(userId: string) {
    const participant = this.participants.get(userId);
    if (participant) {
      participant.connection?.close();
      this.participants.delete(userId);
      this.onStreamRemovedCallback?.(userId);
      this.onParticipantLeftCallback?.(userId);
    }
  }

  toggleVideo(enabled: boolean) {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = enabled;
      }
    }
  }

  toggleAudio(enabled: boolean) {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = enabled;
      }
    }
  }

  async sendMessage(message: string) {
    if (!this.config) return;

    this.participants.forEach((participant) => {
      if (this.peer) {
        const conn = this.peer.connect(participant.userId);
        conn.on('open', () => {
          conn.send({
            type: 'message',
            message,
            from: this.config!.userId,
            timestamp: Date.now()
          });
        });
      }
    });

    // Also send via socket as backup
    this.socket?.emit('room-message', {
      roomId: this.config.roomId,
      userId: this.config.userId,
      message,
      timestamp: Date.now()
    });
  }

  leaveRoom() {
    // Close all connections
    this.participants.forEach((participant) => {
      participant.connection?.close();
    });
    this.participants.clear();

    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Leave socket room
    if (this.socket && this.config) {
      this.socket.emit('leave-room', {
        roomId: this.config.roomId,
        userId: this.config.userId
      });
    }

    // Close peer connection
    this.peer?.destroy();
    this.peer = null;
  }

  destroy() {
    this.leaveRoom();
    this.socket?.disconnect();
    this.socket = null;
  }

  // Event handlers
  onStreamAdded(callback: (participant: ParticipantStream) => void) {
    this.onStreamAddedCallback = callback;
  }

  onStreamRemoved(callback: (userId: string) => void) {
    this.onStreamRemovedCallback = callback;
  }

  onParticipantJoined(callback: (userId: string, userName: string) => void) {
    this.onParticipantJoinedCallback = callback;
  }

  onParticipantLeft(callback: (userId: string) => void) {
    this.onParticipantLeftCallback = callback;
  }

  getParticipants(): ParticipantStream[] {
    return Array.from(this.participants.values());
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }
}

// Export singleton instance
export const webRTCService = new ModernWebRTCService();