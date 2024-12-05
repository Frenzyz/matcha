import React, { useEffect, useRef } from 'react';
import { Video, VideoOff, Mic, MicOff, User } from 'lucide-react';
import WebRTCStats from '../WebRTCStats';

interface LocalVideoProps {
  stream: MediaStream | null;
  videoEnabled: boolean;
  audioEnabled: boolean;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  rtcPeer?: RTCPeerConnection;
}

export default function LocalVideo({
  stream,
  videoEnabled,
  audioEnabled,
  onToggleVideo,
  onToggleAudio,
  rtcPeer
}: LocalVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement || !stream) return;

    videoElement.srcObject = stream;
    const playPromise = videoElement.play();
    
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        if (error.name !== 'AbortError') {
          console.error('Error playing video:', error);
        }
      });
    }

    return () => {
      try {
        if (videoElement) {
          videoElement.pause();
          videoElement.srcObject = null;
        }
      } catch (error) {
        console.error('Error cleaning up video:', error);
      }
    };
  }, [stream]);

  return (
    <div className="relative w-full h-full bg-gray-800 dark:bg-gray-900 rounded-lg overflow-hidden">
      <div className="aspect-square w-full h-full">
        {videoEnabled && stream ? (
          <video
            ref={videoRef}
            muted
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-gray-700 dark:bg-gray-800 flex items-center justify-center">
              <User className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
          </div>
        )}
      </div>
      
      <div className="absolute bottom-4 left-4">
        <span className="bg-black/50 text-white px-2 py-1 rounded text-sm">
          You
        </span>
      </div>

      <div className="absolute bottom-4 right-4 flex gap-2">
        <button
          onClick={(e) => {
            e.preventDefault();
            onToggleVideo();
          }}
          className={`p-2 rounded-full ${
            videoEnabled ? 'bg-emerald-500' : 'bg-red-500'
          } transition-colors text-white hover:opacity-90`}
        >
          {videoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            onToggleAudio();
          }}
          className={`p-2 rounded-full ${
            audioEnabled ? 'bg-emerald-500' : 'bg-red-500'
          } transition-colors text-white hover:opacity-90`}
        >
          {audioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
        </button>
      </div>

      {rtcPeer && (
        <div className="absolute top-4 right-4">
          <WebRTCStats peer={rtcPeer} />
        </div>
      )}
    </div>
  );
}