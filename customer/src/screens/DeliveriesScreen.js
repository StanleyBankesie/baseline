import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import apiClient from '../api/client';

export default function DeliveriesScreen() {
  const { theme } = useTheme();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const fetchDeliveries = async () => {
    try {
      const res = await apiClient.get('/deliveries');
      setDeliveries(res.data.deliveries || []);
    } catch (e) {
      console.warn('Deliveries load error', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg.primary }]}>
      <View style={[styles.topBar, { backgroundColor: theme.bg.card, borderColor: theme.bg.border }]}>
        <Text style={[styles.heading, { color: theme.bg.text }]}>Delivery Notes & Tracking</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={theme.secondary.DEFAULT} /></View>
      ) : deliveries.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={[styles.emptyText, { color: theme.bg.textMuted }]}>No delivery notes generated yet.</Text>
        </View>
      ) : (
        <FlatList
          data={deliveries}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: theme.bg.card, borderColor: theme.bg.border }]}>
              <View style={styles.cardHeader}>
                <View style={styles.headerLeft}>
                  <View style={[styles.iconBox, { backgroundColor: theme.brand.badge }]}>
                    <Ionicons name="car-outline" size={20} color={theme.brand.DEFAULT} />
                  </View>
                  <View>
                    <Text style={[styles.delNo, { color: theme.bg.text }]}>{item.delivery_no}</Text>
                    <Text style={[styles.dateText, { color: theme.bg.textMuted }]}>
                      Delivered: {item.delivery_date ? new Date(item.delivery_date).toLocaleDateString() : 'N/A'}
                    </Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: theme.status.successBg }]}>
                  <Text style={[styles.statusText, { color: theme.status.success }]}>{item.status || 'COMPLETED'}</Text>
                </View>
              </View>

              {item.delivery_instructions ? (
                <View style={[styles.instructionsBox, { backgroundColor: theme.bg.input }]}>
                  <Text style={[styles.instrTitle, { color: theme.bg.textMuted }]}>Instructions:</Text>
                  <Text style={[styles.instrText, { color: theme.bg.text }]}>{item.delivery_instructions}</Text>
                </View>
              ) : null}

              <View style={styles.cardFooter}>
                <Text style={[styles.refText, { color: theme.bg.textMuted }]}>
                  Sales Order: {item.order_no || 'Direct'}
                </Text>
                <Text style={[styles.refText, { color: theme.bg.textMuted }]}>
                  Invoice: {item.invoice_no || 'N/A'}
                </Text>
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
  topBar: { padding: 16, borderBottomWidth: 1 },
  heading: { fontSize: 18, fontWeight: '800' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText: { fontSize: 14 },
  list: { padding: 16, paddingBottom: 40 },
  card: { borderRadius: 18, padding: 16, borderWidth: 1, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  delNo: { fontSize: 15, fontWeight: '800' },
  dateText: { fontSize: 11, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '800' },
  instructionsBox: { borderRadius: 10, padding: 10, marginTop: 12 },
  instrTitle: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  instrText: { fontSize: 12, marginTop: 2 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(150,150,150,0.1)' },
  refText: { fontSize: 11 },
});
