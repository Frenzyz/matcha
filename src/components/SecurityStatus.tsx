import React, { useState, useEffect } from 'react';
import { Shield, ShieldCheck, ShieldAlert, Lock, Unlock, AlertTriangle } from 'lucide-react';
import { webRTCService, SecurityMetrics } from '../services/modernWebRTC';
import { logger } from '../utils/logger';

interface SecurityStatusProps {
  isVisible?: boolean;
  compact?: boolean;
}

export default function SecurityStatus({ isVisible = true, compact = false }: SecurityStatusProps) {
  const [securityMetrics, setSecurityMetrics] = useState<SecurityMetrics | null>(null);
  const [encryptionActive, setEncryptionActive] = useState<boolean>(false);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  useEffect(() => {
    const updateSecurityStatus = () => {
      const metrics = webRTCService.getSecurityMetrics();
      const encryption = webRTCService.isEncryptionActive();
      
      setSecurityMetrics(metrics);
      setEncryptionActive(encryption);
      setLastUpdate(Date.now());
      
      // Log security status for debugging
      if (metrics) {
        logger.debug('Security Status Update:', {
          encryption: encryption ? '✅ ACTIVE' : '❌ INACTIVE',
          dtls: metrics.dtlsState,
          connection: metrics.connectionState,
          ice: metrics.iceConnectionState
        });
      }
    };

    // Initial update
    updateSecurityStatus();

    // Update every 10 seconds
    const interval = setInterval(updateSecurityStatus, 10000);

    return () => clearInterval(interval);
  }, []);

  if (!isVisible || !securityMetrics) {
    return null;
  }

  const getSecurityLevel = (): 'secure' | 'warning' | 'error' => {
    if (!securityMetrics) return 'error';
    
    if (encryptionActive && 
        securityMetrics.dtlsState === 'connected' && 
        securityMetrics.connectionState === 'connected') {
      return 'secure';
    }
    
    if (securityMetrics.connectionState === 'connecting' || 
        securityMetrics.dtlsState === 'connecting') {
      return 'warning';
    }
    
    return 'error';
  };

  const securityLevel = getSecurityLevel();

  const getSecurityIcon = () => {
    switch (securityLevel) {
      case 'secure':
        return <ShieldCheck className="text-emerald-500" size={compact ? 16 : 20} />;
      case 'warning':
        return <ShieldAlert className="text-yellow-500" size={compact ? 16 : 20} />;
      case 'error':
        return <Shield className="text-red-500" size={compact ? 16 : 20} />;
    }
  };

  const getEncryptionIcon = () => {
    return encryptionActive 
      ? <Lock className="text-emerald-500" size={compact ? 14 : 16} />
      : <Unlock className="text-red-500" size={compact ? 14 : 16} />;
  };

  const getSecurityText = () => {
    switch (securityLevel) {
      case 'secure':
        return 'Secure Connection';
      case 'warning':
        return 'Establishing Security';
      case 'error':
        return 'Security Warning';
    }
  };

  const getBadgeColor = () => {
    switch (securityLevel) {
      case 'secure':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-medium ${getBadgeColor()}`}>
        {getSecurityIcon()}
        <span>{encryptionActive ? 'Encrypted' : 'Not Encrypted'}</span>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {getSecurityIcon()}
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Connection Security
          </h3>
        </div>
        <div className={`px-2 py-1 rounded-full border text-xs font-medium ${getBadgeColor()}`}>
          {getSecurityText()}
        </div>
      </div>

      <div className="space-y-3">
        {/* Encryption Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getEncryptionIcon()}
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Encryption
            </span>
          </div>
          <span className={`text-sm font-semibold ${
            encryptionActive ? 'text-emerald-600' : 'text-red-600'
          }`}>
            {encryptionActive ? 'ACTIVE' : 'INACTIVE'}
          </span>
        </div>

        {/* DTLS Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            DTLS State
          </span>
          <span className={`text-sm font-medium ${
            securityMetrics.dtlsState === 'connected' ? 'text-emerald-600' : 
            securityMetrics.dtlsState === 'connecting' ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {securityMetrics.dtlsState.toUpperCase()}
          </span>
        </div>

        {/* Connection State */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Connection
          </span>
          <span className={`text-sm font-medium ${
            securityMetrics.connectionState === 'connected' ? 'text-emerald-600' : 
            securityMetrics.connectionState === 'connecting' ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {securityMetrics.connectionState.toUpperCase()}
          </span>
        </div>

        {/* ICE Connection State */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            ICE State
          </span>
          <span className={`text-sm font-medium ${
            securityMetrics.iceConnectionState === 'connected' ? 'text-emerald-600' : 
            securityMetrics.iceConnectionState === 'connecting' ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {securityMetrics.iceConnectionState.toUpperCase()}
          </span>
        </div>

        {/* Certificate Fingerprint */}
        {securityMetrics.certificateFingerprint && (
          <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
            <div className="flex items-center gap-1 mb-1">
              <Shield size={14} className="text-gray-500" />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Certificate Fingerprint
              </span>
            </div>
            <code className="text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
              {securityMetrics.certificateFingerprint.substring(0, 32)}...
            </code>
          </div>
        )}

        {/* Last Security Check */}
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2">
          Last checked: {new Date(securityMetrics.lastSecurityCheck).toLocaleTimeString()}
        </div>

        {/* Security Warnings */}
        {!encryptionActive && (
          <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-500" />
              <span className="text-sm font-medium text-red-700 dark:text-red-300">
                Connection Not Encrypted
              </span>
            </div>
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              Your connection may not be secure. Please check your network settings.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Export compact version for use in other components
export function SecurityBadge({ className = '' }: { className?: string }) {
  return (
    <div className={className}>
      <SecurityStatus isVisible={true} compact={true} />
    </div>
  );
}