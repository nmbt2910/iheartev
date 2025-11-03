import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Utility function to clear auth state from storage
 * This is used by the API interceptor to avoid circular dependencies
 */
export const clearAuthStorage = async () => {
  try {
    await AsyncStorage.multiRemove(['token', 'role']);
  } catch (error) {
    console.error('Error clearing auth storage:', error);
  }
};

