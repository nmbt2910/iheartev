import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { sellerService } from '../services/sellerService';
import { formatVND } from '../utils/currencyFormatter';

export default function SellerRatingsScreen({ route, navigation }) {
  const { sellerId } = route.params;
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReviews();
  }, [sellerId]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const data = await sellerService.getSellerReviews(sellerId);
      const reviewsData = Array.isArray(data) ? data : [];
      console.log('Loaded reviews:', reviewsData.length);
      if (reviewsData.length > 0) {
        console.log('First review sample:', JSON.stringify(reviewsData[0], null, 2));
      }
      setReviews(reviewsData);
    } catch (error) {
      console.error('Error loading reviews:', error);
      Alert.alert('Lỗi', 'Không thể tải đánh giá');
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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.appbarHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.appbarAction}>
            <Icon name="arrow-left" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.appbarContent}>Đánh giá</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {reviews.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="star-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>Chưa có đánh giá nào</Text>
            </View>
          ) : (
            reviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewerInfo}>
                    <View style={styles.avatarContainer}>
                      <Icon name="account-circle" size={40} color="#6200ee" />
                    </View>
                    <View style={styles.reviewerDetails}>
                      <Text style={styles.reviewerName}>
                        {review.reviewer?.fullName || 'Người dùng'}
                      </Text>
                      <Text style={styles.reviewDate}>
                        {review.createdAt ? new Date(review.createdAt).toLocaleDateString('vi-VN') : ''}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.ratingContainer}>
                    {renderStars(review.rating)}
                  </View>
                </View>
                {review.comment && (
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                )}
                {/* Order Information */}
                {review.order ? (
                  <TouchableOpacity
                    style={styles.orderInfoContainer}
                    onPress={() => navigation.navigate('OrderDetail', { orderId: review.order.id })}
                    activeOpacity={0.7}
                  >
                    <View style={styles.orderInfoHeader}>
                      <Icon name="receipt" size={16} color="#6200ee" />
                      <Text style={styles.orderInfoLabel}>Đơn hàng:</Text>
                    </View>
                    {review.order.listing ? (
                      <>
                        <Text style={styles.orderInfoText} numberOfLines={1}>
                          {review.order.listing.brand} {review.order.listing.model} {review.order.listing.year}
                        </Text>
                        <Text style={styles.orderInfoSubtext}>
                          Số tiền: {formatVND(review.order.amount || 0)}
                        </Text>
                      </>
                    ) : (
                      <Text style={styles.orderInfoSubtext}>
                        Đơn hàng ID: {review.order.id}
                      </Text>
                    )}
                  </TouchableOpacity>
                ) : review.orderId ? (
                  <View style={[styles.orderInfoContainer, styles.orderInfoDisabled]}>
                    <View style={styles.orderInfoHeader}>
                      <Icon name="receipt" size={16} color="#999" />
                      <Text style={[styles.orderInfoLabel, { color: '#999' }]}>Đơn hàng:</Text>
                    </View>
                    <Text style={[styles.orderInfoSubtext, { color: '#999' }]}>
                      Không thể tải thông tin đơn hàng (ID: {review.orderId})
                    </Text>
                  </View>
                ) : null}
                {review.updatedAt && review.updatedAt !== review.createdAt && (
                  <Text style={styles.editLabel}>Đã chỉnh sửa</Text>
                )}
              </View>
            ))
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  reviewCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    marginRight: 12,
  },
  reviewerDetails: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  reviewDate: {
    fontSize: 12,
    color: '#999',
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewComment: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginTop: 8,
  },
  editLabel: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 8,
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
  orderInfoDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#e0e0e0',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
});

