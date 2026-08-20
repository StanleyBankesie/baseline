import React, { useEffect, useState } from 'react';
import { StyleSheet, Pressable, ActivityIndicator, View, FlatList, Modal, ScrollView, RefreshControl } from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { useApp } from '@/context/AppContext';

export const HistoryScreen: React.FC = () => {
  const { apiCall } = useApp();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  const fetchOrders = async (isRef = false) => {
    if (isRef) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await apiCall('/orders');
      if (data?.orders) {
        setOrders(data.orders);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const getStatusColor = (status: string) => {
    switch (String(status).toUpperCase()) {
      case 'APPROVED':
        return { bg: '#e6f4ea', text: '#137333' }; // Green
      case 'PENDING_APPROVAL':
      case 'PENDING':
        return { bg: '#fef7e0', text: '#b06000' }; // Yellow
      case 'CANCELLED':
        return { bg: '#fce8e6', text: '#c5221f' }; // Red
      default:
        return { bg: '#f1f3f4', text: '#5f6368' }; // Grey
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#2D5A27" />
        <ThemedText style={styles.loadingText}>Fetching order history...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>Sales History</ThemedText>
      <ThemedText style={styles.subtitle}>Track your past orders and invoice records</ThemedText>

      {orders.length === 0 ? (
        <ScrollView 
          contentContainerStyle={[styles.scrollCenter]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchOrders(true)} colors={['#2D5A27']} />
          }
        >
          <View style={styles.emptyIconContainer}>
            <ThemedText style={styles.emptyIcon}>📦</ThemedText>
          </View>
          <ThemedText style={styles.emptyTitle}>No Orders Yet</ThemedText>
          <ThemedText style={styles.emptySubtitle}>You haven't placed any orders in Chyta yet.</ThemedText>
        </ScrollView>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchOrders(true)} colors={['#2D5A27']} />
          }
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const statusStyle = getStatusColor(item.status);
            return (
              <Pressable 
                style={({ pressed }) => [
                  styles.orderCard,
                  pressed && styles.orderCardPressed
                ]}
                onPress={() => setSelectedOrder(item)}
              >
                <View style={styles.orderHeader}>
                  <View>
                    <ThemedText style={styles.orderNo}>{item.order_no}</ThemedText>
                    <ThemedText style={styles.orderDate}>{formatDate(item.order_date)}</ThemedText>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <ThemedText style={[styles.statusText, { color: statusStyle.text }]}>
                      {String(item.status).replace('_', ' ')}
                    </ThemedText>
                  </View>
                </View>
                
                <View style={styles.cardDivider} />
                
                <View style={styles.orderFooter}>
                  <ThemedText style={styles.shopName}>📍 {item.shop_name || 'Main Branch'}</ThemedText>
                  <ThemedText style={styles.orderTotal}>GH₵{Number(item.total_amount).toFixed(2)}</ThemedText>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {/* Order Details Modal */}
      <Modal
        visible={selectedOrder !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedOrder(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <ThemedText style={styles.modalTitle}>Order Details</ThemedText>
                <ThemedText style={styles.modalNo}>{selectedOrder?.order_no}</ThemedText>
              </View>
              <Pressable style={styles.closeBtn} onPress={() => setSelectedOrder(null)}>
                <ThemedText style={styles.closeBtnText}>✕</ThemedText>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              <View style={styles.detailRow}>
                <ThemedText style={styles.detailLabel}>Date:</ThemedText>
                <ThemedText style={styles.detailValue}>{formatDate(selectedOrder?.order_date)}</ThemedText>
              </View>
              <View style={styles.detailRow}>
                <ThemedText style={styles.detailLabel}>Shop:</ThemedText>
                <ThemedText style={styles.detailValue}>{selectedOrder?.shop_name || 'Main Branch'}</ThemedText>
              </View>
              <View style={styles.detailRow}>
                <ThemedText style={styles.detailLabel}>Status:</ThemedText>
                <View style={[styles.statusBadge, { backgroundColor: selectedOrder ? getStatusColor(selectedOrder.status).bg : '#fff' }]}>
                  <ThemedText style={[styles.statusText, { color: selectedOrder ? getStatusColor(selectedOrder.status).text : '#000' }]}>
                    {selectedOrder?.status?.replace('_', ' ')}
                  </ThemedText>
                </View>
              </View>
              
              {selectedOrder?.remarks ? (
                <View style={styles.remarksBlock}>
                  <ThemedText style={styles.remarksLabel}>Order Notes:</ThemedText>
                  <ThemedText style={styles.remarksText}>{selectedOrder.remarks}</ThemedText>
                </View>
              ) : null}

              <View style={styles.modalDivider} />
              
              <ThemedText style={styles.itemsTitle}>Items Ordered</ThemedText>
              <View style={styles.itemsList}>
                {selectedOrder?.items?.map((item: any, idx: number) => (
                  <View key={item.id || idx} style={styles.itemRow}>
                    <View style={styles.itemInfo}>
                      <ThemedText style={styles.itemName}>{item.item_name}</ThemedText>
                      <ThemedText style={styles.itemQty}>{item.qty} {item.uom || 'PCS'} × GH₵{Number(item.unit_price).toFixed(2)}</ThemedText>
                    </View>
                    <ThemedText style={styles.itemTotal}>GH₵{Number(item.net_amount).toFixed(2)}</ThemedText>
                  </View>
                ))}
              </View>

              <View style={styles.modalDivider} />

              <View style={styles.totalBlock}>
                <View style={styles.calcRow}>
                  <ThemedText style={styles.calcLabel}>Subtotal</ThemedText>
                  <ThemedText style={styles.calcValue}>GH₵{Number(selectedOrder?.sub_total || 0).toFixed(2)}</ThemedText>
                </View>
                <View style={styles.calcRow}>
                  <ThemedText style={styles.calcLabel}>VAT (15%)</ThemedText>
                  <ThemedText style={styles.calcValue}>GH₵{Number(selectedOrder?.tax_amount || 0).toFixed(2)}</ThemedText>
                </View>
                <View style={styles.calcDivider} />
                <View style={styles.calcRow}>
                  <ThemedText style={styles.grandTotalLabel}>Grand Total</ThemedText>
                  <ThemedText style={styles.grandTotalValue}>GH₵{Number(selectedOrder?.total_amount || 0).toFixed(2)}</ThemedText>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollCenter: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 64,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#60646C',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D5A27',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#60646C',
    marginBottom: 16,
  },
  listContent: {
    paddingBottom: 80,
    gap: 12,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F0F0F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyIcon: {
    fontSize: 44,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2D5A27',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#60646C',
    textAlign: 'center',
    marginTop: 8,
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0F0F3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },
  orderCardPressed: {
    transform: [{ scale: 0.98 }],
    backgroundColor: '#F8F9FA',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderNo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  orderDate: {
    fontSize: 12,
    color: '#60646C',
    marginTop: 2,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F0F0F3',
    marginVertical: 12,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shopName: {
    fontSize: 13,
    color: '#60646C',
    fontWeight: '600',
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D5A27',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderColor: '#F0F0F3',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D5A27',
  },
  modalNo: {
    fontSize: 14,
    color: '#60646C',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F0F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    color: '#60646C',
    fontWeight: 'bold',
  },
  modalScroll: {
    padding: 20,
    paddingBottom: 40,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 6,
  },
  detailLabel: {
    fontSize: 14,
    color: '#60646C',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  remarksBlock: {
    backgroundColor: '#F0F0F3',
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  remarksLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#60646C',
  },
  remarksText: {
    fontSize: 13,
    color: '#333',
    marginTop: 4,
    lineHeight: 18,
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#E0E1E6',
    marginVertical: 18,
  },
  itemsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  itemsList: {
    gap: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    marginRight: 16,
  },
  itemName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  itemQty: {
    fontSize: 12,
    color: '#60646C',
    marginTop: 2,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  totalBlock: {
    backgroundColor: '#f9f9fc',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F0F3',
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  calcLabel: {
    fontSize: 13,
    color: '#60646C',
  },
  calcValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  calcDivider: {
    height: 1,
    backgroundColor: '#E0E1E6',
    marginVertical: 8,
  },
  grandTotalLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2D5A27',
  },
  grandTotalValue: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#2D5A27',
  },
});
