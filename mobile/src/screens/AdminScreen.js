import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../store/auth';
import { adminService } from '../services/adminService';
import { useAuthGuard } from '../hooks/useAuthGuard';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

export default function AdminScreen({ navigation }) {
  const { isAuthenticated, role } = useAuth();
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useAuthGuard(true);

  useEffect(() => {
    if (role !== 'ADMIN') {
      Alert.alert('Access Denied', 'Admin access required', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    }
  }, [role]);

  const loadSummary = async () => {
    if (!isAuthenticated || role !== 'ADMIN') return;
    try {
      const res = await adminService.getSummaryReport();
      setSummary(res || {});
    } catch (error) {
      if (error.sessionExpired) {
        Alert.alert('Session Expired', 'Session expired. Please log in again.', [
          { text: 'OK', onPress: () => navigation.replace('Login') }
        ]);
      } else {
        console.error('Error loading summary:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && role === 'ADMIN') {
      loadSummary();
    }
  }, [isAuthenticated, role]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSummary();
    setRefreshing(false);
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
            icon="car-multiple"
            title="Tin đang hoạt động"
            value={summary.activeListings}
            color="#4caf50"
          />
          <StatCard
            icon="check-circle"
            title="Tin đã bán"
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
});
