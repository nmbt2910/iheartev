import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../store/auth';
import { authService } from '../services/authService';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const { save } = useAuth();
  const signIn = async () => {
    if (!email || !password) {
      setError('Vui lòng điền đầy đủ thông tin');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await authService.login(email, password);
      
      if (!data.token) {
        throw new Error('Không nhận được token từ server');
      }
      
      // Save token to auth store (token already stored in AsyncStorage by authService)
      await save(data.token, data.role);
      console.log('[Login Screen] Token saved to AsyncStorage and auth store');
      
      // Verify token is stored correctly by checking AsyncStorage
      const storedToken = await AsyncStorage.getItem('token');
      if (storedToken === data.token) {
        console.log('[Login Screen] Token verified in AsyncStorage');
      } else {
        console.warn('[Login Screen] Token mismatch in AsyncStorage, re-saving...');
        await save(data.token, data.role);
      }
      
      // Navigate to home immediately after successful login
      navigation.replace('Home');
    } catch (e) {
      if (e.sessionExpired) {
        setError('Session expired. Please log in again.');
      } else {
        setError(e.response?.data?.error || 'Email hoặc mật khẩu không đúng');
      }
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <View style={styles.safeAreaWrapper}>
      <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
      <StatusBar style="light" />
        <View style={styles.appbarHeader}>
          <View style={{ width: 40 }} />
          <Text style={styles.appbarContent}>Đăng nhập</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>
      {Platform.OS === 'ios' ? (
        <KeyboardAvoidingView
          style={styles.container}
          behavior="padding"
        >
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: keyboardHeight > 0 ? keyboardHeight + 40 : 20 }
            ]}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.content}>
              <View style={styles.headerSection}>
                <Icon name="car-electric" size={64} color="#6200ee" />
                <Text style={styles.welcomeTitle}>Chào mừng trở lại!</Text>
                <Text style={styles.welcomeSubtitle}>Đăng nhập để tiếp tục</Text>
              </View>

              <View style={styles.formContainer}>
                <View style={styles.inputContainer}>
                  <Icon name="email-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    value={email}
                    onChangeText={(text) => { setEmail(text); setError(''); }}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholder="Email"
                    placeholderTextColor="#999"
                    style={styles.textInput}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Icon name="lock-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    value={password}
                    onChangeText={(text) => { setPassword(text); setError(''); }}
                    secureTextEntry={!showPassword}
                    placeholder="Mật khẩu"
                    placeholderTextColor="#999"
                    style={styles.textInput}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.passwordToggle}
                  >
                    <Icon
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#666"
                    />
                  </TouchableOpacity>
                </View>

                {!!error && (
                  <View style={styles.errorContainer}>
                    <Icon name="alert-circle" size={18} color="#d32f2f" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                <TouchableOpacity
                  onPress={signIn}
                  style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <Text style={styles.loginButtonText}>Đang đăng nhập...</Text>
                  ) : (
                    <>
                      <Text style={styles.loginButtonText}>Đăng nhập</Text>
                      <Icon name="arrow-right" size={20} color="white" style={{ marginLeft: 8 }} />
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => navigation.navigate('Register')}
                  style={styles.registerLink}
                >
                  <Text style={styles.registerLinkText}>
                    Chưa có tài khoản? <Text style={styles.registerLinkBold}>Đăng ký ngay</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.container}>
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: keyboardHeight > 0 ? keyboardHeight + 40 : 20 }
            ]}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.content}>
              <View style={styles.headerSection}>
                <Icon name="car-electric" size={64} color="#6200ee" />
                <Text style={styles.welcomeTitle}>Chào mừng trở lại!</Text>
                <Text style={styles.welcomeSubtitle}>Đăng nhập để tiếp tục</Text>
              </View>

              <View style={styles.formContainer}>
                <View style={styles.inputContainer}>
                  <Icon name="email-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    value={email}
                    onChangeText={(text) => { setEmail(text); setError(''); }}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholder="Email"
                    placeholderTextColor="#999"
                    style={styles.textInput}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Icon name="lock-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    value={password}
                    onChangeText={(text) => { setPassword(text); setError(''); }}
                    secureTextEntry={!showPassword}
                    placeholder="Mật khẩu"
                    placeholderTextColor="#999"
                    style={styles.textInput}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.passwordToggle}
                  >
                    <Icon
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#666"
                    />
                  </TouchableOpacity>
                </View>

                {!!error && (
                  <View style={styles.errorContainer}>
                    <Icon name="alert-circle" size={18} color="#d32f2f" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                <TouchableOpacity
                  onPress={signIn}
                  style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <Text style={styles.loginButtonText}>Đang đăng nhập...</Text>
                  ) : (
                    <>
                      <Text style={styles.loginButtonText}>Đăng nhập</Text>
                      <Icon name="arrow-right" size={20} color="white" style={{ marginLeft: 8 }} />
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => navigation.navigate('Register')}
                  style={styles.registerLink}
                >
                  <Text style={styles.registerLinkText}>
                    Chưa có tài khoản? <Text style={styles.registerLinkBold}>Đăng ký ngay</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      )}
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
  scrollContent: {
    paddingBottom: 20,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  formContainer: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
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
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  passwordToggle: {
    padding: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    marginLeft: 8,
    color: '#d32f2f',
    fontSize: 14,
  },
  loginButton: {
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
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  registerLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  registerLinkText: {
    color: '#666',
    fontSize: 14,
  },
  registerLinkBold: {
    color: '#6200ee',
    fontWeight: 'bold',
  },
});
