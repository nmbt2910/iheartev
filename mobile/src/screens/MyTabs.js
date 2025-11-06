import React, { useEffect, useState, useMemo } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl, Alert, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../store/auth';
import { listingService } from '../services/listingService';
import { orderService } from '../services/orderService';
import { favoriteService } from '../services/favoriteService';
import { attachmentService } from '../services/attachmentService';
import { profileService } from '../services/profileService';
import { useFavorites } from '../store/favorites';
import { useAuthGuard } from '../hooks/useAuthGuard';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { formatVND } from '../utils/currencyFormatter';
import * as VideoThumbnails from 'expo-video-thumbnails';
import ProfileScreen from './ProfileScreen';

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
  const [allItems, setAllItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [listingImages, setListingImages] = useState({});
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL'); // ALL, EV, BATTERY

  useAuthGuard(true);

  const loadData = async () => {
    if (!isAuthenticated) return;
    try {
      const [listingsRes, ordersRes] = await Promise.all([
        listingService.getMyListings(),
        orderService.getMyOrders()
      ]);
      const listings = Array.isArray(listingsRes) ? listingsRes : [];
      
      // Sort listings: INACTIVE items go to the bottom
      const sortedListings = [...listings].sort((a, b) => {
        const aIsInactive = a.status?.toUpperCase() === 'INACTIVE';
        const bIsInactive = b.status?.toUpperCase() === 'INACTIVE';
        
        // If both are inactive or both are not inactive, maintain original order
        if (aIsInactive === bIsInactive) {
          return 0;
        }
        
        // If a is inactive, it should come after b
        if (aIsInactive) {
          return 1;
        }
        
        // If b is inactive, it should come after a
        return -1;
      });
      
      setAllItems(sortedListings);
      setItems(sortedListings);
      setOrders(Array.isArray(ordersRes) ? ordersRes : []);

      // Load images/thumbnails for listings
      const imagesMap = {};
      await Promise.all(
        listings.map(async (listing) => {
          try {
            const attachments = await attachmentService.getAttachmentsByListing(listing.id);
            if (attachments && attachments.length > 0) {
              const firstAttachment = attachments[0];
              if (firstAttachment.type === 'IMAGE') {
                // Use image directly
                imagesMap[listing.id] = attachmentService.getAttachmentUrl(firstAttachment.id);
              } else if (firstAttachment.type === 'VIDEO') {
                // Generate thumbnail for video
                try {
                  const videoUrl = attachmentService.getAttachmentUrl(firstAttachment.id);
                  const thumbnail = await VideoThumbnails.getThumbnailAsync(videoUrl, {
                    time: 1000,
                    quality: 0.8,
                  });
                  imagesMap[listing.id] = thumbnail.uri;
                } catch (thumbError) {
                  console.error(`Error generating thumbnail for listing ${listing.id}:`, thumbError);
                  // Fallback: try to find an image attachment
                  const imageAttachment = attachments.find(a => a.type === 'IMAGE');
                  if (imageAttachment) {
                    imagesMap[listing.id] = attachmentService.getAttachmentUrl(imageAttachment.id);
                  }
                }
              }
            }
          } catch (error) {
            console.error(`Error loading image for listing ${listing.id}:`, error);
          }
        })
      );
      setListingImages(imagesMap);
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

  const getOrderForListing = (listingId) => {
    // Get any active order (for actions) or CLOSED order (for display)
    return orders.find(o => o.listing?.id === listingId && 
                     o.status !== 'CANCELLED');
  };

  const getStatusColor = (status, order) => {
    // Priority: CLOSED order > PAID order > buyerPaymentConfirmed > listing status
    if (order && order.status === 'CLOSED') {
      return { bg: '#e3f2fd', text: '#1976d2' }; // Blue for sold
    }
    if (order && order.status === 'PAID') {
      return { bg: '#e8f5e9', text: '#2e7d32' }; // Green for paid
    }
    if (order && order.buyerPaymentConfirmed) {
      return { bg: '#fff3e0', text: '#f57c00' }; // Orange for payment confirmed (pending seller action)
    }
    
    const statusUpper = status?.toUpperCase();
    switch (statusUpper) {
      case 'APPROVED':
      case 'ACTIVE':
      case 'PUBLISHED':
        return { bg: '#e8f5e9', text: '#2e7d32' }; // Green for approved/active
      case 'PENDING':
        return { bg: '#fff3e0', text: '#f57c00' }; // Orange for pending
      case 'REJECTED':
        return { bg: '#ffebee', text: '#c62828' }; // Red for rejected
      case 'PAID':
        return { bg: '#e1f5fe', text: '#0277bd' };
      case 'SOLD':
      case 'CLOSED':
        return { bg: '#e3f2fd', text: '#1976d2' };
      case 'INACTIVE':
        return { bg: '#f5f5f5', text: '#999' }; // Gray for deleted
      default:
        return { bg: '#f5f5f5', text: '#666' };
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  // Refresh when screen comes into focus (navigating back or switching tabs)
  useFocusEffect(
    React.useCallback(() => {
      if (isAuthenticated) {
        loadData();
      }
    }, [isAuthenticated])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const filterByStatus = (status, type = selectedType) => {
    let filtered = [];
    
    // First filter by type
    let typeFiltered = allItems;
    if (type === 'EV') {
      typeFiltered = allItems.filter(item => item.type === 'EV');
    } else if (type === 'BATTERY') {
      typeFiltered = allItems.filter(item => item.type === 'BATTERY');
    }
    
    // Then filter by status
    if (status === 'ALL') {
      filtered = typeFiltered;
    } else if (status === 'PAID') {
      // Filter for listings with paid orders
      filtered = typeFiltered.filter(item => {
        const order = getOrderForListing(item.id);
        return order && order.status === 'PAID';
      });
    } else if (status === 'PENDING') {
      // Include both PENDING and REJECTED listings in "Chờ duyệt" section
      // (REJECTED listings can be edited and resubmitted)
      filtered = typeFiltered.filter(item => {
        const statusUpper = item.status?.toUpperCase();
        return statusUpper === 'PENDING' || statusUpper === 'REJECTED';
      });
    } else {
      filtered = typeFiltered.filter(item => {
        const statusUpper = item.status?.toUpperCase();
        return statusUpper === status.toUpperCase();
      });
    }
    
    // Ensure INACTIVE items are always at the bottom, even when filtering
    const sorted = [...filtered].sort((a, b) => {
      const aIsInactive = a.status?.toUpperCase() === 'INACTIVE';
      const bIsInactive = b.status?.toUpperCase() === 'INACTIVE';
      
      if (aIsInactive === bIsInactive) {
        return 0;
      }
      
      if (aIsInactive) {
        return 1;
      }
      
      return -1;
    });
    
    setItems(sorted);
  };

  useEffect(() => {
    if (allItems.length > 0) {
      filterByStatus(selectedStatus, selectedType);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allItems, selectedStatus, selectedType]);

  if (loading && !refreshing) {
    return (
      <ScreenWrapper title="Tin của tôi" navigation={navigation}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6200ee" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  const statusFilters = [
    { key: 'ALL', label: 'Tất cả' },
    { key: 'PENDING', label: 'Chờ duyệt' },
    { key: 'APPROVED', label: 'Đã duyệt' },
    { key: 'ACTIVE', label: 'Đang bán' },
    { key: 'PAID', label: 'Đã thanh toán' },
    { key: 'SOLD', label: 'Đã bán' },
    { key: 'INACTIVE', label: 'Đã xóa' },
  ];

  return (
    <ScreenWrapper title="Tin của tôi" navigation={navigation}>
      {/* Type Filter Bar */}
      {allItems.length > 0 && (
        <View style={styles.typeFilterContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
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
                onPress={() => {
                  setSelectedType(filter.key);
                }}
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
      )}
      
      {/* Status Filter Bar */}
      {allItems.length > 0 && (
        <View style={styles.filterContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
          >
            {statusFilters.map((filter) => (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.filterButton,
                  selectedStatus === filter.key && styles.filterButtonActive
                ]}
                onPress={() => {
                  setSelectedStatus(filter.key);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    selectedStatus === filter.key && styles.filterButtonTextActive
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {(items.length === 0 && !loading) ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Icon name="file-document-outline" size={80} color="#ccc" />
            </View>
            <Text style={styles.emptyTitle}>
              {selectedStatus === 'ALL' ? 'Chưa có tin đăng nào' : 'Không tìm thấy tin đăng'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {selectedStatus === 'ALL' 
                ? 'Tạo tin đăng mới để bắt đầu bán xe'
                : 'Thử chọn bộ lọc khác'}
            </Text>
            {selectedStatus === 'ALL' && (
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate('CreateListing')}
                activeOpacity={0.8}
              >
                <Icon name="plus" size={20} color="white" />
                <Text style={styles.emptyButtonText}>Tạo tin đăng mới</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : items.length > 0 ? (
          items.map(it => {
            const order = getOrderForListing(it.id);
            const imageUrl = listingImages[it.id];
            const statusStyle = getStatusColor(it.status, order);
            
            return (
              <TouchableOpacity
                key={it.id}
                style={styles.listingCard}
                activeOpacity={0.7}
                onPress={() => {
                  // If there's an order (PENDING, PAID, or CLOSED), navigate to order detail
                  // Seller can confirm payment or access the order after it's closed
                  if (order) {
                    navigation.navigate('OrderDetail', { orderId: order.id });
                  } else {
                    navigation.navigate('ListingDetail', { id: it.id, fromMyListings: true });
                  }
                }}
              >
                <View style={styles.listingImageContainer}>
                  {imageUrl ? (
                    <Image 
                      source={{ uri: imageUrl }} 
                      style={styles.listingImage} 
                      resizeMode="cover" 
                    />
                  ) : (
                    <View style={styles.listingImagePlaceholder}>
                      <Icon name="car-electric" size={100} color="#bbb" />
                    </View>
                  )}
                </View>
                
                <View style={styles.listingContent}>
                  <View style={styles.listingHeader}>
                    <View style={styles.listingTitleContainer}>
                      <Text style={styles.listingTitle} numberOfLines={1}>
                        {`${it.brand} ${it.model}`}
                      </Text>
                      <Text style={styles.listingYear}>{it.year}</Text>
                </View>
                    <View style={[styles.statusBadgeNew, { backgroundColor: statusStyle.bg }]}>
                      <Text style={[styles.statusTextNew, { color: statusStyle.text }]}>
                        {order && order.status === 'CLOSED' ? 'Đã bán' :
                         order && order.status === 'PAID' ? 'Đã thanh toán' :
                         order && order.buyerPaymentConfirmed ? 'Đã xác nhận' :
                         it.status === 'PENDING' ? 'Chờ duyệt' :
                         it.status === 'APPROVED' ? 'Đã duyệt' :
                         it.status === 'REJECTED' ? 'Đã từ chối' :
                         it.status === 'ACTIVE' ? 'Đang bán' :
                         it.status === 'PAID' ? 'Đã thanh toán' :
                         it.status === 'SOLD' ? 'Đã bán' :
                         it.status === 'INACTIVE' ? 'Đã xóa' :
                         it.status || 'N/A'}
                      </Text>
                    </View>
                  </View>

                  {/* Fixed Height Price Section */}
                  <View style={styles.priceSectionFixed}>
                    <View style={styles.detailRow}>
                      <Icon name="cash" size={16} color="#6200ee" />
                      <Text style={styles.listingPrice} numberOfLines={1}>
                        {formatVND(it.price)}
                      </Text>
                    </View>
                  </View>

                  {/* Fixed Height Details Section */}
                  <View style={styles.detailsSectionFixed}>
                    <View style={styles.detailsRow}>
                      <View style={styles.detailItemFixed}>
                        {it.batteryCapacityKWh ? (
                          <>
                            <Icon name="battery" size={16} color="#666" />
                            <Text style={styles.detailText} numberOfLines={1}>
                              {it.batteryCapacityKWh} kWh
                            </Text>
                          </>
                        ) : (
                          <View style={styles.detailPlaceholder} />
                        )}
                      </View>
                      <View style={styles.detailItemFixed}>
                        {it.conditionLabel ? (
                          <>
                            <Icon name="star" size={16} color="#666" />
                            <Text style={styles.detailText} numberOfLines={1}>
                              {it.conditionLabel}
                            </Text>
                          </>
                        ) : (
                          <View style={styles.detailPlaceholder} />
                        )}
                      </View>
                    </View>
                  </View>

                </View>

                <View style={styles.listingActions}>
                  <Icon name="chevron-right" size={24} color="#ccc" />
                </View>
              </TouchableOpacity>
            );
          })
        ) : null}
      </ScrollView>
    </ScreenWrapper>
  );
}

function MyOrders({ navigation }) {
  const { isAuthenticated } = useAuth();
  const [allOrders, setAllOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('BUYER'); // 'BUYER' or 'SELLER'
  const { token } = useAuth();
  const [currentUserId, setCurrentUserId] = useState(null);

  useAuthGuard(true);

  // Load current user ID to determine buyer/seller
  useEffect(() => {
    const loadCurrentUser = async () => {
      if (isAuthenticated && token) {
        try {
          const profile = await profileService.getMyProfile();
          const userId = profile?.user?.id || profile?.id;
          console.log('Loaded user profile:', { userId, profile });
          if (userId) {
            setCurrentUserId(userId);
          } else {
            console.warn('User ID not found in profile:', profile);
          }
        } catch (error) {
          console.error('Error loading user profile:', error);
        }
      }
    };
    loadCurrentUser();
  }, [isAuthenticated, token]);

  const loadData = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await orderService.getMyOrders();
      console.log('Orders loaded:', res?.length || 0);
      if (res && res.length > 0) {
        console.log('First order sample:', JSON.stringify(res[0], null, 2));
      }
      setAllOrders(Array.isArray(res) ? res : []);
    } catch (error) {
      if (error.sessionExpired) {
        Alert.alert('Session Expired', 'Session expired. Please log in again.', [
          { text: 'OK', onPress: () => navigation.replace('Login') }
        ]);
      } else {
        console.error('Error loading orders:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  // Filter orders by role
  const buyerOrders = useMemo(() => {
    if (!currentUserId) return [];
    return allOrders.filter(order => {
      const isBuyer = order.buyer && String(order.buyer.id) === String(currentUserId);
      return isBuyer;
    });
  }, [allOrders, currentUserId]);

  const sellerOrders = useMemo(() => {
    if (!currentUserId) return [];
    return allOrders.filter(order => {
      const isSeller = order.listing && 
                       order.listing.seller && 
                       String(order.listing.seller.id) === String(currentUserId);
      return isSeller;
    });
  }, [allOrders, currentUserId]);

  const items = activeTab === 'BUYER' ? buyerOrders : sellerOrders;

  useEffect(() => {
    if (currentUserId && allOrders.length > 0) {
      console.log('Buyer orders count:', buyerOrders.length);
      console.log('Seller orders count:', sellerOrders.length);
      console.log('Current user ID:', currentUserId);
    }
  }, [currentUserId, allOrders, buyerOrders.length, sellerOrders.length]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  // Refresh when screen comes into focus (navigating back from order detail)
  useFocusEffect(
    React.useCallback(() => {
      if (isAuthenticated) {
        loadData();
      }
    }, [isAuthenticated])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (loading && !refreshing) {
    return (
      <ScreenWrapper title="Đơn hàng" navigation={navigation}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6200ee" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  const getStatusColor = (status, buyerPaymentConfirmed) => {
    switch (status?.toUpperCase()) {
      case 'CLOSED':
        return '#4caf50';
      case 'PENDING':
        // If buyer has confirmed payment, use a different color
        return buyerPaymentConfirmed ? '#2196f3' : '#ff9800';
      case 'PAID':
        return '#2196f3';
      case 'CANCELLED':
        return '#f44336';
      default:
        return '#666';
    }
  };

  const getStatusText = (status, buyerPaymentConfirmed) => {
    switch (status?.toUpperCase()) {
      case 'CLOSED':
        return 'Hoàn thành';
      case 'CANCELLED':
        return 'Đã hủy';
      case 'PAID':
        return 'Đã thanh toán';
      case 'PENDING':
        return buyerPaymentConfirmed ? 'Đã xác nhận' : 'Chờ xử lý';
      default:
        return status || 'N/A';
    }
  };

  return (
    <ScreenWrapper title="Đơn hàng" navigation={navigation}>
      {/* Tab Selector */}
      <View style={styles.orderTabContainer}>
        <TouchableOpacity
          style={[styles.orderTab, activeTab === 'BUYER' && styles.orderTabActive]}
          onPress={() => setActiveTab('BUYER')}
          activeOpacity={0.7}
        >
          <Icon 
            name={activeTab === 'BUYER' ? 'cart' : 'cart-outline'} 
            size={18} 
            color={activeTab === 'BUYER' ? 'white' : '#666'} 
          />
          <Text style={[styles.orderTabText, activeTab === 'BUYER' && styles.orderTabTextActive]}>
            Đơn hàng mua
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.orderTab, activeTab === 'SELLER' && styles.orderTabActive]}
          onPress={() => setActiveTab('SELLER')}
          activeOpacity={0.7}
        >
          <Icon 
            name={activeTab === 'SELLER' ? 'store' : 'store-outline'} 
            size={18} 
            color={activeTab === 'SELLER' ? 'white' : '#666'} 
          />
          <Text style={[styles.orderTabText, activeTab === 'SELLER' && styles.orderTabTextActive]}>
            Đơn hàng bán
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name={activeTab === 'BUYER' ? "cart-outline" : "store-outline"} size={64} color="#ccc" />
            <Text style={styles.emptyText}>
              {activeTab === 'BUYER' 
                ? 'Chưa có đơn hàng mua nào' 
                : 'Chưa có đơn hàng bán nào'}
            </Text>
          </View>
        ) : (
          items.map(it => {
            // For buyer orders, show seller info. For seller orders, show buyer info
            const otherParty = activeTab === 'BUYER' 
              ? (it.listing?.seller || {})
              : (it.buyer || {});
            const otherPartyLabel = activeTab === 'BUYER' ? 'Người bán' : 'Người mua';

            return (
              <TouchableOpacity
                key={it.id}
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('OrderDetail', { orderId: it.id })}
              >
                <View style={styles.cardIconContainer}>
                  <Icon name={activeTab === 'BUYER' ? "shopping" : "store"} size={24} color="#6200ee" />
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>
                    {it.listing?.brand} {it.listing?.model || 'N/A'}
                  </Text>
                  {otherParty.fullName && (
                    <Text style={styles.cardSubtitle}>
                      {otherPartyLabel}: {otherParty.fullName}
                    </Text>
                  )}
                  <View style={styles.cardMeta}>
                    <Text style={styles.priceText}>{formatVND(it.amount || 0)}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(it.status, it.buyerPaymentConfirmed) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(it.status, it.buyerPaymentConfirmed) }]}>
                        {getStatusText(it.status, it.buyerPaymentConfirmed)}
                      </Text>
                    </View>
                  </View>
                </View>
                <Icon name="chevron-right" size={20} color="#ccc" />
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

function MyFavorites({ navigation }) {
  const { isAuthenticated, token } = useAuth();
  const [items, setItems] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [removingFavoriteId, setRemovingFavoriteId] = useState(null);
  const [selectedType, setSelectedType] = useState('ALL'); // ALL, EV, BATTERY
  const [selectedForCompare, setSelectedForCompare] = useState(new Set()); // Set of listing IDs
  const [compareMode, setCompareMode] = useState(false);
  const favorites = useFavorites((state) => state.favorites);
  const { loadFavoritesForListings, removeFavorite } = useFavorites();

  useAuthGuard(true);

  const loadData = async () => {
    if (!isAuthenticated || !token) return;
    try {
      setLoading(true);
      const res = await favoriteService.getMyFavorites();
      const favoriteList = res || [];
      setAllItems(favoriteList);
      
      // Filter by type
      filterByType(selectedType, favoriteList);
      
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
    } finally {
      setLoading(false);
    }
  };

  const filterByType = (type, itemsList = allItems) => {
    let filtered = itemsList;
    
    if (type === 'EV') {
      filtered = itemsList.filter(item => item.listing?.type === 'EV');
    } else if (type === 'BATTERY') {
      filtered = itemsList.filter(item => item.listing?.type === 'BATTERY');
    }
    
    setItems(filtered);
  };

  useEffect(() => {
    if (allItems.length > 0) {
      filterByType(selectedType);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType]);

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

  const handleRemoveFavorite = async (favoriteId, listingId, event) => {
    // Prevent navigation to listing detail
    if (event) event.stopPropagation();
    
    if (!listingId) return;
    
    try {
      setRemovingFavoriteId(favoriteId);
      await removeFavorite(listingId);
      // Remove from local state
      const updatedItems = allItems.filter(item => item.id !== favoriteId);
      setAllItems(updatedItems);
      filterByType(selectedType, updatedItems);
      // Remove from compare selection if selected
      setSelectedForCompare(prev => {
        const newSet = new Set(prev);
        newSet.delete(listingId);
        return newSet;
      });
    } catch (error) {
      if (error.sessionExpired) {
        Alert.alert('Session Expired', 'Session expired. Please log in again.', [
          { text: 'OK', onPress: () => navigation.replace('Login') }
        ]);
      } else {
        Alert.alert('Lỗi', error.response?.data?.error || 'Không thể xóa khỏi yêu thích. Vui lòng thử lại.');
      }
    } finally {
      setRemovingFavoriteId(null);
    }
  };

  const toggleCompareSelection = (listingId) => {
    // Find the listing being toggled
    const listingToToggle = items.find(item => item.listing?.id === listingId)?.listing;
    if (!listingToToggle) return;

    setSelectedForCompare(prev => {
      const newSet = new Set(prev);
      if (newSet.has(listingId)) {
        // Remove from selection
        newSet.delete(listingId);
      } else {
        // Check if we can add this item
        if (newSet.size >= 5) {
          Alert.alert('Thông báo', 'Bạn chỉ có thể so sánh tối đa 5 mục');
          return prev;
        }

        // If there are already selected items, check if the type matches
        if (newSet.size > 0) {
          // Get the first selected listing to check its type
          const firstSelectedId = Array.from(newSet)[0];
          const firstSelectedListing = items.find(item => item.listing?.id === firstSelectedId)?.listing;
          
          if (firstSelectedListing) {
            const firstType = firstSelectedListing.type;
            const newType = listingToToggle.type;
            
            // Prevent comparing different types
            if (firstType !== newType) {
              const firstTypeLabel = firstType === 'BATTERY' ? 'pin điện' : 'xe điện';
              const newTypeLabel = newType === 'BATTERY' ? 'pin điện' : 'xe điện';
              Alert.alert(
                'Không thể so sánh',
                `Bạn không thể so sánh ${firstTypeLabel} với ${newTypeLabel}. Vui lòng chỉ chọn các mục cùng loại để so sánh.`,
                [{ text: 'Đồng ý' }]
              );
              return prev;
            }
          }
        }

        // Add to selection if all checks pass
        newSet.add(listingId);
      }
      return newSet;
    });
  };

  const handleCompare = () => {
    if (selectedForCompare.size < 2) {
      Alert.alert('Thông báo', 'Vui lòng chọn ít nhất 2 mục để so sánh');
      return;
    }
    
    const selectedListings = items.filter(item => 
      item.listing?.id && selectedForCompare.has(item.listing.id)
    ).map(item => item.listing);
    
    // Double-check that all selected listings are of the same type
    const types = new Set(selectedListings.map(l => l.type).filter(Boolean));
    if (types.size > 1) {
      Alert.alert(
        'Lỗi',
        'Không thể so sánh các mục khác loại. Vui lòng chỉ chọn xe điện hoặc pin điện để so sánh.',
        [{ text: 'Đồng ý' }]
      );
      return;
    }
    
    navigation.navigate('CompareListings', { listings: selectedListings });
  };

  const clearCompareSelection = () => {
    setSelectedForCompare(new Set());
    setCompareMode(false);
  };

  if (loading && !refreshing) {
    return (
      <ScreenWrapper title="Yêu thích" navigation={navigation}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6200ee" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper title="Yêu thích" navigation={navigation}>
      {/* Type Filter Bar */}
      {allItems.length > 0 && (
        <View style={styles.typeFilterContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
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
                onPress={() => {
                  setSelectedType(filter.key);
                }}
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
      )}

      {/* Compare Mode Controls */}
      {items.length > 0 && (
        <View style={styles.compareControlsContainer}>
          <TouchableOpacity
            style={[styles.compareModeButton, compareMode && styles.compareModeButtonActive]}
            onPress={() => {
              setCompareMode(!compareMode);
              if (!compareMode) {
                setSelectedForCompare(new Set());
              }
            }}
            activeOpacity={0.7}
          >
            <Icon 
              name={compareMode ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"} 
              size={20} 
              color={compareMode ? "white" : "#6200ee"} 
            />
            <Text style={[styles.compareModeButtonText, compareMode && styles.compareModeButtonTextActive]}>
              So sánh
            </Text>
          </TouchableOpacity>
          
          {compareMode && selectedForCompare.size > 0 && (
            <View style={styles.compareActionsContainer}>
              <Text style={styles.compareCountText}>
                Đã chọn: {selectedForCompare.size}/5
              </Text>
              <TouchableOpacity
                style={[styles.compareButton, selectedForCompare.size < 2 && styles.compareButtonDisabled]}
                onPress={handleCompare}
                disabled={selectedForCompare.size < 2}
                activeOpacity={0.7}
              >
                <Icon name="compare-horizontal" size={18} color="white" />
                <Text style={styles.compareButtonText}>So sánh ({selectedForCompare.size})</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.clearCompareButton}
                onPress={clearCompareSelection}
                activeOpacity={0.7}
              >
                <Icon name="close" size={18} color="#6200ee" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="heart-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>
              {selectedType === 'ALL' ? 'Chưa có yêu thích nào' : 
               selectedType === 'EV' ? 'Chưa có xe điện yêu thích nào' : 
               'Chưa có pin điện yêu thích nào'}
            </Text>
          </View>
        ) : (
          items.map(it => {
            const listingId = it.listing?.id;
            const isSelected = listingId && selectedForCompare.has(listingId);
            
            // Check if this item can be selected (same type as already selected items)
            let canSelect = true;
            if (compareMode && selectedForCompare.size > 0 && !isSelected) {
              const firstSelectedId = Array.from(selectedForCompare)[0];
              const firstSelectedListing = items.find(item => item.listing?.id === firstSelectedId)?.listing;
              if (firstSelectedListing && it.listing) {
                canSelect = firstSelectedListing.type === it.listing.type;
              }
            }
            
            return (
              <TouchableOpacity
                key={it.id}
                style={[
                  styles.card, 
                  compareMode && isSelected && styles.cardSelected,
                  compareMode && !canSelect && !isSelected && styles.cardDisabled
                ]}
                activeOpacity={0.7}
                onPress={() => {
                  if (compareMode) {
                    if (canSelect || isSelected) {
                      toggleCompareSelection(listingId);
                    } else {
                      const firstSelectedId = Array.from(selectedForCompare)[0];
                      const firstSelectedListing = items.find(item => item.listing?.id === firstSelectedId)?.listing;
                      const firstTypeLabel = firstSelectedListing?.type === 'BATTERY' ? 'pin điện' : 'xe điện';
                      const currentTypeLabel = it.listing?.type === 'BATTERY' ? 'pin điện' : 'xe điện';
                      Alert.alert(
                        'Không thể so sánh',
                        `Bạn đã chọn ${firstTypeLabel}. Không thể so sánh với ${currentTypeLabel}. Vui lòng chỉ chọn các mục cùng loại.`,
                        [{ text: 'Đồng ý' }]
                      );
                    }
                  } else {
                    navigation.navigate('ListingDetail', { id: listingId });
                  }
                }}
              >
                {compareMode && (
                  <TouchableOpacity
                    style={styles.checkboxContainer}
                    onPress={() => toggleCompareSelection(listingId)}
                    activeOpacity={0.7}
                  >
                    <Icon 
                      name={isSelected ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"} 
                      size={28} 
                      color={isSelected ? "#6200ee" : "#ccc"} 
                    />
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity
                  style={styles.cardIconContainer}
                  activeOpacity={0.7}
                  onPress={(e) => handleRemoveFavorite(it.id, listingId, e)}
                  disabled={removingFavoriteId === it.id}
                >
                  {removingFavoriteId === it.id ? (
                    <ActivityIndicator size="small" color="#e91e63" />
                  ) : (
                    <Icon name="heart" size={24} color="#e91e63" />
                  )}
                </TouchableOpacity>
                <View style={styles.cardContent}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardTitle}>
                      {it.listing?.brand} {it.listing?.model || 'N/A'}
                    </Text>
                    {it.listing?.type && (
                      <View style={[styles.typeBadge, it.listing.type === 'BATTERY' && styles.typeBadgeBattery]}>
                        <Icon 
                          name={it.listing.type === 'BATTERY' ? 'battery-high' : 'car-electric'} 
                          size={12} 
                          color="white" 
                        />
                        <Text style={styles.typeBadgeText}>
                          {it.listing.type === 'BATTERY' ? 'Pin' : 'Xe'}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.cardSubtitle}>
                    {it.listing?.year} • {it.listing?.price ? formatVND(it.listing.price) : 'N/A'}
                  </Text>
                </View>
                {!compareMode && (
                  <Icon name="chevron-right" size={20} color="#ccc" />
                )}
              </TouchableOpacity>
            );
          })
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
      <Tab.Screen
        name="Profile"
        options={{
          title: 'Hồ sơ',
          tabBarIcon: ({ color, size }) => <Icon name="account" size={size} color={color} />,
        }}
      >
        {({ navigation }) => <ProfileScreen navigation={navigation} />}
      </Tab.Screen>
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
  filterContainer: {
    backgroundColor: 'white',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#6200ee',
    borderColor: '#6200ee',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6200ee',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 28,
    gap: 8,
    elevation: 4,
    shadowColor: '#6200ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listingCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 20,
    marginBottom: 12, /* Changed from 16 to 12 */
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#6200ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    alignItems: 'flex-start',
  },
  listingImageContainer: {
    width: 120,
    height: 120,
    overflow: 'hidden',
    borderRadius: 0,
    backgroundColor: '#f0f0f0',
    margin: 0,
    padding: 0,
  },
  listingImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    margin: 0,
    padding: 0,
  },
  listingImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e8e8e8',
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    margin: 0,
    padding: 0,
  },
  listingContent: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 0, /* Changed from 10 to 0 */
    justifyContent: 'flex-start',
    alignSelf: 'flex-start',
  },
  listingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
    gap: 12,
  },
  listingTitleContainer: {
    flex: 1,
  },
  listingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  listingYear: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  statusBadgeNew: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusTextNew: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priceSectionFixed: {
    height: 28,
    marginTop: 0,
    marginBottom: 0,
    justifyContent: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  listingPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6200ee',
    letterSpacing: -0.3,
    flex: 1,
  },
  detailsSectionFixed: {
    height: 24,
    marginTop: 0,
    marginBottom: 0,
    justifyContent: 'center',
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  detailItemFixed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    flex: 1,
  },
  detailPlaceholder: {
    height: 16,
    width: '100%',
  },
  orderBadgeContainer: {
    height: 32,
    marginTop: 0,
    justifyContent: 'center',
  },
  orderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#fff3e0',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffe0b2',
    gap: 6,
    maxWidth: '100%',
  },
  orderBadgeText: {
    fontSize: 12,
    color: '#f57c00',
    fontWeight: '600',
    flex: 1,
    flexShrink: 1,
  },
  listingActions: {
    justifyContent: 'center',
    paddingRight: 16,
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
  statusBadgeOrder: {
    backgroundColor: '#fff3e0',
  },
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#fff3e0',
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 6,
  },
  orderInfoText: {
    fontSize: 12,
    color: '#ff9800',
    fontWeight: '600',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976d2',
  },
  profileTabContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    gap: 16,
    elevation: 0,
    shadowColor: '#6200ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  profileButtonText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  orderTabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 8,
  },
  orderTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 8,
  },
  orderTabActive: {
    backgroundColor: '#6200ee',
    borderColor: '#6200ee',
  },
  orderTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  orderTabTextActive: {
    color: 'white',
  },
  typeFilterContainer: {
    backgroundColor: 'white',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
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
  compareControlsContainer: {
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  compareModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: '#6200ee',
    gap: 8,
    alignSelf: 'flex-start',
  },
  compareModeButtonActive: {
    backgroundColor: '#6200ee',
    borderColor: '#6200ee',
  },
  compareModeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6200ee',
  },
  compareModeButtonTextActive: {
    color: 'white',
  },
  compareActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },
  compareCountText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    flex: 1,
  },
  compareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6200ee',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
  },
  compareButtonDisabled: {
    opacity: 0.5,
  },
  compareButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  clearCompareButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
  },
  checkboxContainer: {
    padding: 8,
    marginRight: 8,
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: '#6200ee',
    backgroundColor: '#f3e5f5',
  },
  cardDisabled: {
    opacity: 0.5,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6200ee',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  typeBadgeBattery: {
    backgroundColor: '#ff9800',
  },
  typeBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
});