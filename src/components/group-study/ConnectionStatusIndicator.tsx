import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Eye, EyeOff, Activity, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useWebRTCConnectionMonitor } from '../../services/webrtc-connection-monitor';
import { useTabSwitchProtection } from '../../hooks/useTabVisibility';

interface ConnectionStatusIndicatorProps {
  isConnected: boolean;
  className?: string;
}

export default function ConnectionStatusIndicator({ isConnected, className = '' }: ConnectionStatusIndicatorProps) {
  const { getConnectionStatus, onConnectionHealthChange } = useWebRTCConnectionMonitor();
  const { isVisible, isHidden, timeHidden, isTabSwitchInProgress } = useTabSwitchProtection();
  
  const [healthStatus, setHealthStatus] = useState({
    isHealthy: true,
    healthyConnections: 0,
    totalConnections: 0,
    reconnectionAttempts: 0,
    isReconnecting: false
  });

  useEffect(() => {
    const unsubscribe = onConnectionHealthChange((status) => {
      setHealthStatus(status);
    });

    return unsubscribe;
  }, [onConnectionHealthChange]);

  const getStatusIcon = () => {
    if (!isConnected) {
      return <WifiOff className="w-4 h-4 text-red-500" />;
    }
    
    if (healthStatus.isReconnecting) {
      return <Clock className="w-4 h-4 text-yellow-500 animate-spin" />;
    }
    
    if (isTabSwitchInProgress) {
      return <Eye className="w-4 h-4 text-blue-500 animate-pulse" />;
    }
    
    if (!healthStatus.isHealthy) {
      return <AlertTriangle className="w-4 h-4 text-orange-500" />;
    }
    
    return <CheckCircle className="w-4 h-4 text-green-500" />;
  };

  const getStatusText = () => {
    if (!isConnected) {
      return 'Disconnected';
    }
    
    if (healthStatus.isReconnecting) {
      return `Reconnecting... (${healthStatus.reconnectionAttempts}/5)`;
    }
    
    if (isTabSwitchInProgress) {
      return 'Tab switching protection active';
    }
    
    if (!healthStatus.isHealthy && healthStatus.totalConnections > 0) {
      return `Connection issues (${healthStatus.healthyConnections}/${healthStatus.totalConnections} healthy)`;
    }
    
    if (healthStatus.totalConnections > 0) {
      return `Connected (${healthStatus.totalConnections} peers)`;
    }
    
    return getConnectionStatus();
  };

  const getStatusColor = () => {
    if (!isConnected) return 'text-red-600 bg-red-50 border-red-200';
    if (healthStatus.isReconnecting) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (isTabSwitchInProgress) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (!healthStatus.isHealthy) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const formatTimeHidden = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    return `${Math.round(ms / 60000)}m`;
  };

  return (
    <div className={`rounded-lg border p-3 ${getStatusColor()} ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        {getStatusIcon()}
        <span className="font-medium text-sm">{getStatusText()}</span>
      </div>
      
      {/* Detailed status information */}
      <div className="text-xs space-y-1 opacity-75">
        <div className="flex items-center gap-2">
          {isVisible ? (
            <Eye className="w-3 h-3" />
          ) : (
            <EyeOff className="w-3 h-3" />
          )}
          <span>
            Tab {isVisible ? 'visible' : 'hidden'}
            {isHidden && timeHidden > 0 && ` for ${formatTimeHidden(timeHidden)}`}
          </span>
        </div>
        
        {isConnected && (
          <div className="flex items-center gap-2">
            <Activity className="w-3 h-3" />
            <span>
              Heartbeat monitoring active
            </span>
          </div>
        )}
        
        {healthStatus.reconnectionAttempts > 0 && (
          <div className="text-yellow-600">
            Reconnection attempts: {healthStatus.reconnectionAttempts}/5
          </div>
        )}
      </div>
    </div>
  );
}

// Optional: Compact version for smaller spaces
export function CompactConnectionStatus({ isConnected }: { isConnected: boolean }) {
  const { isVisible, isTabSwitchInProgress } = useTabSwitchProtection();
  const [healthStatus, setHealthStatus] = useState({ isHealthy: true, isReconnecting: false });
  const { onConnectionHealthChange } = useWebRTCConnectionMonitor();

  useEffect(() => {
    const unsubscribe = onConnectionHealthChange((status) => {
      setHealthStatus({ isHealthy: status.isHealthy, isReconnecting: status.isReconnecting });
    });
    return unsubscribe;
  }, [onConnectionHealthChange]);

  const getIcon = () => {
    if (!isConnected) return <WifiOff className="w-4 h-4 text-red-500" />;
    if (healthStatus.isReconnecting) return <Clock className="w-4 h-4 text-yellow-500 animate-spin" />;
    if (isTabSwitchInProgress) return <Eye className="w-4 h-4 text-blue-500" />;
    if (!healthStatus.isHealthy) return <AlertTriangle className="w-4 h-4 text-orange-500" />;
    return <Wifi className="w-4 h-4 text-green-500" />;
  };

  return (
    <div className="flex items-center gap-1">
      {getIcon()}
      {!isVisible && <EyeOff className="w-3 h-3 text-gray-400" />}
    </div>
  );
}