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
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { useTheme } from '../theme/ThemeContext';
import apiClient from '../api/client';

export default function FirstLoginChangePasswordScreen() {
  const { refreshProfile, logout } = useCustomerAuth();
  const { theme } = useTheme();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>\-_=+]/.test(newPassword);
  const isMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const isValid = hasMinLength && hasUppercase && hasNumber && hasSpecialChar && isMatch;

  const handleChangePassword = async () => {
    if (!isValid) {
      setError('Please satisfy all password criteria below.');
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
        'Your new secured customer password has been set. Welcome to OmniSuite Customer Portal!',
        [{ text: 'Continue to Dashboard', onPress: () => refreshProfile() }]
      );
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Failed to update password.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.bg.primary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={[styles.iconBox, { backgroundColor: theme.bg.card, borderColor: theme.bg.border }]}>
            <Ionicons name="key-outline" size={32} color={theme.secondary.DEFAULT} />
          </View>
          <Text style={[styles.title, { color: theme.bg.text }]}>Secure Customer Account</Text>
          <Text style={[styles.subtitle, { color: theme.secondary.DEFAULT }]}>Initial Password Setup Required</Text>
          <Text style={[styles.helperText, { color: theme.bg.textMuted }]}>
            Please create a secure permanent password to manage orders and access your ledger statements.
          </Text>
        </View>

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: theme.status.errorBg, borderColor: theme.status.error }]}>
            <Ionicons name="alert-circle" size={18} color={theme.status.error} />
            <Text style={[styles.errorText, { color: theme.status.error }]}>{error}</Text>
          </View>
        ) : null}

        <View style={[styles.card, { backgroundColor: theme.bg.card, borderColor: theme.bg.border }]}>
          <Text style={[styles.label, { color: theme.bg.textMuted }]}>NEW PASSWORD</Text>
          <View style={[styles.inputContainer, { backgroundColor: theme.bg.input, borderColor: theme.bg.border }]}>
            <Ionicons name="lock-closed-outline" size={18} color={theme.bg.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { paddingRight: 40, color: theme.bg.text }]}
              placeholder="Enter new strong password"
              placeholderTextColor={theme.bg.textMuted}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.bg.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { marginTop: 14, color: theme.bg.textMuted }]}>CONFIRM NEW PASSWORD</Text>
          <View style={[styles.inputContainer, { backgroundColor: theme.bg.input, borderColor: theme.bg.border }]}>
            <Ionicons name="shield-checkmark-outline" size={18} color={theme.bg.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: theme.bg.text }]}
              placeholder="Re-enter new password"
              placeholderTextColor={theme.bg.textMuted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
          </View>

          <View style={[styles.policyBox, { backgroundColor: theme.bg.input, borderColor: theme.bg.border }]}>
            <Text style={[styles.policyTitle, { color: theme.bg.text }]}>Password Requirements:</Text>
            
            <View style={styles.ruleRow}>
              <Ionicons
                name={hasMinLength ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={hasMinLength ? theme.status.success : theme.bg.textMuted}
              />
              <Text style={[styles.ruleText, { color: hasMinLength ? theme.status.success : theme.bg.textMuted }]}>
                Minimum 8 characters
              </Text>
            </View>

            <View style={styles.ruleRow}>
              <Ionicons
                name={hasUppercase ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={hasUppercase ? theme.status.success : theme.bg.textMuted}
              />
              <Text style={[styles.ruleText, { color: hasUppercase ? theme.status.success : theme.bg.textMuted }]}>
                At least 1 uppercase letter (A-Z)
              </Text>
            </View>

            <View style={styles.ruleRow}>
              <Ionicons
                name={hasNumber ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={hasNumber ? theme.status.success : theme.bg.textMuted}
              />
              <Text style={[styles.ruleText, { color: hasNumber ? theme.status.success : theme.bg.textMuted }]}>
                At least 1 number (0-9)
              </Text>
            </View>

            <View style={styles.ruleRow}>
              <Ionicons
                name={hasSpecialChar ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={hasSpecialChar ? theme.status.success : theme.bg.textMuted}
              />
              <Text style={[styles.ruleText, { color: hasSpecialChar ? theme.status.success : theme.bg.textMuted }]}>
                At least 1 special character (!@#$%^&*...)
              </Text>
            </View>

            <View style={styles.ruleRow}>
              <Ionicons
                name={isMatch ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={isMatch ? theme.status.success : theme.bg.textMuted}
              />
              <Text style={[styles.ruleText, { color: isMatch ? theme.status.success : theme.bg.textMuted }]}>
                Passwords match
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: theme.brand.DEFAULT }, (!isValid || loading) && { opacity: 0.5 }]}
            onPress={handleChangePassword}
            disabled={!isValid || loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <View style={styles.buttonContent}>
                <Text style={styles.buttonText}>Set Customer Password</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={logout}>
            <Text style={[styles.cancelBtnText, { color: theme.bg.textMuted }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 24 },
  iconBox: { width: 60, height: 60, borderRadius: 18, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '800' },
  subtitle: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  helperText: { fontSize: 12, textAlign: 'center', marginTop: 8, lineHeight: 18 },
  errorBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16, gap: 8 },
  errorText: { fontSize: 12, flex: 1 },
  card: { borderRadius: 20, padding: 20, borderWidth: 1 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 6 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, height: 46 },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 13 },
  eyeIcon: { padding: 6 },
  policyBox: { borderRadius: 12, padding: 14, marginTop: 16, borderWidth: 1 },
  policyTitle: { fontSize: 11, fontWeight: '700', marginBottom: 8 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 3 },
  ruleText: { fontSize: 11 },
  submitButton: { borderRadius: 14, height: 48, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  buttonContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  cancelBtn: { alignItems: 'center', marginTop: 14 },
  cancelBtnText: { fontSize: 12, fontWeight: '600' },
});
