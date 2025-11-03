import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { buyerService } from '../services/buyerService';
import { formatVND } from '../utils/currencyFormatter';

export default function BuyerProfileScreen({ route, navigation }) {
  const { buyerId } = route.params;
  const [profile, setProfile] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview, purchases, reviews

  useEffect(() => {
    loadBuyerProfile();
  }, [buyerId]);

  const loadBuyerProfile = async () => {
    try {
      setLoading(true);
      const profileData = await buyerService.getBuyerProfile(buyerId);
      setProfile(profileData);
      setPurchases(profileData.successfulPurchases || []);
    } catch (error) {
      console.error('Error loading buyer profile:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin người mua');
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
      stars.push(<Icon key={i} name="star" size={18} color="#ff9800" />);
    }
    if (hasHalfStar) {
      stars.push(<Icon key="half" name="star-half-full" size={18} color="#ff9800" />);
    }
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Icon key={`empty-${i}`} name="star-outline" size={18} color="#ff9800" />);
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
          <Text style={styles.errorText}>Không tìm thấy thông tin người mua</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { buyer, averageRating, totalReviews, reviews: recentReviews } = profile;
  const purchaseCount = purchases.length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="light" />
      <View style={styles.container}>
        {/* Hero Header with Gradient Background */}
        <View style={styles.heroHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.heroTitle}>Hồ sơ người mua</Text>
          <View style={styles.backButtonSpacer} />
        </View>

        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Hero Card */}
          <View style={styles.heroCard}>
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarContainer}>
                <Icon name="account-circle" size={80} color="#6200ee" />
              </View>
            </View>
            <Text style={styles.buyerName}>{buyer.fullName || 'Người mua'}</Text>
            <View style={styles.ratingSection}>
              <View style={styles.starsContainer}>
                {renderStars(averageRating || 0)}
              </View>
              <Text style={styles.ratingText}>
                {averageRating ? averageRating.toFixed(1) : '0.0'} 
                <Text style={styles.ratingCount}> ({totalReviews || 0} đánh giá)</Text>
              </Text>
            </View>
          </View>

          {/* Tab Container */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
            onPress={() => setActiveTab('overview')}
            activeOpacity={0.7}
          >
              <Icon 
                name="view-dashboard" 
                size={18} 
                color={activeTab === 'overview' ? '#6200ee' : '#999'} 
              />
              <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
                Tổng quan
              </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'purchases' && styles.tabActive]}
            onPress={() => setActiveTab('purchases')}
            activeOpacity={0.7}
          >
              <Icon 
                name="shopping" 
                size={18} 
                color={activeTab === 'purchases' ? '#6200ee' : '#999'} 
              />
              <Text style={[styles.tabText, activeTab === 'purchases' && styles.tabTextActive]}>
                Đã mua ({purchaseCount})
              </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'reviews' && styles.tabActive]}
            onPress={() => setActiveTab('reviews')}
            activeOpacity={0.7}
          >
              <Icon 
                name="star" 
                size={18} 
                color={activeTab === 'reviews' ? '#6200ee' : '#999'} 
              />
              <Text style={[styles.tabText, activeTab === 'reviews' && styles.tabTextActive]}>
                Đánh giá ({totalReviews || 0})
              </Text>
          </TouchableOpacity>
        </View>

          {activeTab === 'overview' && (
            <>
              {/* Statistics Cards */}
              <View style={styles.statsGrid}>
                <View style={[styles.statCard, styles.statCardSuccess]}>
                  <View style={styles.statIconContainer}>
                    <Icon name="check-circle" size={28} color="#4caf50" />
                  </View>
                  <Text style={styles.statValue}>{purchaseCount}</Text>
                  <Text style={styles.statLabel}>Đã mua</Text>
                </View>
                <View style={[styles.statCard, styles.statCardWarning]}>
                  <View style={styles.statIconContainer}>
                    <Icon name="star" size={28} color="#ff9800" />
                  </View>
                  <Text style={styles.statValue}>{totalReviews || 0}</Text>
                  <Text style={styles.statLabel}>Đánh giá</Text>
                </View>
              </View>
                
              {/* Contact Info Card */}
              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <Icon name="information" size={22} color="#6200ee" />
                  <Text style={styles.sectionTitle}>Thông tin liên hệ</Text>
                </View>
                <View style={styles.contactInfo}>
                  <View style={styles.contactRow}>
                    <View style={styles.contactIconContainer}>
                      <Icon name="email" size={20} color="#6200ee" />
                    </View>
                    <View style={styles.contactTextContainer}>
                      <Text style={styles.contactLabel}>Email</Text>
                      <Text style={styles.contactText}>{buyer.email || 'Không có'}</Text>
                    </View>
                  </View>
                  {buyer.phone && (
                    <View style={styles.contactRow}>
                      <View style={styles.contactIconContainer}>
                        <Icon name="phone" size={20} color="#6200ee" />
                      </View>
                      <View style={styles.contactTextContainer}>
                        <Text style={styles.contactLabel}>Số điện thoại</Text>
                      <Text style={styles.contactText}>{buyer.phone}</Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>

              {/* Recent Reviews */}
              {recentReviews && recentReviews.length > 0 && (
                <View style={styles.card}>
                  <View style={styles.sectionHeader}>
                    <Icon name="star-circle" size={22} color="#6200ee" />
                    <Text style={styles.sectionTitle}>Đánh giá gần đây</Text>
                  </View>
                  {recentReviews.map((review, index) => (
                    <View 
                      key={review.id || index} 
                      style={[
                        styles.reviewItem,
                        index === recentReviews.length - 1 && styles.reviewItemLast
                      ]}
                    >
                      <View style={styles.reviewHeader}>
                        <View style={styles.reviewerInfo}>
                          <View style={styles.reviewerAvatar}>
                            <Icon name="account" size={20} color="#666" />
                          </View>
                          <Text style={styles.reviewerName}>
                            {review.reviewer?.fullName || 'Người dùng'}
                          </Text>
                        </View>
                        <View style={styles.reviewStars}>
                          {renderStars(review.rating || 0)}
                        </View>
                      </View>
                      {review.comment && (
                        <Text style={styles.reviewComment}>{review.comment}</Text>
                      )}
                      {/* Order Information */}
                      {review.order && (
                        <TouchableOpacity
                          style={styles.orderInfoContainer}
                          onPress={() => navigation.navigate('OrderDetail', { orderId: review.order.id })}
                          activeOpacity={0.7}
                        >
                          <View style={styles.orderInfoHeader}>
                            <Icon name="receipt" size={16} color="#6200ee" />
                            <Text style={styles.orderInfoLabel}>Đơn hàng:</Text>
                          </View>
                          <Text style={styles.orderInfoText} numberOfLines={1}>
                            {review.order.listing?.brand} {review.order.listing?.model} {review.order.listing?.year}
                          </Text>
                          <Text style={styles.orderInfoSubtext}>
                            Số tiền: {formatVND(review.order.amount || 0)}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {(!recentReviews || recentReviews.length === 0) && (
                <View style={styles.emptyCard}>
                  <Icon name="star-outline" size={64} color="#ccc" />
                  <Text style={styles.emptyText}>Chưa có đánh giá nào</Text>
                </View>
              )}
            </>
          )}

          {activeTab === 'purchases' && (
            <View style={styles.purchasesContainer}>
              {purchases.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Icon name="shopping-outline" size={80} color="#ccc" />
                  <Text style={styles.emptyTitle}>Chưa có đơn hàng nào</Text>
                  <Text style={styles.emptySubtitle}>Người mua này chưa có đơn hàng thành công nào</Text>
                </View>
              ) : (
                purchases.map((purchase) => (
                  <TouchableOpacity
                    key={purchase.id}
                    style={styles.purchaseCard}
                    onPress={() => navigation.navigate('OrderDetail', { orderId: purchase.id })}
                    activeOpacity={0.7}
                  >
                    <View style={styles.purchaseHeader}>
                      <View style={styles.purchaseIconContainer}>
                        <Icon name="receipt" size={24} color="#6200ee" />
                      </View>
                      <View style={styles.purchaseInfo}>
                        <Text style={styles.purchaseTitle} numberOfLines={1}>
                          {purchase.listing?.brand} {purchase.listing?.model} {purchase.listing?.year}
                        </Text>
                        <Text style={styles.purchaseAmount}>
                          {formatVND(purchase.amount || 0)}
                        </Text>
                      </View>
                      <Icon name="chevron-right" size={20} color="#999" />
                    </View>
                    {purchase.closedAt && (
                      <Text style={styles.purchaseDate}>
                        Hoàn thành: {new Date(purchase.closedAt).toLocaleDateString('vi-VN')}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {activeTab === 'reviews' && (
            <View style={styles.reviewsContainer}>
              {recentReviews && recentReviews.length > 0 ? (
                recentReviews.map((review, index) => (
                  <View 
                    key={review.id || index} 
                    style={[
                      styles.reviewCard,
                      index === recentReviews.length - 1 && styles.reviewCardLast
                    ]}
                  >
                    <View style={styles.reviewHeader}>
                      <View style={styles.reviewerInfo}>
                        <View style={styles.reviewerAvatar}>
                          <Icon name="account" size={20} color="#666" />
                        </View>
                        <Text style={styles.reviewerName}>
                          {review.reviewer?.fullName || 'Người dùng'}
                        </Text>
                      </View>
                      <View style={styles.reviewStars}>
                        {renderStars(review.rating || 0)}
                      </View>
                    </View>
                    {review.comment && (
                      <Text style={styles.reviewComment}>{review.comment}</Text>
                    )}
                    {review.order && (
                      <TouchableOpacity
                        style={styles.orderInfoContainer}
                        onPress={() => navigation.navigate('OrderDetail', { orderId: review.order.id })}
                        activeOpacity={0.7}
                      >
                        <View style={styles.orderInfoHeader}>
                          <Icon name="receipt" size={16} color="#6200ee" />
                          <Text style={styles.orderInfoLabel}>Đơn hàng:</Text>
                        </View>
                        <Text style={styles.orderInfoText} numberOfLines={1}>
                          {review.order.listing?.brand} {review.order.listing?.model} {review.order.listing?.year}
                        </Text>
                        <Text style={styles.orderInfoSubtext}>
                          Số tiền: {formatVND(review.order.amount || 0)}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              ) : (
                <View style={styles.emptyCard}>
                  <Icon name="star-outline" size={80} color="#ccc" />
                  <Text style={styles.emptyTitle}>Chưa có đánh giá</Text>
                  <Text style={styles.emptySubtitle}>Người mua này chưa nhận được đánh giá nào</Text>
                </View>
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
    backgroundColor: '#f5f7fa',
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6200ee',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
  },
  heroTitle: {
    flex: 1,
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginRight: 40,
  },
  backButtonSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 16,
    color: '#f44336',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  heroCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#6200ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    marginBottom: 16,
  },
  avatarWrapper: {
    marginBottom: 16,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f3f0ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'white',
    elevation: 4,
    shadowColor: '#6200ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  buyerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  ratingSection: {
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  ratingCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '400',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 4,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#f3f0ff',
  },
  tabText: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#6200ee',
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  statCardSuccess: {
    borderTopWidth: 3,
    borderTopColor: '#4caf50',
  },
  statCardWarning: {
    borderTopWidth: 3,
    borderTopColor: '#ff9800',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f0ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    flex: 1,
  },
  contactInfo: {
    gap: 16,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  contactIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f3f0ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactTextContainer: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
    fontWeight: '500',
  },
  contactText: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  reviewItem: {
    paddingBottom: 20,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  reviewItemLast: {
    borderBottomWidth: 0,
    marginBottom: 0,
    paddingBottom: 0,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  reviewerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewComment: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  orderInfoContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8f4ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e8dfff',
  },
  orderInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  orderInfoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6200ee',
  },
  orderInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  orderInfoSubtext: {
    fontSize: 12,
    color: '#666',
  },
  emptyCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 48,
    marginHorizontal: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  purchasesContainer: {
    gap: 12,
    paddingHorizontal: 16,
  },
  purchaseCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  purchaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  purchaseIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f0ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  purchaseInfo: {
    flex: 1,
  },
  purchaseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  purchaseAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6200ee',
  },
  purchaseDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  reviewsContainer: {
    gap: 16,
    paddingHorizontal: 16,
  },
  reviewCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  reviewCardLast: {
    marginBottom: 0,
  },
});

