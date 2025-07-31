import { useState, useEffect, useRef } from 'react';
import { logger } from '../utils/logger';
import { useTabSwitchProtection } from './useTabVisibility';

interface SimpleConnectionStatus {
  isConnected: boolean;
  tabHidden: boolean;
  timeHidden: number;
  status: string;
}

export function useSimpleConnectionMonitor() {
  const { isVisible, timeHidden } = useTabSwitchProtection();
  const [status, setStatus] = useState<SimpleConnectionStatus>({
    isConnected: false,
    tabHidden: false,
    timeHidden: 0,
    status: 'Not connected'
  });

  const statusRef = useRef(status);
  statusRef.current = status;

  useEffect(() => {
    setStatus(prev => ({
      ...prev,
      tabHidden: !isVisible,
      timeHidden,
      status: getStatusText(!isVisible, timeHidden, prev.isConnected)
    }));
  }, [isVisible, timeHidden]);

  const setConnected = (connected: boolean) => {
    setStatus(prev => ({
      ...prev,
      isConnected: connected,
      status: getStatusText(prev.tabHidden, prev.timeHidden, connected)
    }));
  };

  const getStatusText = (tabHidden: boolean, timeHidden: number, isConnected: boolean): string => {
    if (!isConnected) {
      return 'Not connected';
    }

    if (tabHidden) {
      return `Connected (tab hidden for ${Math.round(timeHidden / 1000)}s)`;
    }

    return 'Connected';
  };

  const handleTabVisibilityChange = () => {
    if (!isVisible) {
      logger.info('🙈 Tab hidden - WebRTC connections should be maintained');
    } else if (timeHidden > 5000) {
      logger.info(`👁️ Tab visible after ${timeHidden}ms - checking connections`);
    }
  };

  useEffect(() => {
    handleTabVisibilityChange();
  }, [isVisible, timeHidden]);

  return {
    status,
    setConnected,
    isTabHidden: !isVisible,
    timeHidden
  };
}