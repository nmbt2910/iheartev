import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Alert } from 'react-native';
import { useAuth } from '../store/auth';

/**
 * Hook to protect routes that require authentication
 * Redirects to login if user is not authenticated
 */
export function useAuthGuard(requireAuth = true) {
  const { token, isAuthenticated, validateToken } = useAuth();
  const navigation = useNavigation();

  useEffect(() => {
    if (requireAuth && !token) {
      Alert.alert(
        'Authentication Required',
        'Please log in to access this feature.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } else if (requireAuth && token) {
      // Periodically validate token
      validateToken().catch((error) => {
        if (error.sessionExpired) {
          Alert.alert(
            'Session Expired',
            'Session expired. Please log in again.',
            [{ text: 'OK', onPress: () => navigation.replace('Login') }],
            { cancelable: false }
          );
        }
      });
    }
  }, [requireAuth, token, navigation, validateToken]);

  return { isAuthenticated: !!token && isAuthenticated };
}

