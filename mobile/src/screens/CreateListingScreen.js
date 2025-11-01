import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useAuth } from '../store/auth';
import { listingService } from '../services/listingService';
import { aiService } from '../services/aiService';
import { useAuthGuard } from '../hooks/useAuthGuard';

export default function CreateListingScreen({ navigation }) {
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('2021');
  const [capacity, setCapacity] = useState('60');
  const [price, setPrice] = useState('');
  const [desc, setDesc] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const { isAuthenticated } = useAuth();

  // Require authentication for this screen
  useAuthGuard(true);

  useEffect(() => {
    if (!isAuthenticated) {
      Alert.alert('Yêu cầu đăng nhập', 'Vui lòng đăng nhập để đăng tin', [
        { text: 'Đăng nhập', onPress: () => navigation.replace('Login') },
        { text: 'Hủy', style: 'cancel', onPress: () => navigation.goBack() }
      ]);
    }
  }, [isAuthenticated]);

  const suggest = async () => {
    if (!brand || !model) {
      Alert.alert('Thông báo', 'Vui lòng nhập hãng và model để gợi ý giá');
      return;
    }
    setSuggesting(true);
    try {
      const features = { brand, model, year: Number(year), capacityKWh: Number(capacity) };
      const res = await aiService.suggestPrice(JSON.stringify(features));
      setSuggestion(res);
      if (res && !price) {
        const suggestedPrice = res.match(/\$?([\d,]+)/);
        if (suggestedPrice) {
          setPrice(suggestedPrice[1].replace(/,/g, ''));
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
    if (!isAuthenticated) {
      Alert.alert('Yêu cầu đăng nhập', 'Vui lòng đăng nhập để đăng tin', [
        { text: 'Đăng nhập', onPress: () => navigation.navigate('Login') },
        { text: 'Hủy', style: 'cancel' }
      ]);
      return;
    }
    setLoading(true);
    try {
      await listingService.createListing({
        type: 'EV',
        brand,
        model,
        year: Number(year),
        batteryCapacityKWh: Number(capacity),
        price: Number(price),
        description: desc,
        conditionLabel: 'used'
      });
      Alert.alert('Thành công', 'Tin đã được đăng!', [
        { text: 'OK', onPress: () => navigation.replace('Home') }
      ]);
    } catch (error) {
      if (error.sessionExpired) {
        Alert.alert('Session Expired', 'Session expired. Please log in again.', [
          { text: 'OK', onPress: () => navigation.replace('Login') }
        ]);
      } else {
        Alert.alert('Lỗi', error.response?.data?.error || 'Không thể đăng tin. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.appbarHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.appbarAction}>
            <Icon name="arrow-left" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.appbarContent}>Đăng tin mới</Text>
          <View style={{ width: 40 }} />
        </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerSection}>
          <Icon name="car-plus" size={48} color="#6200ee" />
          <Text style={styles.headerTitle}>Thông tin xe điện</Text>
          <Text style={styles.headerSubtitle}>Điền thông tin để đăng tin bán xe</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              <Icon name="car" size={16} color="#6200ee" /> Hãng xe *
            </Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="VD: Tesla, VinFast..."
                placeholderTextColor="#999"
                value={brand}
                onChangeText={setBrand}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              <Icon name="car-sport" size={16} color="#6200ee" /> Model *
            </Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="VD: Model 3, VF e34..."
                placeholderTextColor="#999"
                value={model}
                onChangeText={setModel}
              />
            </View>
          </View>

          <View style={styles.rowInputs}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>
                <Icon name="calendar" size={16} color="#6200ee" /> Năm *
              </Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder="2021"
                  placeholderTextColor="#999"
                  value={year}
                  onChangeText={setYear}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>
                <Icon name="battery" size={16} color="#6200ee" /> Pin (kWh) *
              </Text>
              <View style={styles.inputContainer}>
                <TextInput
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
            <Text style={styles.label}>
              <Icon name="currency-usd" size={16} color="#6200ee" /> Giá bán *
            </Text>
            <View style={styles.priceInputContainer}>
              <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                <TextInput
                  style={styles.textInput}
                  placeholder="50000"
                  placeholderTextColor="#999"
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                />
              </View>
              <TouchableOpacity
                onPress={suggest}
                style={[styles.suggestButton, suggesting && styles.suggestButtonDisabled]}
                disabled={suggesting}
                activeOpacity={0.8}
              >
                <Icon name="robot" size={18} color="white" />
                <Text style={styles.suggestButtonText}>
                  {suggesting ? '...' : 'AI'}
                </Text>
              </TouchableOpacity>
            </View>
            {suggestion && (
              <View style={styles.suggestionBox}>
                <Icon name="lightbulb" size={16} color="#ff9800" />
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              <Icon name="text" size={16} color="#6200ee" /> Mô tả *
            </Text>
            <View style={[styles.inputContainer, styles.multilineContainer]}>
              <TextInput
                style={[styles.textInput, styles.multilineInput]}
                placeholder="Mô tả chi tiết về tình trạng xe..."
                placeholderTextColor="#999"
                value={desc}
                onChangeText={setDesc}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          <TouchableOpacity
            onPress={submit}
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <Text style={styles.submitButtonText}>Đang đăng tin...</Text>
            ) : (
              <>
                <Icon name="check-circle" size={20} color="white" />
                <Text style={styles.submitButtonText}>Đăng tin</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
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
  formContainer: {
    paddingHorizontal: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
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
  },
  suggestButtonDisabled: {
    opacity: 0.6,
  },
  suggestButtonText: {
    marginLeft: 6,
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  suggestionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#ff9800',
  },
  suggestionText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#e65100',
    lineHeight: 20,
  },
  multilineContainer: {
    height: 120,
    paddingVertical: 12,
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
    marginTop: 8,
    elevation: 0,
    shadowColor: '#6200ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    marginLeft: 8,
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
