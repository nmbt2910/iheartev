import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, RefreshControl, Dimensions, BackHandler, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../store/auth';
import { listingService } from '../services/listingService';
import { orderService } from '../services/orderService';
import { aiService } from '../services/aiService';
import { attachmentService } from '../services/attachmentService';
import { useFavorites } from '../store/favorites';
import { profileService } from '../services/profileService';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { formatVND } from '../utils/currencyFormatter';
import { Image } from 'react-native';
import { Video } from 'expo-av';
import * as VideoThumbnails from 'expo-video-thumbnails';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ListingDetailScreen({ route, navigation }) {
  const { id, refresh, fromMyListings } = route.params || {};
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [aiOverview, setAiOverview] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [aiExpanded, setAiExpanded] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [hasActiveOrder, setHasActiveOrder] = useState(false);
  const [isSeller, setIsSeller] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const carouselScrollRef = useRef(null);
  const videoRefs = useRef({});
  const [videoThumbnails, setVideoThumbnails] = useState({}); // Cache for video thumbnails
  const { token, isAuthenticated } = useAuth();
  const favorites = useFavorites((state) => state.favorites);
  const { toggleFavorite } = useFavorites();
  
  const isFavorite = (listingId) => {
    return favorites.has(listingId);
  };

  const loadAIOverview = useCallback(async () => {
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
  }, [item]);

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

  const loadListingData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      // Reset seller state when listing changes
      setIsSeller(false);
      setHasActiveOrder(false);
      
      const listing = await listingService.getListingById(id);
      setItem(listing);
      
      // Load attachments
      if (listing) {
        try {
          const atts = await attachmentService.getAttachmentsByListing(id);
          const attachmentsArray = Array.isArray(atts) ? atts : [];
          setAttachments(attachmentsArray);
          
          // Generate thumbnails for videos (in background)
          attachmentsArray
            .filter(att => att.type === 'VIDEO')
            .forEach((videoAttachment) => {
              // Generate thumbnail asynchronously
              (async () => {
                try {
                  const videoUrl = attachmentService.getAttachmentUrl(videoAttachment.id);
                  const thumbnail = await VideoThumbnails.getThumbnailAsync(videoUrl, {
                    time: 1000,
                    quality: 0.8,
                  });
                  
                  setVideoThumbnails(prev => {
                    // Only set if not already in cache
                    if (prev[videoAttachment.id]) {
                      return prev;
                    }
                    return {
                      ...prev,
                      [videoAttachment.id]: thumbnail.uri,
                    };
                  });
                } catch (error) {
                  console.error(`Error generating thumbnail for video ${videoAttachment.id}:`, error);
                  // Don't set thumbnail if generation fails
                }
              })();
            });
        } catch (error) {
          console.error('Error loading attachments:', error);
        }
        
        // Check for active orders and if user is seller
        if (isAuthenticated && token) {
          try {
            const [ordersRes, profileRes] = await Promise.all([
              orderService.getMyOrders().catch(() => []),
              profileService.getMyProfile().catch(() => null)
            ]);
            
            // Check for active orders
            const activeOrder = ordersRes.find(o => 
              o.listing?.id === id && 
              o.status !== 'CANCELLED' && 
              o.status !== 'CLOSED'
            );
            setHasActiveOrder(!!activeOrder);
            
            // Check if user is the seller - compare IDs (handle both number and string types)
            // Profile response has structure: { user: { id: ..., email: ..., ... }, ... }
            const userId = profileRes?.user?.id || profileRes?.id;
            if (listing.seller && listing.seller.id && userId) {
              const sellerId = String(listing.seller.id);
              const currentUserId = String(userId);
              if (sellerId === currentUserId) {
                setIsSeller(true);
              }
            }
          } catch (error) {
            console.error('Error checking orders or profile:', error);
            // If profile fetch fails, still try to check seller using email or other means
            if (listing.seller && listing.seller.email) {
              // Could fallback to email comparison if needed
              console.log('Profile fetch failed, listing seller:', listing.seller);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading listing:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      if (error.sessionExpired) {
        Alert.alert('Session Expired', 'Session expired. Please log in again.', [
          { text: 'OK', onPress: () => navigation.replace('Login') }
        ]);
      } else {
        if (!showRefreshing) {
          const errorMessage = error.response?.status === 404 
            ? 'Tin đăng không tồn tại' 
            : 'Không thể tải thông tin xe';
          Alert.alert('Thông báo', errorMessage, [
            { text: 'OK', onPress: () => navigation.goBack() }
          ]);
          return; // Don't call navigation.goBack() twice
        }
      }
    } finally {
      if (showRefreshing) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [id, isAuthenticated, token]);

  useEffect(() => {
    loadListingData();
  }, [loadListingData]);

  // Refresh when screen comes into focus and refresh param is present
  useFocusEffect(
    useCallback(() => {
      if (refresh) {
        loadListingData(true);
        // Clear the refresh param to avoid refreshing on every focus
        navigation.setParams({ refresh: undefined });
      }
    }, [refresh, loadListingData, navigation])
  );

  const onRefresh = useCallback(() => {
    loadListingData(true);
  }, [loadListingData]);

  // Removed automatic AI overview loading - now only loads when user clicks button

  // Reset carousel index when attachments change
  useEffect(() => {
    setCurrentImageIndex(0);
    if (carouselScrollRef.current) {
      carouselScrollRef.current.scrollTo({ x: 0, animated: false });
    }
    // Cleanup video refs when attachments change
    Object.keys(videoRefs.current).forEach(key => {
      if (videoRefs.current[key]) {
        videoRefs.current[key].unloadAsync?.();
      }
    });
    videoRefs.current = {};
  }, [attachments.length]);

  // Handle video auto-play when carousel index changes
  useEffect(() => {
    attachments.forEach((attachment, index) => {
      if (attachment.type === 'VIDEO') {
        const videoRef = videoRefs.current[attachment.id];
        if (videoRef) {
          if (index === currentImageIndex) {
            // Play video if it's currently visible
            videoRef.playAsync().catch(console.error);
          } else {
            // Pause video if it's not visible
            videoRef.pauseAsync().catch(console.error);
          }
        }
      }
    });
  }, [currentImageIndex, attachments]);

  // Handle screen focus/blur for video playback
  useFocusEffect(
    useCallback(() => {
      // Play current video when screen is focused
      const currentAttachment = attachments[currentImageIndex];
      if (currentAttachment?.type === 'VIDEO') {
        const videoRef = videoRefs.current[currentAttachment.id];
        videoRef?.playAsync().catch(console.error);
      }

      return () => {
        // Pause all videos when screen loses focus
        Object.values(videoRefs.current).forEach(ref => {
          ref?.pauseAsync().catch(console.error);
        });
      };
    }, [attachments, currentImageIndex])
  );

  // Check if user is seller when item loads
  useEffect(() => {
    if (item && isAuthenticated && token) {
      (async () => {
        try {
          const profileRes = await profileService.getMyProfile();
          // Profile response has structure: { user: { id: ..., email: ..., ... }, ... }
          const userId = profileRes?.user?.id || profileRes?.id;
          // Check if user is the seller - compare IDs (handle both number and string types)
          if (item.seller && item.seller.id && userId) {
            const sellerId = String(item.seller.id);
            const currentUserId = String(userId);
            if (sellerId === currentUserId) {
              setIsSeller(true);
            } else {
              setIsSeller(false);
            }
          } else {
            setIsSeller(false);
          }
        } catch (error) {
          console.error('Error checking if user is seller:', error);
          setIsSeller(false);
        }
      })();
    } else {
      setIsSeller(false);
    }
  }, [item, isAuthenticated, token]);

  // Handle hardware back button on Android when fromMyListings is true
  useEffect(() => {
    if (Platform.OS === 'android' && fromMyListings) {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        // Navigate back to My tabs with MyListings tab selected
        // Use getParent to navigate from nested navigator correctly
        const parent = navigation.getParent();
        if (parent) {
          parent.navigate('My', { screen: 'MyListings' });
        } else {
          navigation.navigate('My', { screen: 'MyListings' });
        }
        return true; // Prevent default behavior
      });

      return () => backHandler.remove();
    }
  }, [fromMyListings, navigation]);

  // Favorite status is already loaded via batch loading in HomeScreen
  // No need for individual check - it's already in the favorites store

  const handleBuyNow = async () => {
    if (!isAuthenticated || !token) {
      Alert.alert('Yêu cầu đăng nhập', 'Vui lòng đăng nhập để mua xe', [
        { text: 'Đăng nhập', onPress: () => navigation.navigate('Login') },
        { text: 'Hủy', style: 'cancel' }
      ]);
      return;
    }
    
    // Check if user is the seller of this listing
    if (isSeller) {
      Alert.alert('Thông báo', 'Bạn không thể mua chính xe của mình.');
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
      // toggleFavorite already updates the store state, no need for extra check
      await toggleFavorite(id);
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

  const handleEdit = () => {
    navigation.navigate('EditListing', { listingId: id, fromMyListings: fromMyListings });
  };

  const handleDelete = () => {
    Alert.alert(
      'Xóa tin đăng',
      'Bạn có chắc chắn muốn xóa tin đăng này? Hành động này không thể hoàn tác.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await listingService.deleteListing(id);
              Alert.alert('Thành công', 'Tin đăng đã được xóa', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } catch (error) {
              if (error.sessionExpired) {
                Alert.alert('Session Expired', 'Session expired. Please log in again.', [
                  { text: 'OK', onPress: () => navigation.replace('Login') }
                ]);
              } else {
                Alert.alert('Lỗi', error.response?.data?.error || 'Không thể xóa tin đăng. Vui lòng thử lại.');
              }
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  if (!item) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar style="light" />
        <View style={styles.container}>
          <View style={styles.appbarHeader}>
            <TouchableOpacity 
              onPress={() => {
                if (fromMyListings) {
                  // Navigate back to My tabs with MyListings tab selected
                  // Use getParent to navigate from nested navigator correctly
                  const parent = navigation.getParent();
                  if (parent) {
                    parent.navigate('My', { screen: 'MyListings' });
                  } else {
                    navigation.navigate('My', { screen: 'MyListings' });
                  }
                } else {
                  navigation.goBack();
                }
              }} 
              style={styles.appbarAction}
            >
              <Icon name="arrow-left" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.appbarContent}>Chi tiết xe</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6200ee" />
            <Text style={styles.loadingText}>Đang tải thông tin xe...</Text>
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
          <TouchableOpacity 
            onPress={() => {
              if (fromMyListings) {
                // Navigate back to My tabs with MyListings tab selected
                // Use getParent to navigate from nested navigator correctly
                const parent = navigation.getParent();
                if (parent) {
                  parent.navigate('My', { screen: 'MyListings' });
                } else {
                  navigation.navigate('My', { screen: 'MyListings' });
                }
              } else {
                navigation.goBack();
              }
            }} 
            style={styles.appbarAction}
          >
            <Icon name="arrow-left" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.appbarContent} numberOfLines={1}>{`${item.brand} ${item.model}`}</Text>
          <View style={{ width: 40 }} />
        </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#6200ee']}
            tintColor="#6200ee"
          />
        }
      >
        {/* Attachments Carousel Section */}
        {attachments.length > 0 ? (
          <View style={styles.carouselContainer}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.carouselScrollView}
              contentContainerStyle={styles.carouselContent}
              ref={carouselScrollRef}
              onMomentumScrollEnd={(event) => {
                const slideIndex = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                setCurrentImageIndex(slideIndex);
              }}
            >
              {attachments.map((attachment, index) => (
                <View key={attachment.id} style={styles.carouselItem}>
                  {attachment.type === 'IMAGE' ? (
                    <Image 
                      source={{ uri: attachmentService.getAttachmentUrl(attachment.id) }}
                      style={styles.carouselImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <TouchableOpacity
                      style={styles.carouselVideoContainer}
                      activeOpacity={0.9}
                      onPress={() => {
                        navigation.navigate('VideoPlayer', {
                          videoUrl: attachmentService.getAttachmentUrl(attachment.id),
                          attachmentId: attachment.id,
                        });
                      }}
                    >
                      {/* Show thumbnail if available, otherwise show video */}
                      {videoThumbnails[attachment.id] ? (
                        <>
                          <Image 
                            source={{ uri: videoThumbnails[attachment.id] }}
                            style={styles.carouselVideo}
                            resizeMode="cover"
                          />
                          <View style={styles.videoOverlay}>
                            <View style={styles.videoPlayButton}>
                              <Icon name="play-circle" size={48} color="white" />
                            </View>
                            <Text style={styles.carouselVideoText}>Chạm để xem đầy đủ</Text>
                          </View>
                        </>
                      ) : (
                        <>
                          <Video
                            ref={(ref) => {
                              if (ref) {
                                videoRefs.current[attachment.id] = ref;
                              }
                            }}
                            source={{ uri: attachmentService.getAttachmentUrl(attachment.id) }}
                            style={styles.carouselVideo}
                            resizeMode="cover"
                            shouldPlay={index === currentImageIndex}
                            isLooping={false}
                            isMuted={true}
                            useNativeControls={false}
                            onPlaybackStatusUpdate={(status) => {
                              // Handle video status updates if needed
                            }}
                          />
                          <View style={styles.videoOverlay}>
                            <View style={styles.videoPlayButton}>
                              <Icon name="play-circle" size={48} color="white" />
                            </View>
                            <Text style={styles.carouselVideoText}>Chạm để xem đầy đủ</Text>
                          </View>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </ScrollView>
            {attachments.length > 1 && (
              <View style={styles.carouselPagination}>
                {attachments.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.paginationDot,
                      index === currentImageIndex && styles.paginationDotActive
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.featuredImagePlaceholder}>
            <Icon name="car-electric" size={80} color="#ccc" />
            <Text style={styles.placeholderText}>Chưa có ảnh</Text>
          </View>
        )}

        {/* Hero Section with Title and Price */}
        <View style={styles.heroSection}>
          <View style={styles.heroContent}>
            <View style={styles.heroTitleContainer}>
              <Text style={styles.heroTitle} numberOfLines={2}>{`${item.brand} ${item.model}`}</Text>
              <Text style={styles.heroSubtitle}>{item.year} • Xe điện</Text>
            </View>
            <View style={styles.priceSection}>
              <Text style={styles.priceLabel}>Giá bán</Text>
              <Text style={styles.priceValue}>{formatVND(item.price)}</Text>
            </View>
          </View>
        </View>

        {/* Quick Info Cards */}
        <View style={styles.quickInfoContainer}>
          <View style={styles.quickInfoCard}>
            <View style={styles.quickInfoIcon}>
              <Icon name="calendar" size={20} color="#6200ee" />
            </View>
            <Text style={styles.quickInfoLabel}>Năm</Text>
            <Text style={styles.quickInfoValue}>{item.year}</Text>
          </View>
          {item.batteryCapacityKWh && (
            <View style={styles.quickInfoCard}>
              <View style={styles.quickInfoIcon}>
                <Icon name="battery" size={20} color="#6200ee" />
              </View>
              <Text style={styles.quickInfoLabel}>Pin</Text>
              <Text style={styles.quickInfoValue}>{item.batteryCapacityKWh} kWh</Text>
            </View>
          )}
          {item.conditionLabel && (
            <View style={styles.quickInfoCard}>
              <View style={styles.quickInfoIcon}>
                <Icon name="star" size={20} color="#6200ee" />
              </View>
              <Text style={styles.quickInfoLabel}>Tình trạng</Text>
              <Text style={styles.quickInfoValue} numberOfLines={1}>{item.conditionLabel}</Text>
            </View>
          )}
        </View>

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

        {/* Description Section */}
        {item.description && (
          <View style={styles.descriptionCard}>
            <View style={styles.sectionHeader}>
              <Icon name="text-box-outline" size={22} color="#6200ee" />
              <Text style={styles.sectionTitle}>Mô tả</Text>
            </View>
            <Text style={styles.descriptionText}>{item.description}</Text>
          </View>
        )}

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

        {/* Additional Details Section */}
        <View style={styles.additionalDetailsCard}>
          <View style={styles.sectionHeader}>
            <Icon name="information" size={22} color="#6200ee" />
            <Text style={styles.sectionTitle}>Thông tin bổ sung</Text>
          </View>
          
          <View style={styles.additionalDetailsList}>
            {item.mileageKm && (
              <>
                <View style={styles.additionalDetailItem}>
                  <Icon name="speedometer" size={18} color="#666" />
                  <Text style={styles.additionalDetailLabel}>Số km đã đi:</Text>
                  <Text style={styles.additionalDetailValue}>{item.mileageKm.toLocaleString()} km</Text>
                </View>
                <View style={styles.additionalDetailSeparator} />
              </>
            )}
            {item.type && (
              <>
                <View style={styles.additionalDetailItem}>
                  <Icon name="car-cog" size={18} color="#666" />
                  <Text style={styles.additionalDetailLabel}>Loại xe:</Text>
                  <Text style={styles.additionalDetailValue}>{item.type}</Text>
                </View>
              </>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        {isSeller ? (
          <>
            <TouchableOpacity
              onPress={handleDelete}
              disabled={loading}
              style={[styles.deleteButtonBottom, loading && styles.buttonDisabled]}
              activeOpacity={0.8}
            >
              <Icon name="delete" size={24} color="white" />
              <Text style={styles.deleteButtonText}>Xóa</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleEdit}
              disabled={loading}
              style={[styles.editButtonBottom, loading && styles.buttonDisabled]}
              activeOpacity={0.8}
            >
              <Icon name="pencil" size={22} color="white" />
              <Text style={styles.primaryButtonText}>Chỉnh sửa</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              onPress={handleFavorite}
              style={[styles.favoriteButtonBottom, isFavorite(id) && styles.favoriteButtonBottomActive]}
              activeOpacity={0.8}
              disabled={favoriteLoading}
            >
              <Icon 
                name={isFavorite(id) ? "heart" : "heart-outline"} 
                size={24} 
                color={isFavorite(id) ? "#ffffff" : "#e91e63"} 
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleBuyNow}
              disabled={loading || hasActiveOrder}
              style={[styles.primaryButtonBottom, (loading || hasActiveOrder) && styles.buttonDisabled]}
              activeOpacity={0.8}
            >
              {loading ? (
                <Text style={styles.primaryButtonText}>Đang xử lý...</Text>
              ) : hasActiveOrder ? (
                <>
                  <Icon name="check-circle" size={22} color="white" />
                  <Text style={styles.primaryButtonText}>Đã có đơn hàng</Text>
                </>
              ) : (
                <>
                  <Icon name="cart" size={22} color="white" />
                  <Text style={styles.primaryButtonText}>Mua ngay</Text>
                </>
              )}
            </TouchableOpacity>
          </>
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
    paddingBottom: 24,
  },
  carouselContainer: {
    width: '100%',
    height: 300,
    backgroundColor: '#f0f0f0',
    position: 'relative',
  },
  carouselScrollView: {
    width: '100%',
    height: '100%',
  },
  carouselContent: {
    alignItems: 'center',
  },
  carouselItem: {
    width: SCREEN_WIDTH,
    height: 300,
    backgroundColor: '#f0f0f0',
  },
  carouselImage: {
    width: '100%',
    height: '100%',
  },
  carouselVideoContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    position: 'relative',
  },
  carouselVideo: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  videoPlayButton: {
    marginBottom: 12,
  },
  carouselVideoText: {
    marginTop: 8,
    fontSize: 14,
    color: 'white',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  carouselPagination: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  paginationDotActive: {
    width: 24,
    backgroundColor: 'white',
  },
  featuredImagePlaceholder: {
    width: '100%',
    height: 300,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    marginTop: 12,
    fontSize: 16,
    color: '#999',
    fontWeight: '500',
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
  heroSection: {
    backgroundColor: 'white',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    marginBottom: 16,
    elevation: 0,
    shadowColor: '#6200ee',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  heroContent: {
    gap: 16,
  },
  heroTitleContainer: {
    width: '100%',
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 6,
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  priceSection: {
    backgroundColor: '#f8f4ff',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#6200ee',
  },
  priceLabel: {
    fontSize: 12,
    color: '#6200ee',
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  priceValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6200ee',
    letterSpacing: -0.5,
  },
  quickInfoContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  quickInfoCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  quickInfoIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f3e5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  quickInfoLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickInfoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginLeft: 10,
    letterSpacing: -0.3,
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
    marginBottom: 16,
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
    fontSize: 16,
    color: '#444',
    lineHeight: 26,
    letterSpacing: 0.2,
  },
  additionalDetailsCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
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
  additionalDetailsList: {
    gap: 0,
  },
  additionalDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  additionalDetailLabel: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
    flex: 1,
  },
  additionalDetailValue: {
    fontSize: 15,
    color: '#1a1a1a',
    fontWeight: '600',
  },
  additionalDetailSeparator: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 2,
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
    padding: 16,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e8e8e8',
    gap: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  favoriteButtonBottom: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#e91e63',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#e91e63',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  favoriteButtonBottomActive: {
    backgroundColor: '#e91e63',
    borderColor: '#e91e63',
  },
  primaryButtonBottom: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6200ee',
    paddingVertical: 18,
    borderRadius: 28,
    gap: 10,
    elevation: 4,
    shadowColor: '#6200ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  editButtonBottom: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6200ee',
    paddingVertical: 18,
    borderRadius: 28,
    gap: 10,
    elevation: 4,
    shadowColor: '#6200ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  deleteButtonBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f44336',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 28,
    gap: 8,
    elevation: 4,
    shadowColor: '#f44336',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
});
