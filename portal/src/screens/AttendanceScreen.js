import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import apiClient from '../api/client';

export default function AttendanceScreen() {
  const [history, setHistory] = useState([]);
  const [today, setToday] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAttendance = async () => {
    try {
      const [histRes, dashRes] = await Promise.all([
        apiClient.get('/attendance/history'),
        apiClient.get('/dashboard/overview'),
      ]);
      setHistory(histRes.data.records || []);
      setToday(dashRes.data.todayAttendance || null);
    } catch (e) {
      console.warn('Attendance load error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const handleClockIn = async () => {
    setActionLoading(true);
    try {
      await apiClient.post('/attendance/clock-in', { remarks });
      setRemarks('');
      Alert.alert('Success', 'Clocked in successfully!');
      fetchAttendance();
    } catch (e) {
      Alert.alert('Clock-In Error', e.response?.data?.message || 'Failed to clock in');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockOut = async () => {
    setActionLoading(true);
    try {
      await apiClient.post('/attendance/clock-out', { remarks });
      setRemarks('');
      Alert.alert('Success', 'Clocked out successfully!');
      fetchAttendance();
    } catch (e) {
      Alert.alert('Clock-Out Error', e.response?.data?.message || 'Failed to clock out');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.secondary.DEFAULT} />
      </View>
    );
  }

  const isClockedIn = Boolean(today && today.clock_in && !today.clock_out);
  const isCompleted = Boolean(today && today.clock_in && today.clock_out);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAttendance(); }} tintColor={Colors.secondary.DEFAULT} />}
    >
      {/* Clock Action Card */}
      <View style={styles.actionCard}>
        <Text style={styles.sectionTitle}>Digital Time Clock</Text>
        <Text style={styles.currentDate}>{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Text>

        <View style={styles.statusBadge}>
          <Ionicons
            name={isClockedIn ? 'radio-button-on' : isCompleted ? 'checkmark-circle' : 'time-outline'}
            size={16}
            color={isClockedIn ? Colors.status.success : isCompleted ? Colors.secondary.DEFAULT : Colors.bg.textMuted}
          />
          <Text style={styles.statusBadgeText}>
            {isClockedIn ? 'CURRENTLY WORKING' : isCompleted ? 'SHIFT COMPLETED' : 'NOT CLOCKED IN'}
          </Text>
        </View>

        <TextInput
          style={styles.remarksInput}
          placeholder="Optional shift / location remarks..."
          placeholderTextColor={Colors.bg.textMuted}
          value={remarks}
          onChangeText={setRemarks}
        />

        <View style={styles.buttonRow}>
          {!isCompleted && !isClockedIn && (
            <TouchableOpacity
              style={[styles.clockBtn, styles.clockInBtn]}
              onPress={handleClockIn}
              disabled={actionLoading}
            >
              {actionLoading ? <ActivityIndicator color="#FFF" /> : (
                <>
                  <Ionicons name="enter-outline" size={20} color="#FFF" />
                  <Text style={styles.clockBtnText}>CLOCK IN</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {isClockedIn && (
            <TouchableOpacity
              style={[styles.clockBtn, styles.clockOutBtn]}
              onPress={handleClockOut}
              disabled={actionLoading}
            >
              {actionLoading ? <ActivityIndicator color="#FFF" /> : (
                <>
                  <Ionicons name="exit-outline" size={20} color="#FFF" />
                  <Text style={styles.clockBtnText}>CLOCK OUT</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {isCompleted && (
            <View style={styles.completedNotice}>
              <Ionicons name="checkmark-done" size={20} color={Colors.status.success} />
              <Text style={styles.completedNoticeText}>You have completed your shift for today.</Text>
            </View>
          )}
        </View>
      </View>

      {/* History Log */}
      <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 12 }]}>Attendance History</Text>
      {history.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No attendance records recorded yet.</Text>
        </View>
      ) : (
        history.map((record) => (
          <View key={record.id} style={styles.historyCard}>
            <View style={styles.historyLeft}>
              <Text style={styles.historyDate}>{new Date(record.date).toLocaleDateString()}</Text>
              <Text style={styles.historyTimes}>
                In: {record.clock_in || '--:--'} • Out: {record.clock_out || '--:--'}
              </Text>
              {record.remarks ? <Text style={styles.historyRemarks}>{record.remarks}</Text> : null}
            </View>
            <View style={[styles.badge, record.status === 'PRESENT' ? styles.badgePresent : record.status === 'LATE' ? styles.badgeLate : styles.badgeAbsent]}>
              <Text style={styles.badgeText}>{record.status}</Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.dark },
  content: { padding: 16, paddingBottom: 40 },
  centerContainer: { flex: 1, backgroundColor: Colors.bg.dark, justifyContent: 'center', alignItems: 'center' },
  actionCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.bg.border,
    alignItems: 'center',
  },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#FFF' },
  currentDate: { fontSize: 13, color: Colors.secondary.DEFAULT, marginTop: 4, fontWeight: '600' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.bg.input,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 14,
    marginBottom: 16,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  remarksInput: {
    width: '100%',
    backgroundColor: Colors.bg.input,
    borderColor: Colors.bg.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    color: '#FFF',
    fontSize: 13,
    marginBottom: 16,
  },
  buttonRow: { width: '100%' },
  clockBtn: {
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  clockInBtn: { backgroundColor: Colors.status.success },
  clockOutBtn: { backgroundColor: Colors.status.warning },
  clockBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  completedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(46, 139, 31, 0.15)',
    padding: 12,
    borderRadius: 12,
  },
  completedNoticeText: { color: Colors.status.success, fontSize: 13, fontWeight: '600' },
  historyCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.bg.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  historyLeft: { flex: 1 },
  historyDate: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  historyTimes: { fontSize: 12, color: Colors.bg.textMuted, marginTop: 2 },
  historyRemarks: { fontSize: 11, color: Colors.secondary.light, marginTop: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgePresent: { backgroundColor: 'rgba(46, 139, 31, 0.2)' },
  badgeLate: { backgroundColor: 'rgba(245, 124, 0, 0.2)' },
  badgeAbsent: { backgroundColor: 'rgba(239, 68, 68, 0.2)' },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  emptyCard: { backgroundColor: Colors.bg.card, padding: 20, borderRadius: 14, alignItems: 'center' },
  emptyText: { color: Colors.bg.textMuted, fontSize: 13 },
});
