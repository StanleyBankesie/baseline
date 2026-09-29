import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import apiClient from '../api/client';

export default function CompensationScreen() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompensation();
  }, []);

  const fetchCompensation = async () => {
    try {
      const res = await apiClient.get('/compensation/summary');
      setData(res.data);
    } catch (e) {
      console.warn('Compensation load error', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.secondary.DEFAULT} />
      </View>
    );
  }

  const salary = data?.salary;
  const payslips = data?.payslips || [];
  const allowances = data?.allowances || [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Base Salary Card */}
      <View style={styles.baseCard}>
        <Text style={styles.baseTitle}>Base Monthly Remuneration</Text>
        <Text style={styles.baseAmount}>
          GHS {Number(salary?.base_salary || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </Text>
        <View style={styles.bankRow}>
          <Ionicons name="card-outline" size={16} color={Colors.secondary.DEFAULT} />
          <Text style={styles.bankText}>
            Bank: {salary?.bank_name || 'Standard Chartered'} • Acc: {salary?.bank_account || '••••••••'}
          </Text>
        </View>
        <View style={styles.taxRow}>
          <Text style={styles.taxText}>SSNIT: {salary?.ssnit || 'N/A'}</Text>
          <Text style={styles.taxText}>TIN: {salary?.tin || 'N/A'}</Text>
        </View>
      </View>

      {/* Allowances */}
      {allowances.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { marginTop: 20, marginBottom: 10 }]}>Active Allowances</Text>
          {allowances.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <Text style={styles.itemTitle}>{item.allowance_name}</Text>
              <Text style={styles.itemAmount}>GHS {Number(item.amount || 0).toFixed(2)}</Text>
            </View>
          ))}
        </>
      )}

      {/* Payslips History */}
      <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 12 }]}>Payslip History</Text>
      {payslips.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No payslips generated yet.</Text>
        </View>
      ) : (
        payslips.map((slip) => (
          <View key={slip.id} style={styles.slipCard}>
            <View style={styles.slipHeader}>
              <Text style={styles.slipPeriod}>{slip.period_name || 'Payroll Month'}</Text>
              <Text style={styles.slipNet}>
                GHS {Number(slip.net_salary || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={styles.slipDetails}>
              <Text style={styles.detailText}>Gross: GHS {Number(slip.gross_salary || 0).toFixed(2)}</Text>
              <Text style={styles.detailText}>Allowances: +GHS {Number(slip.total_allowances || 0).toFixed(2)}</Text>
              <Text style={[styles.detailText, { color: Colors.status.error }]}>
                Deductions: -GHS {Number(slip.total_deductions || 0).toFixed(2)}
              </Text>
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
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#FFF' },
  baseCard: {
    backgroundColor: Colors.brand[900],
    borderColor: Colors.brand[700],
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
  },
  baseTitle: { fontSize: 13, color: Colors.bg.textMuted, fontWeight: '600' },
  baseAmount: { fontSize: 28, fontWeight: '800', color: '#FFF', marginVertical: 6 },
  bankRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  bankText: { fontSize: 12, color: Colors.secondary.light },
  taxRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.brand[700] },
  taxText: { fontSize: 11, color: Colors.bg.textMuted },
  itemCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.bg.border,
  },
  itemTitle: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  itemAmount: { fontSize: 14, fontWeight: '700', color: Colors.status.success },
  slipCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.bg.border,
  },
  slipHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  slipPeriod: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  slipNet: { fontSize: 16, fontWeight: '800', color: Colors.status.success },
  slipDetails: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: Colors.bg.input, padding: 10, borderRadius: 10 },
  detailText: { fontSize: 11, color: Colors.bg.textMuted },
  emptyCard: { backgroundColor: Colors.bg.card, padding: 20, borderRadius: 14, alignItems: 'center' },
  emptyText: { color: Colors.bg.textMuted, fontSize: 13 },
});
