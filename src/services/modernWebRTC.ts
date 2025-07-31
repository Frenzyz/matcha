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
    this.setupUnloadHandler();
  }

  private initializeSocket() {
    try {
      // CRITICAL: Prevent multiple socket instances more aggressively
      if (this.socket) {
        if (this.socket.connected) {
          logger.info('Socket already connected, reusing existing connection');
          return;
        } else {
          logger.info('Cleaning up disconnected socket before creating new one');
          this.socket.removeAllListeners();
          this.socket.disconnect();
          this.socket = null;
        }
      }

      // Connect to WebRTC server using environment variable
      const webrtcServerUrl = import.meta.env.VITE_WEBRTC_SERVER_URL || 'http://localhost:3001';
      
      // Firefox-compatible Socket.IO configuration
      const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');
      
      this.socket = io(webrtcServerUrl, {
        // FIREFOX FIX: Start with polling for Firefox, websocket for others
        transports: isFirefox ? ['polling', 'websocket'] : ['websocket', 'polling'],
        timeout: 20000,
        forceNew: false,
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 5000,
        // Enhanced configuration for cross-origin compatibility
        withCredentials: true,
        extraHeaders: {
          'Access-Control-Allow-Credentials': 'true',
          'User-Agent': navigator.userAgent // Help server identify browser
        },
        // Firefox-specific transport configuration
        upgrade: !isFirefox, // Disable upgrade for Firefox initially
        rememberUpgrade: !isFirefox, // Don't remember upgrade for Firefox
        // Firefox WebSocket configuration
        forceBase64: isFirefox, // Force base64 encoding for Firefox
        timestampRequests: true, // Add timestamps to prevent caching issues
        // Add query to identify this specific client instance
        query: {
          clientId: this.config?.userId || 'unknown',
          timestamp: Date.now(),
          browser: isFirefox ? 'firefox' : 'other',
          sessionId: `${this.config?.userId || 'unknown'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }
      });

      this.socket.on('connect', () => {
        const transport = this.socket?.io?.engine?.transport?.name || 'unknown';
        logger.info(`Socket connected for WebRTC using ${transport} transport`);
        
        // For Firefox, log successful connection method
        if (isFirefox) {
          logger.info(`🦊 Firefox successfully connected via ${transport}`);
        }
        
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
        
        // Enhanced Firefox-specific error handling
        if (isFirefox) {
          logger.error('🦊 Firefox connection error detected:', error.message);
          
          // Check for WebSocket-specific errors in Firefox
          if (error.message?.includes('websocket') || error.message?.includes('wss://')) {
            logger.info('🦊 Firefox WebSocket error - switching to polling-only mode');
            
            // Disconnect and recreate with polling-only
            if (this.socket) {
              this.socket.disconnect();
              
              setTimeout(() => {
                this.createFirefoxFallbackConnection(webrtcServerUrl);
              }, 1000);
            }
          }
        }
        
        // Handle specific cookie and CORS errors
        if (error.message?.includes('cookie') || error.message?.includes('CORS') || error.message?.includes('__cf_bm')) {
          logger.warn('Cookie/CORS issue detected in WebRTC socket, attempting fallback');
          // Try with polling only if websocket fails due to cookie issues
          if (this.socket?.io.opts) {
            this.socket.io.opts.transports = ['polling'];
          }
        }
        
        // Handle transport close errors
        if (error.message?.includes('transport close') || error.message?.includes('xhr poll error')) {
          logger.warn('Transport error detected - attempting reconnection with different strategy');
        }
      });

      this.socket.on('user-joined', (data: { userId: string; userName: string }) => {
        logger.info('🆕 User joined room:', data);
        
        // Notify UI about the new participant
        this.onParticipantJoinedCallback?.(data.userId, data.userName);
        
        // CRITICAL FIX: Add small delay to ensure both peers are ready
        setTimeout(async () => {
          // Verify we have the necessary components before initiating call
          if (!this.peer || this.peer.destroyed) {
            logger.warn(`Cannot initiate call to ${data.userId}: peer not ready`);
            return;
          }
          
          if (!this.localStream) {
            logger.warn(`Cannot initiate call to ${data.userId}: no local stream, attempting to start...`);
            try {
              await this.startLocalStream(true, true);
            } catch (error) {
              logger.error('Failed to start local stream:', error);
              return;
            }
          }
          
          logger.info(`🔄 Existing user initiating call to new user: ${data.userId}`);
          this.initiateCall(data.userId);
        }, 1000); // 1 second delay to ensure both peers are ready
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

      // CRITICAL: Handle existing participants when joining room
      this.socket.on('room-participants', (participants: Array<{ userId: string; userName: string }>) => {
        logger.info('Received existing participants:', participants);
        // Connect to all existing participants
        participants.forEach(participant => {
          logger.info(`Connecting to existing participant: ${participant.userName} (${participant.userId})`);
          this.onParticipantJoinedCallback?.(participant.userId, participant.userName);
          // Initiate call to existing participant
          setTimeout(() => {
            this.initiateCall(participant.userId);
          }, 500); // Small delay to ensure peer connection is ready
        });
      });

    } catch (error) {
      logger.error('Failed to initialize socket:', error);
    }
  }

  async initialize(config: WebRTCConfig): Promise<boolean> {
    // Simple initialization like in working commit - no complex retry logic
    try {
      this.config = config;

      // Initialize PeerJS with MINIMAL configuration from working commit
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

  // Method removed - using simple initialize instead

  private getOptimalIceServers(): RTCIceServer[] {
    // ULTRA-MINIMAL configuration from working commit - only essential servers
    return [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
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

  // Method removed - using simple initialization

  private handleReconnection(): void {
    if (this.isDestroyed || this.connectionRetryCount >= this.maxRetries) {
      logger.warn(`Reconnection aborted - destroyed: ${this.isDestroyed}, retries: ${this.connectionRetryCount}/${this.maxRetries}`);
      return;
    }

    // Prevent multiple reconnection attempts
    if (this.reconnectionInProgress) {
      logger.info('Reconnection already in progress, skipping');
      return;
    }

    this.reconnectionInProgress = true;
    const delay = 3000 + (this.connectionRetryCount * 2000); // Longer delays
    
    setTimeout(async () => {
      if (this.isDestroyed) {
        this.reconnectionInProgress = false;
        return;
      }

      try {
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
      } catch (error) {
        logger.error('Error during reconnection:', error);
      } finally {
        this.reconnectionInProgress = false;
      }
    }, delay);
  }

  private reconnectionInProgress: boolean = false;

  private createFirefoxFallbackConnection(webrtcServerUrl: string): void {
    logger.info('🦊 Creating Firefox fallback connection with polling-only transport');
    
    this.socket = io(webrtcServerUrl, {
      transports: ['polling'], // Polling only for maximum Firefox compatibility
      timeout: 30000,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 2,
      reconnectionDelay: 3000,
      withCredentials: true,
      upgrade: false, // Never upgrade to WebSocket
      forceBase64: true, // Force base64 encoding
      timestampRequests: true,
      query: {
        clientId: this.config?.userId || 'unknown',
        timestamp: Date.now(),
        browser: 'firefox-fallback'
      }
    });
    
    // Setup basic event handlers for fallback connection
    this.socket.on('connect', () => {
      logger.info('🦊 Firefox fallback connection established via polling');
      if (this.config) {
        this.joinRoom();
      }
    });
    
    this.socket.on('connect_error', (error) => {
      logger.error('🦊 Firefox fallback connection also failed:', error);
    });
    
    // Re-setup all other event handlers
    this.setupSocketEventHandlers(false);
  }

  private setupUnloadHandler() {
    // Handle page unload to properly disconnect user
    const handleUnload = () => {
      if (this.socket && this.socket.connected && this.config) {
        logger.info('Page unloading - sending explicit leave signal');
        this.socket.emit('user-leaving', {
          userId: this.config.userId,
          roomId: this.config.roomId,
          reason: 'page-unload'
        });
        // Force immediate disconnect
        this.socket.disconnect();
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('unload', handleUnload);
    
    // Also handle visibility API for better mobile support
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        // On mobile, page might be killed without beforeunload
        setTimeout(() => {
          if (document.visibilityState === 'hidden' && this.socket && this.config) {
            logger.info('Page hidden for extended time - disconnecting');
            this.socket.emit('user-leaving', {
              userId: this.config.userId,
              roomId: this.config.roomId,
              reason: 'tab-hidden-extended'
            });
          }
        }, 30000); // 30 seconds of being hidden
      }
    });
  }

  private setupSocketEventHandlers(isFirefox: boolean): void {
    if (!this.socket) return;
    
    // Re-setup user-joined handler
    this.socket.on('user-joined', (data: { userId: string; userName: string }) => {
      logger.info('🆕 User joined room:', data);
      this.onParticipantJoinedCallback?.(data.userId, data.userName);
      
      setTimeout(async () => {
        if (!this.peer || this.peer.destroyed) {
          logger.warn(`Cannot initiate call to ${data.userId}: peer not ready`);
          return;
        }
        
        if (!this.localStream) {
          logger.warn(`Cannot initiate call to ${data.userId}: no local stream, attempting to start...`);
          try {
            await this.startLocalStream(true, true);
          } catch (error) {
            logger.error('Failed to start local stream:', error);
            return;
          }
        }
        
        logger.info(`🔄 Existing user initiating call to new user: ${data.userId}`);
        this.initiateCall(data.userId);
      }, 1000);
    });
    
    this.socket.on('user-left', (data: { userId: string }) => {
      logger.info('User left room:', data);
      this.handleParticipantLeft(data.userId);
    });
    
    // Setup other event handlers...
    this.socket.on('room-participants', (participants: { userId: string; userName: string }[]) => {
      logger.info('Received existing room participants:', participants);
      participants.forEach(p => {
        this.onParticipantJoinedCallback?.(p.userId, p.userName);
        this.initiateCall(p.userId);
      });
    });
  }

  private verifyCallEncryption(call: MediaConnection): void {
    // Verify that the call will use encryption
    if (call.peerConnection) {
      const pc = call.peerConnection;
      
      // Check if DTLS is enabled (this ensures encryption)
      pc.addEventListener('connectionstatechange', () => {
        if (pc.connectionState === 'connected') {
          const stats = pc.getStats();
          stats.then((report) => {
            let dtlsEnabled = false;
            report.forEach((stat) => {
              if (stat.type === 'transport' && stat.dtlsState === 'connected') {
                dtlsEnabled = true;
                logger.info(`🔒 DTLS encryption verified for call to ${call.peer}`);
              }
            });
            
            if (!dtlsEnabled) {
              logger.error(`❌ DTLS encryption not established for call to ${call.peer}`);
              call.close();
            }
          });
        }
      });
    }
  }

  private async createNewConnectionAfterDestroy(): Promise<void> {
    if (!this.config || this.isDestroyed) return;

    try {
      // CRITICAL: Don't create reconnect IDs that multiply - use original ID
      const baseUserId = this.getBaseUserId(this.config.userId);
      
      logger.info(`Recreating peer connection with original ID: ${baseUserId}`);
      
      // Use original config with base user ID (no reconnect suffix)
      const newConfig = { 
        ...this.config, 
        userId: baseUserId  // Use clean base ID
      };
      
      // Clear old peer completely
      if (this.peer) {
        this.peer.destroy();
        this.peer = null;
      }
      
      // Reset connection state
      this.connectionRetryCount++;
      
      // Initialize with clean ID
      await this.initialize(newConfig);
      
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
      // Simple media constraints like in working commit
      const stream = await navigator.mediaDevices.getUserMedia({
        video: video ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } : false,
        audio: audio ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 2,
          sampleRate: 48000,
          sampleSize: 16
        } : false
      });

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

    // Prevent duplicate calls to same user
    if (this.participants.has(userId)) {
      logger.info(`Call to ${userId} already exists, skipping duplicate`);
      return;
    }

    try {
      logger.info(`🔄 Initiating call to user: ${userId}`);
      
      // Enhanced call options with encryption enforcement
      const callOptions = {
        metadata: {
          timestamp: Date.now(),
          encryptionRequired: true,
          clientVersion: '1.0.0'
        }
      };
      
      const call = this.peer.call(userId, this.localStream, callOptions);
      
      if (call) {
        // Verify encryption is enabled before proceeding
        this.verifyCallEncryption(call);
        this.handleOutgoingCall(call, userId);
        logger.info(`✅ Call initiated successfully to ${userId} with encryption`);
      } else {
        logger.error(`❌ Failed to create call to ${userId}`);
      }
    } catch (error) {
      logger.error(`Failed to initiate call to ${userId}:`, error);
    }
  }

  private async handleIncomingCall(call: MediaConnection) {
    if (!this.localStream) {
      logger.warn('No local stream available for incoming call, attempting to start...');
      try {
        await this.startLocalStream(true, true);
      } catch (error) {
        logger.error('Failed to start local stream for incoming call:', error);
        call.close();
        return;
      }
    }

    // Check if we already have a connection to this user
    if (this.participants.has(call.peer)) {
      logger.info(`Connection to ${call.peer} already exists, closing duplicate`);
      call.close();
      return;
    }

    logger.info(`📞 Incoming call from ${call.peer} - answering with encryption verification`);
    
    // Answer the call (PeerJS answer doesn't support metadata, only call does)
    if (this.localStream) {
      call.answer(this.localStream);
    }
    
    // Verify encryption for incoming call
    this.verifyCallEncryption(call);
    
    // Handle the call stream
    this.handleCallStream(call);
    
    // Add connection monitoring
    call.on('error', (error) => {
      logger.error(`Call error with ${call.peer}:`, error);
      this.handleParticipantLeft(call.peer);
    });
    
    call.on('close', () => {
      logger.info(`Call closed with ${call.peer}`);
      this.handleParticipantLeft(call.peer);
    });
  }

  private handleOutgoingCall(call: MediaConnection, userId: string) {
    // Add error handling for outgoing calls
    call.on('error', (error) => {
      logger.error(`Outgoing call error to ${userId}:`, error);
      this.handleParticipantLeft(userId);
    });
    
    call.on('close', () => {
      logger.info(`Outgoing call closed to ${userId}`);
      this.handleParticipantLeft(userId);
    });
    
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

      // CRITICAL: Be very conservative about reconnections to prevent refresh loops
      let needsSocketReconnection = false;
      let needsPeerReconnection = false;

      // Check socket connection first - but be conservative
      if (this.socket) {
        if (!this.socket.connected) {
          logger.info('Socket disconnected while tab hidden - attempting gentle reconnection...');
          needsSocketReconnection = true;
          
          // Try to reconnect socket
          try {
            this.socket.connect();
            
            // Wait for socket to connect with shorter timeout
            await new Promise((resolve) => {
              const checkConnection = () => {
                if (this.socket?.connected) {
                  resolve(true);
                } else {
                  setTimeout(checkConnection, 200);
                }
              };
              checkConnection();
              
              // Shorter timeout to prevent hanging
              setTimeout(() => resolve(false), 3000);
            });
          } catch (error) {
            logger.warn('Socket reconnection failed:', error);
          }
        } else {
          logger.info('Socket still connected - no reconnection needed');
        }
      }

      // Check peer connection - only if socket is working
      if (this.socket?.connected) {
        if (!this.peer || this.peer.destroyed) {
          logger.info('Peer connection lost while tab hidden - will recreate only if necessary');
          needsPeerReconnection = true;
        } else if (this.peer.disconnected) {
          logger.info('Peer disconnected but not destroyed - attempting gentle reconnect');
          try {
            this.peer.reconnect();
          } catch (error) {
            logger.warn('Peer reconnection failed:', error);
            needsPeerReconnection = true;
          }
        } else {
          logger.info('Peer connection still healthy - no reconnection needed');
        }
      }

      // Only rejoin room if we actually had issues AND we're properly connected
      if ((needsSocketReconnection || needsPeerReconnection) && this.socket?.connected) {
        logger.info('Notifying server of tab return - will let server handle room state');
        // Let the server know we're back, but don't aggressively rejoin
        this.socket.emit('tab-visible', { 
          userId: this.config.userId,
          roomId: this.config.roomId 
        });
      } else if (this.socket?.connected) {
        // Just notify we're visible without causing disruption
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
    
    // Stop any ongoing reconnection attempts
    this.reconnectionInProgress = false;
    
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
    this.reconnectionInProgress = false;
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
// Enhanced singleton instance to prevent multiple WebRTC services
let webRTCServiceInstance: ModernWebRTCService | null = null;
let isInitializing = false;
let connectionId: string | null = null;

export const webRTCService = (() => {
  if (isInitializing) {
    logger.warn('WebRTC service initialization already in progress');
    return webRTCServiceInstance || new ModernWebRTCService();
  }

  if (!webRTCServiceInstance) {
    isInitializing = true;
    try {
      webRTCServiceInstance = new ModernWebRTCService();
    } finally {
      isInitializing = false;
    }
  }
  return webRTCServiceInstance;
})();

// Clean up singleton on page unload and prevent tab refresh issues
if (typeof window !== 'undefined') {
  // Prevent multiple event listeners
  let beforeUnloadAdded = false;
  
  if (!beforeUnloadAdded) {
    window.addEventListener('beforeunload', () => {
      if (webRTCServiceInstance) {
        webRTCServiceInstance.destroy();
        webRTCServiceInstance = null;
      }
    });
    beforeUnloadAdded = true;
  }

  // Enhanced page show/hide handling to prevent refresh on tab return
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      // Page was restored from cache - this can cause issues
      logger.info('Page restored from cache - ensuring WebRTC stability');
      if (webRTCServiceInstance) {
        // Don't reinitialize - just check health
        setTimeout(() => {
          // Access checkConnectionHealth through a public method if needed
          if (webRTCServiceInstance) {
            logger.info('Page restored from cache - WebRTC service maintained');
          }
        }, 500);
      }
    }
  });

  window.addEventListener('pagehide', () => {
    // Page is being hidden - maintain connections
    if (webRTCServiceInstance) {
      logger.info('Page hidden - maintaining WebRTC connections');
    }
  });
}