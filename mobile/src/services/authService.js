import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const authService = {
  async login(email, password) {
    const response = await api.post('/api/auth/login', { email, password });
    if (response.data.token) {
      await AsyncStorage.setItem('token', response.data.token);
      await AsyncStorage.setItem('role', response.data.role || '');
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
      await AsyncStorage.setItem('token', response.data.token);
      await AsyncStorage.setItem('role', 'MEMBER');
    }
    return response.data;
  },

  async validateToken() {
    try {
      const response = await api.get('/api/auth/validate');
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        // Token is invalid/expired
        await AsyncStorage.multiRemove(['token', 'role']);
        throw { ...error, sessionExpired: true };
      }
      throw error;
    }
  },
};

