import React, { useState } from 'react';
import { StyleSheet, TextInput, Pressable, ActivityIndicator, View, KeyboardAvoidingView, Platform, ScrollView, Image, Alert, Modal } from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { useApp } from '@/context/AppContext';
import { Ionicons } from '@expo/vector-icons';

export const LoginScreen: React.FC = () => {
  const { loginUser, apiCall, navigateTo } = useApp();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      Alert.alert('Validation Error', 'Please enter your phone/email and password');
      return;
    }
    setLoading(true);
    try {
      const data = await apiCall('/login', 'POST', {
        identifier: identifier.trim(),
        password: password.trim()
      });

      if (data?.requireOtp) {
        setMaskedPhone(data.phone || 'your phone');
        setShowOtpModal(true);
      } else if (data?.token && data?.customer) {
        await loginUser(data.token, data.customer);
      } else if (data?.error) {
        Alert.alert('Login Failed', data.message || 'Invalid credentials');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Login Failed', 'Unable to connect to the server');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpValue.trim()) {
      Alert.alert('Validation Error', 'Please enter the OTP');
      return;
    }
    setLoading(true);
    try {
      const data = await apiCall('/login', 'POST', {
        identifier: identifier.trim(),
        password: password.trim(),
        otp: otpValue.trim()
      });

      if (data?.token && data?.customer) {
        setShowOtpModal(false);
        await loginUser(data.token, data.customer);
      } else {
        Alert.alert('Error', data?.message || 'Invalid OTP');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Invalid OTP or server error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.keyboardView}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <ThemedView style={styles.container}>
          
          <View style={styles.header}>
            <Image 
              source={require('../../assets/images/chyta_logo_2_transparent.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
            <Image 
              source={require('../../assets/images/chyta-text.png')} 
              style={styles.textLogo}
              resizeMode="contain"
            />
            <ThemedText style={styles.title}>Welcome Back</ThemedText>
          </View>

          <View style={styles.formContainer}>
            
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Email Address or Phone</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="Enter your email or phone"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
                value={identifier}
                onChangeText={setIdentifier}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Password</ThemedText>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Password"
                  placeholderTextColor="#999"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  value={password}
                  onChangeText={setPassword}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#666" />
                </Pressable>
              </View>
            </View>

            <Pressable 
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
                loading && styles.buttonDisabled
              ]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <ThemedText style={styles.buttonText}>Sign In</ThemedText>
              )}
            </Pressable>

            <View style={styles.footer}>
              <ThemedText style={styles.footerText}>Don't have an account? </ThemedText>
              <Pressable onPress={() => navigateTo('register')}>
                <ThemedText style={styles.link}>Sign Up</ThemedText>
              </Pressable>
            </View>
          </View>
        </ThemedView>
      </ScrollView>

      {/* OTP Modal */}
      <Modal visible={showOtpModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>Enter OTP</ThemedText>
            <ThemedText style={styles.modalSubtitle}>We sent a verification code to {maskedPhone}</ThemedText>
            
            <TextInput
              style={[styles.input, styles.otpInput]}
              placeholder="000000"
              keyboardType="number-pad"
              maxLength={6}
              value={otpValue}
              onChangeText={setOtpValue}
              textAlign="center"
            />

            <Pressable 
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, loading && styles.buttonDisabled]}
              onPress={handleVerifyOtp}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#000" /> : <ThemedText style={styles.buttonText}>Verify & Login</ThemedText>}
            </Pressable>
            
            <Pressable style={styles.cancelButton} onPress={() => setShowOtpModal(false)} disabled={loading}>
              <ThemedText style={styles.cancelText}>Cancel</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    backgroundColor: '#FFFBF0', // Warm off-white
  },
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 40,
    backgroundColor: '#FFFBF0',
  },
  header: {
    alignItems: 'flex-start',
    marginBottom: 40,
  },
  logo: {
    width: 140,
    height: 140,
    marginBottom: -10, // pull text logo up slightly
  },
  textLogo: {
    width: 140,
    height: 40,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#000000',
  },
  formContainer: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    height: 52,
    backgroundColor: '#ffffff',
    borderRadius: 26,
    paddingHorizontal: 20,
    fontSize: 14,
    color: '#000000',
    borderWidth: 1,
    borderColor: '#D0D0D0',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#D0D0D0',
    height: 52,
    paddingHorizontal: 20,
    marginTop: 6,
  },
  passwordInput: {
    flex: 1,
    fontSize: 14,
    color: '#000000',
    height: '100%',
  },
  eyeIcon: {
    padding: 4,
  },
  button: {
    width: '100%',
    height: 54,
    backgroundColor: '#FFB800', // Yellow
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    backgroundColor: '#FFE082',
  },
  buttonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  footerText: {
    color: '#666',
    fontSize: 14,
  },
  link: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFBF0',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  otpInput: {
    fontSize: 24,
    letterSpacing: 4,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  cancelButton: {
    marginTop: 16,
    padding: 8,
  },
  cancelText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  }
});
