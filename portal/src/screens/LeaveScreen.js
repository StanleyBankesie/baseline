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
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import apiClient from '../api/client';

export default function LeaveScreen() {
  const [balances, setBalances] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  // Form State
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchLeaveData = async () => {
    try {
      const res = await apiClient.get('/leave/balances');
      setBalances(res.data.balances || []);
      setRequests(res.data.requests || []);
      if (res.data.balances?.length > 0 && !leaveTypeId) {
        setLeaveTypeId(String(res.data.balances[0].id));
      }
    } catch (e) {
      console.warn('Leave fetch error', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveData();
  }, []);

  const handleApply = async () => {
    if (!leaveTypeId || !startDate || !endDate || !reason.trim()) {
      Alert.alert('Validation Error', 'Please complete all fields.');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post('/leave/apply', {
        leave_type_id: Number(leaveTypeId),
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim(),
      });
      Alert.alert('Success', 'Leave request submitted for approval!');
      setModalVisible(false);
      setReason('');
      fetchLeaveData();
    } catch (e) {
      Alert.alert('Application Failed', e.response?.data?.message || 'Could not submit leave');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.secondary.DEFAULT} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header with Apply Button */}
      <View style={styles.topRow}>
        <Text style={styles.sectionTitle}>Leave Balances</Text>
        <TouchableOpacity style={styles.applyBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={18} color="#FFF" />
          <Text style={styles.applyBtnText}>Apply Leave</Text>
        </TouchableOpacity>
      </View>

      {/* Leave Balances Grid */}
      <View style={styles.balanceGrid}>
        {balances.map((item) => (
          <View key={item.id} style={styles.balanceCard}>
            <Text style={styles.balanceName}>{item.name}</Text>
            <Text style={styles.balanceDays}>{item.balance_days || 0}</Text>
            <Text style={styles.balanceSub}>Days Remaining</Text>
            <View style={styles.balanceFooter}>
              <Text style={styles.footerText}>Used: {item.used_days || 0} / Total: {item.entitled_days || 0}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Past & Pending Requests */}
      <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 12 }]}>My Leave Requests</Text>
      {requests.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No leave requests submitted yet.</Text>
        </View>
      ) : (
        requests.map((req) => (
          <View key={req.id} style={styles.requestCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.requestType}>{req.leave_type_name || 'Annual Leave'}</Text>
              <Text style={styles.requestDates}>
                {new Date(req.start_date).toLocaleDateString()} — {new Date(req.end_date).toLocaleDateString()} ({req.total_days} days)
              </Text>
              <Text style={styles.requestReason}>{req.reason}</Text>
            </View>
            <View style={[styles.statusBadge, req.status === 'APPROVED' ? styles.badgeApproved : req.status === 'PENDING' ? styles.badgePending : styles.badgeRejected]}>
              <Text style={styles.statusText}>{req.status}</Text>
            </View>
          </View>
        ))
      )}

      {/* Apply Leave Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Apply For Leave</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>LEAVE TYPE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
              {balances.map((b) => (
                <TouchableOpacity
                  key={b.id}
                  style={[styles.typePill, leaveTypeId === String(b.id) && styles.typePillActive]}
                  onPress={() => setLeaveTypeId(String(b.id))}
                >
                  <Text style={[styles.typePillText, leaveTypeId === String(b.id) && styles.typePillTextActive]}>{b.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>START DATE (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 2026-09-10"
              placeholderTextColor={Colors.bg.textMuted}
              value={startDate}
              onChangeText={setStartDate}
            />

            <Text style={styles.label}>END DATE (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 2026-09-15"
              placeholderTextColor={Colors.bg.textMuted}
              value={endDate}
              onChangeText={setEndDate}
            />

            <Text style={styles.label}>REASON FOR LEAVE</Text>
            <TextInput
              style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
              placeholder="Provide reason for request..."
              placeholderTextColor={Colors.bg.textMuted}
              value={reason}
              onChangeText={setReason}
              multiline
            />

            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
              onPress={handleApply}
              disabled={submitting}
            >
              {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Submit Leave Application</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.dark },
  content: { padding: 16, paddingBottom: 40 },
  centerContainer: { flex: 1, backgroundColor: Colors.bg.dark, justifyContent: 'center', alignItems: 'center' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#FFF' },
  applyBtn: {
    backgroundColor: Colors.secondary.DEFAULT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  applyBtnText: { color: Colors.brand[950], fontSize: 13, fontWeight: '700' },
  balanceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  balanceCard: {
    width: '48%',
    backgroundColor: Colors.bg.card,
    borderColor: Colors.bg.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  balanceName: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  balanceDays: { fontSize: 24, fontWeight: '800', color: Colors.secondary.DEFAULT, marginVertical: 4 },
  balanceSub: { fontSize: 11, color: Colors.bg.textMuted },
  balanceFooter: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.bg.border },
  footerText: { fontSize: 10, color: Colors.bg.textMuted },
  requestCard: {
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
  requestType: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  requestDates: { fontSize: 12, color: Colors.secondary.light, marginTop: 2 },
  requestReason: { fontSize: 12, color: Colors.bg.textMuted, marginTop: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeApproved: { backgroundColor: 'rgba(46, 139, 31, 0.2)' },
  badgePending: { backgroundColor: 'rgba(245, 124, 0, 0.2)' },
  badgeRejected: { backgroundColor: 'rgba(239, 68, 68, 0.2)' },
  statusText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  emptyCard: { backgroundColor: Colors.bg.card, padding: 20, borderRadius: 14, alignItems: 'center' },
  emptyText: { color: Colors.bg.textMuted, fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: Colors.bg.card, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: Colors.bg.border },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  label: { fontSize: 11, fontWeight: '700', color: Colors.bg.textMuted, marginTop: 12, marginBottom: 6 },
  typeScroll: { flexDirection: 'row', marginBottom: 4 },
  typePill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: Colors.bg.input, marginRight: 8 },
  typePillActive: { backgroundColor: Colors.secondary.DEFAULT },
  typePillText: { fontSize: 12, color: Colors.bg.textMuted, fontWeight: '600' },
  typePillTextActive: { color: Colors.brand[950], fontWeight: '700' },
  input: {
    backgroundColor: Colors.bg.input,
    borderWidth: 1,
    borderColor: Colors.bg.border,
    borderRadius: 12,
    padding: 12,
    color: '#FFF',
    fontSize: 13,
  },
  submitBtn: {
    backgroundColor: Colors.brand[800],
    borderColor: Colors.brand[600],
    borderWidth: 1,
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  submitBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});
