import { logger } from '../utils/logger';
import { useTabVisibility } from '../hooks/useTabVisibility';

export interface ConnectionHealthStatus {
  isHealthy: boolean;
  healthyConnections: number;
  totalConnections: number;
  lastCheck: number;
  reconnectionAttempts: number;
  isReconnecting: boolean;
}

export class WebRTCConnectionMonitor {
  private static instance: WebRTCConnectionMonitor;
  private monitorInterval: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  
  // Connection state tracking
  private connectionHealthCallbacks: Set<(status: ConnectionHealthStatus) => void> = new Set();
  private reconnectionAttempts = 0;
  private maxReconnectionAttempts = 5;
  private isReconnecting = false;
  private lastHealthCheck = 0;
  
  // Heartbeat tracking
  private heartbeatChannels: Map<string, RTCDataChannel> = new Map();
  private lastHeartbeatSent = 0;
  private lastHeartbeatReceived: Map<string, number> = new Map();
  private heartbeatTimeout = 30000; // 30 seconds
  
  // Tab visibility integration
  private isTabHidden = false;
  private tabVisibilityCleanup: (() => void) | null = null;

  static getInstance(): WebRTCConnectionMonitor {
    if (!WebRTCConnectionMonitor.instance) {
      WebRTCConnectionMonitor.instance = new WebRTCConnectionMonitor();
    }
    return WebRTCConnectionMonitor.instance;
  }

  constructor() {
    this.setupTabVisibilityMonitoring();
    this.setupBeforeUnloadHandler();
  }

  // ===== PUBLIC API =====

  startMonitoring(participants: Map<string, any>, checkInterval = 10000): void {
    logger.info('🔍 Starting WebRTC connection monitoring');
    
    this.stopMonitoring(); // Clean up any existing monitoring
    
    this.monitorInterval = setInterval(() => {
      this.checkConnectionHealth(participants);
    }, checkInterval);

    // Start heartbeat mechanism
    this.startHeartbeat(participants);
  }

  stopMonitoring(): void {
    logger.info('⏹️ Stopping WebRTC connection monitoring');
    
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    
    this.stopHeartbeat();
    this.clearReconnectTimeout();
  }

  onConnectionHealthChange(callback: (status: ConnectionHealthStatus) => void): () => void {
    this.connectionHealthCallbacks.add(callback);
    return () => this.connectionHealthCallbacks.delete(callback);
  }

  setupHeartbeatForPeer(peerId: string, connection: RTCPeerConnection): void {
    try {
      // Create heartbeat data channel
      const channel = connection.createDataChannel('heartbeat', {
        ordered: true,
        maxRetransmits: 3
      });

      channel.onopen = () => {
        logger.debug(`💓 Heartbeat channel opened with ${peerId}`);
        this.heartbeatChannels.set(peerId, channel);
      };

      channel.onmessage = (event) => {
        this.handleHeartbeatMessage(peerId, event.data);
      };

      channel.onerror = (error) => {
        logger.warn(`💔 Heartbeat channel error with ${peerId}:`, error);
      };

      channel.onclose = () => {
        logger.debug(`💔 Heartbeat channel closed with ${peerId}`);
        this.heartbeatChannels.delete(peerId);
        this.lastHeartbeatReceived.delete(peerId);
      };

      // Also listen for incoming data channels
      connection.ondatachannel = (event) => {
        const receivedChannel = event.channel;
        if (receivedChannel.label === 'heartbeat') {
          receivedChannel.onmessage = (event) => {
            this.handleHeartbeatMessage(peerId, event.data);
          };
        }
      };

    } catch (error) {
      logger.error(`Failed to setup heartbeat for ${peerId}:`, error);
    }
  }

  handlePeerDisconnection(peerId: string): void {
    this.heartbeatChannels.delete(peerId);
    this.lastHeartbeatReceived.delete(peerId);
    logger.info(`🔌 Peer ${peerId} disconnected, cleaned up monitoring`);
  }

  // ===== PRIVATE METHODS =====

  private setupTabVisibilityMonitoring(): void {
    const handleVisibilityChange = () => {
      const wasHidden = this.isTabHidden;
      this.isTabHidden = document.hidden;
      
      if (this.isTabHidden && !wasHidden) {
        logger.info('🙈 Tab hidden - maintaining connections with enhanced heartbeat');
        this.handleTabHidden();
      } else if (!this.isTabHidden && wasHidden) {
        logger.info('👁️ Tab visible - checking connection health');
        this.handleTabVisible();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    this.tabVisibilityCleanup = () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }

  private setupBeforeUnloadHandler(): void {
    window.addEventListener('beforeunload', () => {
      this.sendGracefulDisconnect();
    });
  }

  private handleTabHidden(): void {
    // Increase heartbeat frequency when tab is hidden
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Send heartbeats more frequently (every 5 seconds instead of 10)
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 5000);
  }

  private handleTabVisible(): void {
    // Reset normal heartbeat frequency
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 10000);

    // Check connection health after tab becomes visible
    setTimeout(() => {
      // Will trigger in next monitoring cycle
      this.lastHealthCheck = 0;
    }, 1000);
  }

  private checkConnectionHealth(participants: Map<string, any>): void {
    const now = Date.now();
    this.lastHealthCheck = now;

    let healthyConnections = 0;
    const totalConnections = participants.size;

    participants.forEach((participant, peerId) => {
      if (participant.connection) {
        const connectionState = participant.connection.connectionState;
        const iceState = participant.connection.iceConnectionState;

        // Check connection states
        if (connectionState === 'connected' && iceState === 'connected') {
          // Check heartbeat freshness
          const lastHeartbeat = this.lastHeartbeatReceived.get(peerId) || 0;
          const timeSinceHeartbeat = now - lastHeartbeat;
          
          if (timeSinceHeartbeat < this.heartbeatTimeout) {
            healthyConnections++;
          } else {
            logger.warn(`💔 No heartbeat from ${peerId} for ${timeSinceHeartbeat}ms`);
            this.triggerReconnection(peerId, 'heartbeat_timeout');
          }
        } else if (connectionState === 'failed' || iceState === 'failed') {
          logger.warn(`💥 Connection to ${peerId} failed`);
          this.triggerReconnection(peerId, 'connection_failed');
        } else if (connectionState === 'disconnected' || iceState === 'disconnected') {
          // Give disconnected connections time to reconnect automatically
          setTimeout(() => {
            if (participant.connection?.connectionState === 'disconnected') {
              logger.warn(`🔄 Connection to ${peerId} still disconnected`);
              this.triggerReconnection(peerId, 'connection_disconnected');
            }
          }, 5000);
        }
      }
    });

    // Notify callbacks about connection health
    const status: ConnectionHealthStatus = {
      isHealthy: healthyConnections === totalConnections && totalConnections > 0,
      healthyConnections,
      totalConnections,
      lastCheck: now,
      reconnectionAttempts: this.reconnectionAttempts,
      isReconnecting: this.isReconnecting
    };

    this.connectionHealthCallbacks.forEach(callback => callback(status));

    logger.debug(`💓 Connection health: ${healthyConnections}/${totalConnections} healthy`);
  }

  private startHeartbeat(participants: Map<string, any>): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 10000); // Default 10 second interval

    logger.info('💓 Started heartbeat mechanism');
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    this.heartbeatChannels.clear();
    this.lastHeartbeatReceived.clear();
    logger.info('💔 Stopped heartbeat mechanism');
  }

  private sendHeartbeat(): void {
    const now = Date.now();
    this.lastHeartbeatSent = now;

    this.heartbeatChannels.forEach((channel, peerId) => {
      if (channel.readyState === 'open') {
        try {
          channel.send(JSON.stringify({
            type: 'heartbeat',
            timestamp: now,
            tabHidden: this.isTabHidden
          }));
        } catch (error) {
          logger.warn(`💔 Failed to send heartbeat to ${peerId}:`, error);
        }
      }
    });
  }

  private handleHeartbeatMessage(peerId: string, data: string): void {
    try {
      const message = JSON.parse(data);
      
      if (message.type === 'heartbeat') {
        this.lastHeartbeatReceived.set(peerId, Date.now());
        logger.debug(`💓 Heartbeat received from ${peerId}`);
        
        // Respond with heartbeat ack if we have a channel
        const channel = this.heartbeatChannels.get(peerId);
        if (channel && channel.readyState === 'open') {
          channel.send(JSON.stringify({
            type: 'heartbeat_ack',
            timestamp: Date.now()
          }));
        }
      } else if (message.type === 'heartbeat_ack') {
        logger.debug(`💓 Heartbeat ack from ${peerId}`);
      } else if (message.type === 'graceful_disconnect') {
        logger.info(`👋 Graceful disconnect from ${peerId}`);
        this.handlePeerDisconnection(peerId);
      }
    } catch (error) {
      logger.warn(`Failed to parse heartbeat message from ${peerId}:`, error);
    }
  }

  private triggerReconnection(peerId: string, reason: string): void {
    if (this.isReconnecting || this.reconnectionAttempts >= this.maxReconnectionAttempts) {
      return;
    }

    logger.warn(`🔄 Triggering reconnection to ${peerId}, reason: ${reason}`);
    
    this.isReconnecting = true;
    this.reconnectionAttempts++;

    // Clean up old connection data
    this.heartbeatChannels.delete(peerId);
    this.lastHeartbeatReceived.delete(peerId);

    // Use exponential backoff for reconnection delay
    const delay = Math.min(1000 * Math.pow(2, this.reconnectionAttempts - 1), 10000);
    
    this.reconnectTimeout = setTimeout(() => {
      this.attemptReconnection(peerId, reason);
    }, delay);
  }

  private async attemptReconnection(peerId: string, reason: string): Promise<void> {
    try {
      logger.info(`🔄 Attempting reconnection to ${peerId} (${reason})`);
      
      // This would need to be implemented by the calling service
      // For now, we'll emit an event that the service can listen to
      window.dispatchEvent(new CustomEvent('webrtc-reconnection-needed', {
        detail: { peerId, reason, attempts: this.reconnectionAttempts }
      }));

      // Reset reconnection state on success (this would be called by the service)
      // this.onReconnectionSuccess();

    } catch (error) {
      logger.error(`Failed to reconnect to ${peerId}:`, error);
    } finally {
      this.isReconnecting = false;
    }
  }

  private sendGracefulDisconnect(): void {
    logger.info('👋 Sending graceful disconnect to all peers');
    
    this.heartbeatChannels.forEach((channel, peerId) => {
      if (channel.readyState === 'open') {
        try {
          channel.send(JSON.stringify({
            type: 'graceful_disconnect',
            reason: 'tab_close_or_refresh',
            timestamp: Date.now()
          }));
        } catch (error) {
          logger.warn(`Failed to send graceful disconnect to ${peerId}:`, error);
        }
      }
    });
  }

  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  // ===== PUBLIC UTILITY METHODS =====

  onReconnectionSuccess(): void {
    this.reconnectionAttempts = 0;
    this.isReconnecting = false;
    logger.info('✅ Reconnection successful, reset attempt counter');
  }

  getConnectionStatus(): string {
    if (this.isReconnecting) {
      return `Reconnecting... (${this.reconnectionAttempts}/${this.maxReconnectionAttempts})`;
    }

    const totalChannels = this.heartbeatChannels.size;
    const activeChannels = Array.from(this.heartbeatChannels.values())
      .filter(channel => channel.readyState === 'open').length;

    return `Monitoring ${activeChannels}/${totalChannels} connections`;
  }

  cleanup(): void {
    this.stopMonitoring();
    this.connectionHealthCallbacks.clear();
    
    if (this.tabVisibilityCleanup) {
      this.tabVisibilityCleanup();
    }
  }
}

// React hook for easy integration
export function useWebRTCConnectionMonitor() {
  const monitor = WebRTCConnectionMonitor.getInstance();
  
  return {
    monitor,
    startMonitoring: monitor.startMonitoring.bind(monitor),
    stopMonitoring: monitor.stopMonitoring.bind(monitor),
    setupHeartbeatForPeer: monitor.setupHeartbeatForPeer.bind(monitor),
    onConnectionHealthChange: monitor.onConnectionHealthChange.bind(monitor),
    getConnectionStatus: monitor.getConnectionStatus.bind(monitor)
  };
}