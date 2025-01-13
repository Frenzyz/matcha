import React, { useEffect, useRef, useState } from 'react';
import { Video, VideoOff, Mic, MicOff, Share, StopCircle, Download } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { logger } from '../../utils/logger';
import RecordRTC from 'recordrtc';

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
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const easyrtcRef = useRef<any>(null);
  const recorderRef = useRef<RecordRTC | null>(null);

  useEffect(() => {
    const initializeEasyRTC = async () => {
      try {
        const easyrtc = (window as any).easyrtc;
        if (!easyrtc) throw new Error('EasyRTC not loaded');

        easyrtcRef.current = easyrtc;
        easyrtc.enableVideo(true);
        easyrtc.enableAudio(true);
        easyrtc.enableDataChannels(true);
        easyrtc.setVideoDims(1280, 720);

        // Initialize media
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setLocalStream(stream);

        // Configure EasyRTC
        easyrtc.setStreamAcceptor((easyrtcid: string, stream: MediaStream) => {
          const video = document.getElementById(`video-${easyrtcid}`) as HTMLVideoElement;
          if (video) {
            video.srcObject = stream;
            video.play().catch(logger.error);
          }
        });

        easyrtc.setOnStreamClosed((easyrtcid: string) => {
          const video = document.getElementById(`video-${easyrtcid}`) as HTMLVideoElement;
          if (video) {
            video.srcObject = null;
          }
        });

        // Connect to server
        easyrtc.connect('matcha-app', 
          (easyrtcid: string) => {
            logger.info('Connected with ID:', easyrtcid);
            easyrtc.joinRoom(roomId);
          },
          (errorCode: string, errorText: string) => {
            setError(`Connection failed: ${errorText}`);
          }
        );

        // Set up data channel handlers
        easyrtc.setPeerListener((easyrtcid: string, msgType: string, data: any) => {
          if (msgType === 'file') {
            handleFileReceived(data);
          }
        });

      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to initialize video chat';
        setError(message);
        logger.error('Video initialization error:', err);
      }
    };

    initializeEasyRTC();

    return () => {
      if (easyrtcRef.current) {
        easyrtcRef.current.disconnect();
      }
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
      }
      if (recorderRef.current) {
        recorderRef.current.stopRecording();
      }
    };
  }, [roomId]);

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoEnabled;
        setVideoEnabled(!videoEnabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioEnabled;
        setAudioEnabled(!audioEnabled);
      }
    }
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
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = stream;
        }
        setScreenStream(stream);
        setIsSharing(true);

        // Share screen with peers
        if (easyrtcRef.current) {
          easyrtcRef.current.addStreamToCall(stream, 'screen');
        }

        stream.getVideoTracks()[0].onended = () => {
          setIsSharing(false);
          setScreenStream(null);
        };
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
          <video
            ref={localVideoRef}
            muted
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-4 left-4">
            <span className="bg-black/50 text-white px-2 py-1 rounded text-sm">
              You
            </span>
          </div>
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
        {participants
          .filter(id => id !== user?.id)
          .map((participantId) => (
            <div key={participantId} className="relative aspect-square bg-gray-800 rounded-lg overflow-hidden">
              <video
                id={`video-${participantId}`}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-4">
                <span className="bg-black/50 text-white px-2 py-1 rounded text-sm">
                  Participant
                </span>
              </div>
            </div>
          ))}
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-4 mt-4">
        <button
          onClick={toggleScreenShare}
          className={`p-2 rounded-full ${
            isSharing ? 'bg-red-500' : 'bg-emerald-500'
          } text-white hover:opacity-90 transition-opacity`}
        >
          <Share size={20} />
        </button>
        <button
          onClick={toggleRecording}
          className={`p-2 rounded-full ${
            isRecording ? 'bg-red-500' : 'bg-emerald-500'
          } text-white hover:opacity-90 transition-opacity`}
        >
          <StopCircle size={20} />
        </button>
        <label className="p-2 rounded-full bg-emerald-500 text-white hover:opacity-90 transition-opacity cursor-pointer">
          <input
            type="file"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Download size={20} />
        </label>
      </div>

      {error && (
        <div className="absolute top-4 left-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg">
          {error}
        </div>
      )}
    </div>
  );
}
