import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { reviewService } from '../services/reviewService';
import { orderService } from '../services/orderService';

export default function CreateReviewScreen({ route, navigation }) {
  const { orderId, sellerId } = route.params;
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [orderDetail, setOrderDetail] = useState(null);
  const [isEdit, setIsEdit] = useState(false);
  const [existingReview, setExistingReview] = useState(null);

  useEffect(() => {
    loadOrderDetail();
  }, [orderId]);

  const loadOrderDetail = async () => {
    try {
      const data = await orderService.getOrderDetail(orderId);
      setOrderDetail(data);
      
      // Check if review already exists
      if (data.order && data.order.buyerReviewId) {
        // Load existing review if editing
        setIsEdit(true);
        // You might want to load the existing review details here
      }
    } catch (error) {
      console.error('Error loading order detail:', error);
    }
  };

  const handleSubmit = async () => {
    if (!comment.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập nhận xét');
      return;
    }

    try {
      setLoading(true);
      const reviewData = {
        revieweeId: sellerId,
        rating: rating,
        comment: comment.trim(),
        orderId: orderId,
      };

      if (isEdit && existingReview) {
        await reviewService.updateReview(existingReview.id, reviewData);
        Alert.alert('Thành công', 'Đã cập nhật đánh giá', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        await reviewService.createReview(reviewData);
        Alert.alert('Thành công', 'Đã gửi đánh giá', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      Alert.alert('Lỗi', error.response?.data?.error || 'Không thể gửi đánh giá');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => setRating(i)}
          activeOpacity={0.7}
        >
          <Icon
            name={i <= rating ? "star" : "star-outline"}
            size={40}
            color={i <= rating ? "#ff9800" : "#ccc"}
          />
        </TouchableOpacity>
      );
    }
    return stars;
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.appbarHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.appbarAction}>
            <Icon name="arrow-left" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.appbarContent}>{isEdit ? 'Chỉnh sửa đánh giá' : 'Để lại đánh giá'}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {orderDetail && (
            <View style={styles.orderInfoCard}>
              <Text style={styles.orderInfoTitle}>Đơn hàng</Text>
              <Text style={styles.orderInfoText}>
                {orderDetail.listing?.brand} {orderDetail.listing?.model} {orderDetail.listing?.year}
              </Text>
              <Text style={styles.orderInfoSubtext}>
                Người bán: {orderDetail.seller?.fullName}
              </Text>
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.label}>Đánh giá của bạn</Text>
            <View style={styles.starsContainer}>
              {renderStars()}
            </View>
            <Text style={styles.ratingText}>{rating} sao</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Nhận xét</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="Chia sẻ trải nghiệm của bạn..."
                placeholderTextColor="#999"
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <>
                <ActivityIndicator size="small" color="white" />
                <Text style={styles.submitButtonText}>Đang gửi...</Text>
              </>
            ) : (
              <>
                <Icon name="send" size={20} color="white" />
                <Text style={styles.submitButtonText}>Gửi đánh giá</Text>
              </>
            )}
          </TouchableOpacity>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  orderInfoCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  orderInfoTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  orderInfoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  orderInfoSubtext: {
    fontSize: 14,
    color: '#666',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  ratingText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  inputContainer: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 12,
    minHeight: 150,
    marginTop: 12,
  },
  textInput: {
    fontSize: 16,
    color: '#333',
    textAlignVertical: 'top',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6200ee',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 10,
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: 'bold',
  },
});

