import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuth } from './src/store/auth';
import { navigationRef } from './src/utils/navigationService';
import { useTokenChecker } from './src/hooks/useTokenChecker';
import { ConnectionErrorModal } from './src/components/ConnectionErrorModal';
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ListingDetailScreen from './src/screens/ListingDetailScreen';
import CreateListingScreen from './src/screens/CreateListingScreen';
import EditListingScreen from './src/screens/EditListingScreen';
import OrderDetailScreen from './src/screens/OrderDetailScreen';
import SellerProfileScreen from './src/screens/SellerProfileScreen';
import BuyerProfileScreen from './src/screens/BuyerProfileScreen';
import SellerRatingsScreen from './src/screens/SellerRatingsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import CreateReviewScreen from './src/screens/CreateReviewScreen';
import AdminScreen from './src/screens/AdminScreen';
import MyTabs from './src/screens/MyTabs';
import VideoPlayerScreen from './src/screens/VideoPlayerScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const screenOptions = {
  headerShown: false,
};

export default function App() {
  const { load, isAuthenticated, isLoading } = useAuth();
  const { connectionError, countdown } = useTokenChecker();

  React.useEffect(() => {
    // Load auth state on app start
    load();
  }, []);

  // Navigate to Login if not authenticated after loading
  React.useEffect(() => {
    if (!isLoading && navigationRef.isReady()) {
      if (!isAuthenticated) {
        // Reset navigation stack to show Login as initial screen
        navigationRef.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }
    }
  }, [isAuthenticated, isLoading]);

  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator 
          screenOptions={screenOptions}
          initialRouteName={isLoading ? undefined : (isAuthenticated ? 'Home' : 'Login')}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="ListingDetail" component={ListingDetailScreen} />
          <Stack.Screen name="CreateListing" component={CreateListingScreen} />
          <Stack.Screen name="EditListing" component={EditListingScreen} />
          <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
          <Stack.Screen name="SellerProfile" component={SellerProfileScreen} />
          <Stack.Screen name="BuyerProfile" component={BuyerProfileScreen} />
          <Stack.Screen name="SellerRatings" component={SellerRatingsScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="CreateReview" component={CreateReviewScreen} />
          <Stack.Screen name="Admin" component={AdminScreen} />
          <Stack.Screen name="My" component={MyTabs} />
          <Stack.Screen name="VideoPlayer" component={VideoPlayerScreen} />
        </Stack.Navigator>
      </NavigationContainer>
      <ConnectionErrorModal visible={connectionError} countdown={countdown} />
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
