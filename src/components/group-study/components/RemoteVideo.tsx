import React, { useEffect, useRef, useState } from 'react';
import { User } from 'lucide-react';
import { supabase } from '../../../config/supabase';
import { logger } from '../../../utils/logger';

interface RemoteVideoProps {
  participantId: string;
  stream?: MediaStream;
}

export default function RemoteVideo({ participantId, stream }: RemoteVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [participantName, setParticipantName] = useState<string>(`Participant ${participantId.slice(0, 8)}`);

  // Fetch participant name
  useEffect(() => {
    const fetchParticipantName = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', participantId)
          .single();

        if (error) throw error;

        const fullName = `${data.first_name} ${data.last_name}`.trim();
        setParticipantName(fullName || `User ${participantId.slice(0, 8)}`);
      } catch (error) {
        logger.error('Error fetching participant name:', error);
        setParticipantName(`User ${participantId.slice(0, 8)}`);
      }
    };

    fetchParticipantName();
  }, [participantId]);

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
        {stream && stream.getVideoTracks().length > 0 ? (
          <video
            ref={videoRef}
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
          {participantName}
        </span>
      </div>
    </div>
  );
}
