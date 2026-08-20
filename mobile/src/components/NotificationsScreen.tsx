/**
 * Notifications & Workflow Approvals Screen
 * Displays live system notifications, pending workflow approvals, low stock alerts.
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
} from 'react-native';
import { Colors } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

interface NotificationItem {
  id: string;
  type: 'APPROVAL' | 'ALERT' | 'INFO' | 'BIRTHDAY';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

const DEFAULT_NOTIFS: NotificationItem[] = [
  {
    id: 'n1',
    type: 'APPROVAL',
    title: 'Purchase Order Approval Needed',
    message: 'PO #LPO-2026-089 requires executive sign-off (GHS 12,400.00).',
    timestamp: '10 mins ago',
    read: false,
  },
  {
    id: 'n2',
    type: 'ALERT',
    title: 'Low Stock Alert',
    message: 'Ergonomic Office Chair has fallen below reorder threshold (12 left).',
    timestamp: '1 hour ago',
    read: false,
  },
  {
    id: 'n3',
    type: 'INFO',
    title: 'Daily Sales Report Ready',
    message: 'Yesterday total branch sales reached GHS 18,950.00 across 34 receipts.',
    timestamp: '5 hours ago',
    read: true,
  },
  {
    id: 'n4',
    type: 'BIRTHDAY',
    title: 'Staff Birthday Celebration',
    message: 'Kwame Mensah (Operations Director) is celebrating today! 🎂',
    timestamp: 'Today',
    read: true,
  },
];

export function NotificationsScreen() {
  const { themeMode } = useAuth();
  const modeKey: 'light' | 'dark' = themeMode === 'light' ? 'light' : 'dark';
  const colors = Colors[modeKey];

  const [notifications, setNotifications] = useState<NotificationItem[]>(DEFAULT_NOTIFS);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifs = async () => {
    try {
      const res = await api.get('/notifications').catch(() => null);
      if (res?.data && Array.isArray(res.data)) {
        setNotifications(res.data);
      }
    } catch {}
    setRefreshing(false);
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'APPROVAL':
        return '✍️';
      case 'ALERT':
        return '⚠️';
      case 'BIRTHDAY':
        return '🎂';
      default:
        return 'ℹ️';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.brandNavy }]}>
        <View>
          <Text style={styles.headerTitle}>Notifications & Alerts</Text>
          <Text style={styles.headerSubtitle}>
            {notifications.filter((n) => !n.read).length} Unread Updates
          </Text>
        </View>

        <Pressable style={styles.markReadBtn} onPress={markAllRead}>
          <Text style={styles.markReadBtnText}>Mark All Read</Text>
        </Pressable>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchNotifs} />}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View
            style={[
              styles.notifCard,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
              !item.read && { borderLeftWidth: 4, borderLeftColor: colors.secondaryYellow },
            ]}
          >
            <Text style={styles.notifIcon}>{getIcon(item.type)}</Text>
            <View style={{ flex: 1 }}>
              <View style={styles.notifTop}>
                <Text style={[styles.notifTitle, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.notifTime, { color: colors.textMuted }]}>{item.timestamp}</Text>
              </View>
              <Text style={[styles.notifMsg, { color: colors.textSecondary }]}>{item.message}</Text>

              {item.type === 'APPROVAL' ? (
                <View style={styles.approvalRow}>
                  <Pressable style={[styles.appBtn, { backgroundColor: colors.statusSuccess }]}>
                    <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 11 }}>Approve</Text>
                  </Pressable>
                  <Pressable style={[styles.appBtn, { backgroundColor: colors.statusError }]}>
                    <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 11 }}>Reject</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#F9B514',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  markReadBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  markReadBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  notifCard: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  notifIcon: {
    fontSize: 22,
  },
  notifTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  notifTime: {
    fontSize: 10,
  },
  notifMsg: {
    fontSize: 12,
    lineHeight: 16,
  },
  approvalRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  appBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
});
