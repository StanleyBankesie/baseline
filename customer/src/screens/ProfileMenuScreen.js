import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { useTheme } from '../theme/ThemeContext';

export default function ProfileMenuScreen() {
  const { customer, logout } = useCustomerAuth();
  const { theme, mode, toggleTheme } = useTheme();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of the Customer Portal?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg.primary }]} contentContainerStyle={styles.content}>
      {/* Profile Card */}
      <View style={[styles.profileCard, { backgroundColor: theme.bg.card, borderColor: theme.bg.border }]}>
        <View style={[styles.avatar, { backgroundColor: theme.secondary.DEFAULT }]}>
          <Text style={styles.avatarText}>{(customer?.customer_name?.[0] || 'C').toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: theme.bg.text }]}>{customer?.customer_name}</Text>
          <Text style={[styles.code, { color: theme.secondary.DEFAULT }]}>
            Code: {customer?.customer_code} • {customer?.customer_type || 'Commercial'}
          </Text>
        </View>
      </View>

      {/* Account Information */}
      <View style={[styles.card, { backgroundColor: theme.bg.card, borderColor: theme.bg.border }]}>
        <Text style={[styles.cardTitle, { color: theme.bg.text }]}>Company & Contact Information</Text>
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: theme.bg.textMuted }]}>Email</Text>
          <Text style={[styles.val, { color: theme.bg.text }]}>{customer?.email || 'N/A'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: theme.bg.textMuted }]}>Phone / Mobile</Text>
          <Text style={[styles.val, { color: theme.bg.text }]}>{customer?.phone || customer?.mobile || 'N/A'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: theme.bg.textMuted }]}>Address</Text>
          <Text style={[styles.val, { color: theme.bg.text }]}>{customer?.address || customer?.city || 'N/A'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: theme.bg.textMuted }]}>Payment Terms</Text>
          <Text style={[styles.val, { color: theme.bg.text }]}>{customer?.payment_terms || 'Net 30 Days'}</Text>
        </View>
      </View>

      {/* Preferences & Actions */}
      <View style={[styles.card, { backgroundColor: theme.bg.card, borderColor: theme.bg.border }]}>
        <TouchableOpacity style={styles.actionRow} onPress={toggleTheme}>
          <View style={styles.actionLeft}>
            <Ionicons name={mode === 'dark' ? 'sunny-outline' : 'moon-outline'} size={20} color={theme.brand.DEFAULT} />
            <Text style={[styles.actionText, { color: theme.bg.text }]}>
              Theme: {mode === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </Text>
          </View>
          <Ionicons name="swap-horizontal" size={18} color={theme.bg.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: theme.status.errorBg }]} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color={theme.status.error} />
        <Text style={[styles.logoutText, { color: theme.status.error }]}>Sign Out of Portal</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  profileCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, borderWidth: 1, gap: 14, marginBottom: 16 },
  avatar: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 22, fontWeight: '800', color: '#0E3646' },
  name: { fontSize: 17, fontWeight: '800' },
  code: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  card: { borderRadius: 18, padding: 16, borderWidth: 1, marginBottom: 14 },
  cardTitle: { fontSize: 15, fontWeight: '800', marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(150,150,150,0.1)' },
  label: { fontSize: 12, fontWeight: '600' },
  val: { fontSize: 12, fontWeight: '700' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  actionLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  actionText: { fontSize: 14, fontWeight: '600' },
  logoutBtn: { height: 48, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 10 },
  logoutText: { fontSize: 14, fontWeight: '800' },
});
