import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Utility function to clear all auth state and data from storage
 * This is used by the API interceptor to avoid circular dependencies
 * Clears ALL AsyncStorage data when session expires
 */
export const clearAuthStorage = async () => {
  try {
    // Clear all AsyncStorage data
    await AsyncStorage.clear();
    console.log('[Auth Utils] All AsyncStorage data cleared');
  } catch (error) {
    console.error('Error clearing auth storage:', error);
  }
};

