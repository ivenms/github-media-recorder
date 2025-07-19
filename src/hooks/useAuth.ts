import { useState, useEffect } from 'react';
import { isAuthenticated, checkTokenValidity, clearTokenData } from '../utils/tokenAuth';
import { isMobile } from '../utils/device';

export interface UseAuthReturn {
  authenticated: boolean;
  isLoading: boolean;
  setAuthenticated: (value: boolean) => void;
}

export function useAuth(showAlert?: (message: string, title: string) => void): UseAuthReturn {
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAuth = async () => {
      // Skip token validation on desktop - only show DesktopAlert
      if (!isMobile()) {
        setAuthenticated(true); // Set authenticated to true on desktop
        setIsLoading(false);
        return;
      }

      // First check if user has basic auth data
      if (!isAuthenticated()) {
        setIsLoading(false);
        return;
      }

      try {
        // Validate token with GitHub API
        const tokenResult = await checkTokenValidity();
        
        if (tokenResult.isValid) {
          setAuthenticated(true);
        } else {
          // Token is invalid or expired, clear data
          clearTokenData();
          setAuthenticated(false);
          
          if (tokenResult.isExpired && showAlert) {
            showAlert('Your GitHub token has expired. Please enter a new token to continue.', 'Token Expired');
          }
        }
      } catch (error) {
        console.error('Token validation error:', error);
        setAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [showAlert]);

  return {
    authenticated,
    isLoading,
    setAuthenticated,
  };
}