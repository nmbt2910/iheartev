import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, ScrollView, Alert, ActivityIndicator, Keyboard, KeyboardAvoidingView, Image, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useAuth } from '../store/auth';
import { listingService } from '../services/listingService';
import { aiService } from '../services/aiService';
import { bankService } from '../services/bankService';
import { attachmentService } from '../services/attachmentService';
import { useAuthGuard } from '../hooks/useAuthGuard';
import { formatVND } from '../utils/currencyFormatter';

export default function EditListingScreen({ route, navigation }) {
  const { listingId, fromMyListings } = route.params;
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [capacity, setCapacity] = useState('');
  const [price, setPrice] = useState('');
  const [desc, setDesc] = useState('');
  const [mileageKm, setMileageKm] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [suggestionExpanded, setSuggestionExpanded] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingListing, setLoadingListing] = useState(true);
  const [suggesting, setSuggesting] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  // Payment info
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [banks, setBanks] = useState([]);
  const [loadingBanks, setLoadingBanks] = useState(true);
  const [selectedBank, setSelectedBank] = useState(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionContent, setTransactionContent] = useState('');
  const [showBankPicker, setShowBankPicker] = useState(false);
  
  // Attachments
  const [existingAttachments, setExistingAttachments] = useState([]); // Existing attachments from server
  const [attachmentsToDelete, setAttachmentsToDelete] = useState([]); // IDs of attachments to delete
  const [newAttachments, setNewAttachments] = useState([]); // New attachments to upload {uri, type, fileName}
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  
  const { isAuthenticated } = useAuth();
  const scrollViewRef = useRef(null);
  const inputRefs = useRef({});

  // Require authentication for this screen
  useAuthGuard(true);

  // Scroll to input when focused
  const handleInputFocus = (inputName) => {
    if (scrollViewRef.current && inputRefs.current[inputName]) {
      setTimeout(() => {
        if (inputRefs.current[inputName] && scrollViewRef.current) {
          inputRefs.current[inputName].measureLayout(
            scrollViewRef.current,
            (x, y, width, height) => {
              const offset = Platform.OS === 'ios' ? 100 : 150;
              scrollViewRef.current.scrollTo({ 
                y: Math.max(0, y - offset), 
                animated: true 
              });
            },
            () => {}
          );
        }
      }, Platform.OS === 'android' ? 300 : 100);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      Alert.alert('Yêu cầu đăng nhập', 'Vui lòng đăng nhập để chỉnh sửa tin', [
        { text: 'Đăng nhập', onPress: () => navigation.replace('Login') },
        { text: 'Hủy', style: 'cancel', onPress: () => navigation.goBack() }
      ]);
    }
  }, [isAuthenticated]);

  // Keyboard listener
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Load listing data and banks
  useEffect(() => {
    loadListing();
    loadBanks();
    requestMediaPermissions();
  }, [listingId]);

  const requestMediaPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
        Alert.alert('Quyền truy cập', 'Cần quyền truy cập camera và thư viện để tải ảnh/video');
      }
    }
  };

  const loadListing = async () => {
    try {
      setLoadingListing(true);
      const listing = await listingService.getListingById(listingId);
      
      // Populate form fields
      setBrand(listing.brand || '');
      setModel(listing.model || '');
      setYear(listing.year ? String(listing.year) : '');
      setCapacity(listing.batteryCapacityKWh ? String(listing.batteryCapacityKWh) : '');
      setPrice(listing.price ? String(listing.price) : '');
      setDesc(listing.description || '');
      setMileageKm(listing.mileageKm ? String(listing.mileageKm) : '');
      
      // Load payment info
      if (listing.paymentInfo) {
        setPaymentMethod(listing.paymentInfo.paymentMethod || 'CASH');
        if (listing.paymentInfo.paymentMethod === 'VIETQR') {
          // Find and set selected bank
          const bankList = await bankService.getAllBanks();
          const bank = bankList.find(b => b.code === listing.paymentInfo.bankCode);
          if (bank) {
            setSelectedBank(bank);
          }
          setAccountNumber(listing.paymentInfo.accountNumber || '');
          setTransactionAmount(listing.paymentInfo.amount ? String(listing.paymentInfo.amount) : '');
          setTransactionContent(listing.paymentInfo.transactionContent || '');
        }
      }
      
      // Load attachments
      const atts = await attachmentService.getAttachmentsByListing(listingId);
      setExistingAttachments(Array.isArray(atts) ? atts : []);
    } catch (error) {
      console.error('Error loading listing:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin tin đăng', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } finally {
      setLoadingListing(false);
    }
  };

  const loadBanks = async () => {
    try {
      setLoadingBanks(true);
      const bankList = await bankService.getAllBanks();
      setBanks(bankList);
    } catch (error) {
      console.error('Error loading banks:', error);
    } finally {
      setLoadingBanks(false);
    }
  };

  const pickImage = async () => {
    const totalImageCount = existingAttachments.filter(a => !attachmentsToDelete.includes(a.id) && a.type === 'IMAGE').length + 
                          newAttachments.filter(a => a.type === 'IMAGE').length;
    if (totalImageCount >= 5) {
      Alert.alert('Thông báo', 'Tối đa 5 ảnh');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
          Alert.alert('Lỗi', 'Kích thước file không được vượt quá 10MB');
          return;
        }
        setNewAttachments([...newAttachments, {
          uri: asset.uri,
          type: 'IMAGE',
          fileName: asset.fileName || 'image.jpg'
        }]);
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể chọn ảnh');
    }
  };

  const pickVideo = async () => {
    const totalVideoCount = existingAttachments.filter(a => !attachmentsToDelete.includes(a.id) && a.type === 'VIDEO').length + 
                           newAttachments.filter(a => a.type === 'VIDEO').length;
    if (totalVideoCount >= 1) {
      Alert.alert('Thông báo', 'Tối đa 1 video');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsMultipleSelection: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
          Alert.alert('Lỗi', 'Kích thước file không được vượt quá 10MB');
          return;
        }
        // Generate thumbnail for video
        try {
          const thumbnail = await VideoThumbnails.getThumbnailAsync(
            asset.uri,
            {
              time: 1000, // Get thumbnail at 1 second
              quality: 0.8,
            }
          );

          setNewAttachments([...newAttachments, {
            uri: asset.uri,
            type: 'VIDEO',
            fileName: asset.fileName || 'video.mp4',
            thumbnailUri: thumbnail.uri, // Store thumbnail URI
          }]);
        } catch (thumbnailError) {
          console.error('Error generating thumbnail:', thumbnailError);
          // Still add video even if thumbnail generation fails
          setNewAttachments([...newAttachments, {
            uri: asset.uri,
            type: 'VIDEO',
            fileName: asset.fileName || 'video.mp4',
          }]);
        }
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể chọn video');
    }
  };

  const removeExistingAttachment = (attachmentId) => {
    setAttachmentsToDelete([...attachmentsToDelete, attachmentId]);
  };

  const restoreExistingAttachment = (attachmentId) => {
    setAttachmentsToDelete(attachmentsToDelete.filter(id => id !== attachmentId));
  };

  const removeNewAttachment = (index) => {
    setNewAttachments(newAttachments.filter((_, i) => i !== index));
  };

  const suggest = async () => {
    if (!brand || !model) {
      Alert.alert('Thông báo', 'Vui lòng nhập hãng và model để gợi ý giá');
      return;
    }
    setSuggesting(true);
    setSuggestion('');
    setSuggestionExpanded(true);
    try {
      const features = { brand, model, year: Number(year), capacityKWh: Number(capacity) };
      const res = await aiService.suggestPrice(JSON.stringify(features));
      setSuggestion(res);
      if (res && !price) {
        const priceMatch = res.match(/(\d+(?:[.,\s]\d{3})*(?:[.,]\d+)?)/);
        if (priceMatch) {
          const cleanPrice = priceMatch[1].replace(/[.,\s]/g, '');
          setPrice(cleanPrice);
        }
      }
    } catch (error) {
      if (error.sessionExpired) {
        Alert.alert('Session Expired', 'Session expired. Please log in again.', [
          { text: 'OK', onPress: () => navigation.replace('Login') }
        ]);
      } else {
        Alert.alert('Lỗi', 'Không thể lấy gợi ý giá. Vui lòng thử lại.');
      }
    } finally {
      setSuggesting(false);
    }
  };

  const submit = async () => {
    if (!brand || !model || !year || !capacity || !price || !desc) {
      Alert.alert('Thông báo', 'Vui lòng điền đầy đủ thông tin');
      return;
    }
    
    // Check if there's at least one attachment (existing or new)
    const remainingAttachments = existingAttachments.filter(a => !attachmentsToDelete.includes(a.id));
    if (remainingAttachments.length === 0 && newAttachments.length === 0) {
      Alert.alert('Thông báo', 'Vui lòng giữ ít nhất một ảnh hoặc video');
      return;
    }
    
    // Validate payment info if VietQR
    if (paymentMethod === 'VIETQR') {
      if (!selectedBank || !accountNumber || !transactionAmount || !transactionContent) {
        Alert.alert('Thông báo', 'Vui lòng điền đầy đủ thông tin thanh toán VietQR');
        return;
      }
    }
    
    if (!isAuthenticated) {
      Alert.alert('Yêu cầu đăng nhập', 'Vui lòng đăng nhập để chỉnh sửa tin', [
        { text: 'Đăng nhập', onPress: () => navigation.navigate('Login') },
        { text: 'Hủy', style: 'cancel' }
      ]);
      return;
    }
    
    setLoading(true);
    setUploadingAttachments(true);
    
    try {
      // Prepare payment info
      let paymentInfo = null;
      if (paymentMethod === 'VIETQR') {
        paymentInfo = {
          paymentMethod: 'VIETQR',
          bankCode: selectedBank.code,
          bankName: selectedBank.shortName,
          accountNumber: accountNumber,
          amount: Number(transactionAmount),
          transactionContent: transactionContent
        };
      } else {
        paymentInfo = {
          paymentMethod: 'CASH'
        };
      }
      
      // Update listing
      const listingData = {
        type: 'EV',
        brand,
        model,
        year: Number(year),
        batteryCapacityKWh: Number(capacity),
        price: Number(price),
        description: desc,
        conditionLabel: 'used',
        mileageKm: mileageKm ? Number(mileageKm) : null,
        paymentInfo: paymentInfo
      };
      
      await listingService.updateListing(listingId, listingData);
      
      // Delete removed attachments
      for (const attachmentId of attachmentsToDelete) {
        try {
          await attachmentService.deleteAttachment(attachmentId);
        } catch (error) {
          console.error(`Error deleting attachment ${attachmentId}:`, error);
        }
      }
      
      // Upload new attachments if any
      if (newAttachments.length > 0) {
        try {
          const files = [];
          newAttachments.forEach((attachment, index) => {
            // Add the main attachment
            files.push({
              uri: attachment.uri,
              type: attachment.type === 'IMAGE' ? 'image/jpeg' : 'video/mp4',
              fileName: attachment.fileName || `attachment_${Date.now()}_${index}.${attachment.type === 'IMAGE' ? 'jpg' : 'mp4'}`,
            });
            
            // If it's a video with thumbnail, add thumbnail as an image
            if (attachment.type === 'VIDEO' && attachment.thumbnailUri) {
              files.push({
                uri: attachment.thumbnailUri,
                type: 'image/jpeg',
                fileName: `thumbnail_${attachment.fileName?.replace(/\.mp4$/i, '.jpg') || `thumbnail_${Date.now()}.jpg`}`,
                isThumbnail: true,
                videoIndex: index,
              });
            }
          });
          
          await attachmentService.uploadFiles(files, listingId);
        } catch (attachmentError) {
          console.error('Error uploading new attachments:', attachmentError);
          Alert.alert(
            'Thành công', 
            'Tin đã được cập nhật! Tuy nhiên, có lỗi khi tải lên ảnh/video mới. Bạn có thể chỉnh sửa lại sau.',
            [
              { 
                text: 'OK', 
                onPress: () => navigation.navigate('ListingDetail', { 
                  id: listingId,
                  refresh: true,
                  fromMyListings: fromMyListings 
                }) 
              }
            ]
          );
          return;
        }
      }
      
      Alert.alert('Thành công', 'Tin đã được cập nhật!', [
        { 
          text: 'OK', 
          onPress: () => navigation.navigate('ListingDetail', { 
            id: listingId,
            refresh: true,
            fromMyListings: fromMyListings 
          }) 
        }
      ]);
    } catch (error) {
      console.error('Error updating listing:', error);
      if (error.sessionExpired) {
        Alert.alert('Session Expired', 'Session expired. Please log in again.', [
          { text: 'OK', onPress: () => navigation.replace('Login') }
        ]);
      } else {
        const errorMessage = error.response?.data?.error 
          || error.response?.data?.message
          || error.message 
          || 'Không thể cập nhật tin. Vui lòng thử lại.';
        Alert.alert('Lỗi', errorMessage);
      }
    } finally {
      setLoading(false);
      setUploadingAttachments(false);
    }
  };

  if (loadingListing) {
    return (
      <View style={styles.safeAreaWrapper}>
        <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
          <StatusBar style="light" />
          <View style={styles.appbarHeader}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.appbarAction}>
              <Icon name="arrow-left" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.appbarContent}>Chỉnh sửa tin đăng</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6200ee" />
          <Text style={styles.loadingText}>Đang tải thông tin...</Text>
        </View>
      </View>
    );
  }

  const remainingAttachments = existingAttachments.filter(a => !attachmentsToDelete.includes(a.id));
  const allAttachments = [
    ...remainingAttachments.map(a => ({ ...a, isExisting: true })),
    ...newAttachments.map((a, i) => ({ ...a, isExisting: false, tempId: i }))
  ];

  const scrollViewContent = (
    <ScrollView
      ref={scrollViewRef}
      style={styles.scrollView}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: keyboardHeight > 0 ? keyboardHeight + 40 : 20 }
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      keyboardDismissMode="on-drag"
      nestedScrollEnabled={true}
    >
      <View style={styles.headerSection}>
        <View style={styles.headerIconContainer}>
          <Icon name="pencil" size={56} color="#6200ee" />
        </View>
        <Text style={styles.headerTitle}>Chỉnh sửa tin đăng</Text>
        <Text style={styles.headerSubtitle}>Cập nhật thông tin xe điện của bạn</Text>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.inputGroup}>
          <View style={styles.labelContainer}>
            <Icon name="factory" size={18} color="#6200ee" />
            <Text style={styles.label}>Hãng xe *</Text>
          </View>
          <View style={styles.inputContainer}>
            <TextInput
              ref={(ref) => (inputRefs.current.brand = ref)}
              onFocus={() => handleInputFocus('brand')}
              style={styles.textInput}
              placeholder="VD: Tesla, VinFast, Porsche..."
              placeholderTextColor="#999"
              value={brand}
              onChangeText={setBrand}
              autoCapitalize="words"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelContainer}>
            <Icon name="car-side" size={18} color="#6200ee" />
            <Text style={styles.label}>Model *</Text>
          </View>
          <View style={styles.inputContainer}>
            <TextInput
              ref={(ref) => (inputRefs.current.model = ref)}
              onFocus={() => handleInputFocus('model')}
              style={styles.textInput}
              placeholder="VD: Model 3, VF e34, Taycan..."
              placeholderTextColor="#999"
              value={model}
              onChangeText={setModel}
              autoCapitalize="words"
            />
          </View>
        </View>

        <View style={styles.rowInputs}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <View style={styles.labelContainer}>
              <Icon name="calendar" size={18} color="#6200ee" />
              <Text style={styles.label}>Năm *</Text>
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                ref={(ref) => (inputRefs.current.year = ref)}
                onFocus={() => handleInputFocus('year')}
                style={styles.textInput}
                placeholder="2021"
                placeholderTextColor="#999"
                value={year}
                onChangeText={setYear}
                keyboardType="numeric"
                maxLength={4}
              />
            </View>
          </View>

          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <View style={styles.labelContainer}>
              <Icon name="battery-high" size={18} color="#6200ee" />
              <Text style={styles.label}>Pin (kWh) *</Text>
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                ref={(ref) => (inputRefs.current.capacity = ref)}
                onFocus={() => handleInputFocus('capacity')}
                style={styles.textInput}
                placeholder="60"
                placeholderTextColor="#999"
                value={capacity}
                onChangeText={setCapacity}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelContainer}>
            <Icon name="speedometer" size={18} color="#6200ee" />
            <Text style={styles.label}>Số km đã đi</Text>
          </View>
          <View style={styles.inputContainer}>
            <TextInput
              ref={(ref) => (inputRefs.current.mileageKm = ref)}
              onFocus={() => handleInputFocus('mileageKm')}
              style={styles.textInput}
              placeholder="0"
              placeholderTextColor="#999"
              value={mileageKm}
              onChangeText={setMileageKm}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelContainer}>
            <Icon name="cash" size={18} color="#6200ee" />
            <Text style={styles.label}>Giá bán *</Text>
          </View>
          <View style={styles.priceInputContainer}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
              <TextInput
                ref={(ref) => (inputRefs.current.price = ref)}
                onFocus={() => handleInputFocus('price')}
                style={styles.textInput}
                placeholder="50.000.000"
                placeholderTextColor="#999"
                value={price ? formatVND(price, false) : ''}
                onChangeText={(text) => {
                  const cleaned = text.replace(/[^\d]/g, '');
                  setPrice(cleaned);
                }}
                keyboardType="numeric"
              />
              {price && (
                <Text style={styles.priceHelperText}>₫</Text>
              )}
            </View>
            <TouchableOpacity
              onPress={suggest}
              style={[styles.suggestButton, suggesting && styles.suggestButtonDisabled]}
              disabled={suggesting}
              activeOpacity={0.8}
            >
              {suggesting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Icon name="robot" size={18} color="white" />
              )}
              <Text style={styles.suggestButtonText}>
                {suggesting ? 'AI...' : 'AI'}
              </Text>
            </TouchableOpacity>
          </View>
          {suggestion && (
            <View style={styles.suggestionBox}>
              <View style={styles.suggestionHeader}>
                <View style={styles.suggestionHeaderLeft}>
                  <Icon name="lightbulb-on" size={18} color="#ff9800" />
                  <Text style={styles.suggestionTitle}>Gợi ý giá từ AI</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSuggestionExpanded(!suggestionExpanded)}
                  style={styles.suggestionToggle}
                  activeOpacity={0.7}
                >
                  <Icon 
                    name={suggestionExpanded ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color="#ff9800" 
                  />
                </TouchableOpacity>
              </View>
              {suggestionExpanded && (
                <>
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                  <TouchableOpacity
                    onPress={() => setSuggestion('')}
                    style={styles.suggestionCloseButton}
                    activeOpacity={0.7}
                  >
                    <Icon name="close-circle" size={18} color="#999" />
                    <Text style={styles.suggestionCloseText}>Đóng</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelContainer}>
            <Icon name="text-box-outline" size={18} color="#6200ee" />
            <Text style={styles.label}>Mô tả *</Text>
          </View>
          <View style={[styles.inputContainer, styles.multilineContainer]}>
            <TextInput
              ref={(ref) => (inputRefs.current.desc = ref)}
              onFocus={() => handleInputFocus('desc')}
              style={[styles.textInput, styles.multilineInput]}
              placeholder="Mô tả chi tiết về tình trạng xe, lịch sử sử dụng, bảo dưỡng..."
              placeholderTextColor="#999"
              value={desc}
              onChangeText={setDesc}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Payment Method Section */}
        <View style={styles.inputGroup}>
          <View style={styles.labelContainer}>
            <Icon name="credit-card" size={18} color="#6200ee" />
            <Text style={styles.label}>Thông tin thanh toán *</Text>
          </View>
          <View style={styles.paymentMethodContainer}>
            <TouchableOpacity
              style={[styles.paymentMethodButton, paymentMethod === 'CASH' && styles.paymentMethodButtonActive]}
              onPress={() => setPaymentMethod('CASH')}
              activeOpacity={0.7}
            >
              <Icon name="cash" size={20} color={paymentMethod === 'CASH' ? 'white' : '#6200ee'} />
              <Text style={[styles.paymentMethodText, paymentMethod === 'CASH' && styles.paymentMethodTextActive]}>
                Tiền mặt khi nhận hàng
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.paymentMethodButton, paymentMethod === 'VIETQR' && styles.paymentMethodButtonActive]}
              onPress={() => setPaymentMethod('VIETQR')}
              activeOpacity={0.7}
            >
              <Icon name="qrcode" size={20} color={paymentMethod === 'VIETQR' ? 'white' : '#6200ee'} />
              <Text style={[styles.paymentMethodText, paymentMethod === 'VIETQR' && styles.paymentMethodTextActive]}>
                Chuyển khoản VietQR
              </Text>
            </TouchableOpacity>
          </View>

          {paymentMethod === 'VIETQR' && (
            <View style={styles.vietqrFields}>
              <View style={styles.inputGroup}>
                <View style={styles.labelContainer}>
                  <Icon name="bank" size={18} color="#6200ee" />
                  <Text style={styles.label}>Ngân hàng *</Text>
                </View>
                <TouchableOpacity
                  style={styles.inputContainer}
                  onPress={() => setShowBankPicker(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.textInput, !selectedBank && { color: '#999' }]}>
                    {selectedBank ? selectedBank.fullName : 'Chọn ngân hàng...'}
                  </Text>
                  <Icon name="chevron-down" size={20} color="#6200ee" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.labelContainer}>
                  <Icon name="credit-card-outline" size={18} color="#6200ee" />
                  <Text style={styles.label}>Số tài khoản *</Text>
                </View>
                <View style={styles.inputContainer}>
                  <TextInput
                    ref={(ref) => (inputRefs.current.accountNumber = ref)}
                    onFocus={() => handleInputFocus('accountNumber')}
                    style={styles.textInput}
                    placeholder="Nhập số tài khoản"
                    placeholderTextColor="#999"
                    value={accountNumber}
                    onChangeText={setAccountNumber}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.labelContainer}>
                  <Icon name="cash" size={18} color="#6200ee" />
                  <Text style={styles.label}>Số tiền *</Text>
                </View>
                <View style={styles.inputContainer}>
                  <TextInput
                    ref={(ref) => (inputRefs.current.transactionAmount = ref)}
                    onFocus={() => handleInputFocus('transactionAmount')}
                    style={styles.textInput}
                    placeholder="Nhập số tiền"
                    placeholderTextColor="#999"
                    value={transactionAmount ? formatVND(transactionAmount, false) : ''}
                    onChangeText={(text) => {
                      const cleaned = text.replace(/[^\d]/g, '');
                      setTransactionAmount(cleaned);
                    }}
                    keyboardType="numeric"
                  />
                  {transactionAmount && (
                    <Text style={styles.priceHelperText}>₫</Text>
                  )}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.labelContainer}>
                  <Icon name="text" size={18} color="#6200ee" />
                  <Text style={styles.label}>Nội dung chuyển khoản *</Text>
                </View>
                <View style={styles.inputContainer}>
                  <TextInput
                    ref={(ref) => (inputRefs.current.transactionContent = ref)}
                    onFocus={() => handleInputFocus('transactionContent')}
                    style={styles.textInput}
                    placeholder="VD: Mua xe điện [Mã tin]"
                    placeholderTextColor="#999"
                    value={transactionContent}
                    onChangeText={setTransactionContent}
                  />
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Attachments Section */}
        <View style={styles.inputGroup}>
          <View style={styles.labelContainer}>
            <Icon name="image" size={18} color="#6200ee" />
            <Text style={styles.label}>Ảnh/Video *</Text>
            <Text style={styles.labelHint}>(Tối thiểu 1 file, tối đa 5 ảnh + 1 video)</Text>
          </View>
          <View style={styles.attachmentButtons}>
            <TouchableOpacity
              style={styles.attachmentButton}
              onPress={pickImage}
              disabled={allAttachments.filter(a => a.type === 'IMAGE').length >= 5}
              activeOpacity={0.7}
            >
              <Icon name="image-outline" size={24} color="#6200ee" />
              <Text style={styles.attachmentButtonText}>Thêm ảnh</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.attachmentButton}
              onPress={pickVideo}
              disabled={allAttachments.filter(a => a.type === 'VIDEO').length >= 1}
              activeOpacity={0.7}
            >
              <Icon name="video-outline" size={24} color="#6200ee" />
              <Text style={styles.attachmentButtonText}>Thêm video</Text>
            </TouchableOpacity>
          </View>

          {allAttachments.length > 0 && (
            <View style={styles.attachmentsPreview}>
              {allAttachments.map((attachment, index) => {
                const isMarkedForDelete = attachment.isExisting && attachmentsToDelete.includes(attachment.id);
                return (
                  <View key={attachment.isExisting ? attachment.id : `new-${attachment.tempId}`} style={styles.attachmentItem}>
                    {attachment.type === 'IMAGE' ? (
                      <Image 
                        source={{ 
                          uri: attachment.isExisting 
                            ? attachmentService.getAttachmentUrl(attachment.id)
                            : attachment.uri 
                        }} 
                        style={[styles.attachmentThumbnail, isMarkedForDelete && styles.attachmentThumbnailDeleted]} 
                      />
                    ) : (
                      <View style={[styles.attachmentThumbnail, styles.videoThumbnail, isMarkedForDelete && styles.attachmentThumbnailDeleted]}>
                        {attachment.isExisting ? (
                          // For existing videos, we'll display a placeholder (thumbnail will be loaded from server if available)
                          <Icon name="play-circle" size={32} color="#6200ee" />
                        ) : (
                          // For new videos, show thumbnail if available
                          attachment.thumbnailUri ? (
                            <>
                              <Image source={{ uri: attachment.thumbnailUri }} style={styles.attachmentThumbnail} />
                              <View style={styles.videoPlayIconOverlay}>
                                <Icon name="play-circle" size={32} color="white" />
                              </View>
                            </>
                          ) : (
                            <Icon name="play-circle" size={32} color="#6200ee" />
                          )
                        )}
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.removeAttachmentButton}
                      onPress={() => {
                        if (attachment.isExisting) {
                          if (isMarkedForDelete) {
                            restoreExistingAttachment(attachment.id);
                          } else {
                            removeExistingAttachment(attachment.id);
                          }
                        } else {
                          removeNewAttachment(attachment.tempId);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <Icon name={isMarkedForDelete ? "restore" : "close-circle"} size={24} color={isMarkedForDelete ? "#4caf50" : "#d32f2f"} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <TouchableOpacity
          onPress={submit}
          style={[styles.submitButton, (loading || uploadingAttachments) && styles.submitButtonDisabled]}
          disabled={loading || uploadingAttachments}
          activeOpacity={0.8}
        >
          {(loading || uploadingAttachments) ? (
            <>
              <ActivityIndicator size="small" color="white" />
              <Text style={styles.submitButtonText}>
                {uploadingAttachments ? 'Đang tải ảnh/video...' : 'Đang cập nhật...'}
              </Text>
            </>
          ) : (
            <>
              <Icon name="check-circle" size={20} color="white" />
              <Text style={styles.submitButtonText}>Cập nhật tin</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // Bank Picker Modal
  const BankPickerModal = () => (
    <Modal
      visible={showBankPicker}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowBankPicker(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Chọn ngân hàng</Text>
            <TouchableOpacity onPress={() => setShowBankPicker(false)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.bankList}>
            {loadingBanks ? (
              <View style={styles.bankLoadingContainer}>
                <ActivityIndicator size="large" color="#6200ee" />
                <Text style={styles.bankLoadingText}>Đang tải danh sách ngân hàng...</Text>
              </View>
            ) : (
              banks.map((bank) => (
                <TouchableOpacity
                  key={bank.code}
                  style={[
                    styles.bankItem,
                    selectedBank?.code === bank.code && styles.bankItemSelected
                  ]}
                  onPress={() => {
                    setSelectedBank(bank);
                    setShowBankPicker(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.bankItemText}>{bank.fullName}</Text>
                  {selectedBank?.code === bank.code && (
                    <Icon name="check" size={20} color="#6200ee" />
                  )}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.safeAreaWrapper}>
      <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
        <StatusBar style="light" />
        <View style={styles.appbarHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.appbarAction}>
            <Icon name="arrow-left" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.appbarContent}>Chỉnh sửa tin đăng</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>
      {Platform.OS === 'ios' ? (
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior="padding"
        >
          {scrollViewContent}
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.keyboardAvoidingView}>
          {scrollViewContent}
        </View>
      )}
      <BankPickerModal />
    </View>
  );
}

const styles = StyleSheet.create({
  safeAreaWrapper: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  safeAreaTop: {
    backgroundColor: '#6200ee',
  },
  keyboardAvoidingView: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
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
  headerSection: {
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 32,
    marginBottom: 20,
    elevation: 0,
    shadowColor: '#6200ee',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  headerIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#f3e5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 0,
    shadowColor: '#6200ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  formContainer: {
    paddingHorizontal: 20,
  },
  inputGroup: {
    marginBottom: 22,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  labelHint: {
    fontSize: 12,
    color: '#999',
    marginLeft: 8,
    fontStyle: 'italic',
  },
  rowInputs: {
    flexDirection: 'row',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    paddingHorizontal: 20,
    height: 56,
    elevation: 0,
    shadowColor: '#6200ee',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 1.5,
    borderColor: '#f0f0f0',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  priceHelperText: {
    fontSize: 16,
    color: '#6200ee',
    fontWeight: '600',
    marginLeft: 8,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  suggestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6200ee',
    paddingHorizontal: 20,
    height: 56,
    borderRadius: 16,
    elevation: 0,
    shadowColor: '#6200ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    gap: 6,
  },
  suggestButtonDisabled: {
    opacity: 0.7,
  },
  suggestButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
  },
  suggestionBox: {
    backgroundColor: '#fff8e1',
    borderRadius: 12,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
    overflow: 'hidden',
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  suggestionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  suggestionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#e65100',
  },
  suggestionToggle: {
    padding: 4,
  },
  suggestionText: {
    fontSize: 14,
    color: '#e65100',
    lineHeight: 20,
    fontWeight: '500',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  suggestionCloseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: '#ffe0b2',
    gap: 6,
  },
  suggestionCloseText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  multilineContainer: {
    height: 140,
    paddingVertical: 16,
    alignItems: 'flex-start',
  },
  multilineInput: {
    height: '100%',
  },
  paymentMethodContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  paymentMethodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6200ee',
    backgroundColor: 'white',
    gap: 8,
  },
  paymentMethodButtonActive: {
    backgroundColor: '#6200ee',
    borderColor: '#6200ee',
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6200ee',
  },
  paymentMethodTextActive: {
    color: 'white',
  },
  vietqrFields: {
    marginTop: 16,
    gap: 16,
  },
  attachmentButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  attachmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6200ee',
    backgroundColor: 'white',
    gap: 8,
  },
  attachmentButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6200ee',
  },
  attachmentsPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  attachmentItem: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  attachmentThumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  attachmentThumbnailDeleted: {
    opacity: 0.5,
    borderWidth: 2,
    borderColor: '#d32f2f',
    borderStyle: 'dashed',
  },
  videoThumbnail: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    position: 'relative',
  },
  videoPlayIconOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
  },
  removeAttachmentButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6200ee',
    paddingVertical: 18,
    borderRadius: 16,
    marginTop: 12,
    elevation: 0,
    shadowColor: '#6200ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    gap: 10,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  bankList: {
    maxHeight: 400,
  },
  bankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  bankItemSelected: {
    backgroundColor: '#f3e5f5',
  },
  bankItemText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  bankLoadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankLoadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
});

