import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../store/auth';
import { listingService } from '../services/listingService';
import { orderService } from '../services/orderService';
import { favoriteService } from '../services/favoriteService';
import { useFavorites } from '../store/favorites';
import { useAuthGuard } from '../hooks/useAuthGuard';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();

function ScreenWrapper({ title, children, navigation }) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="light" />
      <View style={styles.screenWrapperContainer}>
        <View style={styles.appbarHeader}>
          <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.appbarAction}>
            <Icon name="arrow-left" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.appbarContent}>{title}</Text>
          <View style={{ width: 40 }} />
        </View>
        {children}
      </View>
    </SafeAreaView>
  );
}

function MyListings({ navigation }) {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useAuthGuard(true);

  const loadData = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await listingService.getMyListings();
      setItems(Array.isArray(res) ? res : []);
    } catch (error) {
      if (error.sessionExpired) {
        Alert.alert('Session Expired', 'Session expired. Please log in again.', [
          { text: 'OK', onPress: () => navigation.replace('Login') }
        ]);
      } else {
        console.error('Error loading listings:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <ScreenWrapper title="Tin của tôi" navigation={navigation}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="file-document-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Chưa có tin đăng nào</Text>
          </View>
        ) : (
          items.map(it => (
            <TouchableOpacity
              key={it.id}
              style={styles.card}
              activeOpacity={0.7}
            >
              <View style={styles.cardIconContainer}>
                <Icon name="car" size={24} color="#6200ee" />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{`${it.brand} ${it.model}`}</Text>
                <View style={styles.cardMeta}>
                  <View style={styles.metaItem}>
                    <Icon name="calendar" size={14} color="#666" />
                    <Text style={styles.metaText}>{it.year}</Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>{it.status}</Text>
                  </View>
                </View>
              </View>
              <Icon name="chevron-right" size={20} color="#ccc" />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

function MyOrders({ navigation }) {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useAuthGuard(true);

  const loadData = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await orderService.getMyOrders();
      setItems(res || []);
    } catch (error) {
      if (error.sessionExpired) {
        Alert.alert('Session Expired', 'Session expired. Please log in again.', [
          { text: 'OK', onPress: () => navigation.replace('Login') }
        ]);
      } else {
        console.error('Error loading orders:', error);
      }
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'delivered':
        return '#4caf50';
      case 'pending':
        return '#ff9800';
      case 'cancelled':
        return '#f44336';
      default:
        return '#666';
    }
  };

  return (
    <ScreenWrapper title="Đơn hàng" navigation={navigation}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="cart-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Chưa có đơn hàng nào</Text>
          </View>
        ) : (
          items.map(it => (
            <TouchableOpacity
              key={it.id}
              style={styles.card}
              activeOpacity={0.7}
            >
              <View style={styles.cardIconContainer}>
                <Icon name="shopping" size={24} color="#6200ee" />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>
                  {it.listing?.brand} {it.listing?.model || 'N/A'}
                </Text>
                <View style={styles.cardMeta}>
                  <Text style={styles.priceText}>${it.amount?.toLocaleString() || '0'}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(it.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(it.status) }]}>
                      {it.status || 'N/A'}
                    </Text>
                  </View>
                </View>
              </View>
              <Icon name="chevron-right" size={20} color="#ccc" />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

function MyFavorites({ navigation }) {
  const { isAuthenticated, token } = useAuth();
  const [items, setItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const favorites = useFavorites((state) => state.favorites);
  const { loadFavoritesForListings } = useFavorites();

  useAuthGuard(true);

  const loadData = async () => {
    if (!isAuthenticated || !token) return;
    try {
      const res = await favoriteService.getMyFavorites();
      const favoriteList = res || [];
      setItems(favoriteList);
      
      // Update favorite store with loaded favorites
      if (favoriteList.length > 0) {
        const listingIds = favoriteList.map(f => f.listing?.id).filter(Boolean);
        await loadFavoritesForListings(listingIds);
      }
    } catch (error) {
      if (error.sessionExpired) {
        Alert.alert('Session Expired', 'Session expired. Please log in again.', [
          { text: 'OK', onPress: () => navigation.replace('Login') }
        ]);
      } else {
        console.error('Error loading favorites:', error);
      }
    }
  };

  useEffect(() => {
    if (isAuthenticated && token) {
      loadData();
    }
  }, [isAuthenticated, token]);

  // Refresh when screen comes into focus to sync favorite state
  useFocusEffect(
    React.useCallback(() => {
      if (isAuthenticated && token) {
        loadData();
      }
    }, [isAuthenticated, token])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <ScreenWrapper title="Yêu thích" navigation={navigation}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="heart-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Chưa có xe yêu thích nào</Text>
          </View>
        ) : (
          items.map(it => (
            <TouchableOpacity
              key={it.id}
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('ListingDetail', { id: it.listing?.id })}
            >
              <View style={styles.cardIconContainer}>
                <Icon name="heart" size={24} color="#e91e63" />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>
                  {it.listing?.brand} {it.listing?.model || 'N/A'}
                </Text>
                <Text style={styles.cardSubtitle}>
                  {it.listing?.year} • ${it.listing?.price?.toLocaleString() || 'N/A'}
                </Text>
              </View>
              <Icon name="chevron-right" size={20} color="#ccc" />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const tabScreenOptions = {
  headerShown: false,
  tabBarActiveTintColor: '#6200ee',
  tabBarInactiveTintColor: '#999',
  tabBarStyle: {
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderTopWidth: 0,
  },
};

export default function MyTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen
        name="MyListings"
        component={MyListings}
        options={{
          title: 'Tin của tôi',
          tabBarIcon: ({ color, size }) => <Icon name="file-document" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="MyOrders"
        component={MyOrders}
        options={{
          title: 'Đơn hàng',
          tabBarIcon: ({ color, size }) => <Icon name="shopping" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="MyFavorites"
        component={MyFavorites}
        options={{
          title: 'Yêu thích',
          tabBarIcon: ({ color, size }) => <Icon name="heart" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  screenWrapperContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  appbarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6200ee',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  appbarAction: {
    padding: 8,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#6200ee',
  },
  appbarContent: {
    flex: 1,
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    textAlign: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    elevation: 0,
    shadowColor: '#6200ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  cardIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f3e5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    elevation: 0,
    shadowColor: '#6200ee',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666',
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6200ee',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#e3f2fd',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976d2',
  },
});
