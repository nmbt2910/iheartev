import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import Slider from '@react-native-community/slider';
import { useAuth } from '../store/auth';
import { listingService } from '../services/listingService';
import { useFavorites } from '../store/favorites';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { formatVND } from '../utils/currencyFormatter';

export default function HomeScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState(''); // Debounced search query
  const [items, setItems] = useState([]);
  const { token, role, load: loadAuthState, signOut, isAuthenticated } = useAuth();
  const [minYear, setMinYear] = useState(null);
  const [maxPrice, setMaxPrice] = useState(null);
  const [minCapacity, setMinCapacity] = useState(null);
  const [filtersApplied, setFiltersApplied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(false);
  const favorites = useFavorites((state) => state.favorites);
  const { checkFavorite, loadFavoritesForListings, toggleFavorite } = useFavorites();
  
  const isFavorite = (listingId) => favorites.has(listingId);
  
  // Debounce search query for real-time search
  useEffect(() => {
    // If query is empty, search immediately
    if (!query.trim()) {
      setSearchQuery('');
      return;
    }
    
    // Very short delay for instant feel - only 50ms
    const timeoutId = setTimeout(() => {
      setSearchQuery(query);
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const loadListings = async () => {
    setLoading(true);
    try {
      const params = {
        page: 0,
        size: 20,
        ...(searchQuery && { brand: searchQuery }),
        // Only include filters if they were explicitly set by the user
        ...(filtersApplied && minYear !== null && { minYear }),
        ...(filtersApplied && maxPrice !== null && { maxPrice }),
        ...(filtersApplied && minCapacity !== null && { minCapacity }),
      };
      const res = await listingService.getListings(params);
      const listings = res.content || [];
      setItems(listings);
      
      // Load favorite status asynchronously after setting items for faster UI update
      if (isAuthenticated && token && listings.length > 0) {
        const listingIds = listings.map(l => l.id).filter(Boolean);
        // Don't await - let it load in background for better perceived performance
        loadFavoritesForListings(listingIds).catch((error) => {
          // Silently handle favorite check errors (user might not be authenticated yet)
          if (error.response?.status !== 401 && error.response?.status !== 403) {
            console.error('Error loading favorites:', error);
          }
        });
      }
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

  const onRefresh = async () => {
    setRefreshing(true);
    await loadListings();
    setRefreshing(false);
  };

  // Load listings when search query or filters change
  useEffect(() => { 
    loadListings(); 
  }, [searchQuery, filtersApplied]);

  // Don't reload auth state on mount - it's already loaded by App.js
  // This prevents double validation which can cause issues

  // Refresh favorite status when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (isAuthenticated && token && items.length > 0) {
        const listingIds = items.map(l => l.id).filter(Boolean);
        if (listingIds.length > 0) {
          loadFavoritesForListings(listingIds).catch((error) => {
            // Silently handle favorite check errors
            if (error.response?.status !== 401 && error.response?.status !== 403) {
              console.error('Error refreshing favorites:', error);
            }
          });
        }
      }
    }, [isAuthenticated, token, items.length])
  );

  // Sync favorites when items change
  useEffect(() => {
    if (isAuthenticated && token && items.length > 0) {
      const listingIds = items.map(l => l.id).filter(Boolean);
      if (listingIds.length > 0) {
        loadFavoritesForListings(listingIds).catch((error) => {
          if (error.response?.status !== 401 && error.response?.status !== 403) {
            console.error('Error syncing favorites:', error);
          }
        });
      }
    }
  }, [items.length, isAuthenticated, token]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.appbarHeader}>
        <View style={styles.appbarLeft}>
          <Icon name="car-electric" size={28} color="white" style={styles.logoIcon} />
          <Text style={styles.appbarContent}>iHeartEV</Text>
        </View>
        <View style={styles.appbarRight}>
          {token ? (
            <>
              {role === 'ADMIN' && (
                <TouchableOpacity onPress={() => navigation.navigate('Admin')} style={styles.appbarAction}>
                  <Icon name="shield-check" size={24} color="white" />
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                onPress={() => {
                  Alert.alert(
                    'Đăng xuất',
                    'Bạn có chắc chắn muốn đăng xuất?',
                    [
                      { text: 'Hủy', style: 'cancel' },
                      { text: 'Đăng xuất', style: 'destructive', onPress: signOut }
                    ]
                  );
                }} 
                style={styles.appbarAction}
                activeOpacity={0.7}
              >
                <View style={styles.logoutButton}>
                  <Icon name="logout" size={20} color="white" />
                </View>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.appbarAction}>
              <Icon name="login" size={24} color="white" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.searchContainer}>
          <View style={styles.searchBarContainer}>
            <Icon name="magnify" size={20} color="#666" style={styles.searchIcon} />
                    <TextInput
                      placeholder="Tìm theo hãng xe..."
                      placeholderTextColor="#999"
                      value={query}
                      onChangeText={setQuery}
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={styles.searchbar}
                      returnKeyType="search"
                    />
                    {query.length > 0 && (
                      <TouchableOpacity 
                        onPress={() => { 
                          setQuery(''); 
                          setSearchQuery('');
                        }} 
                        style={styles.clearButton}
                        activeOpacity={0.7}
                      >
                        <Icon name="close-circle" size={20} color="#666" />
                      </TouchableOpacity>
                    )}
          </View>
        </View>

        <TouchableOpacity 
          onPress={() => setShowFilters(!showFilters)} 
          style={styles.filterToggle}
          activeOpacity={0.7}
        >
          <Icon name={showFilters ? "chevron-up" : "filter"} size={20} color="#6200ee" />
          <Text style={styles.filterToggleText}>
            {showFilters ? 'Ẩn bộ lọc' : 'Hiện bộ lọc'}
          </Text>
        </TouchableOpacity>

        {showFilters && (
          <View style={styles.filterContainer}>
              <View style={styles.filterSection}>
                <View style={styles.filterLabelRow}>
                  <Icon name="calendar" size={18} color="#6200ee" />
                  <Text style={styles.filterLabel}>
                    Năm tối thiểu: {minYear !== null ? minYear : 'Không giới hạn'}
                  </Text>
                </View>
                <Slider
                  minimumValue={2010}
                  maximumValue={2025}
                  step={1}
                  value={minYear || 2010}
                  onValueChange={(val) => setMinYear(val >= 2010 ? val : null)}
                  minimumTrackTintColor="#6200ee"
                  maximumTrackTintColor="#e0e0e0"
                  thumbTintColor="#6200ee"
                  style={styles.slider}
                />
              </View>

              <View style={styles.filterSection}>
                <View style={styles.filterLabelRow}>
                  <Icon name="cash" size={18} color="#6200ee" />
                  <Text style={styles.filterLabel}>
                    Giá tối đa: {maxPrice !== null ? formatVND(maxPrice) : 'Không giới hạn'}
                  </Text>
                </View>
                <Slider
                  minimumValue={2000}
                  maximumValue={100000}
                  step={1000}
                  value={maxPrice || 100000}
                  onValueChange={(val) => setMaxPrice(val < 100000 ? val : null)}
                  minimumTrackTintColor="#6200ee"
                  maximumTrackTintColor="#e0e0e0"
                  thumbTintColor="#6200ee"
                  style={styles.slider}
                />
              </View>

              <View style={styles.filterSection}>
                <View style={styles.filterLabelRow}>
                  <Icon name="battery" size={18} color="#6200ee" />
                  <Text style={styles.filterLabel}>
                    Dung lượng pin tối thiểu: {minCapacity !== null ? `${minCapacity} kWh` : 'Không giới hạn'}
                  </Text>
                </View>
                <Slider
                  minimumValue={10}
                  maximumValue={120}
                  step={5}
                  value={minCapacity || 10}
                  onValueChange={(val) => setMinCapacity(val > 10 ? val : null)}
                  minimumTrackTintColor="#6200ee"
                  maximumTrackTintColor="#e0e0e0"
                  thumbTintColor="#6200ee"
                  style={styles.slider}
                />
              </View>

            <TouchableOpacity
              onPress={() => {
                setFiltersApplied(true);
                loadListings();
              }}
              style={styles.applyFilterButton}
              activeOpacity={0.8}
            >
              <Icon name="check-circle" size={20} color="white" />
              <Text style={styles.applyFilterButtonText}>Áp dụng bộ lọc</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => {
                setMinYear(null);
                setMaxPrice(null);
                setMinCapacity(null);
                setFiltersApplied(false);
                setQuery('');
                loadListings();
              }}
              style={styles.clearFilterButton}
              activeOpacity={0.8}
            >
              <Icon name="close-circle" size={18} color="#6200ee" />
              <Text style={styles.clearFilterButtonText}>Xóa bộ lọc</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.resultsHeader}>
          <Text style={styles.resultsCount}>
            {loading && searchQuery ? 'Đang tìm kiếm...' : `Tìm thấy ${items.length} xe`}
          </Text>
        </View>

        {items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="car-off" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Không tìm thấy xe nào</Text>
            <Text style={styles.emptySubtext}>Thử thay đổi bộ lọc của bạn</Text>
          </View>
        ) : (
          items.map(item => {
            const favorited = isAuthenticated && isFavorite(item.id);
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.card}
                onPress={() => navigation.navigate('ListingDetail', { id: item.id })}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <Icon name="car" size={24} color="#6200ee" />
                    <View style={styles.cardTitleContainer}>
                      <Text style={styles.cardTitle} numberOfLines={1} ellipsizeMode="tail">
                        {`${item.brand} ${item.model}`}
                      </Text>
                      <Text style={styles.cardSubtitle} numberOfLines={1}>
                        <Icon name="calendar-outline" size={14} color="#666" /> {item.year} • 
                        <Icon name="battery" size={14} color="#666" /> {item.batteryCapacityKWh || '-'} kWh
                      </Text>
                    </View>
                  </View>
                  {isAuthenticated && (
                    <TouchableOpacity
                      onPress={async (e) => {
                        e.stopPropagation();
                        const wasFavorite = favorited;
                        try {
                          // Optimistically update UI
                          await toggleFavorite(item.id);
                          // Immediately refresh from server to ensure sync
                          await checkFavorite(item.id);
                        } catch (error) {
                          if (!error.sessionExpired) {
                            console.error('Error toggling favorite:', error);
                            // Revert optimistic update on error
                            if (wasFavorite) {
                              await checkFavorite(item.id);
                            }
                          }
                        }
                      }}
                      activeOpacity={0.6}
                      style={[styles.favoriteIconTouchable, favorited && styles.favoriteIconTouchableActive]}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <View style={[styles.favoriteIconContainer, favorited && styles.favoriteIconContainerActive]}>
                        <Icon 
                          name={favorited ? "heart" : "heart-outline"} 
                          size={20} 
                          color={favorited ? "#ffffff" : "#999"}
                        />
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.priceContainer}>
                    <Text style={styles.cardPrice}>{formatVND(item.price)}</Text>
                    {item.conditionLabel && (
                      <View style={styles.conditionBadge}>
                        <Text style={styles.conditionText}>{item.conditionLabel}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.cardFooter}>
                  <Icon name="chevron-right" size={20} color="#6200ee" />
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, styles.fabLeft]}
        onPress={() => navigation.navigate('My')}
        activeOpacity={0.8}
      >
        <Icon name="account" size={24} color="white" />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.fab, styles.fabRight]}
        onPress={() => navigation.navigate('CreateListing')}
        activeOpacity={0.8}
      >
        <Icon name="plus" size={24} color="white" />
      </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#6200ee',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  appbarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  appbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    marginRight: 8,
  },
  appbarContent: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  appbarAction: {
    padding: 6,
    marginLeft: 8,
  },
  logoutButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  scrollView: {
    flex: 1,
  },
  searchContainer: {
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 18,
    height: 56,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    elevation: 1,
    shadowColor: '#6200ee',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchbar: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 4,
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#6200ee',
    elevation: 0,
    shadowColor: '#6200ee',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  filterToggleText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#6200ee',
  },
  filterContainer: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 20,
    borderRadius: 20,
    elevation: 0,
    shadowColor: '#6200ee',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  filterSection: {
    marginBottom: 20,
  },
  filterLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  filterLabel: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  applyFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6200ee',
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
    elevation: 0,
    shadowColor: '#6200ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  applyFilterButtonText: {
    marginLeft: 8,
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  clearFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 8,
    borderWidth: 2,
    borderColor: '#6200ee',
  },
  clearFilterButtonText: {
    marginLeft: 8,
    color: '#6200ee',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
  },
  resultsCount: {
    fontSize: 15,
    color: '#666',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#bbb',
  },
  card: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 20,
    padding: 20,
    paddingRight: 16,
    elevation: 0,
    shadowColor: '#6200ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    overflow: 'visible',
  },
  cardHeader: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  favoriteIconTouchable: {
    padding: 0,
    flexShrink: 0,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteIconTouchableActive: {
    padding: 0,
  },
  favoriteIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(233, 30, 99, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(233, 30, 99, 0.2)',
  },
  favoriteIconContainerActive: {
    backgroundColor: '#e91e63',
    borderColor: '#e91e63',
    elevation: 2,
    shadowColor: '#e91e63',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    marginRight: 10,
    maxWidth: '75%',
  },
  cardTitleContainer: {
    flex: 1,
    marginLeft: 12,
    minWidth: 0,
    maxWidth: '100%',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  cardBody: {
    marginBottom: 12,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6200ee',
  },
  conditionBadge: {
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  conditionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2e7d32',
  },
  cardFooter: {
    alignItems: 'flex-end',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    backgroundColor: '#6200ee',
    borderRadius: 28,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#6200ee',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  fabLeft: {
    left: 20,
  },
  fabRight: {
    right: 20,
  },
});
