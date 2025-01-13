import React, { useState, useEffect } from 'react';
import { Activity, Wifi, WifiOff } from 'lucide-react';

interface WebRTCStatsProps {
  peer: RTCPeerConnection | null;
}

export default function WebRTCStats({ peer }: WebRTCStatsProps) {
  const [stats, setStats] = useState<{
    connectionState: RTCPeerConnectionState;
    bytesReceived: number;
    bytesSent: number;
    packetsLost: number;
    roundTripTime: number;
    bandwidth: number;
  }>({
    connectionState: 'new',
    bytesReceived: 0,
    bytesSent: 0,
    packetsLost: 0,
    roundTripTime: 0,
    bandwidth: 0
  });

  useEffect(() => {
    if (!peer) return;

    let intervalId: number;

    const getStats = async () => {
      try {
        const stats = await peer.getStats();
        let totalBytesReceived = 0;
        let totalBytesSent = 0;
        let totalPacketsLost = 0;
        let roundTripTime = 0;
        let bandwidth = 0;

        stats.forEach(report => {
          if (report.type === 'inbound-rtp') {
            totalBytesReceived += report.bytesReceived || 0;
            totalPacketsLost += report.packetsLost || 0;
          } else if (report.type === 'outbound-rtp') {
            totalBytesSent += report.bytesSent || 0;
          } else if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            roundTripTime = report.currentRoundTripTime || 0;
            bandwidth = report.availableOutgoingBitrate || 0;
          }
        });

        setStats({
          connectionState: peer.connectionState,
          bytesReceived: totalBytesReceived,
          bytesSent: totalBytesSent,
          packetsLost: totalPacketsLost,
          roundTripTime: roundTripTime * 1000, // Convert to ms
          bandwidth: Math.round(bandwidth / 1024) // Convert to Kbps
        });
      } catch (error) {
        console.error('Error getting WebRTC stats:', error);
      }
    };

    intervalId = window.setInterval(getStats, 1000);
    return () => clearInterval(intervalId);
  }, [peer]);

  return (
    <div className="absolute top-4 right-4 bg-black/50 rounded-lg p-3 text-white text-sm">
      <div className="flex items-center gap-2 mb-2">
        {stats.connectionState === 'connected' ? (
          <Wifi className="text-emerald-400" size={16} />
        ) : (
          <WifiOff className="text-red-400" size={16} />
        )}
        <span className="capitalize">{stats.connectionState}</span>
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-blue-400" />
          <span>{Math.round(stats.roundTripTime)}ms</span>
        </div>
        <div className="text-xs opacity-75">
          ↓ {Math.round(stats.bytesReceived / 1024)}KB
        </div>
        <div className="text-xs opacity-75">
          ↑ {Math.round(stats.bytesSent / 1024)}KB
        </div>
        {stats.bandwidth > 0 && (
          <div className="text-xs opacity-75">
            {stats.bandwidth}Kbps
          </div>
        )}
        {stats.packetsLost > 0 && (
          <div className="text-xs text-red-400">
            Lost: {stats.packetsLost} packets
          </div>
        )}
      </div>
    </div>
  );
}
