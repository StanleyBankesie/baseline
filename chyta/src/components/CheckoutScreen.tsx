import React, { useState } from 'react';
import {
  StyleSheet,
  Pressable,
  ActivityIndicator,
  View,
  ScrollView,
  Image,
  Alert,
  Linking,
} from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { useApp } from '@/context/AppContext';

type PaymentMethod = 'CASH' | 'MOMO' | 'CARD';

const DELIVERY_FEE = 20; // flat delivery fee in local currency

export const CheckoutScreen: React.FC = () => {
  const { cart, currency, clearCart, apiCall, setCurrentTab, selectedShop } = useApp();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [placing, setPlacing] = useState(false);

  const sym = currency?.symbol || 'GH₵';
  const subtotal = cart.reduce((s, i) => s + i.selling_price * i.qty, 0);
  const tax = 0; // tax handled at ERP level
  const discount = 0;
  const promo = 0;
  const grandTotal = subtotal + DELIVERY_FEE + tax - discount - promo;

  const handleConfirmOrder = async () => {
    if (cart.length === 0) return;
    setPlacing(true);
    try {
      const res = await apiCall('/orders', 'POST', {
        items: cart.map((c) => ({ item_id: c.id, qty: c.qty })),
        shop_id: selectedShop?.id,
        payment_method: paymentMethod,
        delivery_fee: DELIVERY_FEE,
      });

      if (res?.success) {
        if ((paymentMethod === 'MOMO' || paymentMethod === 'CARD') && res.payment_link) {
          // Open Flutterwave payment page
          await Linking.openURL(res.payment_link);
          Alert.alert(
            'Payment Initiated',
            `Order #${res.order_no} placed. Complete payment in your browser.`,
            [{ text: 'OK', onPress: () => { clearCart(); setCurrentTab('history'); } }]
          );
        } else {
          // Cash order
          Alert.alert(
            '✅ Order Confirmed!',
            `Order #${res.order_no}\nTotal: ${sym}${Number(res.total_amount).toFixed(2)}\n\nPayment will be collected on delivery.`,
            [{ text: 'OK', onPress: () => { clearCart(); setCurrentTab('history'); } }]
          );
        }
      }
    } catch (err) {
      console.error('[Checkout] Error placing order:', err);
    } finally {
      setPlacing(false);
    }
  };

  const PaymentOption = ({
    id,
    icon,
    title,
    subtitle,
    color,
  }: {
    id: PaymentMethod;
    icon: string;
    title: string;
    subtitle: string;
    color: string;
  }) => {
    const selected = paymentMethod === id;
    return (
      <Pressable
        onPress={() => setPaymentMethod(id)}
        style={[styles.paymentOption, selected && { borderColor: color, borderWidth: 2, backgroundColor: color + '10' }]}
      >
        <View style={[styles.paymentIconWrap, { backgroundColor: color + '20' }]}>
          <ThemedText style={styles.paymentIcon}>{icon}</ThemedText>
        </View>
        <View style={styles.paymentInfo}>
          <ThemedText style={[styles.paymentTitle, selected && { color }]}>{title}</ThemedText>
          <ThemedText style={styles.paymentSubtitle}>{subtitle}</ThemedText>
        </View>
        <View style={[styles.radioOuter, selected && { borderColor: color }]}>
          {selected && <View style={[styles.radioInner, { backgroundColor: color }]} />}
        </View>
      </Pressable>
    );
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => setCurrentTab('cart')} style={styles.backBtn}>
          <ThemedText style={styles.backIcon}>←</ThemedText>
        </Pressable>
        <ThemedText style={styles.headerTitle}>Checkout</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Items Summary */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>📦 Order Items</ThemedText>
          {cart.map((item) => (
            <View key={item.id} style={styles.orderItem}>
              <Image
                source={{ uri: item.image_url || 'https://picsum.photos/seed/chyta/200' }}
                style={styles.itemImage}
                resizeMode="cover"
              />
              <View style={styles.itemInfo}>
                <ThemedText style={styles.itemName} numberOfLines={1}>{item.item_name}</ThemedText>
                <ThemedText style={styles.itemQty}>Qty: {item.qty} × {sym}{item.selling_price.toFixed(2)}</ThemedText>
              </View>
              <ThemedText style={styles.itemTotal}>
                {sym}{(item.selling_price * item.qty).toFixed(2)}
              </ThemedText>
            </View>
          ))}
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>🧾 Order Summary</ThemedText>
          <View style={styles.summaryCard}>
            <SummaryRow label="Subtotal" value={`${sym}${subtotal.toFixed(2)}`} />
            <SummaryRow label="Delivery Fee" value={`${sym}${DELIVERY_FEE.toFixed(2)}`} />
            {tax > 0 && <SummaryRow label="Tax (15%)" value={`${sym}${tax.toFixed(2)}`} />}
            {discount > 0 && <SummaryRow label="Discount" value={`- ${sym}${discount.toFixed(2)}`} valueColor="#2D5A27" />}
            {promo > 0 && <SummaryRow label="Promo Code" value={`- ${sym}${promo.toFixed(2)}`} valueColor="#2D5A27" />}
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <ThemedText style={styles.grandTotalLabel}>Grand Total</ThemedText>
              <ThemedText style={styles.grandTotalValue}>{sym}{grandTotal.toFixed(2)}</ThemedText>
            </View>
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>💳 Payment Method</ThemedText>

          <PaymentOption
            id="CASH"
            icon="💵"
            title="Cash on Delivery"
            subtitle="Pay when your order arrives"
            color="#2D5A27"
          />
          <PaymentOption
            id="MOMO"
            icon="📱"
            title="Mobile Money"
            subtitle="Pay via MTN, Vodafone, AirtelTigo"
            color="#FFBB00"
          />
          <PaymentOption
            id="CARD"
            icon="💳"
            title="Debit / Credit Card"
            subtitle="Visa, Mastercard secured payment"
            color="#0052CC"
          />
        </View>

        {/* Delivery Info */}
        <View style={[styles.section, styles.deliveryNote]}>
          <ThemedText style={styles.deliveryNoteText}>
            🚚 Estimated delivery: 30–60 minutes · Delivering to {selectedShop?.name || 'your location'}
          </ThemedText>
        </View>

      </ScrollView>

      {/* Checkout Button */}
      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <ThemedText style={styles.footerLabel}>Total</ThemedText>
          <ThemedText style={styles.footerTotal}>{sym}{grandTotal.toFixed(2)}</ThemedText>
        </View>
        <Pressable
          style={[styles.checkoutBtn, placing && styles.checkoutBtnDisabled]}
          onPress={handleConfirmOrder}
          disabled={placing}
        >
          {placing ? (
            <ActivityIndicator color="#FFFC00" />
          ) : (
            <ThemedText style={styles.checkoutBtnText}>
              {paymentMethod === 'CASH' ? '✅ Confirm Order' : '🔒 Pay Now'}
            </ThemedText>
          )}
        </Pressable>
      </View>
    </ThemedView>
  );
};

const SummaryRow = ({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) => (
  <View style={styles.summaryRow}>
    <ThemedText style={styles.summaryLabel}>{label}</ThemedText>
    <ThemedText style={[styles.summaryValue, valueColor ? { color: valueColor } : {}]}>{value}</ThemedText>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F7FB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F3',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 20,
    color: '#2D5A27',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D5A27',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
    gap: 16,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2D5A27',
    marginBottom: 4,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F0F0F3',
    gap: 10,
  },
  itemImage: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#F0F0F3',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
  },
  itemQty: {
    fontSize: 12,
    color: '#60646C',
    marginTop: 2,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2D5A27',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0F0F3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#60646C',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D5A27',
  },
  grandTotalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D5A27',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F3',
    marginVertical: 10,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E8E8ED',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  paymentIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentIcon: {
    fontSize: 22,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222',
  },
  paymentSubtitle: {
    fontSize: 12,
    color: '#60646C',
    marginTop: 2,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#C8C8CE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 11,
    height: 11,
    borderRadius: 6,
  },
  deliveryNote: {
    backgroundColor: '#2D5A2710',
    borderRadius: 12,
    padding: 12,
  },
  deliveryNoteText: {
    fontSize: 13,
    color: '#2D5A27',
    lineHeight: 18,
  },
  footer: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 6,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  footerLabel: {
    fontSize: 14,
    color: '#60646C',
  },
  footerTotal: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2D5A27',
  },
  checkoutBtn: {
    width: '100%',
    height: 54,
    backgroundColor: '#2D5A27',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2D5A27',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  checkoutBtnDisabled: {
    backgroundColor: '#8da689',
  },
  checkoutBtnText: {
    color: '#FFFC00',
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
});
