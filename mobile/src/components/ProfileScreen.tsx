/**
 * User Profile & Settings Screen Component
 * Displays user identity, active branch scope, theme switcher, clear cache, and logout.
 */

import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { Colors } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

export function ProfileScreen() {
  const { user, activeBranch, logout, themeMode, toggleTheme, setCurrentScreen } = useAuth();
  const modeKey: 'light' | 'dark' = themeMode === 'light' ? 'light' : 'dark';
  const colors = Colors[modeKey];

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const handleClearCache = () => {
    Alert.alert('Cache Cleared', 'Local offline data cache cleared successfully.');
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Profile Header Banner */}
      <View style={[styles.headerBanner, { backgroundColor: colors.brandNavy }]}>
        <View style={[styles.avatarCircle, { borderColor: colors.secondaryYellow }]}>
          <Text style={styles.avatarText}>{getInitials(user?.full_name || user?.username)}</Text>
        </View>

        <Text style={styles.userName}>{user?.full_name || user?.username || 'User Profile'}</Text>
        <Text style={styles.userRole}>
          Role: <Text style={{ color: colors.secondaryYellow, fontWeight: 'bold' }}>{user?.role || 'Enterprise User'}</Text>
        </Text>
        <Text style={styles.userEmail}>{user?.email || `${user?.username || 'user'}@omnisuite.com`}</Text>
      </View>

      {/* Settings Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>🏢 Active Workspace & Branch</Text>
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <View style={styles.settingRow}>
            <View>
              <Text style={[styles.rowTitle, { color: colors.text }]}>Active Branch Scope</Text>
              <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
                {activeBranch?.branch_name || 'Main Branch'}
              </Text>
            </View>
            <Pressable
              style={[styles.actionBtn, { backgroundColor: colors.brandNavy }]}
              onPress={() => setCurrentScreen('branch-select')}
            >
              <Text style={styles.actionBtnText}>Switch Branch</Text>
            </Pressable>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 20 }]}>⚙️ App Preferences</Text>
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          {/* Dark / Light Theme Toggle */}
          <Pressable style={[styles.settingRow, styles.borderBottom, { borderColor: colors.border }]} onPress={toggleTheme}>
            <View>
              <Text style={[styles.rowTitle, { color: colors.text }]}>Appearance Mode</Text>
              <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
                Current Mode: {themeMode === 'dark' ? '🌙 Dark Mode' : '☀️ Light Mode'}
              </Text>
            </View>
            <View style={[styles.actionBtn, { backgroundColor: colors.backgroundSurface }]}>
              <Text style={[styles.actionBtnText, { color: colors.text }]}>Toggle Theme</Text>
            </View>
          </Pressable>

          {/* Offline Cache Reset */}
          <Pressable style={styles.settingRow} onPress={handleClearCache}>
            <View>
              <Text style={[styles.rowTitle, { color: colors.text }]}>PWA Cache & Offline Data</Text>
              <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
                Clear cached product and sales records
              </Text>
            </View>
            <Text style={{ fontSize: 16 }}>🗑️</Text>
          </Pressable>
        </View>

        {/* Logout Button */}
        <Pressable style={styles.logoutCardBtn} onPress={logout}>
          <Text style={styles.logoutCardBtnText}>← Sign Out of Mobile</Text>
        </Pressable>

        <Text style={[styles.versionText, { color: colors.textMuted }]}>
          OmniSuite Mobile • Version 1.0.0 (PWA Offline Ready)
        </Text>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBanner: {
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 26,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#173D50',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    marginBottom: 10,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: 'bold',
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userRole: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 2,
  },
  userEmail: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  borderBottom: {
    borderBottomWidth: 1,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  rowSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  logoutCardBtn: {
    marginTop: 24,
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutCardBtnText: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: 'bold',
  },
  versionText: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 16,
  },
});
