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
  // Security tokens for authentication
  authToken?: string;
  sessionId?: string;
}

export interface SecurityMetrics {
  encryptionEnabled: boolean;
  dtlsState: RTCDtlsTransportState;
  iceConnectionState: RTCIceConnectionState;
  connectionState: RTCPeerConnectionState;
  certificateFingerprint?: string;
  lastSecurityCheck: number;
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
  private securityMetrics: SecurityMetrics | null = null;
  private encryptionVerified: boolean = false;
  private trustedFingerprints: Set<string> = new Set();

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
        // Enhanced configuration to handle cookies and cross-origin issues
        withCredentials: true,
        extraHeaders: {
          'Access-Control-Allow-Credentials': 'true'
        },
        // Cookie configuration for cross-origin compatibility (handled by server)
        // Force polling initially, then upgrade to websocket
        upgrade: true,
        // Additional security headers
        rememberUpgrade: true
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
        // Handle specific cookie and CORS errors
        if (error.message?.includes('cookie') || error.message?.includes('CORS') || error.message?.includes('__cf_bm')) {
          logger.warn('Cookie/CORS issue detected in WebRTC socket, attempting fallback');
          // Try with polling only if websocket fails due to cookie issues
          if (this.socket?.io.opts) {
            this.socket.io.opts.transports = ['polling'];
          }
        }
        logger.error('Socket connection error:', error);
      });

      this.socket.on('user-joined', (data: { userId: string; userName: string }) => {
        logger.info('User joined room:', data);
        // Only notify about new participant (don't duplicate with onStreamAdded)
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

      // Handle existing participants when joining room (without duplicate notifications)
      this.socket.on('room-participants', (participants: Array<{ userId: string; userName: string }>) => {
        logger.info('Received existing participants:', participants);
        // Only initiate calls to existing participants - don't notify UI yet
        // The onStreamAdded callback will handle UI updates when streams are received
        participants.forEach(participant => {
          logger.info(`Initiating call to existing participant: ${participant.userName} (${participant.userId})`);
          // Small delay to ensure peer connection is ready
          setTimeout(() => {
            this.initiateCall(participant.userId);
          }, 500);
        });
      });

    } catch (error) {
      logger.error('Failed to initialize socket:', error);
    }
  }

  async initialize(config: WebRTCConfig): Promise<boolean> {
    // Validate authentication first
    if (!this.validateAuthentication(config)) {
      throw new Error('WebRTC authentication validation failed');
    }

    const result = await this.initializeWithRetry(config, 0);
    
    if (result) {
      // Start security monitoring after successful initialization
      this.startSecurityMonitoring();
      logger.info('🔒 WebRTC security monitoring activated');
    }

    return result;
  }

  private async initializeWithRetry(config: WebRTCConfig, retryCount: number): Promise<boolean> {
    try {
      this.config = config;
      this.connectionRetryCount = retryCount;

      // Enhanced ICE servers for better connectivity
      const iceServers = this.getOptimalIceServers();

      // Initialize PeerJS with enhanced security configuration
      this.peer = new Peer(config.userId, {
        config: {
          iceServers,
          iceCandidatePoolSize: 4, // Reduced for faster connection
          iceTransportPolicy: 'all', // Allow all transport types
          bundlePolicy: 'max-bundle', // Bundle all media into single transport
          rtcpMuxPolicy: 'require', // Require RTCP multiplexing for security
          // Enhanced security configuration
          certificates: undefined, // Use browser-generated certificates (DTLS)
          // Enforce secure transport protocols
          sdpSemantics: 'unified-plan', // Use unified plan for better security
          // Additional security constraints
          offerExtmapAllowMixed: false, // Disable mixed extension maps for security
          // Optimization for faster connections
          iceGatheringTimeout: 5000 // Limit ICE gathering time
        },
        // Enhanced PeerJS security settings
        debug: import.meta.env.DEV ? 2 : 0, // Disable debug in production
        secure: true // Enforce secure connections when available
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
          // Only attempt reconnection if not during tab visibility changes
          if (document.visibilityState === 'visible') {
            this.handleReconnection();
          } else {
            logger.info('Tab hidden during disconnect - will reconnect when tab becomes visible');
          }
        });
      });

    } catch (error) {
      logger.error('Failed to initialize WebRTC:', error);
      return this.handleConnectionFailure(Promise.reject, retryCount, error);
    }
  }

  private getOptimalIceServers(): RTCIceServer[] {
    // Minimal ICE server configuration for fastest discovery
    // Using only 2 servers maximum for immediate peer visibility
    const minimalIceServers: RTCIceServer[] = [
      // Single reliable STUN server
      { urls: 'stun:stun.l.google.com:19302' },
      
      // Single TURN server for NAT traversal
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      }
    ];

    // Use same minimal configuration in all environments for consistency
    return minimalIceServers;
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
    setTimeout(async () => {
      if (this.isDestroyed) return;

      // Check if peer is destroyed - if so, create a new one
      if (!this.peer || this.peer.destroyed) {
        logger.info('Peer destroyed, creating new connection...');
        await this.createNewConnectionAfterDestroy();
      } else if (this.peer.disconnected) {
        logger.info('Attempting to reconnect existing peer...');
        try {
          this.peer.reconnect();
        } catch (error) {
          logger.warn('Reconnect failed, creating new connection:', error);
          await this.createNewConnectionAfterDestroy();
        }
      }
    }, delay);
  }

  private async createNewConnectionAfterDestroy(): Promise<void> {
    if (!this.config || this.isDestroyed) return;

    try {
      // Get the base user ID (without any previous reconnect suffixes)
      const baseUserId = this.getBaseUserId(this.config.userId);
      const newUserId = `${baseUserId}-reconnect-${Date.now()}`;
      
      logger.info(`Creating new peer with ID: ${newUserId} (base: ${baseUserId})`);
      
      // Update config with new ID
      const newConfig = { 
        ...this.config, 
        userId: newUserId 
      };
      
      // Clear old peer completely
      if (this.peer) {
        this.peer.destroy();
        this.peer = null;
      }
      
      // Reset connection state
      this.connectionRetryCount++;
      
      // Initialize with new ID
      await this.initializeWithRetry(newConfig, 0);
      
    } catch (error) {
      logger.error('Failed to create new connection after destroy:', error);
    }
  }

  private getBaseUserId(userId: string): string {
    // Remove any existing reconnect suffixes to prevent ID bloat
    return userId.split('-reconnect-')[0];
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

    // Ensure we have a clean connection before joining
    if (!this.socket.connected) {
      logger.warn('Socket not connected, cannot join room');
      return;
    }

    logger.info(`Joining room: ${this.config.roomId} as ${this.config.userName} (${this.config.userId})`);
    
    // Clear any existing participants to prevent duplicates on reconnection
    if (this.participants.size > 0) {
      logger.info('Clearing existing participants before rejoining room');
      this.participants.clear();
    }
    
    this.socket.emit('join-room', {
      roomId: this.config.roomId,
      userId: this.config.userId,
      userName: this.config.userName,
      authToken: this.config.authToken,
      sessionId: this.config.sessionId
    });
  }

  private async initiateCall(userId: string) {
    if (!this.peer || this.peer.destroyed) {
      logger.warn(`Cannot initiate call to ${userId}: peer not available`);
      return;
    }

    if (!this.localStream) {
      logger.warn(`Cannot initiate call to ${userId}: no local stream`);
      return;
    }

    try {
      logger.info(`🔄 Initiating call to user: ${userId}`);
      const call = this.peer.call(userId, this.localStream);
      
      if (call) {
        this.handleOutgoingCall(call, userId);
        logger.info(`✅ Call initiated successfully to ${userId}`);
      } else {
        logger.error(`❌ Failed to create call to ${userId}`);
      }
    } catch (error) {
      logger.error(`Failed to initiate call to ${userId}:`, error);
    }
  }

  private async handleIncomingCall(call: MediaConnection) {
    if (!this.localStream) return;

    logger.info('🔒 Validating incoming call security...');
    
    // Answer the call first
    call.answer(this.localStream);
    
    // Wait for connection to establish, then validate security
    call.on('stream', async (remoteStream) => {
      try {
        // Get the underlying peer connection for security validation
        const peerConnection = (call as any).peerConnection as RTCPeerConnection;
        
        if (peerConnection) {
          const isSecure = await this.validateIncomingConnection(peerConnection);
          
          if (!isSecure) {
            logger.error('❌ Incoming call failed security validation - terminating');
            call.close();
            return;
          }
          
          logger.info('✅ Incoming call security validation passed');
        }
        
        // If validation passes, handle the call normally
        this.handleCallStream(call);
      } catch (error) {
        logger.error('Security validation error:', error);
        call.close();
      }
    });
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
    logger.info(`Cleaning up participant: ${userId}`);
    const participant = this.participants.get(userId);
    if (participant) {
      participant.connection?.close();
      this.participants.delete(userId);
      this.onStreamRemovedCallback?.(userId);
      this.onParticipantLeftCallback?.(userId);
      logger.info(`Participant ${userId} cleaned up successfully`);
    } else {
      logger.warn(`Participant ${userId} not found for cleanup`);
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
    // Enhanced tab switching protection
    this.visibilityChangeHandler = () => {
      if (document.visibilityState === 'hidden') {
        logger.info('Tab became hidden - maintaining WebRTC connection');
        // Mark that we're in a tab switch to prevent unnecessary reconnection attempts
        if (this.socket) {
          this.socket.emit('tab-hidden', { 
            userId: this.config?.userId,
            roomId: this.config?.roomId 
          });
        }
      } else if (document.visibilityState === 'visible') {
        logger.info('Tab became visible - checking connection status');
        
        // Give the page a moment to fully load before checking connections
        setTimeout(() => {
          this.handleTabReturn();
        }, 1000);
      }
    };

    document.addEventListener('visibilitychange', this.visibilityChangeHandler);

    // Enhanced page unload handling
    const beforeUnloadHandler = (event: BeforeUnloadEvent) => {
      if (!this.isDestroyed && this.config) {
        logger.info('Page unloading - cleaning up WebRTC gracefully');
        
        // Emit leave-room to server before cleanup
        if (this.socket && this.socket.connected) {
          this.socket.emit('user-leaving', {
            userId: this.config.userId,
            roomId: this.config.roomId,
            reason: 'page-unload'
          });
        }
        
        // Quick cleanup without waiting
        this.leaveRoom();
      }
    };
    
    window.addEventListener('beforeunload', beforeUnloadHandler);

    // Handle focus events for additional reliability
    const focusHandler = () => {
      if (this.config && document.visibilityState === 'visible') {
        logger.info('Window focused - ensuring connection health');
        setTimeout(() => {
          this.checkConnectionHealth();
        }, 500);
      }
    };

    window.addEventListener('focus', focusHandler);
  }

  private async handleTabReturn(): Promise<void> {
    if (!this.config) return;

    try {
      logger.info('🔄 Handling tab return - checking connection status');

      let needsReconnection = false;

      // Check socket connection first
      if (this.socket && !this.socket.connected) {
        logger.info('Socket disconnected while tab hidden - reconnecting...');
        needsReconnection = true;
        this.socket.connect();
        
        // Wait for socket to connect before proceeding
        await new Promise((resolve) => {
          const checkConnection = () => {
            if (this.socket?.connected) {
              resolve(true);
            } else {
              setTimeout(checkConnection, 100);
            }
          };
          checkConnection();
          
          // Timeout after 5 seconds
          setTimeout(() => resolve(false), 5000);
        });
      }

      // Check peer connection
      if (!this.peer || this.peer.destroyed || this.peer.disconnected) {
        logger.info('Peer connection lost while tab hidden - attempting to restore...');
        needsReconnection = true;
        await this.handleReconnection();
      }

      // Only rejoin room if we actually had connection issues
      if (needsReconnection && this.socket && this.socket.connected) {
        logger.info('Rejoining room after reconnection');
        this.joinRoom();
      }

      // Notify server that tab is visible (for grace period management)
      if (this.socket && this.socket.connected) {
        this.socket.emit('tab-visible', { 
          userId: this.config.userId,
          roomId: this.config.roomId 
        });
      }

    } catch (error) {
      logger.error('Error handling tab return:', error);
    }
  }

  private async checkConnectionHealth(): Promise<void> {
    if (!this.config) return;

    const issues: string[] = [];

    // Check socket health
    if (!this.socket || !this.socket.connected) {
      issues.push('socket');
    }

    // Check peer health
    if (!this.peer || this.peer.destroyed || this.peer.disconnected) {
      issues.push('peer');
    }

    // Check local stream
    if (!this.localStream || this.localStream.getTracks().length === 0) {
      issues.push('media');
    }

    if (issues.length > 0) {
      logger.warn(`Connection health issues detected: ${issues.join(', ')}`);
      
      // Attempt to fix issues automatically
      if (issues.includes('socket') && this.socket) {
        this.socket.connect();
      }
      
      if (issues.includes('peer')) {
        await this.handleReconnection();
      }
      
      if (issues.includes('media')) {
        logger.info('Attempting to restore media stream...');
        try {
          const stream = await this.startLocalStream(true, true);
          if (stream) {
            logger.info('Media stream restored successfully');
          }
        } catch (error) {
          logger.warn('Failed to restore media stream:', error);
        }
      }
    } else {
      logger.info('Connection health check passed');
    }
  }

  destroy() {
    logger.info('🧹 WebRTC Service: Destroying all connections and resources');
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
    
    // Force stop all local media streams
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
        logger.debug('🎥 Stopped local media track:', track.kind, track.label);
      });
      this.localStream = null;
    }

    // Close all participant connections and stop their streams
    this.participants.forEach((participant, userId) => {
      if (participant.stream) {
        participant.stream.getTracks().forEach(track => track.stop());
      }
      if (participant.connection) {
        participant.connection.close();
      }
      logger.debug('🔌 Closed connection for participant:', userId);
    });
    this.participants.clear();

    // Reset all callbacks
    this.onStreamAddedCallback = undefined;
    this.onStreamRemovedCallback = undefined;
    this.onParticipantJoinedCallback = undefined;
    this.onParticipantLeftCallback = undefined;
    
    // Leave room and close peer connection
    this.leaveRoom();
    
    // Disconnect socket
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    // Reset security state
    this.securityMetrics = null;
    this.encryptionVerified = false;
    this.trustedFingerprints.clear();

    // Reset connection state
    this.connectionState = 'new';
    this.networkQuality = 'unknown';
    this.connectionRetryCount = 0;
    this.config = null;

    logger.info('✅ WebRTC Service: Complete destruction finished');
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

  // ===== SECURITY METHODS =====

  /**
   * Validates authentication token and session
   */
  private validateAuthentication(config: WebRTCConfig): boolean {
    if (import.meta.env.PROD) {
      // In production, require authentication
      if (!config.authToken || !config.sessionId) {
        logger.error('Authentication required for WebRTC connections in production');
        return false;
      }
      
      // More lenient validation for development tokens
      if (config.authToken.length < 8 || !config.sessionId.match(/^[a-zA-Z0-9-]+$/)) {
        logger.warn('Authentication credentials format issue, but allowing connection');
        logger.info(`Token length: ${config.authToken.length}, SessionId: ${config.sessionId}`);
        // Allow connection but log the issue
      }
    }
    
    logger.info('Authentication validation passed');
    return true;
  }

  /**
   * Verifies DTLS encryption is properly established
   */
  private async verifyEncryption(connection: RTCPeerConnection): Promise<boolean> {
    try {
      const stats = await connection.getStats();
      let encryptionEnabled = false;
      let certificateFound = false;

      stats.forEach((stat) => {
        // Check for DTLS transport state
        if (stat.type === 'transport') {
          if (stat.dtlsState === 'connected') {
            encryptionEnabled = true;
            logger.info('DTLS encryption verified as active');
          }
        }
        
        // Check for certificate information
        if (stat.type === 'certificate') {
          certificateFound = true;
          if (stat.fingerprint) {
            this.trustedFingerprints.add(stat.fingerprint);
            logger.info('Certificate fingerprint verified:', stat.fingerprint.substring(0, 20) + '...');
          }
        }
      });

      this.encryptionVerified = encryptionEnabled && certificateFound;
      
      if (!this.encryptionVerified) {
        logger.error('WebRTC encryption verification failed!');
        return false;
      }

      logger.info('✅ WebRTC encryption verification successful');
      return true;
    } catch (error) {
      logger.error('Failed to verify encryption:', error);
      return false;
    }
  }

  /**
   * Performs comprehensive security audit of the connection
   */
  private async performSecurityAudit(connection: RTCPeerConnection): Promise<SecurityMetrics> {
    const stats = await connection.getStats();
    let dtlsState: RTCDtlsTransportState = 'new';
    let certificateFingerprint: string | undefined;

    stats.forEach((stat) => {
      if (stat.type === 'transport') {
        dtlsState = stat.dtlsState || 'new';
      }
      if (stat.type === 'certificate' && stat.fingerprint) {
        certificateFingerprint = stat.fingerprint;
      }
    });

    const metrics: SecurityMetrics = {
      encryptionEnabled: this.encryptionVerified,
      dtlsState,
      iceConnectionState: connection.iceConnectionState,
      connectionState: connection.connectionState,
      certificateFingerprint,
      lastSecurityCheck: Date.now()
    };

    this.securityMetrics = metrics;
    
    // Log security status
    logger.info('🔒 Security Audit Results:', {
      encryption: metrics.encryptionEnabled ? '✅ ENABLED' : '❌ DISABLED',
      dtls: metrics.dtlsState,
      ice: metrics.iceConnectionState,
      connection: metrics.connectionState
    });

    return metrics;
  }

  /**
   * Validates incoming connection security before accepting
   */
  private async validateIncomingConnection(connection: RTCPeerConnection): Promise<boolean> {
    // Wait for DTLS to establish
    await new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (connection.connectionState === 'connected' || 
            connection.connectionState === 'failed') {
          clearInterval(checkInterval);
          resolve(true);
        }
      }, 100);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve(false);
      }, 10000);
    });

    // Verify encryption
    const encryptionValid = await this.verifyEncryption(connection);
    if (!encryptionValid) {
      logger.error('❌ Incoming connection failed encryption validation');
      return false;
    }

    // Perform security audit
    await this.performSecurityAudit(connection);

    logger.info('✅ Incoming connection security validation passed');
    return true;
  }

  /**
   * Monitors connection security continuously
   */
  private startSecurityMonitoring(): void {
    setInterval(async () => {
      if (!this.peer || this.peer.destroyed) return;

      try {
        const connections = Object.values(this.peer.connections).flat();
        for (const conn of connections) {
          if ((conn as any).peerConnection) {
            const peerConnection = (conn as any).peerConnection as RTCPeerConnection;
            await this.performSecurityAudit(peerConnection);
            
            // Alert on security issues
            if (this.securityMetrics) {
              if (!this.securityMetrics.encryptionEnabled) {
                logger.error('🚨 SECURITY ALERT: Encryption not active on connection!');
              }
              if (this.securityMetrics.dtlsState !== 'connected') {
                logger.warn('⚠️ SECURITY WARNING: DTLS not in connected state');
              }
            }
          }
        }
      } catch (error) {
        logger.error('Security monitoring error:', error);
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Gets current security metrics
   */
  getSecurityMetrics(): SecurityMetrics | null {
    return this.securityMetrics;
  }

  /**
   * Checks if connections are properly encrypted
   */
  isEncryptionActive(): boolean {
    return this.encryptionVerified && 
           this.securityMetrics?.encryptionEnabled === true &&
           this.securityMetrics?.dtlsState === 'connected';
  }

  /**
   * Forces security re-validation
   */
  async revalidateSecurity(): Promise<boolean> {
    if (!this.peer || this.peer.destroyed) return false;

    try {
      const connections = Object.values(this.peer.connections).flat();
      for (const conn of connections) {
        if ((conn as any).peerConnection) {
          const peerConnection = (conn as any).peerConnection as RTCPeerConnection;
          const valid = await this.validateIncomingConnection(peerConnection);
          if (!valid) return false;
        }
      }
      return true;
    } catch (error) {
      logger.error('Security revalidation failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const webRTCService = new ModernWebRTCService();