import { useAuth } from '../context/AuthContext';
import { useEffect } from 'react';

export const parseSupabaseUrl = (url: string) => {
  if (url.includes("#")) {
    return url.replace("#", "?");
  }
  return url;
};

export const useLinking = () => {
  const { loginWithToken } = useAuth();

  const subscribe = (listener: (url: string) => void) => {
    const onReceiveURL = ({ url }: { url: string }) => {
      const transformedUrl = parseSupabaseUrl(url);
      const parsedUrl = new URL(transformedUrl);

      // Extract tokens
      const access_token = parsedUrl.searchParams.get('access_token');
      const refresh_token = parsedUrl.searchParams.get('refresh_token');

      // Call listener first to ensure proper handling
      listener(transformedUrl);

      // Login if tokens are present
      if (access_token && refresh_token) {
        void loginWithToken({ access_token, refresh_token });
      }
    };

    // Listen to both hashchange and popstate for broader coverage
    const handleURLChange = () => onReceiveURL({ url: window.location.href });

    window.addEventListener('hashchange', handleURLChange);
    window.addEventListener('popstate', handleURLChange);

    return () => {
      window.removeEventListener('hashchange', handleURLChange);
      window.removeEventListener('popstate', handleURLChange);
    };
  };

  const getInitialURL = async () => {
    const url = window.location.href;
    if (url) {
      return parseSupabaseUrl(url);
    }
    return null;
  };

  return {
    getInitialURL,
    subscribe,
  };
};
