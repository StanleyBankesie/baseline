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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';

export default function FirstLoginChangePasswordScreen() {
  const { refreshProfile, logout } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Password validation rules
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>\-_=+]/.test(newPassword);
  const isMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const isValid = hasMinLength && hasUppercase && hasNumber && hasSpecialChar && isMatch;

  const handleChangePassword = async () => {
    if (!isValid) {
      setError('Please ensure all password requirements below are satisfied.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await apiClient.post('/auth/change-password', {
        newPassword,
        confirmNewPassword: confirmPassword,
      });

      Alert.alert(
        'Password Updated',
        'Your new secured password has been set. Welcome to your Employee Portal!',
        [{ text: 'Continue to Dashboard', onPress: () => refreshProfile() }]
      );
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Failed to update password. Please check requirements.';
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconBox}>
            <Ionicons name="key-outline" size={32} color={Colors.secondary.DEFAULT} />
          </View>
          <Text style={styles.title}>Secure Your Account</Text>
          <Text style={styles.subtitle}>First-Time Password Setup Required</Text>
          <Text style={styles.helperText}>
            You have logged in using your initial temporal credentials. Please create a permanent, secured password to continue.
          </Text>
        </View>

        {/* Error Box */}
        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color={Colors.status.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Form Card */}
        <View style={styles.card}>
          {/* New Password */}
          <Text style={styles.label}>NEW PASSWORD</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={18} color={Colors.bg.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { paddingRight: 40 }]}
              placeholder="Enter new strong password"
              placeholderTextColor={Colors.bg.textMuted}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.bg.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Confirm Password */}
          <Text style={[styles.label, { marginTop: 14 }]}>CONFIRM NEW PASSWORD</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="shield-checkmark-outline" size={18} color={Colors.bg.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Re-enter new password"
              placeholderTextColor={Colors.bg.textMuted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
          </View>

          {/* Password Policy Requirements Checklist */}
          <View style={styles.policyBox}>
            <Text style={styles.policyTitle}>Password Requirements:</Text>
            
            <View style={styles.ruleRow}>
              <Ionicons
                name={hasMinLength ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={hasMinLength ? Colors.status.success : Colors.bg.textMuted}
              />
              <Text style={[styles.ruleText, hasMinLength && styles.ruleTextActive]}>
                Minimum 8 characters in length
              </Text>
            </View>

            <View style={styles.ruleRow}>
              <Ionicons
                name={hasUppercase ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={hasUppercase ? Colors.status.success : Colors.bg.textMuted}
              />
              <Text style={[styles.ruleText, hasUppercase && styles.ruleTextActive]}>
                At least 1 uppercase letter (A-Z)
              </Text>
            </View>

            <View style={styles.ruleRow}>
              <Ionicons
                name={hasNumber ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={hasNumber ? Colors.status.success : Colors.bg.textMuted}
              />
              <Text style={[styles.ruleText, hasNumber && styles.ruleTextActive]}>
                At least 1 number (0-9)
              </Text>
            </View>

            <View style={styles.ruleRow}>
              <Ionicons
                name={hasSpecialChar ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={hasSpecialChar ? Colors.status.success : Colors.bg.textMuted}
              />
              <Text style={[styles.ruleText, hasSpecialChar && styles.ruleTextActive]}>
                At least 1 special character (!@#$%^&*...)
              </Text>
            </View>

            <View style={styles.ruleRow}>
              <Ionicons
                name={isMatch ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={isMatch ? Colors.status.success : Colors.bg.textMuted}
              />
              <Text style={[styles.ruleText, isMatch && styles.ruleTextActive]}>
                Passwords match
              </Text>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, (!isValid || loading) && styles.submitButtonDisabled]}
            onPress={handleChangePassword}
            disabled={!isValid || loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <View style={styles.buttonContent}>
                <Text style={styles.buttonText}>Set Secured Password</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
              </View>
            )}
          </TouchableOpacity>

          {/* Sign Out Option */}
          <TouchableOpacity style={styles.cancelBtn} onPress={logout}>
            <Text style={styles.cancelBtnText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg.dark,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconBox: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: Colors.brand[900],
    borderWidth: 1,
    borderColor: Colors.brand[600],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.secondary.DEFAULT,
    marginTop: 2,
  },
  helperText: {
    fontSize: 12,
    color: Colors.bg.textMuted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: Colors.status.error,
    fontSize: 12,
    flex: 1,
  },
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.bg.border,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.bg.textMuted,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.input,
    borderWidth: 1,
    borderColor: Colors.bg.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#FFF',
    fontSize: 13,
  },
  eyeIcon: {
    padding: 6,
  },
  policyBox: {
    backgroundColor: Colors.bg.input,
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: Colors.bg.border,
  },
  policyTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 8,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 3,
  },
  ruleText: {
    fontSize: 11,
    color: Colors.bg.textMuted,
  },
  ruleTextActive: {
    color: Colors.status.success,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: Colors.brand[800],
    borderColor: Colors.brand[600],
    borderWidth: 1,
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  cancelBtn: {
    alignItems: 'center',
    marginTop: 14,
  },
  cancelBtnText: {
    fontSize: 12,
    color: Colors.bg.textMuted,
    fontWeight: '600',
  },
});
