import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';

export default function DashboardScreen({ navigation }) {
  const { employee, user } = useAuth();
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      const res = await apiClient.get('/dashboard/overview');
      setData(res.data);
    } catch (e) {
      console.warn('Dashboard fetch error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.secondary.DEFAULT} />
      </View>
    );
  }

  const name = employee?.first_name || user?.username || 'Employee';
  const today = data?.todayAttendance;
  const leave = data?.leaveSummary || { available: 24, taken: 0, entitled: 24, pending: 0 };
  const payslip = data?.latestPayslip;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.secondary.DEFAULT} />
      }
    >
      {/* Welcome Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroRow}>
          <View style={styles.avatarBox}>
            <Text style={styles.avatarText}>{name[0].toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.greetingText}>Welcome back,</Text>
            <Text style={styles.nameText}>{name} {employee?.last_name || ''}</Text>
            <Text style={styles.roleText}>{employee?.pos_name || 'Staff Member'} • {employee?.dept_name || 'General'}</Text>
          </View>
        </View>
      </View>

      {/* Quick Attendance Check-In Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Ionicons name="time-outline" size={20} color={Colors.secondary.DEFAULT} />
            <Text style={styles.cardTitle}>Today's Attendance</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Attendance')}>
            <Text style={styles.linkText}>View Details</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.attendanceRow}>
          <View style={styles.timeBox}>
            <Text style={styles.timeLabel}>Clock In</Text>
            <Text style={styles.timeValue}>{today?.clock_in || '--:--'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.timeBox}>
            <Text style={styles.timeLabel}>Clock Out</Text>
            <Text style={styles.timeValue}>{today?.clock_out || '--:--'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.timeBox}>
            <Text style={styles.timeLabel}>Status</Text>
            <Text style={[styles.timeValue, { color: today ? Colors.status.success : Colors.status.warning }]}>
              {today?.status || 'NOT LOGGED'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Attendance')}
        >
          <Ionicons name="finger-print" size={18} color="#FFF" />
          <Text style={styles.actionButtonText}>
            {today?.clock_in && !today?.clock_out ? 'Clock Out Now' : 'Clock In Now'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Leave Summary */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Ionicons name="calendar-outline" size={20} color={Colors.secondary.DEFAULT} />
            <Text style={styles.cardTitle}>Leave Balances</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Leave')}>
            <Text style={styles.linkText}>Apply Leave</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{leave.available}</Text>
            <Text style={styles.statLabel}>Available Days</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{leave.taken}</Text>
            <Text style={styles.statLabel}>Days Taken</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{leave.pending}</Text>
            <Text style={styles.statLabel}>Pending Approval</Text>
          </View>
        </View>
      </View>

      {/* Latest Payslip Snippet */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Ionicons name="cash-outline" size={20} color={Colors.secondary.DEFAULT} />
            <Text style={styles.cardTitle}>Latest Payslip</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Compensation')}>
            <Text style={styles.linkText}>All Payslips</Text>
          </TouchableOpacity>
        </View>

        {payslip ? (
          <View style={styles.payslipBox}>
            <View>
              <Text style={styles.payslipPeriod}>{payslip.period_name || 'Current Period'}</Text>
              <Text style={styles.payslipNet}>GHS {Number(payslip.net_salary || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
              <Text style={styles.payslipSub}>Net Take Home</Text>
            </View>
            <TouchableOpacity
              style={styles.viewPayslipBtn}
              onPress={() => navigation.navigate('Compensation')}
            >
              <Text style={styles.viewPayslipBtnText}>View Breakdown</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.emptyText}>No payslips generated yet for your account.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.dark },
  content: { padding: 16, paddingBottom: 40 },
  centerContainer: { flex: 1, backgroundColor: Colors.bg.dark, justifyContent: 'center', alignItems: 'center' },
  heroCard: {
    backgroundColor: Colors.brand[900],
    borderColor: Colors.brand[700],
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarBox: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: Colors.secondary.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 22, fontWeight: '800', color: Colors.brand[950] },
  greetingText: { fontSize: 12, color: Colors.bg.textMuted, fontWeight: '600' },
  nameText: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  roleText: { fontSize: 12, color: Colors.secondary.DEFAULT, marginTop: 2, fontWeight: '600' },
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.bg.border,
    marginBottom: 16,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  linkText: { fontSize: 12, color: Colors.secondary.DEFAULT, fontWeight: '600' },
  attendanceRow: {
    flexDirection: 'row',
    backgroundColor: Colors.bg.input,
    borderRadius: 12,
    padding: 12,
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 14,
  },
  timeBox: { alignItems: 'center' },
  timeLabel: { fontSize: 11, color: Colors.bg.textMuted, marginBottom: 2 },
  timeValue: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  divider: { width: 1, height: 28, backgroundColor: Colors.bg.border },
  actionButton: {
    backgroundColor: Colors.brand[800],
    borderColor: Colors.brand[600],
    borderWidth: 1,
    borderRadius: 12,
    height: 44,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  actionButtonText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  statsGrid: { flexDirection: 'row', gap: 10 },
  statBox: {
    flex: 1,
    backgroundColor: Colors.bg.input,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statNumber: { fontSize: 18, fontWeight: '800', color: Colors.secondary.DEFAULT },
  statLabel: { fontSize: 10, color: Colors.bg.textMuted, marginTop: 2, textAlign: 'center' },
  payslipBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.bg.input,
    padding: 14,
    borderRadius: 12,
  },
  payslipPeriod: { fontSize: 12, color: Colors.bg.textMuted },
  payslipNet: { fontSize: 18, fontWeight: '800', color: Colors.status.success, marginVertical: 2 },
  payslipSub: { fontSize: 10, color: Colors.bg.textMuted },
  viewPayslipBtn: {
    backgroundColor: Colors.brand[700],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  viewPayslipBtnText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  emptyText: { color: Colors.bg.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: 8 },
});
