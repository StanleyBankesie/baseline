import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { useTheme } from '../theme/ThemeContext';
import apiClient from '../api/client';

export default function AccountGLScreen() {
  const { customer } = useCustomerAuth();
  const { theme } = useTheme();
  const [glData, setGlData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGLReport();
  }, []);

  const fetchGLReport = async () => {
    try {
      const res = await apiClient.get('/account/gl-report');
      setGlData(res.data);
    } catch (e) {
      console.warn('GL report load error', e);
    } finally {
      setLoading(false);
    }
  };

  const entries = glData?.entries || [];

  return (
    <View style={[styles.container, { backgroundColor: theme.bg.primary }]}>
      {/* Account Info Header */}
      <View style={[styles.accountCard, { backgroundColor: theme.brand.DEFAULT }]}>
        <Text style={styles.cardSub}>Customer General Ledger</Text>
        <Text style={styles.cardName}>{customer?.customer_name}</Text>
        <View style={styles.codeRow}>
          <Text style={styles.cardCode}>Account Code: {customer?.account_code || customer?.customer_code || 'CUST001'}</Text>
          <Text style={styles.creditLimit}>Credit Limit: GHS {Number(customer?.credit_limit || 0).toLocaleString()}</Text>
        </View>
      </View>

      <View style={[styles.sectionTitleRow, { backgroundColor: theme.bg.card, borderColor: theme.bg.border }]}>
        <Text style={[styles.title, { color: theme.bg.text }]}>GL Statement & Transactions</Text>
        <Text style={[styles.entryCount, { color: theme.bg.textMuted }]}>{entries.length} Record(s)</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={theme.secondary.DEFAULT} /></View>
      ) : entries.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={[styles.emptyText, { color: theme.bg.textMuted }]}>No ledger journal entries found for this account.</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item, idx) => String(item.voucher_id || idx)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: theme.bg.card, borderColor: theme.bg.border }]}>
              <View style={styles.cardTop}>
                <View>
                  <Text style={[styles.voucherNo, { color: theme.bg.text }]}>{item.voucher_no || 'VOUCHER'}</Text>
                  <Text style={[styles.dateText, { color: theme.bg.textMuted }]}>
                    {item.voucher_date ? new Date(item.voucher_date).toLocaleDateString() : 'N/A'}
                  </Text>
                </View>
                <Text style={[styles.balanceVal, { color: theme.bg.text }]}>
                  Bal: GHS {Number(item.running_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Text>
              </View>

              <Text style={[styles.desc, { color: theme.bg.textMuted }]} numberOfLines={2}>
                {item.description || 'General Ledger Entry'}
              </Text>

              <View style={[styles.amountRow, { backgroundColor: theme.bg.input }]}>
                <View style={styles.amountCol}>
                  <Text style={[styles.amountLabel, { color: theme.bg.textMuted }]}>Debit (+)</Text>
                  <Text style={[styles.debitText, { color: theme.status.error }]}>
                    {Number(item.debit || 0) > 0 ? `GHS ${Number(item.debit).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                  </Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.amountCol}>
                  <Text style={[styles.amountLabel, { color: theme.bg.textMuted }]}>Credit (-)</Text>
                  <Text style={[styles.creditText, { color: theme.status.success }]}>
                    {Number(item.credit || 0) > 0 ? `GHS ${Number(item.credit).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                  </Text>
                </View>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  accountCard: { padding: 20, margin: 16, borderRadius: 20 },
  cardSub: { fontSize: 11, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase' },
  cardName: { fontSize: 20, fontWeight: '800', color: '#FFF', marginTop: 2 },
  codeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 10 },
  cardCode: { fontSize: 12, color: '#F9B514', fontWeight: '700' },
  creditLimit: { fontSize: 12, color: '#FFF', fontWeight: '600' },
  sectionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  title: { fontSize: 15, fontWeight: '800' },
  entryCount: { fontSize: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText: { fontSize: 14 },
  list: { padding: 16, paddingBottom: 40 },
  card: { borderRadius: 18, padding: 16, borderWidth: 1, marginBottom: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  voucherNo: { fontSize: 15, fontWeight: '800' },
  dateText: { fontSize: 11, marginTop: 2 },
  balanceVal: { fontSize: 13, fontWeight: '800' },
  desc: { fontSize: 12, marginVertical: 8 },
  amountRow: { flexDirection: 'row', borderRadius: 10, padding: 10 },
  amountCol: { flex: 1, alignItems: 'center' },
  divider: { width: 1, backgroundColor: 'rgba(150,150,150,0.2)' },
  amountLabel: { fontSize: 10, fontWeight: '700' },
  debitText: { fontSize: 13, fontWeight: '800', marginTop: 2 },
  creditText: { fontSize: 13, fontWeight: '800', marginTop: 2 },
});
