import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, ScrollView, Alert, ActivityIndicator, Keyboard, KeyboardAvoidingView, Image, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useAuth } from '../store/auth';
import { listingService } from '../services/listingService';
import { bankService } from '../services/bankService';
import { attachmentService } from '../services/attachmentService';
import { useAuthGuard } from '../hooks/useAuthGuard';
import { formatVND, parseVND } from '../utils/currencyFormatter';

export default function CreateBatteryListingScreen({ navigation }) {
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [capacity, setCapacity] = useState('');
  const [voltage, setVoltage] = useState('');
  const [chemistry, setChemistry] = useState('');
  const [cycleCount, setCycleCount] = useState('');
  const [healthPercentage, setHealthPercentage] = useState('');
  const [originalVehicle, setOriginalVehicle] = useState('');
  const [price, setPrice] = useState('');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);
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
  const [attachments, setAttachments] = useState([]);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  
  const { isAuthenticated } = useAuth();
  const scrollViewRef = useRef(null);
  const inputRefs = useRef({});

  useAuthGuard(true);

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
        if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
          Alert.alert('Lỗi', 'Kích thước file không được vượt quá 10MB');
          return;
        }

        try {
          const thumbnail = await VideoThumbnails.getThumbnailAsync(
            asset.uri,
            {
              time: 1000,
              quality: 0.8,
            }
          );

          setAttachments([...attachments, {
            uri: asset.uri,
            type: 'VIDEO',
            fileName: asset.fileName || 'video.mp4',
            thumbnailUri: thumbnail.uri,
          }]);
        } catch (thumbnailError) {
          console.error('Error generating thumbnail:', thumbnailError);
          setAttachments([...attachments, {
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

  const removeAttachment = (index) => {
    const newAttachments = attachments.filter((_, i) => i !== index);
    setAttachments(newAttachments);
  };

  const submit = async () => {
    console.log('=== SUBMIT BATTERY LISTING START ===');
    
    if (!brand || !model || !year || !capacity || !price || !desc) {
      Alert.alert('Thông báo', 'Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }
    
    if (attachments.length === 0) {
      Alert.alert('Thông báo', 'Vui lòng tải ít nhất một ảnh hoặc video');
      return;
    }
    
    if (paymentMethod === 'VIETQR') {
      if (!selectedBank || !accountNumber || !transactionAmount || !transactionContent) {
        Alert.alert('Thông báo', 'Vui lòng điền đầy đủ thông tin thanh toán VietQR');
        return;
      }
    }
    
    if (!isAuthenticated) {
      Alert.alert('Yêu cầu đăng nhập', 'Vui lòng đăng nhập để đăng tin', [
        { text: 'Đăng nhập', onPress: () => navigation.navigate('Login') },
        { text: 'Hủy', style: 'cancel' }
      ]);
      return;
    }
    
    setLoading(true);
    setUploadingAttachments(true);
    
    try {
      // Build comprehensive description with all battery details
      let fullDescription = desc;
      if (voltage) {
        fullDescription += `\n\nĐiện áp: ${voltage}V`;
      }
      if (chemistry) {
        fullDescription += `\nLoại pin: ${chemistry}`;
      }
      if (cycleCount) {
        fullDescription += `\nSố chu kỳ sạc: ${cycleCount}`;
      }
      if (healthPercentage) {
        fullDescription += `\nTình trạng pin: ${healthPercentage}%`;
      }
      if (originalVehicle) {
        fullDescription += `\nXe gốc: ${originalVehicle}`;
      }
      
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
      
      // Create battery listing
      const listingData = {
        type: 'BATTERY',
        brand,
        model,
        year: Number(year),
        batteryCapacityKWh: Number(capacity),
        price: Number(price),
        description: fullDescription,
        conditionLabel: 'used',
        paymentInfo: paymentInfo
      };
      
      console.log('Creating battery listing with data:', { 
        ...listingData, 
        paymentInfo: paymentInfo.paymentMethod === 'VIETQR' ? { ...paymentInfo, accountNumber: '***' } : paymentInfo 
      });
      
      const createdListing = await listingService.createListing(listingData);
      console.log('✅ Battery listing created successfully!');
      const listingId = createdListing.id;
      
      if (!listingId) {
        throw new Error('Listing created but ID is missing');
      }
      
      // Upload attachments
      if (attachments.length > 0) {
        try {
          const files = [];
          attachments.forEach((attachment, index) => {
            files.push({
              uri: attachment.uri,
              type: attachment.type === 'IMAGE' ? 'image/jpeg' : 'video/mp4',
              fileName: attachment.fileName || `attachment_${Date.now()}_${index}.${attachment.type === 'IMAGE' ? 'jpg' : 'mp4'}`,
            });
            
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
          
          console.log(`📤 Uploading ${files.length} attachment(s) for battery listing ${listingId}...`);
          await attachmentService.uploadFiles(files, listingId);
          console.log('✅ Attachments uploaded successfully!');
        } catch (attachmentError) {
          console.error('❌ Attachment upload failed!', attachmentError);
          Alert.alert(
            'Thành công', 
            'Tin đăng pin thành công và đang được hệ thống kiểm duyệt. Tuy nhiên, có lỗi khi tải lên ảnh/video. Bạn có thể chỉnh sửa tin đăng sau.',
            [
              { text: 'OK', onPress: () => navigation.replace('Home') }
            ]
          );
          return;
        }
      }
      
      console.log('=== SUBMIT BATTERY LISTING SUCCESS ===');
      Alert.alert('Thành công', 'Tin đăng pin thành công và đang được hệ thống kiểm duyệt', [
        { text: 'OK', onPress: () => navigation.replace('Home') }
      ]);
    } catch (error) {
      console.error('=== SUBMIT BATTERY LISTING ERROR ===', error);
      
      if (error.sessionExpired) {
        Alert.alert('Session Expired', 'Session expired. Please log in again.', [
          { text: 'OK', onPress: () => navigation.replace('Login') }
        ]);
      } else {
        const errorMessage = error.response?.data?.error 
          || error.response?.data?.message
          || error.message 
          || 'Không thể đăng tin. Vui lòng thử lại.';
        Alert.alert('Lỗi', errorMessage);
      }
    } finally {
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
          <Icon name="battery-high" size={56} color="#6200ee" />
        </View>
        <Text style={styles.headerTitle}>Thông tin pin điện</Text>
        <Text style={styles.headerSubtitle}>Điền thông tin để đăng tin bán pin</Text>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.inputGroup}>
          <View style={styles.labelContainer}>
            <Icon name="factory" size={18} color="#6200ee" />
            <Text style={styles.label}>Hãng pin *</Text>
          </View>
          <View style={styles.inputContainer}>
            <TextInput
              ref={(ref) => (inputRefs.current.brand = ref)}
              onFocus={() => handleInputFocus('brand')}
              style={styles.textInput}
              placeholder="VD: LG, Panasonic, CATL, BYD..."
              placeholderTextColor="#999"
              value={brand}
              onChangeText={setBrand}
              autoCapitalize="words"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelContainer}>
            <Icon name="battery" size={18} color="#6200ee" />
            <Text style={styles.label}>Model pin *</Text>
          </View>
          <View style={styles.inputContainer}>
            <TextInput
              ref={(ref) => (inputRefs.current.model = ref)}
              onFocus={() => handleInputFocus('model')}
              style={styles.textInput}
              placeholder="VD: NCM811, LFP, NCA..."
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
              <Text style={styles.label}>Năm sản xuất *</Text>
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                ref={(ref) => (inputRefs.current.year = ref)}
                onFocus={() => handleInputFocus('year')}
                style={styles.textInput}
                placeholder="VD: 2021"
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
              <Text style={styles.label}>Dung lượng (kWh) *</Text>
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                ref={(ref) => (inputRefs.current.capacity = ref)}
                onFocus={() => handleInputFocus('capacity')}
                style={styles.textInput}
                placeholder="VD: 60"
                placeholderTextColor="#999"
                value={capacity}
                onChangeText={setCapacity}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        <View style={styles.rowInputs}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <View style={styles.labelContainer}>
              <Icon name="lightning-bolt" size={18} color="#6200ee" />
              <Text style={styles.label}>Điện áp (V)</Text>
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                ref={(ref) => (inputRefs.current.voltage = ref)}
                onFocus={() => handleInputFocus('voltage')}
                style={styles.textInput}
                placeholder="VD: 400"
                placeholderTextColor="#999"
                value={voltage}
                onChangeText={setVoltage}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <View style={styles.labelContainer}>
              <Icon name="flask" size={18} color="#6200ee" />
              <Text style={styles.label}>Loại pin</Text>
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                ref={(ref) => (inputRefs.current.chemistry = ref)}
                onFocus={() => handleInputFocus('chemistry')}
                style={styles.textInput}
                placeholder="VD: Li-ion, LFP, NCM..."
                placeholderTextColor="#999"
                value={chemistry}
                onChangeText={setChemistry}
                autoCapitalize="words"
              />
            </View>
          </View>
        </View>

        <View style={styles.rowInputs}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <View style={styles.labelContainer}>
              <Icon name="repeat" size={18} color="#6200ee" />
              <Text style={styles.label}>Số chu kỳ sạc</Text>
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                ref={(ref) => (inputRefs.current.cycleCount = ref)}
                onFocus={() => handleInputFocus('cycleCount')}
                style={styles.textInput}
                placeholder="VD: 500"
                placeholderTextColor="#999"
                value={cycleCount}
                onChangeText={setCycleCount}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <View style={styles.labelContainer}>
              <Icon name="heart-pulse" size={18} color="#6200ee" />
              <Text style={styles.label}>Tình trạng (%)</Text>
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                ref={(ref) => (inputRefs.current.healthPercentage = ref)}
                onFocus={() => handleInputFocus('healthPercentage')}
                style={styles.textInput}
                placeholder="VD: 85"
                placeholderTextColor="#999"
                value={healthPercentage}
                onChangeText={setHealthPercentage}
                keyboardType="numeric"
                maxLength={3}
              />
            </View>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelContainer}>
            <Icon name="car" size={18} color="#6200ee" />
            <Text style={styles.label}>Xe gốc (tùy chọn)</Text>
          </View>
          <View style={styles.inputContainer}>
            <TextInput
              ref={(ref) => (inputRefs.current.originalVehicle = ref)}
              onFocus={() => handleInputFocus('originalVehicle')}
              style={styles.textInput}
              placeholder="VD: Tesla Model 3, VinFast VF e34..."
              placeholderTextColor="#999"
              value={originalVehicle}
              onChangeText={setOriginalVehicle}
              autoCapitalize="words"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelContainer}>
            <Icon name="cash" size={18} color="#6200ee" />
            <Text style={styles.label}>Giá bán *</Text>
          </View>
          <View style={styles.inputContainer}>
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
              placeholder="Mô tả chi tiết về tình trạng pin, lịch sử sử dụng, bảo dưỡng..."
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
                    placeholder="VD: Mua pin điện [Mã tin]"
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
                      {attachment.thumbnailUri ? (
                        <>
                          <Image source={{ uri: attachment.thumbnailUri }} style={styles.attachmentThumbnail} />
                          <View style={styles.videoPlayIconOverlay}>
                            <Icon name="play-circle" size={32} color="white" />
                          </View>
                        </>
                      ) : (
                        <Icon name="play-circle" size={32} color="#6200ee" />
                      )}
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
          <Text style={styles.appbarContent}>Đăng tin pin mới</Text>
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

// Reuse styles from CreateListingScreen
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

