import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { profileService } from '../services/profileService';
import { useAuth } from '../store/auth';

export default function ProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [activeTab, setActiveTab] = useState('profile'); // profile, reviewsGiven, reviewsReceived
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
          <Text style={styles.errorText}>Không tìm thấy thông tin</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { user, averageRating, totalReviewsReceived, totalReviewsGiven, reviewsIGave, reviewsIReceived } = profile;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.appbarHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.appbarAction}>
            <Icon name="arrow-left" size={24} color="white" />
          </TouchableOpacity>
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
            <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>Thông tin</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'reviewsGiven' && styles.tabActive]}
            onPress={() => setActiveTab('reviewsGiven')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'reviewsGiven' && styles.tabTextActive]}>Đã đánh giá ({totalReviewsGiven})</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'reviewsReceived' && styles.tabActive]}
            onPress={() => setActiveTab('reviewsReceived')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'reviewsReceived' && styles.tabTextActive]}>Nhận được ({totalReviewsReceived})</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {activeTab === 'profile' && (
            <>
              {/* Rating Overview */}
              <View style={styles.card}>
                <View style={styles.ratingOverview}>
                  <Text style={styles.ratingValue}>{averageRating.toFixed(1)}</Text>
                  <View style={styles.starsContainer}>
                    {renderStars(averageRating)}
                  </View>
                  <Text style={styles.ratingCount}>{totalReviewsReceived} đánh giá</Text>
                </View>
              </View>

              {/* Personal Info */}
              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <Icon name="account-circle" size={20} color="#6200ee" />
                  <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Họ và tên</Text>
                  {editing ? (
                    <TextInput
                      style={styles.input}
                      value={fullName}
                      onChangeText={setFullName}
                      placeholder="Nhập họ tên"
                    />
                  ) : (
                    <Text style={styles.value}>{user.fullName}</Text>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email</Text>
                  <Text style={styles.value}>{user.email}</Text>
                  <Text style={styles.hint}>Email không thể thay đổi</Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Số điện thoại</Text>
                  {editing ? (
                    <TextInput
                      style={styles.input}
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="Nhập số điện thoại"
                      keyboardType="phone-pad"
                    />
                  ) : (
                    <Text style={styles.value}>{user.phone || 'Chưa cập nhật'}</Text>
                  )}
                </View>

                {editing && (
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
                        <Icon name="check" size={20} color="white" />
                        <Text style={styles.saveButtonText}>Lưu thay đổi</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}

          {activeTab === 'reviewsGiven' && (
            <View style={styles.reviewsContainer}>
              {reviewsIGave && reviewsIGave.length > 0 ? (
                reviewsIGave.map((review) => (
                  <View key={review.id} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <Text style={styles.reviewTitle}>Đánh giá cho {review.reviewee.fullName}</Text>
                      <View style={styles.ratingContainer}>
                        {renderStars(review.rating)}
                      </View>
                    </View>
                    {review.comment && (
                      <Text style={styles.reviewComment}>{review.comment}</Text>
                    )}
                    <Text style={styles.reviewDate}>
                      {review.createdAt ? new Date(review.createdAt).toLocaleDateString('vi-VN') : ''}
                    </Text>
                  </View>
                ))
              ) : (
                <View style={styles.emptyContainer}>
                  <Icon name="star-outline" size={64} color="#ccc" />
                  <Text style={styles.emptyText}>Bạn chưa đánh giá ai</Text>
                </View>
              )}
            </View>
          )}

          {activeTab === 'reviewsReceived' && (
            <View style={styles.reviewsContainer}>
              {reviewsIReceived && reviewsIReceived.length > 0 ? (
                reviewsIReceived.map((review) => (
                  <View key={review.id} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <Text style={styles.reviewTitle}>Từ {review.reviewer.fullName}</Text>
                      <View style={styles.ratingContainer}>
                        {renderStars(review.rating)}
                      </View>
                    </View>
                    {review.comment && (
                      <Text style={styles.reviewComment}>{review.comment}</Text>
                    )}
                    <Text style={styles.reviewDate}>
                      {review.createdAt ? new Date(review.createdAt).toLocaleDateString('vi-VN') : ''}
                    </Text>
                  </View>
                ))
              ) : (
                <View style={styles.emptyContainer}>
                  <Icon name="star-outline" size={64} color="#ccc" />
                  <Text style={styles.emptyText}>Chưa có đánh giá nào</Text>
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
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
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
  ratingOverview: {
    alignItems: 'center',
    padding: 20,
  },
  ratingValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#6200ee',
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  ratingCount: {
    fontSize: 14,
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
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  value: {
    fontSize: 16,
    color: '#333',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    fontStyle: 'italic',
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6200ee',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  reviewsContainer: {
    gap: 12,
  },
  reviewCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewComment: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  reviewDate: {
    fontSize: 12,
    color: '#999',
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

