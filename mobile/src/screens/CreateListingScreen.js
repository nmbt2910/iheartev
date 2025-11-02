import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, ScrollView, Alert, ActivityIndicator, Keyboard, KeyboardAvoidingView, Image, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useAuth } from '../store/auth';
import { listingService } from '../services/listingService';
import { aiService } from '../services/aiService';
import { bankService } from '../services/bankService';
import { attachmentService } from '../services/attachmentService';
import { useAuthGuard } from '../hooks/useAuthGuard';
import { formatVND, parseVND } from '../utils/currencyFormatter';

export default function CreateListingScreen({ navigation }) {
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('2021');
  const [capacity, setCapacity] = useState('60');
  const [price, setPrice] = useState('');
  const [desc, setDesc] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [suggestionExpanded, setSuggestionExpanded] = useState(true);
  const [loading, setLoading] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  // Payment info
  const [paymentMethod, setPaymentMethod] = useState('CASH'); // CASH or VIETQR
  const [banks, setBanks] = useState([]);
  const [selectedBank, setSelectedBank] = useState(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionContent, setTransactionContent] = useState('');
  const [showBankPicker, setShowBankPicker] = useState(false);
  
  // Attachments
  const [attachments, setAttachments] = useState([]); // Array of {uri, type, fileName}
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  
  const { isAuthenticated } = useAuth();
  const scrollViewRef = useRef(null);
  const inputRefs = useRef({});

  // Require authentication for this screen
  useAuthGuard(true);

  // Scroll to input when focused (helper for KeyboardAvoidingView)
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
      Alert.alert('Yêu cầu đăng nhập', 'Vui lòng đăng nhập để đăng tin', [
        { text: 'Đăng nhập', onPress: () => navigation.replace('Login') },
        { text: 'Hủy', style: 'cancel', onPress: () => navigation.goBack() }
      ]);
    }
  }, [isAuthenticated]);

  // Keyboard listener to adjust padding when keyboard opens/closes
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

  // Load banks on mount
  useEffect(() => {
    loadBanks();
    requestMediaPermissions();
  }, []);

  const requestMediaPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
        Alert.alert('Quyền truy cập', 'Cần quyền truy cập camera và thư viện để tải ảnh/video');
      }
    }
  };

  const loadBanks = async () => {
    try {
      const bankList = await bankService.getAllBanks();
      setBanks(bankList);
    } catch (error) {
      console.error('Error loading banks:', error);
    }
  };

  const pickImage = async () => {
    const imageCount = attachments.filter(a => a.type === 'IMAGE').length;
    if (imageCount >= 5) {
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
        // Check file size (10MB max)
        if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
          Alert.alert('Lỗi', 'Kích thước file không được vượt quá 10MB');
          return;
        }
        setAttachments([...attachments, {
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
    const videoCount = attachments.filter(a => a.type === 'VIDEO').length;
    if (videoCount >= 1) {
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
        // Check file size (10MB max)
        if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
          Alert.alert('Lỗi', 'Kích thước file không được vượt quá 10MB');
          return;
        }
        setAttachments([...attachments, {
          uri: asset.uri,
          type: 'VIDEO',
          fileName: asset.fileName || 'video.mp4'
        }]);
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể chọn video');
    }
  };

  const removeAttachment = (index) => {
    const newAttachments = attachments.filter((_, i) => i !== index);
    setAttachments(newAttachments);
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
      // Try to extract price in VNĐ format (e.g., "1.200.000.000" or "1200000000")
      if (res && !price) {
        // Match Vietnamese price format: numbers with dots or spaces as thousands separators
        const priceMatch = res.match(/(\d+(?:[.,\s]\d{3})*(?:[.,]\d+)?)/);
        if (priceMatch) {
          // Clean the price (remove dots, spaces, keep only digits)
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
    console.log('=== SUBMIT START ===');
    console.log('Form data:', { brand, model, year, capacity, price, desc });
    console.log('Attachments count:', attachments.length);
    console.log('Payment method:', paymentMethod);
    console.log('Is authenticated:', isAuthenticated);
    
    if (!brand || !model || !year || !capacity || !price || !desc) {
      console.log('Validation failed: Missing required fields');
      Alert.alert('Thông báo', 'Vui lòng điền đầy đủ thông tin');
      return;
    }
    
    // Validate attachments
    if (attachments.length === 0) {
      console.log('Validation failed: No attachments');
      Alert.alert('Thông báo', 'Vui lòng tải ít nhất một ảnh hoặc video');
      return;
    }
    
    // Validate payment info if VietQR
    if (paymentMethod === 'VIETQR') {
      console.log('Validating VietQR payment info:', { 
        selectedBank, 
        accountNumber: accountNumber ? '***' : null, 
        transactionAmount, 
        transactionContent 
      });
      if (!selectedBank || !accountNumber || !transactionAmount || !transactionContent) {
        console.log('Validation failed: Missing VietQR payment fields');
        Alert.alert('Thông báo', 'Vui lòng điền đầy đủ thông tin thanh toán VietQR');
        return;
      }
    }
    
    if (!isAuthenticated) {
      console.log('Validation failed: Not authenticated');
      Alert.alert('Yêu cầu đăng nhập', 'Vui lòng đăng nhập để đăng tin', [
        { text: 'Đăng nhập', onPress: () => navigation.navigate('Login') },
        { text: 'Hủy', style: 'cancel' }
      ]);
      return;
    }
    
    console.log('All validations passed, starting submission...');
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
        console.log('Payment info (VietQR):', { ...paymentInfo, accountNumber: '***' });
      } else {
        paymentInfo = {
          paymentMethod: 'CASH'
        };
        console.log('Payment info (CASH)');
      }
      
      // Create listing first
      const listingData = {
        type: 'EV',
        brand,
        model,
        year: Number(year),
        batteryCapacityKWh: Number(capacity),
        price: Number(price),
        description: desc,
        conditionLabel: 'used',
        paymentInfo: paymentInfo
      };
      
      console.log('Creating listing with data:', { 
        ...listingData, 
        paymentInfo: paymentInfo.paymentMethod === 'VIETQR' ? { ...paymentInfo, accountNumber: '***' } : paymentInfo 
      });
      
      const createdListing = await listingService.createListing(listingData);
      console.log('✅ Listing created successfully!');
      console.log('Listing response:', createdListing);
      const listingId = createdListing.id;
      console.log('Listing ID:', listingId);
      
      if (!listingId) {
        console.error('❌ ERROR: Listing ID is missing from response!');
        throw new Error('Listing created but ID is missing');
      }
      
      // Upload attachments if any
      if (attachments.length > 0) {
        try {
          console.log('Preparing attachments for upload...');
          // Prepare files for upload
          const files = attachments.map((attachment, index) => {
            const fileData = {
              uri: attachment.uri,
              type: attachment.type === 'IMAGE' ? 'image/jpeg' : 'video/mp4',
              fileName: attachment.fileName || `attachment_${Date.now()}_${index}.${attachment.type === 'IMAGE' ? 'jpg' : 'mp4'}`,
            };
            console.log(`File ${index + 1}:`, { 
              uri: fileData.uri.substring(0, 50) + '...', 
              type: fileData.type, 
              fileName: fileData.fileName 
            });
            return fileData;
          });
          
          console.log(`📤 Uploading ${files.length} attachment(s) for listing ${listingId}...`);
          const uploadResult = await attachmentService.uploadFiles(files, listingId);
          console.log('✅ Attachments uploaded successfully!');
          console.log('Upload result:', uploadResult);
        } catch (attachmentError) {
          console.error('❌ Attachment upload failed!');
          console.error('Error type:', attachmentError.constructor.name);
          console.error('Error message:', attachmentError.message);
          console.error('Error response:', attachmentError.response?.data);
          console.error('Error status:', attachmentError.response?.status);
          console.error('Error headers:', attachmentError.response?.headers);
          console.error('Full error:', JSON.stringify(attachmentError, null, 2));
          
          // Still show success if listing was created, but log the error
          // The listing is already created, so we'll allow it to succeed
          Alert.alert(
            'Thành công', 
            'Tin đã được đăng! Tuy nhiên, có lỗi khi tải lên ảnh/video. Bạn có thể chỉnh sửa tin đăng sau.',
            [
              { text: 'OK', onPress: () => navigation.replace('Home') }
            ]
          );
          return;
        }
      } else {
        console.log('⚠️ No attachments to upload');
      }
      
      console.log('=== SUBMIT SUCCESS ===');
      Alert.alert('Thành công', 'Tin đã được đăng!', [
        { text: 'OK', onPress: () => navigation.replace('Home') }
      ]);
    } catch (error) {
      console.error('=== SUBMIT ERROR ===');
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Error response status:', error.response?.status);
      console.error('Error response data:', error.response?.data);
      console.error('Error response headers:', error.response?.headers);
      console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      
      // Also show detailed error in development
      if (__DEV__) {
        console.warn('=== DETAILED ERROR FOR DEBUGGING ===');
        console.warn(JSON.stringify({
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
          config: {
            url: error.config?.url,
            method: error.config?.method,
            headers: error.config?.headers
          }
        }, null, 2));
      }
      
      if (error.sessionExpired) {
        console.log('Session expired - redirecting to login');
        Alert.alert('Session Expired', 'Session expired. Please log in again.', [
          { text: 'OK', onPress: () => navigation.replace('Login') }
        ]);
      } else {
        const errorMessage = error.response?.data?.error 
          || error.response?.data?.message
          || error.message 
          || 'Không thể đăng tin. Vui lòng thử lại.';
        console.log('Showing error alert:', errorMessage);
        
        // Show more detailed error in development
        const detailedError = __DEV__ ? `\n\n[Debug]\nStatus: ${error.response?.status}\nMessage: ${error.message}\nData: ${JSON.stringify(error.response?.data)}` : '';
        Alert.alert('Lỗi', errorMessage + detailedError);
      }
    } finally {
      console.log('=== SUBMIT END ===');
      setLoading(false);
      setUploadingAttachments(false);
    }
  };

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
            <Icon name="car-electric" size={56} color="#6200ee" />
          </View>
          <Text style={styles.headerTitle}>Thông tin xe điện</Text>
          <Text style={styles.headerSubtitle}>Điền thông tin để đăng tin bán xe</Text>
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
                disabled={attachments.filter(a => a.type === 'IMAGE').length >= 5}
                activeOpacity={0.7}
              >
                <Icon name="image-outline" size={24} color="#6200ee" />
                <Text style={styles.attachmentButtonText}>Thêm ảnh</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.attachmentButton}
                onPress={pickVideo}
                disabled={attachments.filter(a => a.type === 'VIDEO').length >= 1}
                activeOpacity={0.7}
              >
                <Icon name="video-outline" size={24} color="#6200ee" />
                <Text style={styles.attachmentButtonText}>Thêm video</Text>
              </TouchableOpacity>
            </View>

            {attachments.length > 0 && (
              <View style={styles.attachmentsPreview}>
                {attachments.map((attachment, index) => (
                  <View key={index} style={styles.attachmentItem}>
                    {attachment.type === 'IMAGE' ? (
                      <Image source={{ uri: attachment.uri }} style={styles.attachmentThumbnail} />
                    ) : (
                      <View style={[styles.attachmentThumbnail, styles.videoThumbnail]}>
                        <Icon name="play-circle" size={32} color="#6200ee" />
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.removeAttachmentButton}
                      onPress={() => removeAttachment(index)}
                      activeOpacity={0.7}
                    >
                      <Icon name="close-circle" size={24} color="#d32f2f" />
                    </TouchableOpacity>
                  </View>
                ))}
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
                  {uploadingAttachments ? 'Đang tải ảnh/video...' : 'Đang đăng tin...'}
                </Text>
              </>
            ) : (
              <>
                <Icon name="check-circle" size={20} color="white" />
                <Text style={styles.submitButtonText}>Đăng tin</Text>
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
            {banks.map((bank) => (
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
            ))}
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
          <Text style={styles.appbarContent}>Đăng tin mới</Text>
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
  scrollViewWrapper: {
    flex: 1,
  },
  scrollView: {
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
    paddingBottom: 20,
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
  labelHint: {
    fontSize: 12,
    color: '#999',
    marginLeft: 8,
    fontStyle: 'italic',
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
  videoThumbnail: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
  },
  removeAttachmentButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'white',
    borderRadius: 12,
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
});
