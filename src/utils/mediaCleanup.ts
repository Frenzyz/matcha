import { logger } from './logger';

/**
 * Comprehensive media stream cleanup utility
 * This utility ensures all media streams are properly stopped and released
 */

interface MediaCleanupOptions {
  stopAllTracks?: boolean;
  clearVideoElements?: boolean;
  destroyWebRTC?: boolean;
  logDetails?: boolean;
}

/**
 * Force cleanup of all media streams and WebRTC connections
 */
export async function forceMediaCleanup(options: MediaCleanupOptions = {}): Promise<void> {
  const {
    stopAllTracks = true,
    clearVideoElements = true,
    destroyWebRTC = true,
    logDetails = true
  } = options;

  try {
    if (logDetails) {
      logger.info('🧹 Starting comprehensive media cleanup...');
    }

    let trackCount = 0;
    let elementCount = 0;

    // 1. Stop all tracks from video/audio elements
    if (clearVideoElements) {
      const allMediaElements = document.querySelectorAll('video, audio');
      elementCount = allMediaElements.length;
      
      allMediaElements.forEach((element, index) => {
        const mediaElement = element as HTMLMediaElement;
        if (mediaElement.srcObject && mediaElement.srcObject instanceof MediaStream) {
          mediaElement.srcObject.getTracks().forEach(track => {
            if (stopAllTracks) {
              track.stop();
              trackCount++;
              if (logDetails) {
                logger.debug(`🎥 Stopped track ${trackCount}: ${track.kind} (${track.label})`);
              }
            }
          });
          mediaElement.srcObject = null;
          if (logDetails) {
            logger.debug(`📺 Cleared media element ${index + 1}/${elementCount}`);
          }
        }
      });
    }

    // 2. Destroy WebRTC service if requested
    if (destroyWebRTC) {
      try {
        const { webRTCService } = await import('../services/modernWebRTC');
        webRTCService.destroy();
        if (logDetails) {
          logger.info('🔌 WebRTC service destroyed');
        }
      } catch (error) {
        logger.warn('Error destroying WebRTC service:', error);
      }
    }

    // 3. Additional safety checks using Media Devices API
    try {
      await navigator.mediaDevices.enumerateDevices();
      if (logDetails) {
        logger.debug('🔍 Media devices enumerated successfully');
      }
    } catch (error) {
      logger.warn('Error enumerating media devices:', error);
    }

    // 4. Global cleanup of any remaining streams
    if (stopAllTracks && (window as any).mediaStreams) {
      const globalStreams = (window as any).mediaStreams as MediaStream[];
      globalStreams.forEach((stream, index) => {
        stream.getTracks().forEach(track => {
          track.stop();
          trackCount++;
        });
        if (logDetails) {
          logger.debug(`🌐 Stopped global stream ${index + 1}`);
        }
      });
      (window as any).mediaStreams = [];
    }

    if (logDetails) {
      logger.info(`✅ Media cleanup completed: ${trackCount} tracks stopped, ${elementCount} elements cleared`);
    }

  } catch (error) {
    logger.error('❌ Error during media cleanup:', error);
    throw error;
  }
}

/**
 * Quick cleanup for tab switching protection
 * Lighter cleanup that doesn't destroy everything
 */
export function quickMediaCleanup(): void {
  try {
    logger.debug('🔄 Quick media cleanup for tab switch protection');
    
    // Only pause media elements, don't stop tracks
    const allMediaElements = document.querySelectorAll('video, audio');
    allMediaElements.forEach(element => {
      const mediaElement = element as HTMLMediaElement;
      if (!mediaElement.paused) {
        mediaElement.pause();
      }
    });
    
    logger.debug('⏸️ Quick media cleanup completed');
  } catch (error) {
    logger.warn('Error during quick media cleanup:', error);
  }
}

/**
 * Check if there are any active media streams
 */
export function getActiveMediaInfo(): {
  videoTracks: number;
  audioTracks: number;
  mediaElements: number;
  totalStreams: number;
} {
  let videoTracks = 0;
  let audioTracks = 0;
  let mediaElements = 0;
  let totalStreams = 0;

  try {
    const allMediaElements = document.querySelectorAll('video, audio');
    mediaElements = allMediaElements.length;

    allMediaElements.forEach(element => {
      const mediaElement = element as HTMLMediaElement;
      if (mediaElement.srcObject && mediaElement.srcObject instanceof MediaStream) {
        totalStreams++;
        mediaElement.srcObject.getTracks().forEach(track => {
          if (track.kind === 'video') videoTracks++;
          if (track.kind === 'audio') audioTracks++;
        });
      }
    });
  } catch (error) {
    logger.warn('Error getting active media info:', error);
  }

  return { videoTracks, audioTracks, mediaElements, totalStreams };
}

/**
 * Log current media status for debugging
 */
export function logMediaStatus(): void {
  const info = getActiveMediaInfo();
  logger.info('📊 Current Media Status:', {
    videoTracks: info.videoTracks,
    audioTracks: info.audioTracks,
    mediaElements: info.mediaElements,
    totalStreams: info.totalStreams
  });
}

/**
 * Setup global media tracking for better cleanup
 */
export function setupGlobalMediaTracking(): void {
  if (!(window as any).mediaStreams) {
    (window as any).mediaStreams = [];
  }

  // Override getUserMedia to track streams
  const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = async (constraints) => {
    const stream = await originalGetUserMedia(constraints);
    (window as any).mediaStreams.push(stream);
    logger.debug('📹 New media stream tracked:', stream.id);
    return stream;
  };

  logger.info('🔍 Global media tracking enabled');
}