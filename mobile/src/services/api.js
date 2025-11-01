import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add token to all requests except public endpoints
api.interceptors.request.use(
  async (config) => {
    // Skip adding token for public endpoints
    const publicEndpoints = ['/api/ai/overview', '/api/auth/login', '/api/auth/register'];
    const isPublicEndpoint = publicEndpoints.some(endpoint => config.url.includes(endpoint));
    
    if (!isPublicEndpoint) {
      try {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.error('Error getting token:', error);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle token expiration
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 (Unauthorized) and we haven't retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Clear stored auth data
      try {
        await AsyncStorage.multiRemove(['token', 'role']);
      } catch (e) {
        console.error('Error clearing auth data:', e);
      }

      // Show session expired message
      Alert.alert(
        'Session Expired',
        'Session expired. Please log in again.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigation will be handled by the app
              // This will trigger navigation in the component that receives the error
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

    return Promise.reject(error);
  }
);

export default api;

