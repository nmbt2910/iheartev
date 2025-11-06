import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, RefreshControl, Alert, ActivityIndicator, Modal } from 'react-native';
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
  const [loading, setLoading] = useState(true);
  const [showListingTypeModal, setShowListingTypeModal] = useState(false);
  const [selectedType, setSelectedType] = useState('ALL'); // ALL, EV, BATTERY
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, priceLow, priceHigh, yearNew, yearOld
  const [showSortMenu, setShowSortMenu] = useState(false);
  const favorites = useFavorites((state) => state.favorites);
  const { loadFavoritesForListings, toggleFavorite } = useFavorites();
  
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

  const [allListings, setAllListings] = useState([]); // Store all listings for client-side filtering/sorting

  // Memoized sorting function
  const sortListings = useCallback((listings, sortOption) => {
    const sorted = [...listings];
    switch (sortOption) {
      case 'newest':
        return sorted.sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bTime - aTime;
        });
      case 'oldest':
        return sorted.sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return aTime - bTime;
        });
      case 'priceLow':
        return sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
      case 'priceHigh':
        return sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
      case 'yearNew':
        return sorted.sort((a, b) => (b.year || 0) - (a.year || 0));
      case 'yearOld':
        return sorted.sort((a, b) => (a.year || 0) - (b.year || 0));
      default:
        return sorted;
    }
  }, []);

  // Memoized filtered and sorted listings
  const filteredAndSortedListings = useMemo(() => {
    let filtered = allListings;
    
    // Filter by type
    if (selectedType !== 'ALL') {
      filtered = filtered.filter(l => l.type === selectedType);
    }
    
    // Sort listings
    return sortListings(filtered, sortBy);
  }, [allListings, selectedType, sortBy, sortListings]);

  // Update items when filtered/sorted listings change
  useEffect(() => {
    setItems(filteredAndSortedListings);
  }, [filteredAndSortedListings]);

  const loadListings = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: 0,
        size: 50,
        ...(searchQuery && { brand: searchQuery }),
        ...(filtersApplied && minYear !== null && { minYear }),
        ...(filtersApplied && maxPrice !== null && { maxPrice }),
        ...(filtersApplied && minCapacity !== null && { minCapacity }),
      };
      const res = await listingService.getListings(params);
      const listings = res.content || [];
      
      setAllListings(listings);
      
      // Load favorite status asynchronously - don't block UI
      if (isAuthenticated && token && listings.length > 0) {
        const listingIds = listings.map(l => l.id).filter(Boolean);
        if (listingIds.length > 0) {
          // Fire and forget - don't await
          loadFavoritesForListings(listingIds).catch((error) => {
            if (error.response?.status !== 401 && error.response?.status !== 403) {
              console.error('Error loading favorites:', error);
            }
          });
        }
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
  }, [searchQuery, filtersApplied, minYear, maxPrice, minCapacity, isAuthenticated, token, loadFavoritesForListings]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadListings();
    setRefreshing(false);
  }, [loadListings]);

  // Optimized handlers for instant UI response
  const handleSortMenuToggle = useCallback(() => {
    setShowSortMenu(prev => !prev);
    setShowFilters(false);
  }, []);

  const handleFilterToggle = useCallback(() => {
    setShowFilters(prev => !prev);
    setShowSortMenu(false);
  }, []);

  const handleSortSelect = useCallback((key) => {
    setSortBy(key);
    setShowSortMenu(false);
  }, []);

  const handleTypeFilterSelect = useCallback((type) => {
    setSelectedType(type);
  }, []);

  // Load listings when search query or filters change (not type/sort - those are client-side)
  useEffect(() => { 
    loadListings(); 
  }, [searchQuery, filtersApplied, loadListings]);

  // Reload listings when screen comes into focus to show new listings
  useFocusEffect(
    React.useCallback(() => {
      loadListings();
    }, [loadListings])
  );

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

        {/* Type Filter Bar */}
        <View style={styles.typeFilterContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.typeFilterScrollContent}
          >
            {[
              { key: 'ALL', label: 'Tất cả', icon: 'view-grid' },
              { key: 'EV', label: 'Xe điện', icon: 'car-electric' },
              { key: 'BATTERY', label: 'Pin điện', icon: 'battery-high' },
            ].map((filter) => (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.typeFilterButton,
                  selectedType === filter.key && styles.typeFilterButtonActive
                ]}
                onPress={() => handleTypeFilterSelect(filter.key)}
                activeOpacity={0.7}
              >
                <Icon 
                  name={filter.icon} 
                  size={18} 
                  color={selectedType === filter.key ? 'white' : '#6200ee'} 
                />
                <Text
                  style={[
                    styles.typeFilterButtonText,
                    selectedType === filter.key && styles.typeFilterButtonTextActive
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Sort and Filter Controls */}
        <View style={styles.controlsContainer}>
          <TouchableOpacity 
            onPress={handleSortMenuToggle}
            style={styles.sortButton}
            activeOpacity={0.7}
          >
            <Icon name="sort" size={18} color="#6200ee" />
            <Text style={styles.sortButtonText}>
              {sortBy === 'newest' ? 'Mới nhất' :
               sortBy === 'oldest' ? 'Cũ nhất' :
               sortBy === 'priceLow' ? 'Giá: Thấp → Cao' :
               sortBy === 'priceHigh' ? 'Giá: Cao → Thấp' :
               sortBy === 'yearNew' ? 'Năm: Mới → Cũ' :
               sortBy === 'yearOld' ? 'Năm: Cũ → Mới' : 'Sắp xếp'}
            </Text>
            <Icon name={showSortMenu ? "chevron-up" : "chevron-down"} size={18} color="#6200ee" />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleFilterToggle}
            style={styles.filterToggle}
            activeOpacity={0.7}
          >
            <Icon name={showFilters ? "chevron-up" : "filter"} size={18} color="#6200ee" />
            <Text style={styles.filterToggleText}>
              {showFilters ? 'Ẩn' : 'Lọc'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sort Menu - Render immediately without blocking */}
        {showSortMenu && (
          <View style={styles.sortMenuContainer} removeClippedSubviews={false}>
            {[
              { key: 'newest', label: 'Mới nhất', icon: 'clock-outline' },
              { key: 'oldest', label: 'Cũ nhất', icon: 'clock-outline' },
              { key: 'priceLow', label: 'Giá: Thấp → Cao', icon: 'arrow-up' },
              { key: 'priceHigh', label: 'Giá: Cao → Thấp', icon: 'arrow-down' },
              { key: 'yearNew', label: 'Năm: Mới → Cũ', icon: 'calendar' },
              { key: 'yearOld', label: 'Năm: Cũ → Mới', icon: 'calendar' },
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.sortOption,
                  sortBy === option.key && styles.sortOptionActive
                ]}
                onPress={() => handleSortSelect(option.key)}
                activeOpacity={0.7}
              >
                <Icon 
                  name={option.icon} 
                  size={18} 
                  color={sortBy === option.key ? 'white' : '#666'} 
                />
                <Text
                  style={[
                    styles.sortOptionText,
                    sortBy === option.key && styles.sortOptionTextActive
                  ]}
                >
                  {option.label}
                </Text>
                {sortBy === option.key && (
                  <Icon name="check" size={18} color="white" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

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
            {loading && !refreshing ? 'Đang tải...' : loading && searchQuery ? 'Đang tìm kiếm...' : 
             `Tìm thấy ${items.length} ${selectedType === 'ALL' ? 'mục' : selectedType === 'EV' ? 'xe điện' : 'pin điện'}`}
          </Text>
        </View>

        {loading && !refreshing && items.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6200ee" />
            <Text style={styles.loadingText}>Đang tải danh sách xe...</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name={selectedType === 'BATTERY' ? 'battery-off' : 'car-off'} size={64} color="#ccc" />
            <Text style={styles.emptyText}>
              {selectedType === 'ALL' ? 'Không tìm thấy mục nào' :
               selectedType === 'EV' ? 'Không tìm thấy xe điện nào' :
               'Không tìm thấy pin điện nào'}
            </Text>
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
                    <Icon 
                      name={item.type === 'BATTERY' ? 'battery-high' : 'car-electric'} 
                      size={24} 
                      color="#6200ee" 
                    />
                    <View style={styles.cardTitleContainer}>
                      <Text style={styles.cardTitle} numberOfLines={1} ellipsizeMode="tail">
                        {`${item.brand} ${item.model}`}
                      </Text>
                      <Text style={styles.cardSubtitle} numberOfLines={1}>
                        <Icon name="calendar-outline" size={14} color="#666" /> {item.year} • 
                        <Icon name="battery" size={14} color="#666" /> {item.batteryCapacityKWh || '-'} kWh
                        {item.type === 'BATTERY' && (
                          <>
                            {' • '}
                            <Icon name="battery-high" size={14} color="#ff9800" />
                            <Text style={styles.typeIndicator}> Pin</Text>
                          </>
                        )}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.cardHeaderRight}>
                    {/* Verified Badge - positioned in top right */}
                    <View style={styles.verifiedBadge}>
                      <Icon name="check-circle" size={12} color="#4caf50" />
                      <Text style={styles.verifiedBadgeText}>Đã kiểm định</Text>
                    </View>
                    {isAuthenticated && (
                      <TouchableOpacity
                        onPress={async (e) => {
                          e.stopPropagation();
                          try {
                            await toggleFavorite(item.id);
                          } catch (error) {
                            if (!error.sessionExpired) {
                              console.error('Error toggling favorite:', error);
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
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.priceContainer}>
                    <Text style={styles.cardPrice}>{formatVND(item.price)}</Text>
                    {item.conditionLabel && (
                      <View style={styles.conditionBadge}>
                        <Text style={styles.conditionText}>
                          {item.conditionLabel === 'used' ? 'Qua sử dụng' : item.conditionLabel}
                        </Text>
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
        onPress={() => setShowListingTypeModal(true)}
        activeOpacity={0.8}
      >
        <Icon name="plus" size={24} color="white" />
      </TouchableOpacity>

      {/* Listing Type Selection Modal */}
      <Modal
        visible={showListingTypeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowListingTypeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn loại tin đăng</Text>
              <TouchableOpacity onPress={() => setShowListingTypeModal(false)}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={styles.listingTypeOption}
              onPress={() => {
                setShowListingTypeModal(false);
                navigation.navigate('CreateListing');
              }}
              activeOpacity={0.7}
            >
              <View style={styles.listingTypeIconContainer}>
                <Icon name="car-electric" size={32} color="#6200ee" />
              </View>
              <View style={styles.listingTypeContent}>
                <Text style={styles.listingTypeTitle}>Bán xe điện</Text>
                <Text style={styles.listingTypeSubtitle}>Đăng tin bán xe điện đã qua sử dụng</Text>
              </View>
              <Icon name="chevron-right" size={24} color="#ccc" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.listingTypeOption, styles.listingTypeOptionLast]}
              onPress={() => {
                setShowListingTypeModal(false);
                navigation.navigate('CreateBatteryListing');
              }}
              activeOpacity={0.7}
            >
              <View style={styles.listingTypeIconContainer}>
                <Icon name="battery-high" size={32} color="#6200ee" />
              </View>
              <View style={styles.listingTypeContent}>
                <Text style={styles.listingTypeTitle}>Bán pin điện</Text>
                <Text style={styles.listingTypeSubtitle}>Đăng tin bán pin EV đã qua sử dụng</Text>
              </View>
              <Icon name="chevron-right" size={24} color="#ccc" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#6200ee',
    gap: 6,
  },
  filterToggleText: {
    fontSize: 14,
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    width: '100%',
  },
  cardHeaderRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 8,
    flexShrink: 0,
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
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '85%',
    maxWidth: 400,
    padding: 0,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  listingTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  listingTypeOptionLast: {
    borderBottomWidth: 0,
  },
  listingTypeIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f3e5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  listingTypeContent: {
    flex: 1,
  },
  listingTypeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  listingTypeSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  typeFilterContainer: {
    backgroundColor: 'white',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  typeFilterScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  typeFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 8,
    gap: 6,
  },
  typeFilterButtonActive: {
    backgroundColor: '#6200ee',
    borderColor: '#6200ee',
  },
  typeFilterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  typeFilterButtonTextActive: {
    color: 'white',
  },
  controlsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  sortButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#6200ee',
    gap: 8,
  },
  sortButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#6200ee',
  },
  sortMenuContainer: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
  },
  sortOptionActive: {
    backgroundColor: '#6200ee',
  },
  sortOptionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  sortOptionTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
    alignSelf: 'flex-end',
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4caf50',
  },
  typeIndicator: {
    fontSize: 14,
    color: '#ff9800',
    fontWeight: '600',
  },
});
