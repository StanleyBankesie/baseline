import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import apiClient from '../api/client';

export default function InvoicesScreen() {
  const { theme } = useTheme();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const res = await apiClient.get('/invoices');
      setInvoices(res.data.invoices || []);
    } catch (e) {
      console.warn('Invoices load error', e);
    } finally {
      setLoading(false);
    }
  };

  const getPaymentStatusBadge = (status) => {
    const s = String(status || '').toUpperCase();
    if (s === 'PAID') return { bg: theme.status.successBg, text: theme.status.success };
    if (s === 'PARTIAL') return { bg: theme.secondary.badge, text: theme.secondary.DEFAULT };
    return { bg: theme.status.errorBg, text: theme.status.error };
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg.primary }]}>
      <View style={[styles.topBar, { backgroundColor: theme.bg.card, borderColor: theme.bg.border }]}>
        <Text style={[styles.heading, { color: theme.bg.text }]}>Sales & Invoice Histories</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={theme.secondary.DEFAULT} /></View>
      ) : invoices.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={[styles.emptyText, { color: theme.bg.textMuted }]}>No invoices issued yet.</Text>
        </View>
      ) : (
        <FlatList
          data={invoices}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const badge = getPaymentStatusBadge(item.payment_status);
            return (
              <View style={[styles.card, { backgroundColor: theme.bg.card, borderColor: theme.bg.border }]}>
                <View style={styles.cardTop}>
                  <View>
                    <Text style={[styles.invNo, { color: theme.bg.text }]}>{item.invoice_no}</Text>
                    <Text style={[styles.dateText, { color: theme.bg.textMuted }]}>
                      Due: {item.due_date ? new Date(item.due_date).toLocaleDateString() : 'N/A'}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.statusText, { color: badge.text }]}>
                      {item.payment_status || 'UNPAID'}
                    </Text>
                  </View>
                </View>

                <View style={[styles.breakdownBox, { backgroundColor: theme.bg.input }]}>
                  <View style={styles.row}>
                    <Text style={[styles.breakdownLabel, { color: theme.bg.textMuted }]}>Total Invoiced</Text>
                    <Text style={[styles.breakdownVal, { color: theme.bg.text }]}>
                      GHS {Number(item.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={[styles.breakdownLabel, { color: theme.bg.textMuted }]}>Amount Paid</Text>
                    <Text style={[styles.breakdownVal, { color: theme.status.success }]}>
                      GHS {Number(item.amount_paid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={[styles.breakdownLabel, { color: theme.bg.textMuted }]}>Balance Due</Text>
                    <Text style={[styles.breakdownVal, { color: theme.status.error }]}>
                      GHS {Number(item.balance_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { padding: 16, borderBottomWidth: 1 },
  heading: { fontSize: 18, fontWeight: '800' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText: { fontSize: 14 },
  list: { padding: 16, paddingBottom: 40 },
  card: { borderRadius: 18, padding: 16, borderWidth: 1, marginBottom: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  invNo: { fontSize: 16, fontWeight: '800' },
  dateText: { fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '800' },
  breakdownBox: { borderRadius: 12, padding: 12, gap: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  breakdownLabel: { fontSize: 12, fontWeight: '600' },
  breakdownVal: { fontSize: 13, fontWeight: '700' },
});
