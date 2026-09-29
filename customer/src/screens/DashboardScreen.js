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
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { useTheme } from '../theme/ThemeContext';
import apiClient from '../api/client';

export default function DashboardScreen({ navigation }) {
  const { customer } = useCustomerAuth();
  const { theme } = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await apiClient.get('/dashboard');
      setData(res.data);
    } catch (e) {
      console.warn('Customer dashboard load error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg.primary }]}>
        <ActivityIndicator size="large" color={theme.secondary.DEFAULT} />
      </View>
    );
  }

  const stats = data?.stats || {};
  const recentOrders = data?.recentOrders || [];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.bg.primary }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.secondary.DEFAULT} />
      }
    >
      {/* Customer Welcome Card */}
      <View style={[styles.welcomeCard, { backgroundColor: theme.brand.DEFAULT }]}>
        <View style={styles.welcomeRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.welcomeSub}>Welcome Back,</Text>
            <Text style={styles.welcomeName}>{customer?.customer_name || 'Valued Client'}</Text>
            <Text style={styles.accountCode}>
              Acc Code: {customer?.account_code || customer?.customer_code || 'CUST-001'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.newOrderBtn}
            onPress={() => navigation.navigate('Orders', { screen: 'NewOrder' })}
          >
            <Ionicons name="cart" size={18} color={theme.brand.DEFAULT} />
            <Text style={styles.newOrderText}>New Order</Text>
          </TouchableOpacity>
        </View>

        {/* Credit & Outstanding Summary */}
        <View style={styles.financialRow}>
          <View style={styles.finCol}>
            <Text style={styles.finLabel}>Available Credit</Text>
            <Text style={styles.finValue}>
              GHS {Number(stats.available_credit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </Text>
          </View>
          <View style={styles.finDivider} />
          <View style={styles.finCol}>
            <Text style={styles.finLabel}>Outstanding Balance</Text>
            <Text style={[styles.finValue, { color: '#F87171' }]}>
              GHS {Number(stats.total_outstanding || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </View>
      </View>

      {/* KPI Grid */}
      <View style={styles.kpiGrid}>
        <TouchableOpacity
          style={[styles.kpiCard, { backgroundColor: theme.bg.card, borderColor: theme.bg.border }]}
          onPress={() => navigation.navigate('Orders')}
        >
          <View style={[styles.iconPill, { backgroundColor: theme.brand.badge }]}>
            <Ionicons name="receipt-outline" size={20} color={theme.brand.DEFAULT} />
          </View>
          <Text style={[styles.kpiNumber, { color: theme.bg.text }]}>{stats.total_orders || 0}</Text>
          <Text style={[styles.kpiTitle, { color: theme.bg.textMuted }]}>Total Orders</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.kpiCard, { backgroundColor: theme.bg.card, borderColor: theme.bg.border }]}
          onPress={() => navigation.navigate('Invoices')}
        >
          <View style={[styles.iconPill, { backgroundColor: theme.secondary.badge }]}>
            <Ionicons name="document-text-outline" size={20} color={theme.secondary.DEFAULT} />
          </View>
          <Text style={[styles.kpiNumber, { color: theme.bg.text }]}>{stats.total_invoices || 0}</Text>
          <Text style={[styles.kpiTitle, { color: theme.bg.textMuted }]}>Invoices</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.kpiCard, { backgroundColor: theme.bg.card, borderColor: theme.bg.border }]}
          onPress={() => navigation.navigate('Deliveries')}
        >
          <View style={[styles.iconPill, { backgroundColor: 'rgba(46, 139, 31, 0.15)' }]}>
            <Ionicons name="car-outline" size={20} color={theme.status.success} />
          </View>
          <Text style={[styles.kpiNumber, { color: theme.bg.text }]}>{stats.total_deliveries || 0}</Text>
          <Text style={[styles.kpiTitle, { color: theme.bg.textMuted }]}>Deliveries</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Orders Section */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.bg.text }]}>Recent Orders</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Orders')}>
          <Text style={[styles.viewAllText, { color: theme.secondary.DEFAULT }]}>View All</Text>
        </TouchableOpacity>
      </View>

      {recentOrders.length === 0 ? (
        <View style={[styles.emptyBox, { backgroundColor: theme.bg.card, borderColor: theme.bg.border }]}>
          <Text style={[styles.emptyText, { color: theme.bg.textMuted }]}>No sales orders placed yet.</Text>
        </View>
      ) : (
        recentOrders.map((ord) => (
          <TouchableOpacity
            key={ord.id}
            style={[styles.orderCard, { backgroundColor: theme.bg.card, borderColor: theme.bg.border }]}
            onPress={() => navigation.navigate('Orders', { screen: 'OrderDetail', params: { orderId: ord.id } })}
          >
            <View style={styles.orderTop}>
              <Text style={[styles.orderNo, { color: theme.bg.text }]}>{ord.order_no}</Text>
              <View style={[styles.statusBadge, { backgroundColor: theme.brand.badge }]}>
                <Text style={[styles.statusText, { color: theme.brand.DEFAULT }]}>{ord.status || 'PENDING'}</Text>
              </View>
            </View>
            <View style={styles.orderBottom}>
              <Text style={[styles.orderDate, { color: theme.bg.textMuted }]}>
                Date: {ord.order_date ? new Date(ord.order_date).toLocaleDateString() : 'N/A'}
              </Text>
              <Text style={[styles.orderAmount, { color: theme.status.success }]}>
                GHS {Number(ord.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </Text>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  welcomeCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  welcomeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  welcomeSub: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  welcomeName: { fontSize: 20, fontWeight: '800', color: '#FFF', marginTop: 2 },
  accountCode: { fontSize: 12, color: '#F9B514', marginTop: 4, fontWeight: '700' },
  newOrderBtn: {
    backgroundColor: '#F9B514',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  newOrderText: { color: '#061A22', fontWeight: '800', fontSize: 12 },
  financialRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 14,
    marginTop: 16,
    padding: 12,
  },
  finCol: { flex: 1, alignItems: 'center' },
  finDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  finLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase' },
  finValue: { fontSize: 16, fontWeight: '800', color: '#10B981', marginTop: 2 },
  kpiGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  kpiCard: { flex: 1, borderRadius: 16, padding: 14, borderWidth: 1, alignItems: 'center' },
  iconPill: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  kpiNumber: { fontSize: 18, fontWeight: '800' },
  kpiTitle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '800' },
  viewAllText: { fontSize: 13, fontWeight: '700' },
  emptyBox: { padding: 24, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
  emptyText: { fontSize: 13 },
  orderCard: { borderRadius: 16, padding: 14, borderWidth: 1, marginBottom: 10 },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  orderNo: { fontSize: 15, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '800' },
  orderBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderDate: { fontSize: 12 },
  orderAmount: { fontSize: 14, fontWeight: '800' },
});
