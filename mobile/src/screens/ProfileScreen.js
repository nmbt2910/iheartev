import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { profileService } from '../services/profileService';
import { reviewService } from '../services/reviewService';
import { useAuth } from '../store/auth';
import { formatVND } from '../utils/currencyFormatter';

export default function ProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [activeTab, setActiveTab] = useState('profile'); // profile, reviewsGiven, reviewsReceived
  const [editingReview, setEditingReview] = useState(null);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState('');
  const [savingReview, setSavingReview] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await profileService.getMyProfile();
      setProfile(data);
      setFullName(data.user?.fullName || '');
      setPhone(data.user?.phone || '');
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin tài khoản');
      if (error.sessionExpired) {
        navigation.replace('Login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập họ tên');
      return;
    }

    try {
      setSaving(true);
      const updates = {
        fullName: fullName.trim(),
        phone: phone.trim(),
      };
      await profileService.updateMyProfile(updates);
      await loadProfile();
      setEditing(false);
      Alert.alert('Thành công', 'Đã cập nhật thông tin');
    } catch (error) {
      Alert.alert('Lỗi', error.response?.data?.error || 'Không thể cập nhật thông tin');
    } finally {
      setSaving(false);
    }
  };

  const handleEditReview = (review) => {
    setEditingReview(review);
    setEditRating(review.rating);
    setEditComment(review.comment || '');
  };

  const handleSaveReview = async () => {
    if (!editingReview) return;

    try {
      setSavingReview(true);
      await reviewService.updateReview(editingReview.id, {
        rating: editRating,
        comment: editComment.trim(),
      });
      await loadProfile();
      setEditingReview(null);
      Alert.alert('Thành công', 'Đã cập nhật đánh giá');
    } catch (error) {
      Alert.alert('Lỗi', error.response?.data?.error || 'Không thể cập nhật đánh giá');
    } finally {
      setSavingReview(false);
    }
  };

  const renderStars = (rating, size = 16, interactive = false, onPress = null) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <TouchableOpacity key={i} onPress={interactive ? () => onPress(i + 1) : null} disabled={!interactive}>
          <Icon name="star" size={size} color="#ff9800" />
        </TouchableOpacity>
      );
    }
    if (hasHalfStar) {
      stars.push(
        <TouchableOpacity key="half" onPress={interactive ? () => onPress(fullStars + 1) : null} disabled={!interactive}>
          <Icon name="star-half-full" size={size} color="#ff9800" />
        </TouchableOpacity>
      );
    }
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <TouchableOpacity key={`empty-${i}`} onPress={interactive ? () => onPress(fullStars + (hasHalfStar ? 1 : 0) + i + 1) : null} disabled={!interactive}>
          <Icon name="star-outline" size={size} color="#ff9800" />
        </TouchableOpacity>
      );
    }
    return stars;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
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
          <Text style={styles.errorText}>Không tìm thấy thông tin</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { user, averageRating, totalReviewsReceived, totalReviewsGiven, reviewsIGave, reviewsIReceived } = profile;
  
  // Check if we can go back (i.e., if this screen was navigated to, not embedded in tab)
  const canGoBack = navigation.canGoBack();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.appbarHeader}>
          {canGoBack ? (
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.appbarAction}>
              <Icon name="arrow-left" size={24} color="white" />
            </TouchableOpacity>
          ) : (
            <View style={styles.appbarAction} />
          )}
          <Text style={styles.appbarContent}>Hồ sơ của tôi</Text>
          {!editing ? (
            <TouchableOpacity onPress={() => setEditing(true)} style={styles.appbarAction}>
              <Icon name="pencil" size={24} color="white" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => { setEditing(false); setFullName(user.fullName); setPhone(user.phone || ''); }} style={styles.appbarAction}>
              <Icon name="close" size={24} color="white" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'profile' && styles.tabActive]}
            onPress={() => setActiveTab('profile')}
            activeOpacity={0.7}
          >
            <Icon 
              name={activeTab === 'profile' ? 'account-circle' : 'account-circle-outline'} 
              size={18} 
              color={activeTab === 'profile' ? 'white' : '#666'} 
            />
            <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>
              Thông tin
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'reviewsGiven' && styles.tabActive]}
            onPress={() => setActiveTab('reviewsGiven')}
            activeOpacity={0.7}
          >
            <Icon 
              name={activeTab === 'reviewsGiven' ? 'star' : 'star-outline'} 
              size={18} 
              color={activeTab === 'reviewsGiven' ? 'white' : '#666'} 
            />
            <Text style={[styles.tabText, activeTab === 'reviewsGiven' && styles.tabTextActive]}>
              Đã đánh giá ({totalReviewsGiven})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'reviewsReceived' && styles.tabActive]}
            onPress={() => setActiveTab('reviewsReceived')}
            activeOpacity={0.7}
          >
            <Icon 
              name={activeTab === 'reviewsReceived' ? 'account-check' : 'account-check-outline'} 
              size={18} 
              color={activeTab === 'reviewsReceived' ? 'white' : '#666'} 
            />
            <Text style={[styles.tabText, activeTab === 'reviewsReceived' && styles.tabTextActive]}>
              Nhận được ({totalReviewsReceived})
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {activeTab === 'profile' && (
            <>
              {/* Rating Overview */}
              <View style={styles.ratingCard}>
                <View style={styles.ratingOverview}>
                  <View style={styles.ratingCircle}>
                    <Text style={styles.ratingValue}>{averageRating > 0 ? averageRating.toFixed(1) : '—'}</Text>
                  </View>
                  <View style={styles.ratingInfo}>
                    <View style={styles.starsContainer}>
                      {renderStars(averageRating > 0 ? averageRating : 0, 20)}
                    </View>
                    <Text style={styles.ratingCount}>
                      {totalReviewsReceived > 0 
                        ? `${totalReviewsReceived} ${totalReviewsReceived === 1 ? 'đánh giá' : 'đánh giá'}` 
                        : 'Chưa có đánh giá'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Personal Info */}
              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIconContainer}>
                    <Icon name="account-details" size={22} color="#6200ee" />
                  </View>
                  <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <View style={styles.infoIconWrapper}>
                    <Icon name="account" size={20} color="#999" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Họ và tên</Text>
                    {editing ? (
                      <TextInput
                        style={styles.input}
                        value={fullName}
                        onChangeText={setFullName}
                        placeholder="Nhập họ tên"
                        placeholderTextColor="#999"
                      />
                    ) : (
                      <Text style={styles.value}>{user.fullName || 'Chưa cập nhật'}</Text>
                    )}
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.infoRow}>
                  <View style={styles.infoIconWrapper}>
                    <Icon name="email" size={20} color="#999" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Email</Text>
                    <Text style={styles.value}>{user.email}</Text>
                    <Text style={styles.hint}>Email không thể thay đổi</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.infoRow}>
                  <View style={styles.infoIconWrapper}>
                    <Icon name="phone" size={20} color="#999" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Số điện thoại</Text>
                    {editing ? (
                      <TextInput
                        style={styles.input}
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="Nhập số điện thoại"
                        placeholderTextColor="#999"
                        keyboardType="phone-pad"
                      />
                    ) : (
                      <Text style={styles.value}>{user.phone || 'Chưa cập nhật'}</Text>
                    )}
                  </View>
                </View>

                {editing && (
                  <View style={styles.saveButtonContainer}>
                    <TouchableOpacity
                      style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                      onPress={handleSave}
                      disabled={saving}
                      activeOpacity={0.8}
                    >
                      {saving ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <>
                          <Icon name="check-circle" size={20} color="white" />
                          <Text style={styles.saveButtonText}>Lưu thay đổi</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </>
          )}

          {activeTab === 'reviewsGiven' && (
            <View style={styles.reviewsContainer}>
              {reviewsIGave && reviewsIGave.length > 0 ? (
                <View style={styles.card}>
                  {reviewsIGave.map((review, index) => (
                    <View 
                      key={review.id} 
                      style={[
                        styles.reviewItem,
                        index === reviewsIGave.length - 1 && styles.reviewItemLast
                      ]}
                    >
                      <View style={styles.reviewHeader}>
                        <View style={styles.reviewerInfo}>
                          <View style={styles.reviewerAvatar}>
                            <Icon name="account" size={20} color="#666" />
                          </View>
                          <Text style={styles.reviewerName}>
                            {review.reviewee?.fullName || 'Người dùng'}
                          </Text>
                        </View>
                        <View style={styles.reviewActions}>
                          <View style={styles.reviewStars}>
                            {renderStars(review.rating || 0, 18)}
                          </View>
                          {review.editCount < 2 && (
                            <TouchableOpacity
                              onPress={() => handleEditReview(review)}
                              style={styles.editButtonSmall}
                              activeOpacity={0.7}
                            >
                              <Icon name="pencil-outline" size={16} color="#6200ee" />
                            </TouchableOpacity>
                          )}
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
                      {review.updatedAt && review.updatedAt !== review.createdAt && (
                        <Text style={styles.reviewMeta}>
                          Đã chỉnh sửa {review.editCount > 0 && `${review.editCount} lần`} • {formatDate(review.createdAt)}
                        </Text>
                      )}
                      {(!review.updatedAt || review.updatedAt === review.createdAt) && (
                        <Text style={styles.reviewMeta}>
                          {formatDate(review.createdAt)}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyCard}>
                  <Icon name="star-outline" size={64} color="#ccc" />
                  <Text style={styles.emptyText}>Bạn chưa đánh giá ai</Text>
                </View>
              )}
            </View>
          )}

          {activeTab === 'reviewsReceived' && (
            <View style={styles.reviewsContainer}>
              {reviewsIReceived && reviewsIReceived.length > 0 ? (
                <View style={styles.card}>
                  {reviewsIReceived.map((review, index) => (
                    <View 
                      key={review.id} 
                      style={[
                        styles.reviewItem,
                        index === reviewsIReceived.length - 1 && styles.reviewItemLast
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
                          {renderStars(review.rating || 0, 18)}
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
                      <Text style={styles.reviewMeta}>
                        {formatDate(review.createdAt)}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyCard}>
                  <Icon name="star-outline" size={64} color="#ccc" />
                  <Text style={styles.emptyText}>Chưa có đánh giá nào</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Edit Review Modal */}
        <Modal
          visible={editingReview !== null}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setEditingReview(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Chỉnh sửa đánh giá</Text>
                <TouchableOpacity onPress={() => setEditingReview(null)}>
                  <Icon name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              {editingReview && editingReview.order && (
                <View style={styles.modalOrderInfo}>
                  <Text style={styles.modalOrderText}>
                    Đơn hàng: {editingReview.order.listing?.brand} {editingReview.order.listing?.model} {editingReview.order.listing?.year}
                  </Text>
                  <Text style={styles.modalOrderText}>
                    {editingReview.editCount >= 1 && `Đã chỉnh sửa ${editingReview.editCount} lần. Còn ${2 - editingReview.editCount} lần nữa.`}
                  </Text>
                </View>
              )}

              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Đánh giá</Text>
                <View style={styles.interactiveStarsContainer}>
                  {renderStars(editRating, 32, true, setEditRating)}
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Nhận xét</Text>
                <TextInput
                  style={styles.modalTextInput}
                  value={editComment}
                  onChangeText={setEditComment}
                  placeholder="Nhập nhận xét của bạn..."
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                style={[styles.modalSaveButton, savingReview && styles.modalSaveButtonDisabled]}
                onPress={handleSaveReview}
                disabled={savingReview}
              >
                {savingReview ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.modalSaveButtonText}>Lưu thay đổi</Text>
                )}
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#6200ee',
    borderColor: '#6200ee',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  tabTextActive: {
    color: 'white',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  ratingCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#6200ee',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  ratingOverview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  ratingCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f3e5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#6200ee',
  },
  ratingValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6200ee',
  },
  ratingInfo: {
    flex: 1,
    gap: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  ratingCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#6200ee',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3e5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    letterSpacing: 0.3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    gap: 16,
  },
  infoIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 4,
  },
  infoLabel: {
    fontSize: 13,
    color: '#999',
    marginBottom: 6,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    lineHeight: 22,
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    fontStyle: 'italic',
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontWeight: '500',
  },
  saveButtonContainer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6200ee',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    elevation: 4,
    shadowColor: '#6200ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  reviewsContainer: {
    paddingHorizontal: 0,
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
  reviewActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 2,
  },
  editButtonSmall: {
    padding: 6,
  },
  reviewComment: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginBottom: 12,
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
  reviewMeta: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    letterSpacing: 0.3,
  },
  modalOrderInfo: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#6200ee',
  },
  modalOrderText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    lineHeight: 20,
    fontWeight: '500',
  },
  modalSection: {
    marginBottom: 24,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  interactiveStarsContainer: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  modalTextInput: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: 120,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  modalSaveButton: {
    backgroundColor: '#6200ee',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    elevation: 4,
    shadowColor: '#6200ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalSaveButtonDisabled: {
    opacity: 0.6,
  },
  modalSaveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
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
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
});

