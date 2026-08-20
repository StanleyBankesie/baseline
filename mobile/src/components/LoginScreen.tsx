/**
 * Modern Mobile Login Screen Component
 * Connected to OmniSuite backend database (server folder).
 * Clean enterprise UI without exposing backend server URLs.
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  SafeAreaView,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Colors } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

export function LoginScreen() {
  const { login, isLoading, themeMode } = useAuth();
  const modeKey: 'light' | 'dark' = themeMode === 'light' ? 'light' : 'dark';
  const colors = Colors[modeKey];

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      setErrorMessage('Please enter both username/email and password.');
      return;
    }
    setErrorMessage('');
    const result = await login(username.trim(), password);
    if (!result.success) {
      setErrorMessage(result.message || 'Login failed. Check server connection or credentials.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0E3646" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          {/* Header & Logo Banner */}
          <View style={styles.headerBanner}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoIcon}>🏢</Text>
            </View>
            <Text style={styles.brandTitle}>OmniSuite</Text>
            <Text style={styles.brandTagline}>Enterprise Business Management Platform</Text>
          </View>

          {/* Login Card Form */}
          <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Text style={[styles.welcomeTitle, { color: colors.text }]}>Welcome Back</Text>
            <Text style={[styles.welcomeSubtitle, { color: colors.textSecondary }]}>
              Sign in to access your business workspace
            </Text>

            {/* Error Message Alert */}
            {errorMessage ? (
              <View style={[styles.errorBox, { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' }]}>
                <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
              </View>
            ) : null}

            {/* Username Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Username / Email</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.backgroundSurface, color: colors.text, borderColor: colors.border },
                ]}
                value={username}
                onChangeText={setUsername}
                placeholder="Enter your username or email"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Password</Text>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={[
                    styles.input,
                    styles.passwordInput,
                    { backgroundColor: colors.backgroundSurface, color: colors.text, borderColor: colors.border },
                  ]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                />
                <Pressable
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={{ fontSize: 16 }}>{showPassword ? '👁️' : '🙈'}</Text>
                </Pressable>
              </View>
            </View>

            {/* Submit Button */}
            <Pressable
              style={[
                styles.submitBtn,
                { backgroundColor: colors.brandNavy },
                isLoading && { opacity: 0.7 },
              ]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Sign In to OmniSuite</Text>
              )}
            </Pressable>

            <Text style={[styles.footerText, { color: colors.textMuted }]}>
              OmniSuite ERP v1.0 • Connected to MySQL Backend
            </Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  headerBanner: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#0E3646',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 3,
    borderColor: '#F9B514',
    shadowColor: '#0E3646',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoIcon: {
    fontSize: 36,
  },
  brandTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: '#0E3646',
    letterSpacing: 1,
  },
  brandTagline: {
    fontSize: 13,
    color: '#F57C00',
    fontWeight: '600',
    marginTop: 4,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 13,
    marginBottom: 20,
  },
  errorBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  passwordWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 46,
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    width: 36,
  },
  submitBtn: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    shadowColor: '#0E3646',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footerText: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  },
});
