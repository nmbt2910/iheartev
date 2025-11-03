import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { reviewService } from '../services/reviewService';
import { orderService } from '../services/orderService';

export default function CreateReviewScreen({ route, navigation }) {
  const { orderId, sellerId, buyerId } = route.params;
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [orderDetail, setOrderDetail] = useState(null);
  const [isEdit, setIsEdit] = useState(false);
  const [existingReview, setExistingReview] = useState(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const scrollViewRef = useRef(null);
  const textInputRef = useRef(null);
  
  // Determine if this is a seller reviewing buyer or buyer reviewing seller
  const revieweeId = buyerId || sellerId; // buyerId means seller is reviewing buyer, sellerId means buyer is reviewing seller
  const isSellerReviewingBuyer = !!buyerId;

  useEffect(() => {
    loadOrderDetail();
  }, [orderId]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

  const loadOrderDetail = async () => {
    try {
      setLoadingOrder(true);
      const data = await orderService.getOrderDetail(orderId);
      setOrderDetail(data);
      
      // Check if review already exists and load it
      if (data.order) {
        const reviewId = isSellerReviewingBuyer 
          ? data.order.sellerReviewId 
          : data.order.buyerReviewId;
        
        if (reviewId) {
          setIsEdit(true);
          try {
            const existing = await reviewService.getReview(reviewId);
            setExistingReview(existing);
            setRating(existing.rating || 5);
            setComment(existing.comment || '');
            console.log('Loaded existing review:', existing);
          } catch (error) {
            console.error('Error loading existing review:', error);
            Alert.alert('Lỗi', 'Không thể tải đánh giá hiện có. ' + (error.response?.data?.error || ''));
          }
        } else {
          // No existing review, reset edit state
          setIsEdit(false);
          setExistingReview(null);
        }
      }
    } catch (error) {
      console.error('Error loading order detail:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin đơn hàng');
      navigation.goBack();
    } finally {
      setLoadingOrder(false);
    }
  };

  const handleSubmit = async () => {
    if (!comment.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập nhận xét');
      return;
    }

    // Check edit count limit before submitting
    if (isEdit && existingReview && existingReview.editCount >= 2) {
      Alert.alert('Lỗi', 'Bạn đã chỉnh sửa đánh giá tối đa 2 lần. Không thể chỉnh sửa thêm.');
      return;
    }

    // Ensure orderId is always included
    if (!orderId) {
      Alert.alert('Lỗi', 'Thông tin đơn hàng không hợp lệ');
      return;
    }

    try {
      setLoading(true);
      const reviewData = {
        revieweeId: revieweeId, // buyerId if seller reviewing buyer, sellerId if buyer reviewing seller
        rating: rating,
        comment: comment.trim(),
        orderId: orderId, // Always include orderId
      };

      if (isEdit && existingReview && existingReview.id) {
        console.log('Updating review:', existingReview.id, reviewData);
        await reviewService.updateReview(existingReview.id, reviewData);
        Alert.alert('Thành công', 'Đã cập nhật đánh giá', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        console.log('Creating new review:', reviewData);
        await reviewService.createReview(reviewData);
        Alert.alert('Thành công', 'Đã gửi đánh giá', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.error('Review submission error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Không thể gửi đánh giá';
      Alert.alert('Lỗi', errorMessage);
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

  if (loadingOrder) {
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
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6200ee" />
            <Text style={styles.loadingText}>Đang tải thông tin đơn hàng...</Text>
          </View>
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
          <Text style={styles.appbarContent}>{isEdit ? 'Chỉnh sửa đánh giá' : 'Để lại đánh giá'}</Text>
          <View style={{ width: 40 }} />
        </View>

        <KeyboardAvoidingView 
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView 
            ref={scrollViewRef}
            style={styles.scrollView} 
            contentContainerStyle={keyboardVisible ? styles.scrollContentWithKeyboard : styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
          >
            {orderDetail && (
              <View style={styles.orderInfoCard}>
                <Text style={styles.orderInfoTitle}>Đơn hàng</Text>
                <Text style={styles.orderInfoText}>
                  {orderDetail.listing?.brand} {orderDetail.listing?.model} {orderDetail.listing?.year}
                </Text>
                <Text style={styles.orderInfoSubtext}>
                  {isSellerReviewingBuyer 
                    ? `Đánh giá người mua: ${orderDetail.buyer?.fullName || 'N/A'}`
                    : `Đánh giá người bán: ${orderDetail.seller?.fullName || 'N/A'}`}
                </Text>
              </View>
            )}

            <View style={styles.card}>
              <Text style={styles.label}>Đánh giá của bạn</Text>
              {isEdit && existingReview && (
                <>
                  <View style={styles.editWarningContainer}>
                    <Icon name="information" size={16} color="#ff9800" />
                    <Text style={styles.editWarningText}>
                      Bạn đang chỉnh sửa đánh giá của mình
                    </Text>
                  </View>
                  <View style={styles.editWarningContainer}>
                    <Icon name="information" size={16} color="#4caf50" />
                    <Text style={styles.editWarningText}>
                      {existingReview.editCount >= 2 
                        ? 'Bạn đã chỉnh sửa tối đa 2 lần. Không thể chỉnh sửa thêm.'
                        : `Bạn đã chỉnh sửa ${existingReview.editCount || 0} lần. Còn ${2 - (existingReview.editCount || 0)} lần nữa.`}
                    </Text>
                  </View>
                </>
              )}
              <View style={styles.starsContainer}>
                {renderStars()}
              </View>
              <Text style={styles.ratingText}>{rating} sao</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>Nhận xét</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  ref={textInputRef}
                  style={styles.textInput}
                  placeholder="Chia sẻ trải nghiệm của bạn..."
                  placeholderTextColor="#999"
                  value={comment}
                  onChangeText={setComment}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  onFocus={() => {
                    // Scroll to end when input is focused to ensure it's visible above keyboard
                    setTimeout(() => {
                      scrollViewRef.current?.scrollToEnd({ animated: true });
                    }, 100);
                  }}
                />
              </View>
            </View>

          <TouchableOpacity
            style={[
              styles.submitButton, 
              (loading || (isEdit && existingReview && existingReview.editCount >= 2)) && styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={loading || (isEdit && existingReview && existingReview.editCount >= 2)}
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
        </KeyboardAvoidingView>
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
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
  },
  scrollContentWithKeyboard: {
    padding: 16,
    paddingBottom: 80,
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
  editWarningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#ff9800',
  },
  editWarningText: {
    flex: 1,
    fontSize: 13,
    color: '#f57c00',
    fontWeight: '500',
    lineHeight: 18,
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

