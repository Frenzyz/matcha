import { useState, useEffect, useRef, useCallback } from 'react';
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

  const hiddenStartTimeRef = useRef<number>(0);
  const stateRef = useRef(state);
  
  // Keep state ref in sync
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const handleVisibilityChange = useCallback(() => {
    const isVisible = !document.hidden;
    const isHidden = document.hidden;
    const now = Date.now();
    const currentState = stateRef.current;

    logger.debug(`🔍 Visibility change: ${isHidden ? 'HIDDEN' : 'VISIBLE'}`);

    if (isVisible && currentState.isHidden) {
      // Tab became visible
      const timeHidden = hiddenStartTimeRef.current ? now - hiddenStartTimeRef.current : 0;
      logger.debug(`✅ Tab became visible after ${timeHidden}ms`);
      
      setState({
        isVisible: true,
        isHidden: false,
        lastVisibleTime: now,
        timeHidden
      });
    } else if (isHidden && currentState.isVisible) {
      // Tab became hidden
      hiddenStartTimeRef.current = now;
      logger.debug('👁️ Tab became hidden');
      
      setState(prev => ({
        ...prev,
        isVisible: false,
        isHidden: true
      }));
    }
  }, []);

  const handleWindowBlur = useCallback(() => {
    logger.debug('🌫️ Window blur event');
    if (!document.hidden) {
      // Window lost focus but tab is still visible
      const now = Date.now();
      setState(prev => ({
        ...prev,
        isVisible: false,
        isHidden: true
      }));
      hiddenStartTimeRef.current = now;
    }
  }, []);

  const handleWindowFocus = useCallback(() => {
    logger.debug('🎯 Window focus event');
    if (!document.hidden) {
      // Window regained focus and tab is visible
      const now = Date.now();
      const timeHidden = hiddenStartTimeRef.current ? now - hiddenStartTimeRef.current : 0;
      
      setState({
        isVisible: true,
        isHidden: false,
        lastVisibleTime: now,
        timeHidden
      });
    }
  }, []);

  useEffect(() => {
    // Add all relevant event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [handleVisibilityChange, handleWindowBlur, handleWindowFocus]);

  return state;
}

// Robust tab switching protection with context isolation
class TabSwitchProtectionManager {
  private static instance: TabSwitchProtectionManager;
  private isProtectionActive = false;
  private protectionTimeout: NodeJS.Timeout | null = null;
  private lastHiddenTime = 0;
  private protectionDuration = 2000; // 2 seconds protection after becoming visible
  
  static getInstance(): TabSwitchProtectionManager {
    if (!TabSwitchProtectionManager.instance) {
      TabSwitchProtectionManager.instance = new TabSwitchProtectionManager();
    }
    return TabSwitchProtectionManager.instance;
  }
  
  activateProtection(): void {
    this.isProtectionActive = true;
    this.lastHiddenTime = Date.now();
    this.clearTimeout();
    logger.debug('🛡️ Tab switch protection ACTIVATED');
  }
  
  scheduleDeactivation(): void {
    this.clearTimeout();
    this.protectionTimeout = setTimeout(() => {
      this.isProtectionActive = false;
      logger.debug('🔓 Tab switch protection DEACTIVATED');
    }, this.protectionDuration);
    logger.debug(`⏰ Tab switch protection scheduled to deactivate in ${this.protectionDuration}ms`);
  }
  
  isProtected(): boolean {
    // Additional check: if tab was hidden recently (within 5 seconds), consider it protected
    const timeSinceHidden = Date.now() - this.lastHiddenTime;
    const recentlyHidden = timeSinceHidden < 5000; // 5 second grace period
    
    return this.isProtectionActive || document.hidden || recentlyHidden;
  }
  
  forceDeactivate(): void {
    this.clearTimeout();
    this.isProtectionActive = false;
    logger.debug('🚫 Tab switch protection FORCE DEACTIVATED');
  }
  
  private clearTimeout(): void {
    if (this.protectionTimeout) {
      clearTimeout(this.protectionTimeout);
      this.protectionTimeout = null;
    }
  }
}

export function useTabSwitchProtection() {
  const { isVisible, isHidden, timeHidden } = useTabVisibility();
  const [protectionState, setProtectionState] = useState(false);
  const manager = TabSwitchProtectionManager.getInstance();

  useEffect(() => {
    if (isHidden) {
      manager.activateProtection();
      setProtectionState(true);
    } else if (isVisible) {
      manager.scheduleDeactivation();
      // Update state after a short delay to allow protection to take effect
      setTimeout(() => {
        setProtectionState(manager.isProtected());
      }, 100);
    }
  }, [isVisible, isHidden, manager]);

  // Update protection state periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setProtectionState(manager.isProtected());
    }, 500);
    
    return () => clearInterval(interval);
  }, [manager]);

  const isTabSwitchInProgress = useCallback(() => {
    return manager.isProtected();
  }, [manager]);

  const forceAllowAction = useCallback(() => {
    logger.info('🔓 Force allowing action - overriding tab switch protection');
    manager.forceDeactivate();
    setProtectionState(false);
  }, [manager]);

  return {
    isTabSwitchInProgress,
    forceAllowAction,
    isVisible,
    isHidden,
    timeHidden,
    isProtected: protectionState
  };
}

// Utility function to check if current behavior might be due to tab switching
export function isLikelyTabSwitch(): boolean {
  const manager = TabSwitchProtectionManager.getInstance();
  return manager.isProtected();
}

// Utility function to prevent actions during tab switches
export function preventDuringTabSwitch<T extends (...args: any[]) => any>(
  fn: T,
  fallbackValue?: ReturnType<T>
): T {
  return ((...args: Parameters<T>) => {
    if (isLikelyTabSwitch()) {
      logger.debug('🚫 Action prevented due to tab switch protection');
      return fallbackValue;
    }
    return fn(...args);
  }) as T;
}