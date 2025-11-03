import { useEffect, useRef, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../store/auth';
import { authService } from '../services/authService';
import { reset } from '../utils/navigationService';
import { Alert } from 'react-native';

const CHECK_INTERVAL = 5000; // Check every 5 seconds
const CONNECTION_ERROR_RETRY_DELAY = 10000; // 10 seconds countdown

export const useTokenChecker = () => {
  const { token, isAuthenticated, signOut } = useAuth();
  const [connectionError, setConnectionError] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const intervalRef = useRef(null);
  const countdownRef = useRef(null);
  const isCheckingRef = useRef(false);

  const checkToken = useCallback(async () => {
    // Prevent multiple simultaneous checks
    if (isCheckingRef.current) {
      return;
    }

    isCheckingRef.current = true;

    try {
      // Verify token exists in storage before validating
      const storedToken = await AsyncStorage.getItem('token');
      if (!storedToken) {
        console.warn('[Token Checker] No token found in AsyncStorage, skipping validation');
        isCheckingRef.current = false;
        return;
      }

      // Clear any existing connection error when starting a new check
      setConnectionError(false);
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }

      // Validate token
      await authService.validateToken();
      
      // Token is valid - ensure connection error is cleared
      setConnectionError(false);
    } catch (error) {
      // Check if server responded (means we have connection, but token is invalid)
      // 401 = Unauthorized, 403 = Forbidden (both indicate expired/invalid token)
      const isTokenExpired = error.response && (error.response.status === 401 || error.response.status === 403 || error.sessionExpired);
      
      // If error has a response, server is reachable, so it's a token issue, not connection issue
      if (isTokenExpired) {
        // Token expired or invalid
        isCheckingRef.current = false;
        
        // Clear intervals
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
        }

        // Explicitly clear token from AsyncStorage before signing out
        try {
          await AsyncStorage.multiRemove(['token', 'role']);
          console.log('[Token Checker] Token cleared from AsyncStorage');
        } catch (storageError) {
          console.error('[Token Checker] Error clearing token from AsyncStorage:', storageError);
        }

        // Sign out (also clears state)
        await signOut();

        // Show session expired message
        Alert.alert(
          'Phiên đăng nhập đã hết hạn',
          'Phiên đăng nhập của bạn đã hết hạn. Vui lòng đăng nhập lại.',
          [
            {
              text: 'Đồng ý',
              onPress: () => {
                // Navigate to login screen
                reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                });
              },
            },
          ],
          { cancelable: false }
        );

        // Navigate to login screen
        reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      } else if (!error.response) {
        // No response means connection error (network timeout, server unreachable, etc.)
        setConnectionError(true);
        setCountdown(10);

        // Start countdown
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
        }

        countdownRef.current = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              // Reset and try again
              if (countdownRef.current) {
                clearInterval(countdownRef.current);
                countdownRef.current = null;
              }
              setConnectionError(false);
              // Trigger immediate check
              setTimeout(() => checkToken(), 500);
              return 10;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        // Other server errors (500, etc.) - server responded, so connection is fine
        // Just log and don't show any error modal
        console.warn('Token validation returned unexpected error:', error.response?.status);
      }
    } finally {
      isCheckingRef.current = false;
    }
  }, [signOut]);

  useEffect(() => {
    // Only start checking if user is authenticated
    if (!isAuthenticated || !token) {
      // Clear any running intervals if user logs out
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      setConnectionError(false);
      return;
    }

    // Add a delay before starting token checks to ensure token is fully stored after login
    // This prevents race conditions where the checker runs before AsyncStorage is updated
    const startChecker = async () => {
      // Wait a bit to ensure token is fully available (2 seconds to be safe)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verify token is actually available before starting checks
      const storedToken = await AsyncStorage.getItem('token');
      if (storedToken && storedToken === token) {
        console.log('[Token Checker] Token verified, starting periodic checks');
        // Check token immediately
        checkToken();
        
        // Set up periodic checking
        intervalRef.current = setInterval(() => {
          checkToken();
        }, CHECK_INTERVAL);
      } else {
        console.warn('[Token Checker] Token not found in AsyncStorage or mismatch, skipping checks');
      }
    };

    startChecker();

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [isAuthenticated, token, checkToken]);

  return {
    connectionError,
    countdown,
  };
};

