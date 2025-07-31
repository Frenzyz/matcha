import React, { useEffect, useRef, useState } from 'react';
import { Video, VideoOff, Mic, MicOff, Share, StopCircle, Download, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { logger } from '../../utils/logger';
import RecordRTC from 'recordrtc';
import { easyRTCService, ParticipantStream } from '../../services/easyRTCService';

interface VideoCallProps {
  roomId: string;
  participants: string[];
}

export default function VideoCallEasyRTC({ roomId, participants }: VideoCallProps) {
  const { user } = useAuth();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [remoteParticipants, setRemoteParticipants] = useState<ParticipantStream[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<string>('Ready to connect');
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const recorderRef = useRef<RecordRTC | null>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  // Initialize EasyRTC service
  useEffect(() => {
    const setupEasyRTCService = async () => {
      if (!user) return;

      try {
        setIsJoiningRoom(true);
        setConnectionStatus('Connecting to EasyRTC...');

        // Setup event handlers
        easyRTCService.onStreamAdded((participant) => {
          logger.info('🎉 VideoCall: Stream added for participant:', participant.userId);
          setRemoteParticipants(prev => {
            const updated = prev.filter(p => p.userId !== participant.userId);
            return [...updated, participant];
          });
        });

        easyRTCService.onStreamRemoved((userId) => {
          logger.info('👋 VideoCall: Stream removed for participant:', userId);
          setRemoteParticipants(prev => prev.filter(p => p.userId !== userId));
        });

        easyRTCService.onParticipantJoined((userId, userName) => {
          logger.info('🆕 VideoCall: Participant joined:', { userId, userName });
          setConnectionStatus(`${userName} joined the room`);
        });

        easyRTCService.onParticipantLeft((userId) => {
          logger.info('👋 VideoCall: Participant left:', userId);
          setRemoteParticipants(prev => prev.filter(p => p.userId !== userId));
        });

        // Initialize EasyRTC
        const success = await easyRTCService.initialize({
          roomId,
          userId: user.id,
          userName: user.displayName || user.email.split('@')[0]
        });

        if (success) {
          setIsInitialized(true);
          setConnectionStatus('Connected to EasyRTC');
          logger.info('✅ VideoCall: EasyRTC initialized successfully');
        } else {
          throw new Error('Failed to initialize EasyRTC');
        }
      } catch (error) {
        logger.error('❌ VideoCall: Failed to setup EasyRTC:', error);
        setError(error instanceof Error ? error.message : 'Failed to connect to video call');
        setConnectionStatus('Connection failed');
      } finally {
        setIsJoiningRoom(false);
      }
    };

    setupEasyRTCService();

    // Cleanup on unmount
    return () => {
      logger.info('🧹 VideoCall: Cleaning up EasyRTC service');
      easyRTCService.destroy();
    };
  }, [user, roomId]);

  // Setup local video stream
  useEffect(() => {
    if (!isInitialized) return;

    const setupLocalVideo = async () => {
      try {
        setConnectionStatus('Starting camera...');
        const stream = await easyRTCService.startLocalStream(videoEnabled, audioEnabled);
        
        if (stream && localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          setLocalStream(stream);
          setConnectionStatus('Camera ready');
          logger.info('✅ VideoCall: Local video stream started');
        }
      } catch (error) {
        logger.error('❌ VideoCall: Failed to start local video:', error);
        setError('Failed to access camera/microphone');
      }
    };

    setupLocalVideo();
  }, [isInitialized, videoEnabled, audioEnabled]);

  // Update remote video elements when participants change
  useEffect(() => {
    remoteParticipants.forEach((participant) => {
      const videoElement = remoteVideoRefs.current.get(participant.userId);
      if (videoElement && participant.stream) {
        videoElement.srcObject = participant.stream;
        participant.videoElement = videoElement;
        logger.info(`📺 VideoCall: Updated video element for ${participant.userId}`);
      }
    });
  }, [remoteParticipants]);

  const toggleVideo = () => {
    const newVideoState = !videoEnabled;
    setVideoEnabled(newVideoState);
    easyRTCService.toggleVideo(newVideoState);
    logger.info(`🎥 VideoCall: Video ${newVideoState ? 'enabled' : 'disabled'}`);
  };

  const toggleAudio = () => {
    const newAudioState = !audioEnabled;
    setAudioEnabled(newAudioState);
    easyRTCService.toggleAudio(newAudioState);
    logger.info(`🎤 VideoCall: Audio ${newAudioState ? 'enabled' : 'disabled'}`);
  };

  const startScreenShare = async () => {
    try {
      setConnectionStatus('Starting screen share...');
      const stream = await easyRTCService.startScreenShare();
      
      if (stream && screenVideoRef.current) {
        screenVideoRef.current.srcObject = stream;
        setScreenStream(stream);
        setIsSharing(true);
        setConnectionStatus('Screen sharing active');
        logger.info('✅ VideoCall: Screen sharing started');
      }
    } catch (error) {
      logger.error('❌ VideoCall: Failed to start screen share:', error);
      setError('Failed to start screen sharing');
    }
  };

  const stopScreenShare = () => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
      setIsSharing(false);
      setConnectionStatus('Screen sharing stopped');
      
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = null;
      }
      
      logger.info('🛑 VideoCall: Screen sharing stopped');
    }
  };

  const startRecording = () => {
    if (!localStream) return;

    try {
      const recorder = new RecordRTC(localStream, {
        type: 'video',
        mimeType: 'video/webm',
        bitsPerSecond: 128000
      });

      recorder.startRecording();
      recorderRef.current = recorder;
      setIsRecording(true);
      setConnectionStatus('Recording started');
      logger.info('🔴 VideoCall: Recording started');
    } catch (error) {
      logger.error('❌ VideoCall: Failed to start recording:', error);
      setError('Failed to start recording');
    }
  };

  const stopRecording = () => {
    if (!recorderRef.current) return;

    recorderRef.current.stopRecording(() => {
      const blob = recorderRef.current!.getBlob();
      const url = URL.createObjectURL(blob);
      
      // Create download link
      const a = document.createElement('a');
      a.href = url;
      a.download = `matcha-recording-${new Date().toISOString()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(url);
      setIsRecording(false);
      setConnectionStatus('Recording saved');
      logger.info('✅ VideoCall: Recording saved');
    });
  };

  if (isJoiningRoom) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center">
        <div className="text-white mb-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p>Connecting to video call...</p>
          <p className="text-sm text-gray-400 mt-2">{connectionStatus}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-red-800">
            <h3 className="font-medium">Video Call Error</h3>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${easyRTCService.isReady() ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600">{connectionStatus}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Users className="w-4 h-4" />
            <span>{remoteParticipants.length + 1} participants</span>
          </div>
        </div>
      </div>

      {/* Video Controls */}
      <div className="flex items-center justify-center space-x-4 p-4 bg-gray-800 rounded-lg">
        <button
          onClick={toggleVideo}
          className={`p-3 rounded-full ${videoEnabled ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} text-white`}
        >
          {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>

        <button
          onClick={toggleAudio}
          className={`p-3 rounded-full ${audioEnabled ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} text-white`}
        >
          {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>

        <button
          onClick={isSharing ? stopScreenShare : startScreenShare}
          className={`p-3 rounded-full ${isSharing ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 hover:bg-gray-700'} text-white`}
        >
          {isSharing ? <StopCircle className="w-5 h-5" /> : <Share className="w-5 h-5" />}
        </button>

        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`p-3 rounded-full ${isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-700'} text-white`}
        >
          {isRecording ? <StopCircle className="w-5 h-5" /> : <Download className="w-5 h-5" />}
        </button>
      </div>

      {/* Video Streams */}
      <div className="space-y-4">
        {/* Local Video */}
        <div className="relative">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-48 bg-gray-900 rounded-lg object-cover"
          />
          <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
            You ({user?.displayName || 'Local'})
          </div>
        </div>

        {/* Screen Share */}
        {isSharing && (
          <div className="relative">
            <video
              ref={screenVideoRef}
              autoPlay
              playsInline
              className="w-full h-64 bg-gray-900 rounded-lg object-contain"
            />
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
              Screen Share
            </div>
          </div>
        )}

        {/* Remote Participants */}
        {remoteParticipants.map((participant) => (
          <div key={participant.userId} className="relative">
            <video
              ref={(el) => {
                if (el) {
                  remoteVideoRefs.current.set(participant.userId, el);
                } else {
                  remoteVideoRefs.current.delete(participant.userId);
                }
              }}
              autoPlay
              playsInline
              className="w-full h-48 bg-gray-900 rounded-lg object-cover"
            />
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
              Participant {participant.userId}
            </div>
          </div>
        ))}

        {/* No Remote Participants Message */}
        {remoteParticipants.length === 0 && isInitialized && (
          <div className="text-center py-8 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Waiting for other participants to join...</p>
            <p className="text-sm mt-1">Share the room link to invite others</p>
          </div>
        )}
      </div>
    </div>
  );
}