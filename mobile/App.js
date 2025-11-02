import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuth } from './src/store/auth';
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ListingDetailScreen from './src/screens/ListingDetailScreen';
import CreateListingScreen from './src/screens/CreateListingScreen';
import OrderDetailScreen from './src/screens/OrderDetailScreen';
import SellerProfileScreen from './src/screens/SellerProfileScreen';
import SellerRatingsScreen from './src/screens/SellerRatingsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import CreateReviewScreen from './src/screens/CreateReviewScreen';
import AdminScreen from './src/screens/AdminScreen';
import MyTabs from './src/screens/MyTabs';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const screenOptions = {
  headerShown: false,
};

export default function App() {
  const { load, isAuthenticated, isLoading } = useAuth();
  const navigationRef = React.useRef(null);

  React.useEffect(() => {
    // Load auth state on app start
    load();
  }, []);

  // Navigate to Login if not authenticated after loading
  React.useEffect(() => {
    if (!isLoading && navigationRef.current) {
      if (!isAuthenticated) {
        // Reset navigation stack to show Login as initial screen
        navigationRef.current.reset({
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
          <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
          <Stack.Screen name="SellerProfile" component={SellerProfileScreen} />
          <Stack.Screen name="SellerRatings" component={SellerRatingsScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="CreateReview" component={CreateReviewScreen} />
          <Stack.Screen name="Admin" component={AdminScreen} />
          <Stack.Screen name="My" component={MyTabs} />
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
