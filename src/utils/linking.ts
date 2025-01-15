import { useAuth } from '../context/AuthContext';
    import { useEffect } from 'react';

    export const parseSupabaseUrl = (url: string) => {
      let parsedUrl = url;
      if (url.includes("#")) {
        parsedUrl = url.replace("#", "?");
      }
      return parsedUrl;
    };

    export const useLinking = () => {
      const { loginWithToken } = useAuth();

      const subscribe = (listener: (url: string) => void) => {
        const onReceiveURL = ({ url }: { url: string }) => {
          const transformedUrl = parseSupabaseUrl(url);
          const parsedUrl = new URL(transformedUrl);

          const access_token = parsedUrl.searchParams.get('access_token');
          const refresh_token = parsedUrl.searchParams.get('refresh_token');

          if (
            typeof access_token === "string" &&
            typeof refresh_token === "string"
          ) {
            void loginWithToken({ access_token, refresh_token });
          }

          listener(transformedUrl);
        };

        window.addEventListener('hashchange', onReceiveURL);
        return () => {
          window.removeEventListener('hashchange', onReceiveURL);
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
        subscribe
      };
    };
