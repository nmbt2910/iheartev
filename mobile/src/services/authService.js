import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const authService = {
  async login(email, password) {
    const response = await api.post('/api/auth/login', { email, password });
    if (response.data.token) {
      // Immediately store the new token and role
      await AsyncStorage.setItem('token', response.data.token);
      await AsyncStorage.setItem('role', response.data.role || '');
      console.log('[Auth Service] New token stored after login');
    }
    return response.data;
  },

  async register(email, password, fullName, phone) {
    const response = await api.post('/api/auth/register', {
      email,
      password,
      fullName,
      phone,
    });
    if (response.data.token) {
      // Immediately store the new token and role
      await AsyncStorage.setItem('token', response.data.token);
      await AsyncStorage.setItem('role', 'MEMBER');
      console.log('[Auth Service] New token stored after registration');
    }
    return response.data;
  },

  async validateToken() {
    try {
      const response = await api.get('/api/auth/validate');
      return response.data;
    } catch (error) {
      // Both 401 and 403 indicate expired/invalid token
      if (error.response?.status === 401 || error.response?.status === 403) {
        // Token is invalid/expired - clear from storage
        await AsyncStorage.multiRemove(['token', 'role']);
        throw { ...error, sessionExpired: true };
      }
      throw error;
    }
  },
};

