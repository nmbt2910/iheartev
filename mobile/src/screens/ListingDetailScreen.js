import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../store/auth';
import { listingService } from '../services/listingService';
import { orderService } from '../services/orderService';
import { aiService } from '../services/aiService';
import { attachmentService } from '../services/attachmentService';
import { useFavorites } from '../store/favorites';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { formatVND } from '../utils/currencyFormatter';
import { Image } from 'react-native';

export default function ListingDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [aiOverview, setAiOverview] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [aiExpanded, setAiExpanded] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [hasActiveOrder, setHasActiveOrder] = useState(false);
  const { token, isAuthenticated } = useAuth();
  const favorites = useFavorites((state) => state.favorites);
  const { checkFavorite, toggleFavorite } = useFavorites();
  
  const isFavorite = (listingId) => {
    return favorites.has(listingId);
  };

  const loadAIOverview = async () => {
    if (!item) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const listingData = {
        brand: item.brand,
        model: item.model,
        year: item.year,
        batteryCapacityKWh: item.batteryCapacityKWh,
        price: item.price,
        conditionLabel: item.conditionLabel,
        mileageKm: item.mileageKm,
        description: item.description,
        type: item.type,
      };
      const overview = await aiService.getOverview(listingData);
      setAiOverview(overview);
      setAiExpanded(false); // Reset expand state when loading new overview
    } catch (error) {
      setAiError('Không thể tải đánh giá AI. Vui lòng thử lại.');
      console.error('Error loading AI overview:', error);
    } finally {
      setAiLoading(false);
    }
  };

  // Simple text cleaner - removes markdown syntax
  const cleanText = (text) => {
    if (!text) return '';
    return text
      .replace(/#{1,6}\s+/g, '') // Remove headers
      .replace(/\*\*([^*]+?)\*\*/g, '$1') // Remove bold
      .replace(/__([^_]+?)__/g, '$1') // Remove bold alt
      .replace(/\*\*/g, '') // Remove remaining **
      .replace(/__/g, '') // Remove remaining __
      .replace(/\*([^*]+?)\*/g, '$1') // Remove italic (careful with numbered lists)
      .replace(/`([^`]+?)`/g, '$1') // Remove code
      .replace(/\[([^\]]+?)\]\([^\)]+?\)/g, '$1') // Remove links
      .trim();
  };

  // Format AI text with proper styling
  const formatAIText = (text) => {
    if (!text) return [];
    
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const formatted = [];
    let currentParagraph = [];
    
    lines.forEach((line, index) => {
      let trimmed = line.trim();
      
      // Clean markdown from the line
      trimmed = cleanText(trimmed);
      
      if (!trimmed) return;
      
      // Numbered list items (1., 2., 3., etc.)
      const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
      if (numberedMatch) {
        // Flush any pending paragraph
        if (currentParagraph.length > 0) {
          formatted.push({ type: 'paragraph', text: cleanText(currentParagraph.join(' ')) });
          currentParagraph = [];
        }
        formatted.push({ type: 'numbered', number: numberedMatch[1], text: cleanText(numberedMatch[2]) });
        return;
      }
      
      // Headings (lines that start with common heading patterns or are short)
      const isHeading = trimmed.match(/^(Đánh giá|So sánh|Lời khuyên|Ưu điểm|Nhược điểm|Đặc điểm)/i) ||
                       (trimmed.length < 60 && !trimmed.includes('.') && trimmed.length > 5 && index < lines.length - 1);
      
      if (isHeading) {
        // Flush any pending paragraph
        if (currentParagraph.length > 0) {
          formatted.push({ type: 'paragraph', text: cleanText(currentParagraph.join(' ')) });
          currentParagraph = [];
        }
        formatted.push({ type: 'heading', text: trimmed });
        return;
      }
      
      // Regular paragraph content
      currentParagraph.push(trimmed);
    });
    
    // Flush remaining paragraph
    if (currentParagraph.length > 0) {
      formatted.push({ type: 'paragraph', text: cleanText(currentParagraph.join(' ')) });
    }
    
    return formatted;
  };

  const formattedAIText = aiOverview ? formatAIText(aiOverview) : [];
  const MAX_VISIBLE_ITEMS = 2; // Show first 2 items when collapsed (heading + first content)
  const shouldShowExpandButton = formattedAIText.length > MAX_VISIBLE_ITEMS;
  const displayedItems = aiExpanded || !shouldShowExpandButton 
    ? formattedAIText 
    : formattedAIText.slice(0, MAX_VISIBLE_ITEMS);

  useEffect(() => {
    (async () => {
      try {
        const listing = await listingService.getListingById(id);
        setItem(listing);
        
        // Load attachments
        if (listing) {
          try {
            const atts = await attachmentService.getAttachmentsByListing(id);
            setAttachments(Array.isArray(atts) ? atts : []);
          } catch (error) {
            console.error('Error loading attachments:', error);
          }
          
          // Check for active orders
          if (isAuthenticated) {
            try {
              const orders = await orderService.getMyOrders();
              const activeOrder = orders.find(o => 
                o.listing?.id === id && 
                o.status !== 'CANCELLED' && 
                o.status !== 'CLOSED'
              );
              setHasActiveOrder(!!activeOrder);
            } catch (error) {
              console.error('Error checking orders:', error);
            }
          }
          
          // Auto-load AI overview when listing loads
          loadAIOverview();
        }
      } catch (error) {
        if (error.sessionExpired) {
          Alert.alert('Session Expired', 'Session expired. Please log in again.', [
            { text: 'OK', onPress: () => navigation.replace('Login') }
          ]);
        } else {
          Alert.alert('Lỗi', 'Không thể tải thông tin xe');
          navigation.goBack();
        }
      }
    })();
  }, [id, isAuthenticated]);

  // Check favorite status when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (isAuthenticated && token && id) {
        checkFavorite(id).catch((error) => {
          // Silently handle favorite check errors
          if (error.response?.status !== 401 && error.response?.status !== 403) {
            console.error('Error checking favorite:', error);
          }
        });
      }
    }, [isAuthenticated, token, id])
  );

  const handleBuyNow = async () => {
    if (!isAuthenticated || !token) {
      Alert.alert('Yêu cầu đăng nhập', 'Vui lòng đăng nhập để mua xe', [
        { text: 'Đăng nhập', onPress: () => navigation.navigate('Login') },
        { text: 'Hủy', style: 'cancel' }
      ]);
      return;
    }
    
    if (hasActiveOrder) {
      Alert.alert('Thông báo', 'Xe này đã có đơn hàng. Không thể mua được.');
      return;
    }
    
    setLoading(true);
    try {
      const order = await orderService.buyNow(id);
      Alert.alert('Thành công', 'Đơn hàng đã được tạo!', [
        { text: 'Xem đơn hàng', onPress: () => navigation.navigate('OrderDetail', { orderId: order.id }) },
        { text: 'OK', style: 'cancel', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      if (error.sessionExpired) {
        Alert.alert('Session Expired', 'Session expired. Please log in again.', [
          { text: 'OK', onPress: () => navigation.replace('Login') }
        ]);
      } else {
        Alert.alert('Lỗi', error.response?.data?.error || 'Không thể tạo đơn hàng. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFavorite = async () => {
    if (!isAuthenticated || !token) {
      Alert.alert('Yêu cầu đăng nhập', 'Vui lòng đăng nhập để thêm vào yêu thích', [
        { text: 'Đăng nhập', onPress: () => navigation.navigate('Login') },
        { text: 'Hủy', style: 'cancel' }
      ]);
      return;
    }
    setFavoriteLoading(true);
    try {
      await toggleFavorite(id);
      // Refresh favorite status after toggle to ensure sync across all screens
      await checkFavorite(id);
    } catch (error) {
      if (error.sessionExpired) {
        Alert.alert('Session Expired', 'Session expired. Please log in again.', [
          { text: 'OK', onPress: () => navigation.replace('Login') }
        ]);
      } else {
        Alert.alert('Lỗi', error.response?.data?.error || 'Không thể cập nhật yêu thích. Vui lòng thử lại.');
      }
    } finally {
      setFavoriteLoading(false);
    }
  };

  if (!item) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar style="light" />
        <View style={styles.container}>
          <View style={styles.appbarHeader}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.appbarAction}>
              <Icon name="arrow-left" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.appbarContent}>Chi tiết xe</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Đang tải...</Text>
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
          <Text style={styles.appbarContent} numberOfLines={1}>{`${item.brand} ${item.model}`}</Text>
          <View style={{ width: 40 }} />
        </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Section with Price */}
        <View style={styles.heroSection}>
          <View style={styles.heroHeader}>
            <View style={styles.heroIconContainer}>
              <Icon name="car-electric" size={48} color="#6200ee" />
            </View>
            <View style={styles.heroTitleContainer}>
              <Text style={styles.heroTitle} numberOfLines={2}>{`${item.brand} ${item.model}`}</Text>
              <Text style={styles.heroSubtitle}>{item.year}</Text>
            </View>
          </View>
          <View style={styles.priceHighlight}>
            <Text style={styles.priceHighlightLabel}>Giá bán</Text>
            <Text style={styles.priceHighlightValue}>{formatVND(item.price)}</Text>
          </View>
        </View>

        {/* Attachments Gallery */}
        {attachments.length > 0 && (
          <View style={styles.attachmentsCard}>
            <View style={styles.sectionHeader}>
              <Icon name="image" size={20} color="#6200ee" />
              <Text style={styles.sectionTitle}>Ảnh/Video</Text>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.attachmentsScroll}
              contentContainerStyle={styles.attachmentsContainer}
            >
              {attachments.map((attachment) => (
                <View key={attachment.id} style={styles.attachmentItem}>
                  {attachment.type === 'IMAGE' ? (
                    <Image 
                      source={{ uri: attachmentService.getAttachmentUrl(attachment.id) }}
                      style={styles.attachmentImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.attachmentImage, styles.attachmentVideo]}>
                      <Icon name="play-circle" size={48} color="#6200ee" />
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* AI Overview Section - Main Feature */}
        <View style={styles.aiMainCard}>
          <View style={styles.aiHeader}>
            <View style={styles.aiHeaderIcon}>
              <Icon name="robot" size={24} color="#6200ee" />
            </View>
            <View style={styles.aiHeaderText}>
              <Text style={styles.aiMainTitle}>Đánh giá AI</Text>
              <Text style={styles.aiMainSubtitle}>Phân tích thông minh về chiếc xe</Text>
            </View>
            {aiOverview && (
              <TouchableOpacity
                onPress={loadAIOverview}
                style={styles.aiRefreshIconButton}
                activeOpacity={0.7}
              >
                <Icon name="refresh" size={20} color="#6200ee" />
              </TouchableOpacity>
            )}
          </View>

          {aiLoading ? (
            <View style={styles.aiLoadingContainer}>
              <View style={styles.aiLoadingIndicator}>
                <Icon name="robot" size={32} color="#6200ee" />
              </View>
              <Text style={styles.aiLoadingText}>AI đang phân tích chiếc xe...</Text>
              <Text style={styles.aiLoadingSubtext}>Vui lòng đợi một chút</Text>
            </View>
          ) : aiError ? (
            <View style={styles.aiErrorContainer}>
              <Icon name="alert-circle" size={32} color="#d32f2f" />
              <Text style={styles.aiErrorText}>{aiError}</Text>
              <TouchableOpacity
                onPress={loadAIOverview}
                style={styles.aiRetryButton}
                activeOpacity={0.7}
              >
                <Icon name="refresh" size={18} color="white" />
                <Text style={styles.aiRetryButtonText}>Thử lại</Text>
              </TouchableOpacity>
            </View>
          ) : aiOverview ? (
            <View>
              <View style={styles.aiContentContainer}>
                {displayedItems.map((item, index) => {
                  if (item.type === 'heading') {
                    return (
                      <View key={index} style={styles.aiHeadingContainer}>
                        <View style={styles.aiHeadingDot} />
                        <Text style={styles.aiHeadingText}>{item.text}</Text>
                      </View>
                    );
                  } else if (item.type === 'numbered') {
                    return (
                      <View key={index} style={styles.aiNumberedItem}>
                        <View style={styles.aiNumberBadge}>
                          <Text style={styles.aiNumberText}>{item.number}</Text>
                        </View>
                        <Text style={styles.aiNumberedText}>{item.text}</Text>
                      </View>
                    );
                  } else {
                    return (
                      <Text key={index} style={styles.aiParagraph}>{item.text}</Text>
                    );
                  }
                })}
              </View>
              {shouldShowExpandButton && (
                <TouchableOpacity
                  onPress={() => setAiExpanded(!aiExpanded)}
                  style={styles.aiExpandButton}
                  activeOpacity={0.7}
                >
                  <Text style={styles.aiExpandButtonText}>
                    {aiExpanded ? 'Thu gọn' : 'Xem thêm'}
                  </Text>
                  <Icon 
                    name={aiExpanded ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color="#6200ee" 
                  />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.aiPromptContainer}>
              <Icon name="robot-outline" size={48} color="#ccc" />
              <Text style={styles.aiPromptText}>Nhấn để xem đánh giá AI</Text>
              <TouchableOpacity
                onPress={loadAIOverview}
                style={styles.aiLoadButton}
                activeOpacity={0.7}
              >
                <Icon name="robot" size={20} color="white" />
                <Text style={styles.aiLoadButtonText}>Xem đánh giá AI</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Details Section */}
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Thông tin chi tiết</Text>
          
          <View style={styles.detailsList}>
            <View style={styles.detailItem}>
              <View style={styles.detailItemIcon}>
                <Icon name="calendar" size={20} color="#6200ee" />
              </View>
              <View style={styles.detailItemContent}>
                <Text style={styles.detailItemLabel}>Năm sản xuất</Text>
                <Text style={styles.detailItemValue}>{item.year}</Text>
              </View>
            </View>

            <View style={styles.detailSeparator} />

            <View style={styles.detailItem}>
              <View style={styles.detailItemIcon}>
                <Icon name="battery" size={20} color="#6200ee" />
              </View>
              <View style={styles.detailItemContent}>
                <Text style={styles.detailItemLabel}>Dung lượng pin</Text>
                <Text style={styles.detailItemValue}>{item.batteryCapacityKWh || 'N/A'} kWh</Text>
              </View>
            </View>

            {item.conditionLabel && (
              <>
                <View style={styles.detailSeparator} />
                <View style={styles.detailItem}>
                  <View style={styles.detailItemIcon}>
                    <Icon name="star" size={20} color="#6200ee" />
                  </View>
                  <View style={styles.detailItemContent}>
                    <Text style={styles.detailItemLabel}>Tình trạng</Text>
                    <View style={styles.conditionBadgeInline}>
                      <Text style={styles.conditionTextInline}>{item.conditionLabel}</Text>
                    </View>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Seller Info */}
        {item.seller && (
          <View style={styles.descriptionCard}>
            <View style={styles.sectionHeader}>
              <Icon name="account-circle" size={20} color="#6200ee" />
              <Text style={styles.sectionTitle}>Người bán</Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('SellerProfile', { sellerId: item.seller.id })}
              activeOpacity={0.7}
              style={styles.sellerInfoRow}
            >
              <View style={styles.sellerAvatarContainer}>
                <Icon name="account-circle" size={40} color="#6200ee" />
              </View>
              <View style={styles.sellerInfoContent}>
                <Text style={styles.sellerName}>{item.seller.fullName}</Text>
                <Text style={styles.sellerEmail}>{item.seller.email}</Text>
                {item.seller.phone && (
                  <Text style={styles.sellerPhone}>{item.seller.phone}</Text>
                )}
              </View>
              <Icon name="chevron-right" size={20} color="#999" />
            </TouchableOpacity>
          </View>
        )}

        {/* Payment Info */}
        {item.paymentInfo && (
          <View style={styles.descriptionCard}>
            <View style={styles.sectionHeader}>
              <Icon name="credit-card" size={20} color="#6200ee" />
              <Text style={styles.sectionTitle}>Phương thức thanh toán</Text>
            </View>
            {item.paymentInfo.paymentMethod === 'CASH' ? (
              <View style={styles.paymentInfoBox}>
                <Icon name="cash" size={32} color="#4caf50" />
                <Text style={styles.paymentMethodText}>Thanh toán tiền mặt khi nhận hàng</Text>
              </View>
            ) : (
              <View style={styles.paymentInfoBox}>
                <Icon name="qrcode" size={32} color="#6200ee" />
                <Text style={styles.paymentMethodText}>Chuyển khoản VietQR</Text>
                <View style={styles.vietqrDetails}>
                  <View style={styles.paymentInfoRow}>
                    <Text style={styles.paymentInfoLabel}>Ngân hàng:</Text>
                    <Text style={styles.paymentInfoValue}>{item.paymentInfo.bankName}</Text>
                  </View>
                  <View style={styles.paymentInfoRow}>
                    <Text style={styles.paymentInfoLabel}>Số tài khoản:</Text>
                    <Text style={styles.paymentInfoValue}>{item.paymentInfo.accountNumber}</Text>
                  </View>
                  <View style={styles.paymentInfoRow}>
                    <Text style={styles.paymentInfoLabel}>Số tiền:</Text>
                    <Text style={styles.paymentInfoValue}>{formatVND(item.paymentInfo.amount)}</Text>
                  </View>
                  <View style={styles.paymentInfoRow}>
                    <Text style={styles.paymentInfoLabel}>Nội dung:</Text>
                    <Text style={styles.paymentInfoValue}>{item.paymentInfo.transactionContent}</Text>
                  </View>
                </View>
              </View>
            )}
            <View style={styles.warningBox}>
              <Icon name="alert" size={20} color="#ff9800" />
              <Text style={styles.warningText}>
                ⚠️ CẢNH BÁO: Chỉ thực hiện thanh toán sau khi đã gặp mặt người bán và kiểm tra xe trực tiếp. 
                Không chuyển khoản trước khi nhận hàng để tránh lừa đảo.
              </Text>
            </View>
          </View>
        )}

        {/* Description Section */}
        {item.description && (
          <View style={styles.descriptionCard}>
            <View style={styles.sectionHeader}>
              <Icon name="text-box-outline" size={20} color="#6200ee" />
              <Text style={styles.sectionTitle}>Mô tả</Text>
            </View>
            <Text style={styles.descriptionText}>{item.description}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          onPress={handleFavorite}
          style={[styles.favoriteButton, isFavorite(id) && styles.favoriteButtonActive]}
          activeOpacity={0.8}
          disabled={favoriteLoading}
        >
          <View style={[styles.favoriteButtonIconContainer, isFavorite(id) && styles.favoriteButtonIconContainerActive]}>
            <Icon 
              name={isFavorite(id) ? "heart" : "heart-outline"} 
              size={22} 
              color={isFavorite(id) ? "#ffffff" : "#e91e63"} 
            />
          </View>
        </TouchableOpacity>

        {(!hasActiveOrder || isFavorite(id)) && (
          <TouchableOpacity
            onPress={handleBuyNow}
            disabled={loading || hasActiveOrder}
            style={[styles.primaryButton, (loading || hasActiveOrder) && styles.buttonDisabled]}
            activeOpacity={0.8}
          >
            <Icon name="shopping" size={22} color="white" />
            <Text style={styles.primaryButtonText}>
              {loading ? 'Đang xử lý...' : hasActiveOrder ? 'Đã có đơn hàng' : 'Mua ngay'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
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
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  heroSection: {
    backgroundColor: 'white',
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
    marginBottom: 12,
    elevation: 0,
    shadowColor: '#6200ee',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f3e5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    elevation: 0,
    shadowColor: '#6200ee',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  heroTitleContainer: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  priceHighlight: {
    width: '100%',
    backgroundColor: '#f8f4ff',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#6200ee',
  },
  priceHighlightLabel: {
    fontSize: 11,
    color: '#6200ee',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  priceHighlightValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6200ee',
    letterSpacing: -0.5,
  },
  detailsCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 18,
    elevation: 0,
    shadowColor: '#6200ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginLeft: 8,
    letterSpacing: -0.3,
  },
  detailsList: {
    gap: 0,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  detailSeparator: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 2,
  },
  detailItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3e5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  detailItemContent: {
    flex: 1,
  },
  detailItemLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailItemValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  conditionBadgeInline: {
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  conditionTextInline: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2e7d32',
  },
  attachmentsCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 18,
    padding: 20,
    elevation: 0,
    shadowColor: '#6200ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  attachmentsScroll: {
    marginTop: 12,
  },
  attachmentsContainer: {
    gap: 12,
  },
  attachmentItem: {
    width: 200,
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  attachmentImage: {
    width: '100%',
    height: '100%',
  },
  attachmentVideo: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
  },
  sellerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8f4ff',
    borderRadius: 12,
  },
  sellerAvatarContainer: {
    marginRight: 12,
  },
  sellerInfoContent: {
    flex: 1,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  sellerEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  sellerPhone: {
    fontSize: 14,
    color: '#666',
  },
  paymentInfoBox: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f4ff',
    borderRadius: 12,
    marginTop: 12,
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
    gap: 12,
  },
  paymentInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  paymentInfoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    width: 120,
  },
  paymentInfoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#e65100',
    lineHeight: 18,
  },
  descriptionCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 18,
    padding: 20,
    elevation: 0,
    shadowColor: '#6200ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  descriptionText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 24,
    letterSpacing: 0.1,
  },
  aiMainCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    padding: 24,
    elevation: 0,
    shadowColor: '#6200ee',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    borderWidth: 2,
    borderColor: '#f0e6ff',
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
  aiMainTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  aiMainSubtitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
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
  aiContentContainer: {
    gap: 20,
  },
  aiHeadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiHeadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6200ee',
    marginRight: 12,
  },
  aiHeadingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    letterSpacing: -0.2,
    flex: 1,
  },
  aiNumberedItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  aiNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6200ee',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    flexShrink: 0,
  },
  aiNumberText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  aiNumberedText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 26,
    flex: 1,
    letterSpacing: 0.1,
  },
  aiParagraph: {
    fontSize: 16,
    color: '#444',
    lineHeight: 26,
    letterSpacing: 0.1,
    marginBottom: 8,
  },
  aiExpandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#f3e5f5',
    borderWidth: 1,
    borderColor: '#e1bee7',
    gap: 8,
  },
  aiExpandButtonText: {
    fontSize: 15,
    color: '#6200ee',
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e8e8e8',
    gap: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  favoriteButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#e91e63',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 0,
    shadowColor: '#e91e63',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  favoriteButtonActive: {
    backgroundColor: '#e91e63',
    borderColor: '#e91e63',
  },
  favoriteButtonIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(233, 30, 99, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteButtonIconContainerActive: {
    backgroundColor: 'transparent',
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6200ee',
    paddingVertical: 18,
    borderRadius: 18,
    elevation: 0,
    shadowColor: '#6200ee',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    marginLeft: 10,
    color: 'white',
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
});
