import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { clearAuthStorage } from '../utils/authUtils';
import { reset } from '../utils/navigationService';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  // Don't set default Content-Type - we'll set it per request type
  // For JSON requests, we'll set it in the interceptor
  // For FormData, we'll leave it undefined so React Native sets multipart/form-data with boundary
});

// Request interceptor - Add token to all requests except public endpoints
api.interceptors.request.use(
  async (config) => {
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
    
    // Skip adding token for public endpoints
    const publicEndpoints = ['/api/ai/overview', '/api/auth/login', '/api/auth/register'];
    const isPublicEndpoint = publicEndpoints.some(endpoint => config.url.includes(endpoint));
    
    if (!isPublicEndpoint) {
      try {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log('[API Request] Token added to headers');
        } else {
          console.warn('[API Request] No token found in storage');
        }
      } catch (error) {
        console.error('[API Request] Error getting token:', error);
      }
    } else {
      console.log('[API Request] Public endpoint - skipping token');
    }
    
    // Handle Content-Type based on data type
    if (config.data instanceof FormData) {
      console.log('[API Request] FormData detected - omitting Content-Type (React Native will set multipart/form-data)');
      // Completely remove Content-Type for FormData - React Native will set it with boundary
      delete config.headers['Content-Type'];
      delete config.headers['content-type'];
    } else if (!config.headers['Content-Type'] && !config.headers['content-type']) {
      // For non-FormData requests, set Content-Type to application/json if not already set
      config.headers['Content-Type'] = 'application/json';
      console.log('[API Request] Setting Content-Type to application/json');
    } else {
      console.log('[API Request] Content-Type already set:', config.headers['Content-Type'] || config.headers['content-type']);
    }
    
    console.log('[API Request] Headers:', Object.keys(config.headers));
    return config;
  },
  (error) => {
    console.error('[API Request] Interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - Handle token expiration
api.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url} - Status: ${response.status}`);
    if (response.data) {
      console.log('[API Response] Response data type:', Array.isArray(response.data) ? 'Array' : typeof response.data);
      console.log('[API Response] Response data preview:', JSON.stringify(response.data).substring(0, 200));
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    console.error(`[API Response] ❌ Error ${error.response?.status || 'NO_STATUS'} ${error.config?.method?.toUpperCase()} ${error.config?.url}`);
    console.error('[API Response] Error message:', error.message);
    if (error.response) {
      console.error('[API Response] Error response data:', error.response.data);
      console.error('[API Response] Error response headers:', error.response.headers);
    }

    // If error is 401 (Unauthorized) - definitely token expired/invalid
    if (error.response?.status === 401 && !originalRequest._retry) {
      console.log('[API Response] 401 Unauthorized - handling session expiration');
      originalRequest._retry = true;

      // Skip alert for token validation calls - token checker will handle it
      const isValidationCall = originalRequest.url?.includes('/api/auth/validate');
      
      // Clear all auth storage
      try {
        await clearAuthStorage();
        console.log('[API Response] All AsyncStorage data cleared');
        
        // Update auth store state by importing it lazily to avoid circular dependency
        // The store will be updated when App.js detects isAuthenticated change
        const { clearAuthState } = await import('../store/auth');
        clearAuthState();
      } catch (e) {
        console.error('[API Response] Error clearing auth state:', e);
      }

      // Navigate to login screen
      reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });

      // Show session expired message in Vietnamese (only for non-validation calls)
      // Token checker will handle alerts for validation calls
      if (!isValidationCall) {
        Alert.alert(
          'Phiên đăng nhập đã hết hạn',
          'Phiên đăng nhập của bạn đã hết hạn. Vui lòng đăng nhập lại.',
          [
            {
              text: 'Đồng ý',
              onPress: () => {
                // Navigation already handled above
              },
            },
          ],
          { cancelable: false }
        );
      }

      return Promise.reject({
        ...error,
        sessionExpired: true,
        message: 'Session expired. Please log in again.',
      });
    }

    // For 403 (Forbidden), treat as token expiration if it's from /api/auth/validate
    // For other endpoints, we'll still check, but if validation also returns 403, treat as expiration
    if (error.response?.status === 403 && !originalRequest._retry) {
      const isValidationCall = originalRequest.url?.includes('/api/auth/validate');
      
      // If 403 is from /api/auth/validate, token is definitely expired/invalid
      // No need to validate again (would cause infinite loop)
      if (isValidationCall) {
        console.log('[API Response] 403 Forbidden from /api/auth/validate - token is expired/invalid');
        originalRequest._retry = true;
        
        // Clear all auth storage
        try {
          await clearAuthStorage();
          console.log('[API Response] All AsyncStorage data cleared');
          
          const { clearAuthState } = await import('../store/auth');
          clearAuthState();
        } catch (e) {
          console.error('[API Response] Error clearing auth state:', e);
        }

        // Navigate to login screen
        reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });

        return Promise.reject({
          ...error,
          sessionExpired: true,
          message: 'Session expired. Please log in again.',
        });
      }
      
      // For other 403 errors, check if token is still valid before assuming expiration
      // A 403 could be due to missing permissions (e.g., not admin) rather than expired token
      console.log('[API Response] 403 Forbidden - checking if token is still valid');
      originalRequest._retry = true;

      // Validate token to see if it's expired or just a permission issue
      try {
        const { authService } = await import('./authService');
        await authService.validateToken();
        // Token is valid, so 403 is a permission issue, not token expiration
        console.log('[API Response] Token is valid, 403 is a permission issue, not token expiration');
        return Promise.reject(error); // Re-throw original error for caller to handle
      } catch (validationError) {
        // Token validation failed (likely also 403), so token is expired/invalid
        console.log('[API Response] Token validation failed, 403 is due to token expiration');
        
        // Clear all auth storage
        try {
          await clearAuthStorage();
          console.log('[API Response] All AsyncStorage data cleared');
          
          const { clearAuthState } = await import('../store/auth');
          clearAuthState();
        } catch (e) {
          console.error('[API Response] Error clearing auth state:', e);
        }

        // Navigate to login screen
        reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });

        // Show session expired message in Vietnamese
        Alert.alert(
          'Phiên đăng nhập đã hết hạn',
          'Phiên đăng nhập của bạn đã hết hạn. Vui lòng đăng nhập lại.',
          [
            {
              text: 'Đồng ý',
              onPress: () => {
                // Navigation already handled above
              },
            },
          ],
          { cancelable: false }
        );

        return Promise.reject({
          ...error,
          sessionExpired: true,
          message: 'Session expired. Please log in again.',
        });
      }
    }

    return Promise.reject(error);
  }
);

export default api;

