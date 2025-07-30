import { useState, useEffect } from 'react';
import { logger } from '../utils/logger';

interface TabVisibilityState {
  isVisible: boolean;
  isHidden: boolean;
  lastVisibleTime: number;
  timeHidden: number;
}

export function useTabVisibility() {
  const [state, setState] = useState<TabVisibilityState>({
    isVisible: !document.hidden,
    isHidden: document.hidden,
    lastVisibleTime: Date.now(),
    timeHidden: 0
  });

  useEffect(() => {
    let hiddenStartTime = 0;

    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      const now = Date.now();

      if (isVisible && state.isHidden) {
        // Tab became visible
        const timeHidden = hiddenStartTime ? now - hiddenStartTime : 0;
        logger.debug(`Tab became visible after ${timeHidden}ms`);
        
        setState({
          isVisible: true,
          isHidden: false,
          lastVisibleTime: now,
          timeHidden
        });
      } else if (!isVisible && state.isVisible) {
        // Tab became hidden
        hiddenStartTime = now;
        logger.debug('Tab became hidden');
        
        setState(prev => ({
          ...prev,
          isVisible: false,
          isHidden: true
        }));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [state.isVisible, state.isHidden]);

  return state;
}

// Global tab switching protection
let isTabSwitchInProgress = false;
let tabSwitchTimeout: NodeJS.Timeout | null = null;

export function useTabSwitchProtection() {
  const { isVisible, isHidden, timeHidden } = useTabVisibility();

  useEffect(() => {
    if (isHidden) {
      // Mark tab switch as in progress
      isTabSwitchInProgress = true;
      
      // Clear any existing timeout
      if (tabSwitchTimeout) {
        clearTimeout(tabSwitchTimeout);
      }
      
      logger.debug('Tab switch protection activated');
    } else if (isVisible && isTabSwitchInProgress) {
      // Tab became visible again, set timeout to clear protection
      tabSwitchTimeout = setTimeout(() => {
        isTabSwitchInProgress = false;
        logger.debug('Tab switch protection deactivated');
      }, 1000); // 1 second buffer after tab becomes visible
    }
  }, [isVisible, isHidden, timeHidden]);

  return {
    isTabSwitchInProgress: () => isTabSwitchInProgress,
    isVisible,
    isHidden,
    timeHidden
  };
}

// Utility function to check if current behavior might be due to tab switching
export function isLikelyTabSwitch(): boolean {
  return isTabSwitchInProgress || document.hidden;
}

// Utility function to prevent actions during tab switches
export function preventDuringTabSwitch<T extends (...args: any[]) => any>(
  fn: T,
  fallbackValue?: ReturnType<T>
): T {
  return ((...args: Parameters<T>) => {
    if (isLikelyTabSwitch()) {
      logger.debug('Action prevented due to tab switch');
      return fallbackValue;
    }
    return fn(...args);
  }) as T;
}