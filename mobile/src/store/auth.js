import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { authService } from '../services/authService';

export const useAuth = create((set, get) => ({
  token: null,
  role: null,
  isAuthenticated: false,
  isLoading: true,
  async load() {
    try {
      const token = await AsyncStorage.getItem('token');
      const role = await AsyncStorage.getItem('role');
      set({ token, role, isLoading: false });
      
      // Validate token if exists, but don't block on it
      if (token) {
        // Set authenticated optimistically
        set({ isAuthenticated: true });
        // Validate in background, but don't fail immediately if validation fails
        // This handles cases where network is slow or temporarily unavailable
        authService.validateToken().then((validation) => {
          set({ isAuthenticated: true, role: validation.role || role });
        }).catch((error) => {
          // Only clear token if it's actually invalid (401), not on network errors
          if (error.response?.status === 401 || error.sessionExpired) {
            set({ token: null, role: null, isAuthenticated: false });
            AsyncStorage.multiRemove(['token', 'role']).catch(() => {});
          } else {
            // Network error or other issues - keep token but mark as potentially invalid
            console.warn('Token validation failed, but keeping token:', error.message);
          }
        });
      } else {
        set({ isAuthenticated: false });
      }
    } catch (error) {
      console.error('Error loading auth:', error);
      set({ isLoading: false, isAuthenticated: false });
    }
  },
  async save(token, role) {
    await AsyncStorage.setItem('token', token || '');
    await AsyncStorage.setItem('role', role ? String(role) : '');
    // Don't validate immediately after save - trust the token is valid since we just got it
    set({ token, role, isAuthenticated: !!token });
  },
  async signOut() {
    await AsyncStorage.multiRemove(['token', 'role']);
    set({ token: null, role: null, isAuthenticated: false });
  },
  async validateToken() {
    try {
      const validation = await authService.validateToken();
      set({ isAuthenticated: true, role: validation.role });
      return true;
    } catch (error) {
      // Only clear token if it's actually invalid (401), not on network errors
      if (error.response?.status === 401 || error.sessionExpired) {
        await AsyncStorage.multiRemove(['token', 'role']);
        set({ token: null, role: null, isAuthenticated: false });
        return false;
      }
      // Network error - return false but don't clear token
      console.warn('Token validation failed due to network error:', error.message);
      return false;
    }
  },
}));


