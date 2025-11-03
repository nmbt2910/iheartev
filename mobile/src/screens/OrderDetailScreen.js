import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Modal, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../store/auth';
import { orderService } from '../services/orderService';
import { formatVND } from '../utils/currencyFormatter';
import { generateVietQR } from '../utils/vietqrGenerator';

export default function OrderDetailScreen({ route, navigation }) {
  const { orderId } = route.params;
  const [orderDetail, setOrderDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiInsights, setAiInsights] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showPaymentQR, setShowPaymentQR] = useState(false);
  const [processing, setProcessing] = useState(false);
  const { token, isAuthenticated } = useAuth();

  useEffect(() => {
    loadOrderDetail();
  }, [orderId]);

  const loadOrderDetail = async () => {
    try {
      setLoading(true);
      const data = await orderService.getOrderDetail(orderId);
      setOrderDetail(data);
      // Log for debugging
      if (data?.order) {
        console.log('Order review IDs:', {
          buyerReviewId: data.order.buyerReviewId,
          sellerReviewId: data.order.sellerReviewId,
          status: data.order.status,
          isBuyer: data.isBuyer,
          isSeller: data.isSeller
        });
      }
      // Removed automatic AI insights loading - now only loads when user clicks button
    } catch (error) {
      console.error('Error loading order detail:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin đơn hàng');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const loadAIInsights = async () => {
    setLoadingAI(true);
    setAiError(null);
    try {
      const insights = await orderService.getAIInsights(orderId);
      setAiInsights(insights);
    } catch (error) {
      setAiError('Không thể tải phân tích AI. Vui lòng thử lại.');
      console.error('Error loading AI insights:', error);
      // Log more details about the error
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      } else if (error.request) {
        console.error('Request made but no response received:', error.request);
      } else {
        console.error('Error setting up request:', error.message);
      }
    } finally {
      setLoadingAI(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập lý do hủy đơn hàng');
      return;
    }

    Alert.alert(
      'Xác nhận hủy đơn hàng',
      'Bạn có chắc chắn muốn hủy đơn hàng này? Hủy quá nhiều đơn hàng có thể dẫn đến khóa tài khoản.',
      [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Có, hủy đơn hàng',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessing(true);
              await orderService.cancelOrder(orderId, cancelReason);
              Alert.alert('Thành công', 'Đơn hàng đã được hủy', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } catch (error) {
              Alert.alert('Lỗi', error.response?.data?.error || 'Không thể hủy đơn hàng');
            } finally {
              setProcessing(false);
              setShowCancelModal(false);
            }
          }
        }
      ]
    );
  };

  const handleConfirmPayment = async () => {
    Alert.alert(
      'Xác nhận thanh toán',
      'Bạn có chắc chắn đã thanh toán cho người bán sau khi gặp mặt và kiểm tra xe?',
      [
        { text: 'Chưa', style: 'cancel' },
        {
          text: 'Đã thanh toán',
          onPress: async () => {
            try {
              setProcessing(true);
              await orderService.confirmPayment(orderId);
              await loadOrderDetail();
              Alert.alert('Thành công', 'Đã xác nhận thanh toán. Chờ người bán xác nhận nhận tiền.');
            } catch (error) {
              Alert.alert('Lỗi', error.response?.data?.error || 'Không thể xác nhận thanh toán');
            } finally {
              setProcessing(false);
            }
          }
        }
      ]
    );
  };

  const handleConfirmReceived = async () => {
    Alert.alert(
      'Xác nhận đã nhận tiền',
      'Bạn có chắc chắn đã nhận tiền từ người mua?',
      [
        { text: 'Chưa', style: 'cancel' },
        {
          text: 'Đã nhận tiền',
          onPress: async () => {
            try {
              setProcessing(true);
              await orderService.confirmReceived(orderId);
              await loadOrderDetail();
              
              // Reload order detail to get updated order with buyer info
              const updatedData = await orderService.getOrderDetail(orderId);
              const updatedOrder = updatedData?.order;
              const updatedBuyer = updatedData?.buyer;
              
              // Prompt seller to rate buyer
              if (updatedOrder && updatedOrder.status === 'CLOSED' && !updatedOrder.sellerReviewId && updatedBuyer) {
                Alert.alert(
                  'Thành công', 
                  'Đơn hàng đã được đóng. Bạn có muốn đánh giá người mua ngay bây giờ không?',
                  [
                    { 
                      text: 'Để sau', 
                      style: 'cancel' 
                    },
                    {
                      text: 'Đánh giá ngay',
                      onPress: () => {
                        navigation.navigate('CreateReview', {
                          orderId: orderId,
                          buyerId: updatedBuyer.id
                        });
                      }
                    }
                  ]
                );
              } else {
                Alert.alert('Thành công', 'Đơn hàng đã được đóng. Người mua có thể để lại đánh giá.');
              }
            } catch (error) {
              Alert.alert('Lỗi', error.response?.data?.error || 'Không thể xác nhận nhận tiền');
            } finally {
              setProcessing(false);
            }
          }
        }
      ]
    );
  };

  const generateQRData = () => {
    if (!orderDetail?.paymentInfo || orderDetail.paymentInfo.paymentMethod !== 'VIETQR') {
      return '';
    }
    const { bankCode, accountNumber, amount, transactionContent } = orderDetail.paymentInfo;
    try {
      // Generate proper VietQR EMV format
      return generateVietQR(
        bankCode,
        accountNumber,
        amount || null,
        transactionContent || ''
      );
    } catch (error) {
      console.error('Error generating VietQR:', error);
      // Fallback to simple format if generation fails
      return `${bankCode}|${accountNumber}|${amount}|${transactionContent}`;
    }
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

  if (!orderDetail) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Không tìm thấy đơn hàng</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { order, listing, seller, buyer, paymentInfo, isBuyer, isSeller } = orderDetail;
  const qrData = generateQRData();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.appbarHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.appbarAction}>
            <Icon name="arrow-left" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.appbarContent}>Chi tiết đơn hàng</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Order Status */}
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <Icon 
                name={
                  order.status === 'CLOSED' ? 'check-circle' :
                  order.status === 'CANCELLED' ? 'close-circle' :
                  order.status === 'PAID' ? 'cash-check' :
                  'clock-outline'
                }
                size={32}
                color={
                  order.status === 'CLOSED' ? '#4caf50' :
                  order.status === 'CANCELLED' ? '#f44336' :
                  order.status === 'PAID' ? '#ff9800' :
                  '#6200ee'
                }
              />
              <Text style={styles.statusText}>
                {order.status === 'CLOSED' ? 'Đã hoàn thành' :
                 order.status === 'CANCELLED' ? 'Đã hủy' :
                 order.status === 'PAID' ? 'Đã thanh toán' :
                 order.buyerPaymentConfirmed ? 'Đã xác nhận thanh toán' :
                 'Đang chờ'}
              </Text>
            </View>
            {order.cancelledBy && (
              <View style={styles.cancellationInfo}>
                <Text style={styles.cancellationLabel}>Hủy bởi: {order.cancelledBy === 'BUYER' ? 'Người mua' : 'Người bán'}</Text>
                {order.cancellationReason && (
                  <Text style={styles.cancellationReason}>{order.cancellationReason}</Text>
                )}
              </View>
            )}
          </View>

          {/* Vehicle Information */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Icon name="car-electric" size={20} color="#6200ee" />
              <Text style={styles.sectionTitle}>Thông tin xe</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Xe:</Text>
              <Text style={styles.infoValue}>{listing.brand} {listing.model} {listing.year}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Giá:</Text>
              <Text style={styles.infoValue}>{formatVND(listing.price)}</Text>
            </View>
            {listing.mileageKm && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Số km:</Text>
                <Text style={styles.infoValue}>{listing.mileageKm.toLocaleString()} km</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Pin:</Text>
              <Text style={styles.infoValue}>{listing.batteryCapacityKWh} kWh</Text>
            </View>
          </View>

          {/* Seller/Buyer Information */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Icon name="account-circle" size={20} color="#6200ee" />
              <Text style={styles.sectionTitle}>
                {isSeller ? 'Thông tin người mua' : 'Thông tin người bán'}
              </Text>
            </View>
            {isSeller ? (
              // Show buyer information when user is the seller
              <>
                <TouchableOpacity
                  onPress={() => navigation.navigate('BuyerProfile', { buyerId: buyer.id })}
                  activeOpacity={0.7}
                >
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Tên:</Text>
                    <View style={styles.infoValueRow}>
                      <Text style={styles.infoValue}>{buyer.fullName || 'N/A'}</Text>
                      <Icon name="chevron-right" size={20} color="#999" />
                    </View>
                  </View>
                </TouchableOpacity>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Email:</Text>
                  <Text style={styles.infoValue}>{buyer.email}</Text>
                </View>
                {buyer.phone && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Điện thoại:</Text>
                    <Text style={styles.infoValue}>{buyer.phone}</Text>
                  </View>
                )}
              </>
            ) : (
              // Show seller information when user is the buyer
              <>
                <TouchableOpacity
                  onPress={() => navigation.navigate('SellerProfile', { sellerId: seller.id })}
                  activeOpacity={0.7}
                >
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Tên:</Text>
                    <View style={styles.infoValueRow}>
                      <Text style={styles.infoValue}>{seller.fullName}</Text>
                      <Icon name="chevron-right" size={20} color="#999" />
                    </View>
                  </View>
                </TouchableOpacity>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Email:</Text>
                  <Text style={styles.infoValue}>{seller.email}</Text>
                </View>
                {seller.phone && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Điện thoại:</Text>
                    <Text style={styles.infoValue}>{seller.phone}</Text>
                  </View>
                )}
              </>
            )}
          </View>

          {/* Payment Information */}
          {paymentInfo && (
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <Icon name="credit-card" size={20} color="#6200ee" />
                <Text style={styles.sectionTitle}>Phương thức thanh toán</Text>
              </View>
              
              {paymentInfo.paymentMethod === 'CASH' ? (
                <View style={styles.paymentInfoBox}>
                  <Icon name="cash" size={32} color="#4caf50" />
                  <Text style={styles.paymentMethodText}>Thanh toán tiền mặt khi nhận hàng</Text>
                </View>
              ) : (
                <View style={styles.paymentInfoBox}>
                  <Icon name="qrcode" size={32} color="#6200ee" />
                  <Text style={styles.paymentMethodText}>Chuyển khoản VietQR</Text>
                  <View style={styles.vietqrDetails}>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Ngân hàng:</Text>
                      <Text style={styles.infoValue}>{paymentInfo.bankName}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Số tài khoản:</Text>
                      <Text style={styles.infoValue}>{paymentInfo.accountNumber}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Số tiền:</Text>
                      <Text style={styles.infoValue}>{formatVND(paymentInfo.amount)}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Nội dung:</Text>
                      <Text style={styles.infoValue}>{paymentInfo.transactionContent}</Text>
                    </View>
                  </View>
                  {isBuyer && order.status === 'PENDING' && (
                    <TouchableOpacity
                      style={styles.qrButton}
                      onPress={() => setShowPaymentQR(true)}
                      activeOpacity={0.7}
                    >
                      <Icon name="qrcode" size={20} color="white" />
                      <Text style={styles.qrButtonText}>Xem mã QR</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Scam Warning */}
              <View style={styles.warningBox}>
                <Icon name="alert" size={20} color="#ff9800" />
                <Text style={styles.warningText}>
                  ⚠️ CẢNH BÁO: Chỉ thực hiện thanh toán sau khi đã gặp mặt người bán và kiểm tra xe trực tiếp. 
                  Không chuyển khoản trước khi nhận hàng để tránh lừa đảo.
                </Text>
              </View>
            </View>
          )}

          {/* AI Insights */}
          {(order.status === 'PENDING' || order.status === 'PAID') && (
            <View style={styles.card}>
              <View style={styles.aiHeader}>
                <View style={styles.aiHeaderIcon}>
                  <Icon name="robot" size={24} color="#6200ee" />
                </View>
                <View style={styles.aiHeaderText}>
                  <Text style={styles.sectionTitle}>Phân tích AI</Text>
                </View>
                {aiInsights && (
                  <TouchableOpacity
                    onPress={loadAIInsights}
                    style={styles.aiRefreshIconButton}
                    activeOpacity={0.7}
                  >
                    <Icon name="refresh" size={20} color="#6200ee" />
                  </TouchableOpacity>
                )}
              </View>

              {loadingAI ? (
                <View style={styles.aiLoadingContainer}>
                  <View style={styles.aiLoadingIndicator}>
                    <Icon name="robot" size={32} color="#6200ee" />
                  </View>
                  <Text style={styles.aiLoadingText}>AI đang phân tích...</Text>
                  <Text style={styles.aiLoadingSubtext}>Vui lòng đợi một chút</Text>
                </View>
              ) : aiError ? (
                <View style={styles.aiErrorContainer}>
                  <Icon name="alert-circle" size={32} color="#d32f2f" />
                  <Text style={styles.aiErrorText}>{aiError}</Text>
                  <TouchableOpacity
                    onPress={loadAIInsights}
                    style={styles.aiRetryButton}
                    activeOpacity={0.7}
                  >
                    <Icon name="refresh" size={18} color="white" />
                    <Text style={styles.aiRetryButtonText}>Thử lại</Text>
                  </TouchableOpacity>
                </View>
              ) : aiInsights ? (
                <View>
                  <View style={styles.aiInsightsContainer}>
                    <Text style={styles.aiInsightsText}>{aiInsights.insights}</Text>
                  </View>
                  {aiInsights.sellerStats && (
                    <View style={styles.statsBox}>
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>
                          {aiInsights.sellerStats.averageRating ? aiInsights.sellerStats.averageRating.toFixed(1) : '0.0'}
                        </Text>
                        <Text style={styles.statLabel}>Đánh giá TB</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>{aiInsights.sellerStats.totalReviews || 0}</Text>
                        <Text style={styles.statLabel}>Đánh giá</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>{aiInsights.sellerStats.soldListings || 0}</Text>
                        <Text style={styles.statLabel}>Đã bán</Text>
                      </View>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.aiPromptContainer}>
                  <Icon name="robot-outline" size={48} color="#ccc" />
                  <Text style={styles.aiPromptText}>Nhấn để xem phân tích AI</Text>
                  <TouchableOpacity
                    onPress={loadAIInsights}
                    style={styles.aiLoadButton}
                    activeOpacity={0.7}
                  >
                    <Icon name="robot" size={20} color="white" />
                    <Text style={styles.aiLoadButtonText}>Xem phân tích AI</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Actions */}
          {(order.status === 'PENDING' || order.status === 'PAID' || order.status === 'CLOSED') && (
            <View style={styles.actionsCard}>
              {/* Buyer Actions */}
              {isBuyer && order.status === 'PENDING' && !order.buyerPaymentConfirmed && (
                <>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.confirmButton]}
                    onPress={handleConfirmPayment}
                    disabled={processing}
                    activeOpacity={0.8}
                  >
                    <Icon name="check-circle" size={20} color="white" />
                    <Text style={styles.actionButtonText}>Xác nhận đã thanh toán</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.cancelButton]}
                    onPress={() => setShowCancelModal(true)}
                    disabled={processing}
                    activeOpacity={0.8}
                  >
                    <Icon name="close-circle" size={20} color="white" />
                    <Text style={styles.actionButtonText}>Hủy đơn hàng</Text>
                  </TouchableOpacity>
                </>
              )}
              
              {/* Buyer - Payment Confirmed, waiting for seller */}
              {isBuyer && order.status === 'PENDING' && order.buyerPaymentConfirmed && (
                <View style={styles.statusMessageContainer}>
                  <Icon name="check-circle" size={24} color="#4caf50" />
                  <Text style={styles.statusMessageText}>
                    Bạn đã xác nhận thanh toán. Đang chờ người bán xác nhận nhận tiền.
                  </Text>
                </View>
              )}
              
              {/* Seller Actions - PENDING */}
              {isSeller && order.status === 'PENDING' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={() => setShowCancelModal(true)}
                  disabled={processing}
                  activeOpacity={0.8}
                >
                  <Icon name="close-circle" size={20} color="white" />
                  <Text style={styles.actionButtonText}>Hủy đơn hàng</Text>
                </TouchableOpacity>
              )}
              
              {/* Seller Actions - Buyer has confirmed payment */}
              {isSeller && order.status === 'PENDING' && order.buyerPaymentConfirmed && (
                <>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.confirmButton]}
                    onPress={handleConfirmReceived}
                    disabled={processing}
                    activeOpacity={0.8}
                  >
                    <Icon name="cash-check" size={20} color="white" />
                    <Text style={styles.actionButtonText}>Xác nhận đã nhận tiền</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Seller Actions - CLOSED (Review/Update Buyer) */}
              {order.status === 'CLOSED' && isSeller && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.reviewButton]}
                  onPress={() => navigation.navigate('CreateReview', { 
                    orderId: order.id,
                    buyerId: buyer.id 
                  })}
                  activeOpacity={0.8}
                >
                  <Icon name={order.sellerReviewId ? "pencil" : "star"} size={20} color="white" />
                  <Text style={styles.actionButtonText}>
                    {order.sellerReviewId ? 'Cập nhật đánh giá' : 'Đánh giá người mua'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Buyer Actions - CLOSED (Review/Update Seller) */}
              {order.status === 'CLOSED' && isBuyer && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.reviewButton]}
                  onPress={() => navigation.navigate('CreateReview', { 
                    orderId: order.id,
                    sellerId: seller.id 
                  })}
                  activeOpacity={0.8}
                >
                  <Icon name={order.buyerReviewId ? "pencil" : "star"} size={20} color="white" />
                  <Text style={styles.actionButtonText}>
                    {order.buyerReviewId ? 'Cập nhật đánh giá' : 'Đánh giá người bán'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>

        {/* Cancel Modal */}
        <Modal
          visible={showCancelModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowCancelModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Hủy đơn hàng</Text>
                <TouchableOpacity onPress={() => setShowCancelModal(false)}>
                  <Icon name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalSubtitle}>
                Vui lòng nhập lý do hủy đơn hàng. Hủy quá nhiều đơn hàng có thể dẫn đến khóa tài khoản.
              </Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  multiline
                  numberOfLines={4}
                  placeholder="Nhập lý do..."
                  placeholderTextColor="#999"
                  value={cancelReason}
                  onChangeText={setCancelReason}
                />
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => setShowCancelModal(false)}
                >
                  <Text style={styles.modalButtonTextCancel}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonConfirm]}
                  onPress={handleCancel}
                  disabled={processing}
                >
                  {processing ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.modalButtonTextConfirm}>Xác nhận</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* QR Code Modal */}
        <Modal
          visible={showPaymentQR}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowPaymentQR(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.qrModalContent}>
              <View style={styles.qrModalHeader}>
                <Text style={styles.qrModalTitle}>Mã QR Thanh toán</Text>
                <TouchableOpacity onPress={() => setShowPaymentQR(false)}>
                  <Icon name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              {qrData && (
                <>
                  <View style={styles.qrCodeContainer}>
                    <QRCode
                      value={qrData}
                      size={200}
                      color="#6200ee"
                      backgroundColor="white"
                    />
                    <Text style={styles.qrInstruction}>
                      Quét mã này bằng ứng dụng ngân hàng để chuyển khoản
                    </Text>
                  </View>
                  <Text style={styles.qrWarning}>
                    ⚠️ Chỉ quét mã QR sau khi đã gặp mặt và kiểm tra xe!
                  </Text>
                </>
              )}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 16,
  },
  statusCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  cancellationInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#ffebee',
    borderRadius: 8,
    width: '100%',
  },
  cancellationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#d32f2f',
    marginBottom: 4,
  },
  cancellationReason: {
    fontSize: 14,
    color: '#666',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 14,
    alignItems: 'flex-start',
    minHeight: 24,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    width: 110,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    fontWeight: '400',
  },
  infoValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  paymentInfoBox: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f4ff',
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e8d5ff',
  },
  paymentMethodText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6200ee',
    marginTop: 8,
    textAlign: 'center',
  },
  vietqrDetails: {
    width: '100%',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6200ee',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  qrButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#fff3e0',
    padding: 14,
    borderRadius: 10,
    marginTop: 16,
    gap: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#e65100',
    lineHeight: 20,
    fontWeight: '500',
  },
  aiInsightsText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
    marginBottom: 16,
    textAlign: 'justify',
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  aiHeaderIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f3e5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  aiHeaderText: {
    flex: 1,
  },
  aiRefreshIconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f3e5f5',
  },
  aiLoadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  aiLoadingIndicator: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f3e5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  aiLoadingText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
    marginBottom: 8,
  },
  aiLoadingSubtext: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  aiErrorContainer: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  aiErrorText: {
    fontSize: 15,
    color: '#d32f2f',
    marginTop: 16,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  aiRetryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6200ee',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
  },
  aiRetryButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  aiPromptContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  aiPromptText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    marginBottom: 24,
  },
  aiLoadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6200ee',
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 16,
    gap: 10,
    elevation: 0,
    shadowColor: '#6200ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  aiLoadButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingAIContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 24,
  },
  loadingAIText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  aiInsightsContainer: {
    backgroundColor: '#f8f4ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#6200ee',
  },
  statsBox: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
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
    fontWeight: '500',
  },
  actionsCard: {
    gap: 12,
    marginBottom: 16,
    paddingTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmButton: {
    backgroundColor: '#4caf50',
  },
  cancelButton: {
    backgroundColor: '#f44336',
  },
  reviewButton: {
    backgroundColor: '#ff9800',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  statusMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#4caf50',
  },
  statusMessageText: {
    flex: 1,
    fontSize: 15,
    color: '#2e7d32',
    fontWeight: '500',
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  inputContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textInput: {
    fontSize: 14,
    color: '#333',
    textAlignVertical: 'top',
    minHeight: 80,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#f5f5f5',
  },
  modalButtonConfirm: {
    backgroundColor: '#f44336',
  },
  modalButtonTextCancel: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextConfirm: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  qrModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  qrModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  qrModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  qrCodeContainer: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  qrDataText: {
    marginTop: 16,
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
    textAlign: 'center',
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    width: '100%',
  },
  qrInstruction: {
    marginTop: 12,
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  qrWarning: {
    fontSize: 12,
    color: '#ff9800',
    textAlign: 'center',
    fontWeight: '600',
  },
});

