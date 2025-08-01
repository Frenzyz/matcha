import React, { useEffect, useRef, useState } from 'react';
import { Video, VideoOff, Mic, MicOff, Share, StopCircle, Download, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { logger } from '../../utils/logger';
import RecordRTC from 'recordrtc';
import { webRTCService, ParticipantStream } from '../../services/modernWebRTC';

interface VideoCallProps {
  roomId: string;
  participants: string[];
}

export default function VideoCall({ roomId, participants }: VideoCallProps) {
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
  const [hasRequestedMedia, setHasRequestedMedia] = useState(false);
  const [remoteParticipants, setRemoteParticipants] = useState<ParticipantStream[]>([]);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const recorderRef = useRef<RecordRTC | null>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  // Initialize WebRTC service (without media access)
  useEffect(() => {
    const setupWebRTCService = () => {
      if (!user) return;

      // Setup event handlers
      webRTCService.onStreamAdded((participant) => {
        logger.info('Stream added for participant:', participant.userId);
        setRemoteParticipants(prev => {
          const existing = prev.find(p => p.userId === participant.userId);
          if (existing) return prev;
          return [...prev, participant];
        });
      });

      webRTCService.onStreamRemoved((userId) => {
        logger.info('Stream removed for participant:', userId);
        setRemoteParticipants(prev => prev.filter(p => p.userId !== userId));
      });

      webRTCService.onParticipantJoined((userId, userName) => {
        logger.info(`Participant joined: ${userName} (${userId})`);
      });

      webRTCService.onParticipantLeft((userId) => {
        logger.info(`Participant left: ${userId}`);
      });
    };

    setupWebRTCService();

    return () => {
      if (hasRequestedMedia) {
        webRTCService.leaveRoom();
        if (localStream) {
          localStream.getTracks().forEach(track => track.stop());
        }
        if (screenStream) {
          screenStream.getTracks().forEach(track => track.stop());
        }
        if (recorderRef.current) {
          recorderRef.current.stopRecording();
        }
      }
    };
  }, [roomId, user, hasRequestedMedia, localStream, screenStream]);

  const joinVideoRoom = async () => {
    if (!user || isInitialized || isJoiningRoom) return;

    try {
      setIsJoiningRoom(true);
      setError(null);
      logger.info('Joining video room...');

      // Initialize WebRTC service with retries
      let success = false;
      let attempts = 0;
      const maxAttempts = 3;

      while (!success && attempts < maxAttempts) {
        attempts++;
        try {
          success = await Promise.race([
            webRTCService.initialize({
              roomId,
              userId: user.id,
              userName: user.email || 'Anonymous',
              // Add required authentication for production
              authToken: user.access_token || `dev-token-${Date.now()}`,
              sessionId: `session-${user.id.replace(/[^a-zA-Z0-9-]/g, '')}-${Date.now()}`
            }),
            new Promise<boolean>((_, reject) => 
              setTimeout(() => reject(new Error('Connection timeout')), 5000)
            )
          ]);
        } catch (attemptError) {
          logger.warn(`WebRTC init attempt ${attempts} failed:`, attemptError);
          if (attempts === maxAttempts) throw attemptError;
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
        }
      }

      if (!success) {
        throw new Error('Failed to initialize WebRTC service after multiple attempts');
      }

      // Start local stream
      const stream = await webRTCService.startLocalStream(videoEnabled, audioEnabled);
      if (!stream) {
        throw new Error('Failed to access camera/microphone. Please check permissions.');
      }

      setLocalStream(stream);
      setHasRequestedMedia(true);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        try {
          await localVideoRef.current.play();
          logger.info('Local video stream started successfully');
        } catch (playError) {
          logger.warn('Video autoplay blocked, user interaction required:', playError);
        }
      }

      setIsInitialized(true);
      logger.info('Successfully joined video room');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join video room';
      logger.error('Video room join error:', err);
      setError(errorMessage);
    } finally {
      setIsJoiningRoom(false);
    }
  };

  // Update remote video elements when participants change
  useEffect(() => {
    remoteParticipants.forEach((participant) => {
      const videoElement = remoteVideoRefs.current.get(participant.userId);
      if (videoElement && participant.stream) {
        videoElement.srcObject = participant.stream;
      }
    });
  }, [remoteParticipants]);

  const toggleVideo = () => {
    const newVideoState = !videoEnabled;
    setVideoEnabled(newVideoState);
    webRTCService.toggleVideo(newVideoState);
  };

  const toggleAudio = () => {
    const newAudioState = !audioEnabled;
    setAudioEnabled(newAudioState);
    webRTCService.toggleAudio(newAudioState);
  };

  const toggleScreenShare = async () => {
    try {
      if (isSharing) {
        if (screenStream) {
          screenStream.getTracks().forEach(track => track.stop());
          setScreenStream(null);
        }
        setIsSharing(false);
      } else {
        const stream = await webRTCService.startScreenShare();
        if (stream) {
          if (screenVideoRef.current) {
            screenVideoRef.current.srcObject = stream;
          }
          setScreenStream(stream);
          setIsSharing(true);

          stream.getVideoTracks()[0].onended = () => {
            setIsSharing(false);
            setScreenStream(null);
          };
        } else {
          throw new Error('Failed to start screen sharing');
        }
      }
    } catch (err) {
      logger.error('Screen sharing error:', err);
      setError('Failed to share screen');
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      if (recorderRef.current) {
        recorderRef.current.stopRecording(() => {
          const blob = recorderRef.current?.getBlob();
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `recording-${Date.now()}.webm`;
            a.click();
            URL.revokeObjectURL(url);
          }
        });
      }
      setIsRecording(false);
    } else {
      if (localStream) {
        recorderRef.current = new RecordRTC(localStream, {
          type: 'video',
          mimeType: 'video/webm'
        });
        recorderRef.current.startRecording();
        setIsRecording(true);
      }
    }
  };

  const handleFileReceived = (data: { name: string; type: string; data: string }) => {
    const blob = base64toBlob(data.data, data.type);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = data.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !easyrtcRef.current) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result?.toString().split(',')[1];
      if (base64) {
        easyrtcRef.current.sendDataWS(null, 'file', {
          name: file.name,
          type: file.type,
          data: base64
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const base64toBlob = (base64: string, type: string) => {
    const byteString = atob(base64);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type });
  };

  return (
    <div className="bg-gray-900 dark:bg-gray-950 rounded-lg p-4 h-full">
      <div className="grid grid-cols-2 gap-4 h-[calc(100%-4rem)]">
        {/* Local video */}
        <div className="relative aspect-square bg-gray-800 rounded-lg overflow-hidden">
          {/* Join button when not initialized */}
          {!isInitialized && !isJoiningRoom && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white">
                <Video size={48} className="mx-auto mb-4 opacity-75" />
                <button
                  onClick={joinVideoRoom}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
                >
                  Join Video Call
                </button>
                <p className="text-xs text-gray-400 mt-2">
                  Camera and microphone will be requested
                </p>
              </div>
            </div>
          )}
          
                      {/* Loading state */}
            {isJoiningRoom && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white">
                  <Users size={48} className="mx-auto mb-2 opacity-50 animate-pulse" />
                  <p className="text-sm">Connecting to video call...</p>
                </div>
              </div>
            )}
          
          {/* Error state */}
          {error && !isJoiningRoom && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-red-400 p-4">
                <p className="text-sm font-medium">Connection Failed</p>
                <p className="text-xs opacity-75 mb-3">{error}</p>
                <button
                  onClick={joinVideoRoom}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
          
          {/* Video element */}
          <video
            ref={localVideoRef}
            muted
            autoPlay
            playsInline
            className="w-full h-full object-cover"
            style={{ display: isInitialized && !error ? 'block' : 'none' }}
          />
          
          {/* User label */}
          {isInitialized && (
            <div className="absolute bottom-4 left-4">
              <span className="bg-black/50 text-white px-2 py-1 rounded text-sm">
                You
              </span>
            </div>
          )}
          
          {/* Video/Audio controls - only show when initialized */}
          {isInitialized && (
            <div className="absolute bottom-4 right-4 flex gap-2">
              <button
                onClick={toggleVideo}
                className={`p-2 rounded-full ${
                  videoEnabled ? 'bg-emerald-500' : 'bg-red-500'
                } text-white hover:opacity-90 transition-opacity`}
              >
                {videoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
              </button>
              <button
                onClick={toggleAudio}
                className={`p-2 rounded-full ${
                  audioEnabled ? 'bg-emerald-500' : 'bg-red-500'
                } text-white hover:opacity-90 transition-opacity`}
              >
                {audioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
              </button>
            </div>
          )}
        </div>

        {/* Screen share */}
        {isSharing && (
          <div className="relative aspect-square bg-gray-800 rounded-lg overflow-hidden">
            <video
              ref={screenVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-4 left-4">
              <span className="bg-black/50 text-white px-2 py-1 rounded text-sm">
                Screen Share
              </span>
            </div>
          </div>
        )}

        {/* Remote videos */}
        {remoteParticipants.map((participant) => (
          <div key={participant.userId} className="relative aspect-square bg-gray-800 rounded-lg overflow-hidden">
            <video
              ref={(video) => {
                if (video) {
                  remoteVideoRefs.current.set(participant.userId, video);
                  if (participant.stream) {
                    video.srcObject = participant.stream;
                  }
                }
              }}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-4 left-4">
              <span className="bg-black/50 text-white px-2 py-1 rounded text-sm">
                {participant.userId}
              </span>
            </div>
          </div>
        ))}
        
        {/* Show participants count */}
        {remoteParticipants.length === 0 && isInitialized && (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <Users size={48} className="mx-auto mb-2 opacity-50" />
            <p>Waiting for other participants to join...</p>
          </div>
        )}
      </div>

      {/* Controls - only show when video call is active */}
      {isInitialized && (
        <div className="flex justify-center gap-4 mt-4">
          <button
            onClick={toggleScreenShare}
            className={`p-2 rounded-full ${
              isSharing ? 'bg-red-500' : 'bg-emerald-500'
            } text-white hover:opacity-90 transition-opacity`}
            title={isSharing ? 'Stop sharing' : 'Share screen'}
          >
            <Share size={20} />
          </button>
          <button
            onClick={toggleRecording}
            className={`p-2 rounded-full ${
              isRecording ? 'bg-red-500' : 'bg-emerald-500'
            } text-white hover:opacity-90 transition-opacity`}
            title={isRecording ? 'Stop recording' : 'Start recording'}
          >
            <StopCircle size={20} />
          </button>
          <label 
            className="p-2 rounded-full bg-emerald-500 text-white hover:opacity-90 transition-opacity cursor-pointer"
            title="Share file"
          >
            <input
              type="file"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Download size={20} />
          </label>
        </div>
      )}


    </div>
  );
}
