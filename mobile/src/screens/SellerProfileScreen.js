import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { sellerService } from '../services/sellerService';
import { formatVND } from '../utils/currencyFormatter';

export default function SellerProfileScreen({ route, navigation }) {
  const { sellerId } = route.params;
  const [profile, setProfile] = useState(null);
  const [currentListings, setCurrentListings] = useState([]);
  const [soldListings, setSoldListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview, listings, sold

  useEffect(() => {
    loadSellerProfile();
  }, [sellerId]);

  const loadSellerProfile = async () => {
    try {
      setLoading(true);
      const profileData = await sellerService.getSellerProfile(sellerId);
      setProfile(profileData);
      // Extract listings from profile data
      setCurrentListings(profileData.activeListings || []);
      setSoldListings(profileData.soldListings || []);
    } catch (error) {
      console.error('Error loading seller profile:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin người bán');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Icon key={i} name="star" size={16} color="#ff9800" />);
    }
    if (hasHalfStar) {
      stars.push(<Icon key="half" name="star-half-full" size={16} color="#ff9800" />);
    }
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Icon key={`empty-${i}`} name="star-outline" size={16} color="#ff9800" />);
    }
    return stars;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6200ee" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Không tìm thấy thông tin người bán</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { seller, averageRating, totalReviews, activeListings: activeListingsData, soldListings: soldListingsData, reviews: recentReviews } = profile;
  
  // Calculate counts from actual data
  const currentCount = currentListings.length;
  const soldCount = soldListings.length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.appbarHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.appbarAction}>
            <Icon name="arrow-left" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.appbarContent}>Hồ sơ người bán</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
            onPress={() => setActiveTab('overview')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>Tổng quan</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'listings' && styles.tabActive]}
            onPress={() => setActiveTab('listings')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'listings' && styles.tabTextActive]}>Tin đang bán ({currentCount})</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'sold' && styles.tabActive]}
            onPress={() => setActiveTab('sold')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'sold' && styles.tabTextActive]}>Đã bán ({soldCount})</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {activeTab === 'overview' && (
            <>
              {/* Seller Info Card */}
              <View style={styles.card}>
                <View style={styles.sellerHeader}>
                  <View style={styles.avatarContainer}>
                    <Icon name="account-circle" size={64} color="#6200ee" />
                  </View>
                  <View style={styles.sellerInfo}>
                    <Text style={styles.sellerName}>{seller.fullName}</Text>
                    <View style={styles.ratingContainer}>
                      <View style={styles.starsContainer}>
                        {renderStars(averageRating)}
                      </View>
                      <Text style={styles.ratingText}>
                        {averageRating.toFixed(1)} ({totalReviews} đánh giá)
                      </Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.contactInfo}>
                  <View style={styles.contactRow}>
                    <Icon name="email-outline" size={18} color="#666" />
                    <Text style={styles.contactText}>{seller.email}</Text>
                  </View>
                  {seller.phone && (
                    <View style={styles.contactRow}>
                      <Icon name="phone-outline" size={18} color="#666" />
                      <Text style={styles.contactText}>{seller.phone}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Statistics */}
              <View style={styles.statsCard}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{currentCount}</Text>
                  <Text style={styles.statLabel}>Tin đang bán</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{soldCount}</Text>
                  <Text style={styles.statLabel}>Đã bán</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{totalReviews}</Text>
                  <Text style={styles.statLabel}>Đánh giá</Text>
                </View>
              </View>

              {/* Recent Reviews */}
              {recentReviews && recentReviews.length > 0 && (
                <View style={styles.card}>
                  <View style={styles.sectionHeader}>
                    <Icon name="star" size={20} color="#6200ee" />
                    <Text style={styles.sectionTitle}>Đánh giá gần đây</Text>
                    <TouchableOpacity
                      onPress={() => navigation.navigate('SellerRatings', { sellerId })}
                      style={styles.viewAllButton}
                    >
                      <Text style={styles.viewAllText}>Xem tất cả</Text>
                      <Icon name="chevron-right" size={20} color="#6200ee" />
                    </TouchableOpacity>
                  </View>
                  {recentReviews.map((review) => (
                    <View key={review.id} style={styles.reviewItem}>
                      <View style={styles.reviewHeader}>
                        <Text style={styles.reviewerName}>{review.reviewer.fullName}</Text>
                        <View style={styles.reviewStars}>
                          {renderStars(review.rating)}
                        </View>
                      </View>
                      {review.comment && (
                        <Text style={styles.reviewComment}>{review.comment}</Text>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </>
          )}

          {activeTab === 'listings' && (
            <View style={styles.listingsContainer}>
              {currentListings.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Icon name="car-outline" size={64} color="#ccc" />
                  <Text style={styles.emptyText}>Chưa có tin đang bán</Text>
                </View>
              ) : (
                currentListings.map((listing) => (
                  <TouchableOpacity
                    key={listing.id}
                    style={styles.listingCard}
                    onPress={() => navigation.navigate('ListingDetail', { id: listing.id })}
                    activeOpacity={0.7}
                  >
                    <View style={styles.listingHeader}>
                      <Text style={styles.listingTitle}>{listing.brand} {listing.model}</Text>
                      <Text style={styles.listingPrice}>{formatVND(listing.price)}</Text>
                    </View>
                    <Text style={styles.listingSubtitle}>
                      {listing.year} • {listing.batteryCapacityKWh} kWh
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {activeTab === 'sold' && (
            <View style={styles.listingsContainer}>
              {soldListings.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Icon name="check-circle-outline" size={64} color="#ccc" />
                  <Text style={styles.emptyText}>Chưa có tin đã bán</Text>
                </View>
              ) : (
                soldListings.map((listing) => (
                  <TouchableOpacity
                    key={listing.id}
                    style={styles.listingCard}
                    onPress={() => navigation.navigate('ListingDetail', { id: listing.id })}
                    activeOpacity={0.7}
                  >
                    <View style={styles.listingHeader}>
                      <Text style={styles.listingTitle}>{listing.brand} {listing.model}</Text>
                      <Text style={styles.listingPrice}>{formatVND(listing.price)}</Text>
                    </View>
                    <Text style={styles.listingSubtitle}>
                      {listing.year} • {listing.batteryCapacityKWh} kWh
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </ScrollView>
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
    backgroundColor: '#6200ee',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  appbarAction: {
    padding: 8,
  },
  appbarContent: {
    flex: 1,
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#f44336',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#6200ee',
  },
  tabText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#6200ee',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  sellerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    marginRight: 16,
  },
  sellerInfo: {
    flex: 1,
  },
  sellerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  ratingContainer: {
    gap: 4,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
  },
  contactInfo: {
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#333',
  },
  statsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6200ee',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    color: '#6200ee',
    fontWeight: '600',
  },
  reviewItem: {
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewComment: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  listingsContainer: {
    gap: 12,
  },
  listingCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  listingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  listingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  listingPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6200ee',
    marginLeft: 12,
  },
  listingSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
});

