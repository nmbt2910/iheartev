import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../store/auth';
import { adminService } from '../services/adminService';
import { useAuthGuard } from '../hooks/useAuthGuard';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

export default function AdminScreen({ navigation }) {
  const { isAuthenticated, role } = useAuth();
  const [summary, setSummary] = useState({});
  const [pendingListings, setPendingListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  useAuthGuard(true);

  useEffect(() => {
    if (role !== 'ADMIN') {
      Alert.alert('Truy cập bị từ chối', 'Yêu cầu quyền quản trị viên', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    }
  }, [role]);

  const loadData = async () => {
    if (!isAuthenticated || role !== 'ADMIN') return;
    try {
      const [summaryRes, pendingRes] = await Promise.all([
        adminService.getSummaryReport(),
        adminService.getPendingListings()
      ]);
      setSummary(summaryRes || {});
      setPendingListings(Array.isArray(pendingRes) ? pendingRes : []);
    } catch (error) {
      if (error.sessionExpired) {
        Alert.alert('Phiên đăng nhập hết hạn', 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', [
          { text: 'OK', onPress: () => navigation.replace('Login') }
        ]);
      } else {
        console.error('Error loading data:', error);
        Alert.alert('Lỗi', 'Không thể tải dữ liệu quản trị');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && role === 'ADMIN') {
      loadData();
    }
  }, [isAuthenticated, role]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleApprove = async (listingId) => {
    setProcessingId(listingId);
    try {
      await adminService.approveListing(listingId);
      Alert.alert('Thành công', 'Tin đăng đã được duyệt');
      await loadData();
    } catch (error) {
      console.error('Error approving listing:', error);
      Alert.alert('Lỗi', error.response?.data?.error || 'Không thể duyệt tin đăng');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (listingId) => {
    Alert.alert(
      'Từ chối tin đăng',
      'Bạn có chắc chắn muốn từ chối tin đăng này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Từ chối',
          style: 'destructive',
          onPress: async () => {
            setProcessingId(listingId);
            try {
              const result = await adminService.rejectListing(listingId);
              if (result.deletedAt) {
                Alert.alert('Tin đăng đã bị xóa', 'Tin đăng đã được tự động xóa vì bị từ chối lần thứ hai.');
              } else {
                Alert.alert('Tin đăng đã bị từ chối', 'Người bán có thể chỉnh sửa và gửi lại tin đăng một lần.');
              }
              await loadData();
            } catch (error) {
              console.error('Error rejecting listing:', error);
              Alert.alert('Lỗi', error.response?.data?.error || 'Không thể từ chối tin đăng');
            } finally {
              setProcessingId(null);
            }
          }
        }
      ]
    );
  };

  const StatCard = ({ icon, title, value, color }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        <Icon name={icon} size={28} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value || 0}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar style="light" />
        <View style={styles.container}>
          <View style={styles.appbarHeader}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.appbarAction}>
              <Icon name="arrow-left" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.appbarContent}>Bảng điều khiển</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6200ee" />
            <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
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
          <Text style={styles.appbarContent}>Bảng điều khiển</Text>
          <View style={{ width: 40 }} />
        </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.headerSection}>
          <Icon name="shield-check" size={48} color="#6200ee" />
          <Text style={styles.headerTitle}>Quản trị viên</Text>
          <Text style={styles.headerSubtitle}>Thống kê và quản lý hệ thống</Text>
        </View>

        <View style={styles.statsContainer}>
          <StatCard
            icon="check-circle"
            title="Đã duyệt"
            value={summary.approvedListings}
            color="#4caf50"
          />
          <StatCard
            icon="clock-outline"
            title="Chờ duyệt"
            value={summary.pendingListings}
            color="#ff9800"
          />
        </View>

        <View style={styles.statsContainer}>
          <StatCard
            icon="close-circle"
            title="Đã từ chối"
            value={summary.rejectedListings}
            color="#f44336"
          />
          <StatCard
            icon="check-all"
            title="Đã bán"
            value={summary.soldListings}
            color="#2196f3"
          />
        </View>

        {(summary.totalUsers || summary.totalOrders) && (
          <View style={styles.statsContainer}>
            {summary.totalUsers !== undefined && (
              <StatCard
                icon="account-group"
                title="Tổng người dùng"
                value={summary.totalUsers}
                color="#ff9800"
              />
            )}
            {summary.totalOrders !== undefined && (
              <StatCard
                icon="shopping"
                title="Tổng đơn hàng"
                value={summary.totalOrders}
                color="#9c27b0"
              />
            )}
          </View>
        )}

        {pendingListings.length > 0 && (
          <View style={styles.pendingSection}>
            <Text style={styles.sectionTitle}>Tin đăng chờ duyệt ({pendingListings.length})</Text>
            {pendingListings.map((listing) => (
              <View key={listing.id} style={styles.pendingCard}>
                <View style={styles.pendingCardContent}>
                  <Text style={styles.pendingCardTitle}>
                    {listing.brand} {listing.model} ({listing.year})
                  </Text>
                  <Text style={styles.pendingCardPrice}>
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(listing.price)}
                  </Text>
                  <Text style={styles.pendingCardSeller} numberOfLines={1}>
                    Người đăng: {listing.seller?.fullName || listing.seller?.email || 'Không xác định'}
                  </Text>
                  {listing.editedAfterRejection && (
                    <View style={styles.editedBadge}>
                      <Icon name="pencil" size={12} color="#ff9800" />
                      <Text style={styles.editedBadgeText}>Đã chỉnh sửa sau khi từ chối</Text>
                    </View>
                  )}
                </View>
                <View style={styles.pendingCardActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.approveButton]}
                    onPress={() => handleApprove(listing.id)}
                    disabled={processingId === listing.id}
                  >
                    {processingId === listing.id ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <>
                        <Icon name="check" size={18} color="white" />
                        <Text style={styles.actionButtonText}>Duyệt</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => handleReject(listing.id)}
                    disabled={processingId === listing.id}
                  >
                    {processingId === listing.id ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <>
                        <Icon name="close" size={18} color="white" />
                        <Text style={styles.actionButtonText}>Từ chối</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.infoCard}>
          <Icon name="information" size={24} color="#6200ee" />
          <Text style={styles.infoText}>
            Dữ liệu được cập nhật theo thời gian thực. Kéo xuống để làm mới.
          </Text>
        </View>
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
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
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
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  headerSection: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 28,
    marginBottom: 20,
    elevation: 0,
    shadowColor: '#6200ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 18,
    borderLeftWidth: 4,
    elevation: 0,
    shadowColor: '#6200ee',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#1976d2',
    lineHeight: 20,
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
  pendingSection: {
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  pendingCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  pendingCardContent: {
    marginBottom: 12,
  },
  pendingCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  pendingCardPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6200ee',
    marginBottom: 4,
  },
  pendingCardSeller: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  editedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  editedBadgeText: {
    fontSize: 12,
    color: '#e65100',
    marginLeft: 4,
    fontWeight: '500',
  },
  pendingCardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  approveButton: {
    backgroundColor: '#4caf50',
  },
  rejectButton: {
    backgroundColor: '#f44336',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});
