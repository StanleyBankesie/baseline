import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const { theme, mode, toggleTheme } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      setError('Please enter both your full name / username and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await login(username.trim(), password);
      if (res.requiresPasswordChange) {
        navigation.replace('FirstLoginChangePassword');
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Authentication failed. Please check your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ImageBackground
        source={require('../../assets/BACKGROUND.jpg')}
        style={styles.bgImage}
        resizeMode="cover"
      >
        <View style={[styles.overlay, { backgroundColor: mode === 'dark' ? 'rgba(6, 26, 34, 0.92)' : 'rgba(255, 255, 255, 0.92)' }]}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Top Bar with Theme Toggle */}
            <View style={styles.topBar}>
              <TouchableOpacity
                style={[
                  styles.themeToggleBtn,
                  {
                    backgroundColor: mode === 'dark' ? '#0E2A38' : '#FFFFFF',
                    borderColor: mode === 'dark' ? '#1C4A60' : '#E2E8F0',
                  },
                ]}
                onPress={toggleTheme}
              >
                <Ionicons
                  name={mode === 'dark' ? 'sunny-outline' : 'moon-outline'}
                  size={18}
                  color={mode === 'dark' ? '#F9B514' : '#0E3646'}
                />
              </TouchableOpacity>
            </View>

            {/* Brand Logo Capsule */}
            <View style={styles.brandCapsuleWrapper}>
              <View
                style={[
                  styles.brandCapsule,
                  {
                    backgroundColor: mode === 'dark' ? 'rgba(14, 42, 56, 0.9)' : 'rgba(255, 255, 255, 0.95)',
                    borderColor: mode === 'dark' ? '#1C4A60' : '#F1F5F9',
                  },
                ]}
              >
                <Image
                  source={require('../../assets/OMNISUITE_ICON_CLEAR.png')}
                  style={styles.brandIcon}
                  resizeMode="contain"
                />
                <Text style={[styles.brandText, { color: mode === 'dark' ? '#F8FAFC' : '#0F172A' }]}>
                  Omnisuite ERP
                </Text>
              </View>
            </View>

            {/* Header Titles */}
            <View style={styles.titleSection}>
              <Text style={[styles.mainTitle, { color: mode === 'dark' ? '#F8FAFC' : '#1E293B' }]}>
                Welcome
              </Text>
              <Text style={[styles.subTitle, { color: mode === 'dark' ? '#94A3B8' : '#64748B' }]}>
                Sign in to continue your enterprise journey.
              </Text>
            </View>

            {/* Error Message */}
            {error ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            ) : null}

            {/* Form Section */}
            <View style={styles.formContainer}>
              {/* Full Name / Username */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.inputLabel, { color: mode === 'dark' ? '#CBD5E1' : '#334155' }]}>
                  Username / Full Name
                </Text>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: mode === 'dark' ? '#08212D' : 'rgba(255, 255, 255, 0.9)',
                      borderColor: mode === 'dark' ? '#1C4A60' : '#E2E8F0',
                    },
                  ]}
                >
                  <TextInput
                    style={[styles.inputControl, { color: mode === 'dark' ? '#F8FAFC' : '#0F172A' }]}
                    placeholder="e.g. Abigail Esuman or ST0002"
                    placeholderTextColor={mode === 'dark' ? '#64748B' : '#94A3B8'}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.inputLabel, { color: mode === 'dark' ? '#CBD5E1' : '#334155' }]}>
                  Password
                </Text>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: mode === 'dark' ? '#08212D' : 'rgba(255, 255, 255, 0.9)',
                      borderColor: mode === 'dark' ? '#1C4A60' : '#E2E8F0',
                    },
                  ]}
                >
                  <TextInput
                    style={[styles.inputControl, { paddingRight: 40, color: mode === 'dark' ? '#F8FAFC' : '#0F172A' }]}
                    placeholder="Enter password or employee code"
                    placeholderTextColor={mode === 'dark' ? '#64748B' : '#94A3B8'}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.eyeToggle}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={19}
                      color={mode === 'dark' ? '#94A3B8' : '#64748B'}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Remember Me Checkbox */}
              <TouchableOpacity
                style={styles.rememberRow}
                onPress={() => setRememberMe(!rememberMe)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.checkbox,
                    rememberMe && styles.checkboxActive,
                    { borderColor: rememberMe ? '#F59E0B' : (mode === 'dark' ? '#1C4A60' : '#CBD5E1') },
                  ]}
                >
                  {rememberMe && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                </View>
                <Text style={[styles.rememberText, { color: mode === 'dark' ? '#CBD5E1' : '#475569' }]}>
                  Remember me
                </Text>
              </TouchableOpacity>

              {/* Temporal Login Note */}
              <View
                style={[
                  styles.temporalHintBox,
                  {
                    backgroundColor: mode === 'dark' ? 'rgba(14, 42, 56, 0.6)' : 'rgba(241, 245, 249, 0.8)',
                    borderColor: mode === 'dark' ? '#1C4A60' : '#E2E8F0',
                  },
                ]}
              >
                <Ionicons name="information-circle" size={16} color="#F59E0B" />
                <Text style={[styles.temporalHintText, { color: mode === 'dark' ? '#94A3B8' : '#64748B' }]}>
                  First-time login? Use your registered employee full name and employee code as temporal password.
                </Text>
              </View>

              {/* Submit Button (Amber theme from client LoginPage) */}
              <TouchableOpacity
                style={[styles.submitButton, loading && { opacity: 0.7 }]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#0E3646" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.footerSection}>
              <Text style={[styles.footerBrand, { color: mode === 'dark' ? '#64748B' : '#94A3B8' }]}>
                Powered by{' '}
                <Text style={[styles.footerBrandBold, { color: mode === 'dark' ? '#94A3B8' : '#64748B' }]}>
                  Stanness Technologies
                </Text>
              </Text>
              <Text style={[styles.footerTerms, { color: mode === 'dark' ? '#64748B' : '#94A3B8' }]}>
                Privacy Policy • Terms of Service
              </Text>
            </View>
          </ScrollView>
        </View>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bgImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 32,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 12,
  },
  themeToggleBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  brandCapsuleWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  brandCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    gap: 8,
  },
  brandIcon: {
    width: 24,
    height: 24,
  },
  brandText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  mainTitle: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subTitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorBannerText: {
    fontSize: 13,
    color: '#DC2626',
    flex: 1,
  },
  formContainer: {
    width: '100%',
  },
  fieldGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  inputControl: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  eyeToggle: {
    position: 'absolute',
    right: 12,
    padding: 6,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 14,
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#F59E0B',
  },
  rememberText: {
    fontSize: 13,
    fontWeight: '500',
  },
  temporalHintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 18,
    gap: 8,
  },
  temporalHintText: {
    fontSize: 11.5,
    flex: 1,
    lineHeight: 16,
  },
  submitButton: {
    backgroundColor: '#FBBF24',
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F59E0B',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 2,
  },
  submitButtonText: {
    color: '#0E3646',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  footerSection: {
    marginTop: 28,
    alignItems: 'center',
    gap: 4,
  },
  footerBrand: {
    fontSize: 11.5,
  },
  footerBrandBold: {
    fontWeight: '700',
  },
  footerTerms: {
    fontSize: 11,
  },
});
