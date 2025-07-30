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
  private isDestroyed: boolean = false;
  private visibilityChangeHandler?: () => void;
  private connectionRetryCount: number = 0;
  private maxRetries: number = 5;
  private retryDelay: number = 1000;
  private connectionState: RTCPeerConnectionState = 'new';
  private networkQuality: 'excellent' | 'good' | 'poor' | 'unknown' = 'unknown';
  private connectionMonitorInterval?: number;

  constructor() {
    // Initialize socket connection
    this.initializeSocket();
    this.setupVisibilityHandler();
  }

  private initializeSocket() {
    try {
      // Connect to WebRTC server using environment variable
      const webrtcServerUrl = import.meta.env.VITE_WEBRTC_SERVER_URL || 'http://localhost:3001';
      this.socket = io(webrtcServerUrl, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        maxReconnectionAttempts: 5
      });

      this.socket.on('connect', () => {
        logger.info('Socket connected for WebRTC');
        // Rejoin room if we were previously connected
        if (this.config) {
          logger.info('Rejoining room after reconnection');
          this.joinRoom();
        }
      });

      this.socket.on('disconnect', (reason) => {
        logger.info('Socket disconnected:', reason);
        // Don't trigger disconnect events for tab visibility changes
        if (reason !== 'io client disconnect' && reason !== 'transport close') {
          logger.info('Socket disconnected due to network issue, will attempt to reconnect');
        }
      });

      this.socket.on('reconnect', (attemptNumber) => {
        logger.info(`Socket reconnected after ${attemptNumber} attempts`);
      });

      this.socket.on('reconnect_error', (error) => {
        logger.error('Socket reconnection error:', error);
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
    return this.initializeWithRetry(config, 0);
  }

  private async initializeWithRetry(config: WebRTCConfig, retryCount: number): Promise<boolean> {
    try {
      this.config = config;
      this.connectionRetryCount = retryCount;

      // Enhanced ICE servers for better connectivity
      const iceServers = this.getOptimalIceServers();

      // Initialize PeerJS with enhanced configuration
      this.peer = new Peer(config.userId, {
        config: {
          iceServers,
          iceCandidatePoolSize: 10,
          iceTransportPolicy: 'all',
          bundlePolicy: 'max-bundle',
          rtcpMuxPolicy: 'require'
        },
        debug: process.env.NODE_ENV === 'development' ? 2 : 0
      });

      return new Promise((resolve, reject) => {
        if (!this.peer) {
          reject(new Error('Failed to create peer'));
          return;
        }

        // Set connection timeout based on network quality
        const timeout = this.getConnectionTimeout();
        const timeoutId = setTimeout(() => {
          logger.warn(`Peer connection timeout after ${timeout}ms`);
          this.handleConnectionFailure(reject, retryCount);
        }, timeout);

        this.peer.on('open', (id) => {
          clearTimeout(timeoutId);
          logger.info('Peer connection opened with ID:', id);
          this.connectionState = 'connected';
          this.startConnectionMonitoring();
          this.joinRoom();
          resolve(true);
        });

        this.peer.on('error', (error) => {
          clearTimeout(timeoutId);
          logger.error('Peer error:', error);
          this.handleConnectionFailure(reject, retryCount, error);
        });

        this.peer.on('call', (call) => {
          this.handleIncomingCall(call);
        });

        this.peer.on('connection', (conn) => {
          this.handleDataConnection(conn);
        });

        this.peer.on('disconnected', () => {
          logger.warn('Peer disconnected, attempting to reconnect...');
          this.connectionState = 'disconnected';
          this.handleReconnection();
        });
      });

    } catch (error) {
      logger.error('Failed to initialize WebRTC:', error);
      return this.handleConnectionFailure(Promise.reject, retryCount, error);
    }
  }

  private getOptimalIceServers(): RTCIceServer[] {
    return [
      // Primary STUN servers
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      
      // Alternative STUN servers for better connectivity
      { urls: 'stun:stun.cloudflare.com:3478' },
      { urls: 'stun:stun.nextcloud.com:443' },
      { urls: 'stun:stun.stunprotocol.org:3478' },
      
      // Mozilla STUN servers
      { urls: 'stun:stun.services.mozilla.com' },
      
      // Additional backup STUN servers
      { urls: 'stun:stun.ekiga.net' },
      { urls: 'stun:stun.ideasip.com' },
      { urls: 'stun:stun.schlund.de' }
    ];
  }

  private getConnectionTimeout(): number {
    switch (this.networkQuality) {
      case 'excellent': return 5000;
      case 'good': return 8000;
      case 'poor': return 15000;
      default: return 10000;
    }
  }

  private async handleConnectionFailure(
    rejectFn: (reason?: any) => void, 
    retryCount: number, 
    error?: any
  ): Promise<boolean> {
    if (retryCount < this.maxRetries) {
      const delay = this.retryDelay * Math.pow(2, retryCount); // Exponential backoff
      logger.info(`Retrying connection in ${delay}ms (attempt ${retryCount + 1}/${this.maxRetries})`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.initializeWithRetry(this.config!, retryCount + 1);
    } else {
      const errorMessage = error?.message || 'Max connection retries exceeded';
      logger.error(errorMessage);
      rejectFn(new Error(errorMessage));
      return false;
    }
  }

  private handleReconnection(): void {
    if (this.isDestroyed || this.connectionRetryCount >= this.maxRetries) return;

    const delay = 2000 + (this.connectionRetryCount * 1000);
    setTimeout(() => {
      if (this.peer && this.peer.disconnected && !this.isDestroyed) {
        logger.info('Attempting to reconnect peer...');
        this.peer.reconnect();
      }
    }, delay);
  }

  private startConnectionMonitoring(): void {
    this.connectionMonitorInterval = window.setInterval(() => {
      this.monitorConnectionQuality();
    }, 5000);
  }

  private async monitorConnectionQuality(): Promise<void> {
    if (!this.peer || this.peer.destroyed) return;

    try {
      // Monitor connection state
      const connections = Object.values(this.peer.connections).flat();
      if (connections.length > 0) {
        const connection = connections[0] as any;
        if (connection.peerConnection) {
          const stats = await connection.peerConnection.getStats();
          this.analyzeConnectionStats(stats);
        }
      }
    } catch (error) {
      logger.warn('Failed to monitor connection quality:', error);
    }
  }

  private analyzeConnectionStats(stats: RTCStatsReport): void {
    let bytesReceived = 0;
    let packetsLost = 0;
    let packetsReceived = 0;

    stats.forEach((stat) => {
      if (stat.type === 'inbound-rtp' && stat.mediaType === 'video') {
        bytesReceived += stat.bytesReceived || 0;
        packetsLost += stat.packetsLost || 0;
        packetsReceived += stat.packetsReceived || 0;
      }
    });

    // Calculate packet loss rate
    const totalPackets = packetsReceived + packetsLost;
    const lossRate = totalPackets > 0 ? packetsLost / totalPackets : 0;

    // Update network quality based on stats
    if (lossRate < 0.02 && bytesReceived > 100000) {
      this.networkQuality = 'excellent';
    } else if (lossRate < 0.05 && bytesReceived > 50000) {
      this.networkQuality = 'good';
    } else if (bytesReceived > 0) {
      this.networkQuality = 'poor';
    }

    logger.debug(`Network quality: ${this.networkQuality}, Loss rate: ${(lossRate * 100).toFixed(2)}%`);
  }

  async startLocalStream(video: boolean = true, audio: boolean = true): Promise<MediaStream | null> {
    try {
      const constraints = this.getAdaptiveMediaConstraints(video, audio);
      const stream = await this.acquireMediaWithFallback(constraints);

      this.localStream = stream;
      return stream;
    } catch (error) {
      logger.error('Failed to access media devices:', error);
      return null;
    }
  }

  private getAdaptiveMediaConstraints(video: boolean, audio: boolean): MediaStreamConstraints {
    const videoConstraints = video ? this.getVideoConstraints() : false;
    const audioConstraints = audio ? this.getAudioConstraints() : false;

    return {
      video: videoConstraints,
      audio: audioConstraints
    };
  }

  private getVideoConstraints(): MediaTrackConstraints {
    // Adapt video quality based on network conditions
    switch (this.networkQuality) {
      case 'excellent':
        return {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 },
          facingMode: 'user'
        };
      case 'good':
        return {
          width: { ideal: 854, max: 1280 },
          height: { ideal: 480, max: 720 },
          frameRate: { ideal: 24, max: 30 },
          facingMode: 'user'
        };
      case 'poor':
        return {
          width: { ideal: 640, max: 854 },
          height: { ideal: 360, max: 480 },
          frameRate: { ideal: 15, max: 24 },
          facingMode: 'user'
        };
      default:
        return {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
          facingMode: 'user'
        };
    }
  }

  private getAudioConstraints(): MediaTrackConstraints {
    return {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 2,
      sampleRate: this.networkQuality === 'poor' ? 16000 : 48000,
      sampleSize: 16
    };
  }

  private async acquireMediaWithFallback(constraints: MediaStreamConstraints): Promise<MediaStream> {
    const fallbackConfigs = [
      constraints,
      // Fallback 1: Lower video quality
      {
        video: constraints.video ? {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 15 },
          facingMode: 'user'
        } : false,
        audio: constraints.audio
      },
      // Fallback 2: Audio only
      {
        video: false,
        audio: constraints.audio
      },
      // Fallback 3: Basic audio
      {
        video: false,
        audio: true
      }
    ];

    for (let i = 0; i < fallbackConfigs.length; i++) {
      try {
        logger.info(`Attempting media acquisition with config ${i + 1}/${fallbackConfigs.length}`);
        const stream = await navigator.mediaDevices.getUserMedia(fallbackConfigs[i]);
        
        if (i > 0) {
          logger.warn(`Media acquired with fallback config ${i + 1}`);
        }
        
        return stream;
      } catch (error) {
        logger.warn(`Media config ${i + 1} failed:`, error);
        
        if (i === fallbackConfigs.length - 1) {
          throw new Error('Failed to acquire media with all fallback configurations');
        }
      }
    }

    throw new Error('All media acquisition attempts failed');
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

  private setupVisibilityHandler() {
    // Prevent disconnection when tab becomes hidden
    this.visibilityChangeHandler = () => {
      if (document.visibilityState === 'hidden') {
        logger.info('Tab became hidden - maintaining WebRTC connection');
        // Keep connection alive, don't disconnect
      } else if (document.visibilityState === 'visible') {
        logger.info('Tab became visible - WebRTC connection active');
        // Reconnect if disconnected while hidden
        if (this.config && this.socket && !this.socket.connected) {
          logger.info('Reconnecting socket after tab became visible');
          this.socket.connect();
        }
      }
    };

    document.addEventListener('visibilitychange', this.visibilityChangeHandler);

    // Handle page unload to properly cleanup
    const beforeUnloadHandler = () => {
      if (!this.isDestroyed) {
        logger.info('Page unloading - cleaning up WebRTC');
        this.leaveRoom();
      }
    };
    
    window.addEventListener('beforeunload', beforeUnloadHandler);
  }

  destroy() {
    this.isDestroyed = true;
    
    // Stop connection monitoring
    if (this.connectionMonitorInterval) {
      clearInterval(this.connectionMonitorInterval);
      this.connectionMonitorInterval = undefined;
    }
    
    // Remove visibility change handler
    if (this.visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
      this.visibilityChangeHandler = undefined;
    }
    
    this.leaveRoom();
    this.socket?.disconnect();
    this.socket = null;
  }

  // Public methods to get connection status
  getConnectionState(): RTCPeerConnectionState {
    return this.connectionState;
  }

  getNetworkQuality(): 'excellent' | 'good' | 'poor' | 'unknown' {
    return this.networkQuality;
  }

  getConnectionRetryCount(): number {
    return this.connectionRetryCount;
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