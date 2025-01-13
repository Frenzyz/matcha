import { useState, useEffect, useRef, useCallback } from 'react';
import Peer from 'simple-peer';
import { io, Socket } from 'socket.io-client';
import { logger } from '../utils/logger';

interface WebRTCState {
  stream: MediaStream | null;
  peers: Record<string, Peer.Instance>;
  videoEnabled: boolean;
  audioEnabled: boolean;
  error: string | null;
}

export function useWebRTC(roomId: string, userId: string | undefined) {
  const [state, setState] = useState<WebRTCState>({
    stream: null,
    peers: {},
    videoEnabled: false,
    audioEnabled: false,
    error: null
  });
  
  const socketRef = useRef<Socket>();
  const peersRef = useRef<Record<string, Peer.Instance>>({});
  const streamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  const createPeer = useCallback((targetId: string, initiator: boolean = true, stream?: MediaStream) => {
    try {
      const peer = new Peer({
        initiator,
        stream,
        trickle: false,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            {
              urls: 'turn:a.relay.metered.ca:80',
              username: 'e899095c1c3f852c4f9e1709',
              credential: 'kEw+YXezTQxhK5//'
            }
          ]
        }
      });

      peer.on('signal', signal => {
        socketRef.current?.emit('signal', { to: targetId, signal });
      });

      peer.on('stream', remoteStream => {
        const video = document.getElementById(`video-${targetId}`) as HTMLVideoElement;
        if (video) {
          video.srcObject = remoteStream;
          video.play().catch(logger.error);
        }
      });

      peer.on('error', err => {
        logger.error('Peer connection error:', err);
        setState(prev => ({ ...prev, error: err.message }));
      });

      peer.on('close', () => {
        delete peersRef.current[targetId];
        setState(prev => {
          const newPeers = { ...prev.peers };
          delete newPeers[targetId];
          return { ...prev, peers: newPeers };
        });
      });

      return peer;
    } catch (error) {
      logger.error('Error creating peer:', error);
      return null;
    }
  }, []);

  const startMedia = useCallback(async (withVideo: boolean, withAudio: boolean) => {
    try {
      setState(prev => ({ ...prev, error: null }));

      const constraints = {
        video: withVideo ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } : false,
        audio: withAudio ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } : false
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = mediaStream;
        try {
          await localVideoRef.current.play();
        } catch (error) {
          logger.error('Error playing local video:', error);
        }
      }

      streamRef.current = mediaStream;
      setState(prev => ({
        ...prev,
        stream: mediaStream,
        videoEnabled: withVideo,
        audioEnabled: withAudio
      }));

      return mediaStream;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to access media devices';
      logger.error('Error accessing media devices:', error);
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (!streamRef.current) return;

    const videoTracks = streamRef.current.getVideoTracks();
    videoTracks.forEach(track => {
      track.enabled = !track.enabled;
    });

    setState(prev => ({ ...prev, videoEnabled: !prev.videoEnabled }));
  }, []);

  const toggleAudio = useCallback(() => {
    if (!streamRef.current) return;

    const audioTracks = streamRef.current.getAudioTracks();
    audioTracks.forEach(track => {
      track.enabled = !track.enabled;
    });

    setState(prev => ({ ...prev, audioEnabled: !prev.audioEnabled }));
  }, []);

  useEffect(() => {
    socketRef.current = io('/', {
      path: '/socket.io'
    });

    socketRef.current.on('connect', () => {
      socketRef.current?.emit('join-room', roomId);
    });

    socketRef.current.on('peers', (peers: string[]) => {
      peers.forEach(peerId => {
        const peer = createPeer(peerId, true, streamRef.current);
        if (peer) {
          peersRef.current[peerId] = peer;
          setState(prev => ({
            ...prev,
            peers: { ...prev.peers, [peerId]: peer }
          }));
        }
      });
    });

    socketRef.current.on('user-joined', (userId: string) => {
      const peer = createPeer(userId, false, streamRef.current);
      if (peer) {
        peersRef.current[userId] = peer;
        setState(prev => ({
          ...prev,
          peers: { ...prev.peers, [userId]: peer }
        }));
      }
    });

    socketRef.current.on('user-left', (userId: string) => {
      if (peersRef.current[userId]) {
        peersRef.current[userId].destroy();
        delete peersRef.current[userId];
        setState(prev => {
          const newPeers = { ...prev.peers };
          delete newPeers[userId];
          return { ...prev, peers: newPeers };
        });
      }
    });

    socketRef.current.on('signal', ({ from, signal }) => {
      if (peersRef.current[from]) {
        peersRef.current[from].signal(signal);
      }
    });

    return () => {
      Object.values(peersRef.current).forEach(peer => peer.destroy());
      socketRef.current?.disconnect();
    };
  }, [roomId, createPeer]);

  return {
    ...state,
    localVideoRef,
    startMedia,
    toggleVideo,
    toggleAudio
  };
}
