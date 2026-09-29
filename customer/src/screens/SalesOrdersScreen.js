import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import apiClient from '../api/client';

export default function SalesOrdersScreen() {
  const { theme } = useTheme();
  const [orders, setOrders] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItems, setSelectedItems] = useState({});
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchOrdersAndCatalog();
  }, []);

  const fetchOrdersAndCatalog = async () => {
    try {
      const [ordRes, catRes] = await Promise.all([
        apiClient.get('/orders'),
        apiClient.get('/catalog'),
      ]);
      setOrders(ordRes.data.orders || []);
      setCatalog(catRes.data.items || []);
    } catch (e) {
      console.warn('Orders load error', e);
    } finally {
      setLoading(false);
    }
  };

  const handleQtyChange = (itemId, text) => {
    const qty = parseInt(text, 10);
    setSelectedItems((prev) => {
      const updated = { ...prev };
      if (isNaN(qty) || qty <= 0) {
        delete updated[itemId];
      } else {
        updated[itemId] = qty;
      }
      return updated;
    });
  };

  const handlePlaceOrder = async () => {
    const orderItems = Object.keys(selectedItems).map((id) => {
      const item = catalog.find((c) => String(c.id) === String(id));
      return {
        item_id: Number(id),
        quantity: selectedItems[id],
        unit_price: Number(item?.standard_price || 0),
      };
    });

    if (orderItems.length === 0) {
      Alert.alert('Validation Error', 'Please select at least one item and quantity.');
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post('/orders', {
        items: orderItems,
        remarks,
      });

      Alert.alert('Order Created', 'Your sales order has been placed successfully.');
      setModalVisible(false);
      setSelectedItems({});
      setRemarks('');
      fetchOrdersAndCatalog();
    } catch (e) {
      Alert.alert('Order Failed', e.response?.data?.message || 'Could not place sales order.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStageColor = (status) => {
    const s = String(status || '').toUpperCase();
    if (s === 'DELIVERED' || s === 'COMPLETED') return theme.status.success;
    if (s === 'APPROVED' || s === 'DISPATCHED') return theme.secondary.DEFAULT;
    if (s === 'CANCELLED') return theme.status.error;
    return theme.brand.DEFAULT;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg.primary }]}>
      {/* Top Header Bar */}
      <View style={[styles.topBar, { backgroundColor: theme.bg.card, borderColor: theme.bg.border }]}>
        <Text style={[styles.heading, { color: theme.bg.text }]}>Sales Orders</Text>
        <TouchableOpacity
          style={[styles.createBtn, { backgroundColor: theme.brand.DEFAULT }]}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={styles.createBtnText}>New Order</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={theme.secondary.DEFAULT} /></View>
      ) : orders.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={[styles.emptyText, { color: theme.bg.textMuted }]}>No sales orders created yet.</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: theme.bg.card, borderColor: theme.bg.border }]}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={[styles.orderNo, { color: theme.bg.text }]}>{item.order_no}</Text>
                  <Text style={[styles.orderDate, { color: theme.bg.textMuted }]}>
                    Date: {item.order_date ? new Date(item.order_date).toLocaleDateString() : 'N/A'}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStageColor(item.status) }]}>
                  <Text style={styles.statusText}>{item.status || 'PENDING'}</Text>
                </View>
              </View>

              {/* Order Stages Visual Progress */}
              <View style={[styles.stageTrack, { backgroundColor: theme.bg.input }]}>
                <View style={styles.stageNode}>
                  <Ionicons name="checkmark-circle" size={16} color={theme.status.success} />
                  <Text style={[styles.stageLabel, { color: theme.bg.text }]}>Placed</Text>
                </View>
                <View style={[styles.stageLine, { backgroundColor: theme.bg.border }]} />
                <View style={styles.stageNode}>
                  <Ionicons
                    name={['APPROVED', 'PROCESSING', 'DISPATCHED', 'DELIVERED'].includes(item.status) ? 'checkmark-circle' : 'ellipse-outline'}
                    size={16}
                    color={['APPROVED', 'PROCESSING', 'DISPATCHED', 'DELIVERED'].includes(item.status) ? theme.status.success : theme.bg.textMuted}
                  />
                  <Text style={[styles.stageLabel, { color: theme.bg.textMuted }]}>Processing</Text>
                </View>
                <View style={[styles.stageLine, { backgroundColor: theme.bg.border }]} />
                <View style={styles.stageNode}>
                  <Ionicons
                    name={item.status === 'DELIVERED' ? 'checkmark-circle' : 'ellipse-outline'}
                    size={16}
                    color={item.status === 'DELIVERED' ? theme.status.success : theme.bg.textMuted}
                  />
                  <Text style={[styles.stageLabel, { color: theme.bg.textMuted }]}>Delivered</Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <Text style={[styles.itemsCount, { color: theme.bg.textMuted }]}>
                  {item.item_count || 1} Item(s)
                </Text>
                <Text style={[styles.totalAmount, { color: theme.status.success }]}>
                  GHS {Number(item.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Text>
              </View>
            </View>
          )}
        />
      )}

      {/* New Order Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.bg.card, borderColor: theme.bg.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.bg.text }]}>Create Sales Order</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.bg.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 350 }}>
              <Text style={[styles.sectionSubtitle, { color: theme.bg.textMuted }]}>Select Products & Quantities:</Text>
              {catalog.map((prod) => (
                <View key={prod.id} style={[styles.prodRow, { borderColor: theme.bg.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.prodName, { color: theme.bg.text }]}>{prod.name}</Text>
                    <Text style={[styles.prodPrice, { color: theme.secondary.DEFAULT }]}>
                      GHS {Number(prod.standard_price || 0).toFixed(2)} / {prod.uom_name || 'Unit'}
                    </Text>
                  </View>
                  <TextInput
                    style={[styles.qtyInput, { backgroundColor: theme.bg.input, color: theme.bg.text, borderColor: theme.bg.border }]}
                    placeholder="0"
                    placeholderTextColor={theme.bg.textMuted}
                    keyboardType="numeric"
                    value={selectedItems[prod.id] ? String(selectedItems[prod.id]) : ''}
                    onChangeText={(t) => handleQtyChange(prod.id, t)}
                  />
                </View>
              ))}

              <Text style={[styles.sectionSubtitle, { marginTop: 14, color: theme.bg.textMuted }]}>Order Remarks / Instructions:</Text>
              <TextInput
                style={[styles.remarksInput, { backgroundColor: theme.bg.input, color: theme.bg.text, borderColor: theme.bg.border }]}
                placeholder="Optional delivery instructions..."
                placeholderTextColor={theme.bg.textMuted}
                value={remarks}
                onChangeText={setRemarks}
                multiline={true}
              />
            </ScrollView>

            <TouchableOpacity
              style={[styles.submitOrderBtn, { backgroundColor: theme.brand.DEFAULT }]}
              onPress={handlePlaceOrder}
              disabled={submitting}
            >
              {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitOrderText}>Submit Sales Order</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  heading: { fontSize: 18, fontWeight: '800' },
  createBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, gap: 4 },
  createBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  listContent: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText: { fontSize: 14 },
  card: { borderRadius: 18, padding: 16, borderWidth: 1, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  orderNo: { fontSize: 16, fontWeight: '800' },
  orderDate: { fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  stageTrack: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, padding: 10, marginVertical: 12 },
  stageNode: { alignItems: 'center', gap: 2 },
  stageLabel: { fontSize: 10, fontWeight: '600' },
  stageLine: { flex: 1, height: 2, marginHorizontal: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(150,150,150,0.1)', paddingTop: 10 },
  itemsCount: { fontSize: 12 },
  totalAmount: { fontSize: 16, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, borderWidth: 1, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  sectionSubtitle: { fontSize: 12, fontWeight: '700', marginBottom: 8 },
  prodRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1 },
  prodName: { fontSize: 14, fontWeight: '700' },
  prodPrice: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  qtyInput: { width: 60, height: 40, borderWidth: 1, borderRadius: 8, textAlign: 'center', fontSize: 14, fontWeight: '700' },
  remarksInput: { height: 60, borderWidth: 1, borderRadius: 10, padding: 8, fontSize: 13, textAlignVertical: 'top' },
  submitOrderBtn: { height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 16 },
  submitOrderText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
});
