import { useState, useRef, useCallback } from 'react';
import { logger } from '../../../utils/logger';

interface MediaStreamOptions {
  video?: boolean;
  audio?: boolean;
}

export function useMediaStream() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);

  const startMedia = useCallback(async ({ video, audio }: MediaStreamOptions) => {
    try {
      const constraints = {
        video: video ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } : false,
        audio: audio ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 2,
          sampleRate: 48000,
          sampleSize: 16
        } : false
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Store video track reference
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrackRef.current = videoTrack;
      }

      setStream(mediaStream);
      streamRef.current = mediaStream;
      setVideoEnabled(!!video);
      setAudioEnabled(!!audio);

      return mediaStream;
    } catch (error) {
      logger.error('Error accessing media devices:', error);
      throw error;
    }
  }, []);

  const stopMedia = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setStream(null);
    streamRef.current = null;
    videoTrackRef.current = null;
    setVideoEnabled(false);
    setAudioEnabled(false);
  }, []);

  const toggleVideo = useCallback(async () => {
    if (!stream) return;

    try {
      if (videoEnabled) {
        // If video is enabled, just disable the track
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = false;
          setVideoEnabled(false);
        }
      } else {
        // If video is disabled, we need to get a new video track
        if (!videoTrackRef.current || videoTrackRef.current.readyState === 'ended') {
          const newStream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: 'user'
            }
          });
          
          const newVideoTrack = newStream.getVideoTracks()[0];
          videoTrackRef.current = newVideoTrack;

          // Replace the old video track with the new one
          const oldVideoTrack = stream.getVideoTracks()[0];
          if (oldVideoTrack) {
            stream.removeTrack(oldVideoTrack);
          }
          stream.addTrack(newVideoTrack);
          
          // Update the stream reference
          setStream(new MediaStream([...stream.getTracks()]));
        } else {
          // Re-enable existing track
          videoTrackRef.current.enabled = true;
        }
        setVideoEnabled(true);
      }
    } catch (error) {
      logger.error('Error toggling video:', error);
    }
  }, [stream, videoEnabled]);

  const toggleAudio = useCallback(() => {
    if (!stream) return;
    const audioTracks = stream.getAudioTracks();
    audioTracks.forEach(track => {
      track.enabled = !track.enabled;
    });
    setAudioEnabled(prev => !prev);
  }, [stream]);

  return {
    stream,
    videoEnabled,
    audioEnabled,
    startMedia,
    stopMedia,
    toggleVideo,
    toggleAudio
  };
}
