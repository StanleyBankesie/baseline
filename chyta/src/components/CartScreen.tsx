import React from 'react';
import { StyleSheet, Pressable, View, FlatList, Image } from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { useApp } from '@/context/AppContext';

export const CartScreen: React.FC = () => {
  const { cart, currency, updateCartQty, removeFromCart, setCurrentTab } = useApp();

  const subtotal = cart.reduce((sum, item) => sum + item.selling_price * item.qty, 0);
  const DELIVERY_FEE = 20;
  const total = subtotal + DELIVERY_FEE;

  if (cart.length === 0) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <View style={styles.emptyIconContainer}>
          <ThemedText style={styles.emptyIcon}>🛒</ThemedText>
        </View>
        <ThemedText style={styles.emptyTitle}>Your Cart is Empty</ThemedText>
        <ThemedText style={styles.emptySubtitle}>Explore our catalog and add items you'd like to purchase.</ThemedText>
        <Pressable style={styles.shopBtn} onPress={() => setCurrentTab('home')}>
          <ThemedText style={styles.shopBtnText}>Browse Products</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>My Cart</ThemedText>
      <ThemedText style={styles.subtitle}>{cart.length} item(s)</ThemedText>

      <FlatList
        data={cart}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.cartCard}>
            <Image
              source={{ uri: item.image_url || 'https://picsum.photos/seed/chyta/200' }}
              style={styles.cardImage}
              resizeMode="cover"
            />
            <View style={styles.cardInfo}>
              <ThemedText style={styles.cardName} numberOfLines={1}>{item.item_name}</ThemedText>
              <ThemedText style={styles.cardCode}>{item.item_code}</ThemedText>
              <ThemedText style={styles.cardPrice}>{currency?.symbol || 'GH₵'}{item.selling_price.toFixed(2)}</ThemedText>

              <View style={styles.qtyContainer}>
                <Pressable 
                  style={styles.qtyBtn} 
                  onPress={() => updateCartQty(item.id, item.qty - 1)}
                >
                  <ThemedText style={styles.qtyBtnText}>-</ThemedText>
                </Pressable>
                <ThemedText style={styles.qtyText}>{item.qty}</ThemedText>
                <Pressable 
                  style={styles.qtyBtn} 
                  onPress={() => updateCartQty(item.id, item.qty + 1)}
                >
                  <ThemedText style={styles.qtyBtnText}>+</ThemedText>
                </Pressable>
              </View>
            </View>
            <Pressable style={styles.removeBtn} onPress={() => removeFromCart(item.id)}>
              <ThemedText style={styles.removeText}>🗑️</ThemedText>
            </Pressable>
          </View>
        )}
        ListFooterComponent={
          <View style={styles.checkoutSection}>
            <View style={styles.divider} />

            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>Subtotal</ThemedText>
                <ThemedText style={styles.summaryValue}>{currency?.symbol || 'GH₵'}{subtotal.toFixed(2)}</ThemedText>
              </View>
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>Delivery Fee</ThemedText>
                <ThemedText style={styles.summaryValue}>{currency?.symbol || 'GH₵'}{DELIVERY_FEE.toFixed(2)}</ThemedText>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <ThemedText style={styles.totalLabel}>Estimated Total</ThemedText>
                <ThemedText style={styles.totalValue}>{currency?.symbol || 'GH₵'}{total.toFixed(2)}</ThemedText>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.checkoutBtn,
                pressed && styles.checkoutBtnPressed,
              ]}
              onPress={() => setCurrentTab('checkout')}
            >
              <ThemedText style={styles.checkoutBtnText}>Proceed to Checkout →</ThemedText>
            </Pressable>
          </View>
        }
      />
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
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  shopBtn: {
    backgroundColor: '#2D5A27',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginTop: 24,
    shadowColor: '#2D5A27',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  shopBtnText: {
    color: '#FFFC00',
    fontSize: 16,
    fontWeight: 'bold',
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
    paddingBottom: 40,
    gap: 12,
  },
  cartCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F0F0F3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  cardImage: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: '#F0F0F3',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 14,
  },
  cardName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  cardCode: {
    fontSize: 12,
    color: '#60646C',
    marginTop: 2,
  },
  cardPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2D5A27',
    marginTop: 2,
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F0F0F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  qtyText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    minWidth: 16,
    textAlign: 'center',
  },
  removeBtn: {
    padding: 8,
    justifyContent: 'center',
  },
  removeText: {
    fontSize: 18,
  },
  checkoutSection: {
    marginTop: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F3',
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  remarksInput: {
    width: '100%',
    minHeight: 80,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E1E6',
    padding: 12,
    fontSize: 14,
    color: '#000',
    textAlignVertical: 'top',
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#F0F0F3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
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
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D5A27',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D5A27',
  },
  checkoutBtn: {
    width: '100%',
    height: 52,
    backgroundColor: '#2D5A27',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: '#2D5A27',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  checkoutBtnPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.99 }],
  },
  checkoutBtnDisabled: {
    backgroundColor: '#8da689',
  },
  checkoutBtnText: {
    color: '#FFFC00',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
