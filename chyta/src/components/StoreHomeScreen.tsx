import React, { useEffect, useState } from 'react';
import { StyleSheet, TextInput, Pressable, ActivityIndicator, View, FlatList, Image, Dimensions } from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { useApp } from '@/context/AppContext';
import Constants from 'expo-constants';

const { width } = Dimensions.get('window');

export const StoreHomeScreen: React.FC = () => {
  const { selectedShop, currency, cart, addToCart, apiCall } = useApp();
  const [items, setItems] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchItems = async () => {
    try {
      const data = await apiCall(`/items?shop_id=${selectedShop?.id}`);
      if (data?.items) {
        setItems(data.items);
        setFilteredItems(data.items);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [selectedShop]);

  useEffect(() => {
    const term = search.toLowerCase().trim();
    if (!term) {
      setFilteredItems(items);
    } else {
      setFilteredItems(
        items.filter(
          (i) =>
            i.item_name?.toLowerCase().includes(term) ||
            i.item_code?.toLowerCase().includes(term)
        )
      );
    }
  }, [search, items]);

  const resolveImageUrl = (imgUrl: string | null) => {
    if (!imgUrl) return 'https://picsum.photos/seed/chyta/200';
    if (imgUrl.startsWith('http')) return imgUrl;
    
    // Resolve relative path using ERP backend
    const debuggerHost = Constants.expoConfig?.hostUri;
    const ip = debuggerHost ? debuggerHost.split(':')[0] : 'localhost';
    // Clean up double slashes or leading slash
    const cleanedPath = imgUrl.startsWith('/') ? imgUrl.substring(1) : imgUrl;
    return `http://${ip}:4002/${cleanedPath}`;
  };

  const getItemCartQty = (itemId: number) => {
    const cItem = cart.find((c) => c.id === itemId);
    return cItem ? cItem.qty : 0;
  };

  const handleAddToCart = (item: any) => {
    addToCart(item);
    setToastMessage(`Added "${item.item_name}" to cart`);
    setTimeout(() => {
      setToastMessage(null);
    }, 2000);
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header bar */}
      <View style={styles.topBar}>
        <View style={styles.shopIndicator}>
          <ThemedText style={styles.shopLabel}>DELIVERING FROM</ThemedText>
          <ThemedText style={styles.shopName} numberOfLines={1}>{selectedShop?.name}</ThemedText>
        </View>
        <Pressable style={styles.refreshBtn} onPress={fetchItems}>
          <ThemedText style={styles.refreshText}>↻</ThemedText>
        </Pressable>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search items by name or code..."
          placeholderTextColor="#999"
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <Pressable style={styles.clearSearch} onPress={() => setSearch('')}>
            <ThemedText style={styles.clearText}>×</ThemedText>
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2D5A27" />
          <ThemedText style={styles.loadingText}>Loading products...</ThemedText>
        </View>
      ) : filteredItems.length === 0 ? (
        <View style={styles.center}>
          <ThemedText style={styles.emptyText}>No items found matching "{search}"</ThemedText>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id.toString()}
          numColumns={width > 600 ? 3 : 2}
          key={width > 600 ? '3-col' : '2-col'}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={() => (
            <View style={styles.categoriesContainer}>
              <ThemedText style={styles.sectionTitle}>Categories</ThemedText>
              <View style={styles.categoryRow}>
                <View style={styles.categoryBadge}><ThemedText style={styles.categoryText}>🍔 Food</ThemedText></View>
                <View style={styles.categoryBadge}><ThemedText style={styles.categoryText}>🛒 Groceries</ThemedText></View>
                <View style={styles.categoryBadge}><ThemedText style={styles.categoryText}>💊 Pharmacy</ThemedText></View>
                <View style={styles.categoryBadge}><ThemedText style={styles.categoryText}>🔌 Electronics</ThemedText></View>
              </View>
              <ThemedText style={styles.sectionTitle}>All Products</ThemedText>
            </View>
          )}
          renderItem={({ item }) => {
            const cartQty = getItemCartQty(item.id);
            const inStock = item.stock_qty > 0;
            return (
              <View style={styles.itemCard}>
                <View style={styles.imageContainer}>
                  <Image
                    source={{ uri: resolveImageUrl(item.image_url) }}
                    style={styles.itemImage}
                    resizeMode="cover"
                  />
                  {cartQty > 0 ? (
                    <View style={styles.badge}>
                      <ThemedText style={styles.badgeText}>{cartQty}</ThemedText>
                    </View>
                  ) : null}
                  {!inStock ? (
                    <View style={styles.outOfStockBadge}>
                      <ThemedText style={styles.outOfStockText}>OUT OF STOCK</ThemedText>
                    </View>
                  ) : null}
                </View>
                <View style={styles.infoContainer}>
                  <ThemedText style={styles.itemCategory}>{item.item_code}</ThemedText>
                  <ThemedText style={styles.itemName} numberOfLines={2}>
                    {item.item_name}
                  </ThemedText>
                  <View style={styles.priceRow}>
                    <ThemedText style={styles.itemPrice}>
                      {currency?.symbol || 'GH₵'}{Number(item.selling_price || 0).toFixed(2)}
                    </ThemedText>
                    <ThemedText style={styles.itemUOM}>/{item.uom || 'PCS'}</ThemedText>
                  </View>
                  
                  {/* Stock level info */}
                  <ThemedText style={[styles.stockInfo, inStock ? styles.inStock : styles.outOfStock]}>
                    {inStock ? `Available: ${item.stock_qty} ${item.uom || 'PCS'}` : 'Out of stock'}
                  </ThemedText>

                  <Pressable
                    style={({ pressed }) => [
                      styles.addBtn,
                      pressed && styles.addBtnPressed,
                      !inStock && styles.addBtnDisabled
                    ]}
                    onPress={() => inStock && handleAddToCart(item)}
                    disabled={!inStock}
                  >
                    <ThemedText style={styles.addBtnText}>
                      {inStock ? 'Add to Cart' : 'Unavailable'}
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Modern floating inline toast message */}
      {toastMessage ? (
        <View style={styles.toastContainer}>
          <View style={styles.toastContent}>
            <View style={styles.toastCheckmark} />
            <ThemedText style={styles.toastText}>{toastMessage}</ThemedText>
          </View>
        </View>
      ) : null}
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#ffffff',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    marginTop: 8,
  },
  shopIndicator: {
    flex: 1,
    marginRight: 16,
  },
  shopLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#8E8E93',
    letterSpacing: 1.2,
  },
  shopName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#2D5A27',
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshText: {
    fontSize: 20,
    color: '#2D5A27',
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 46,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E2E7',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#000',
  },
  clearSearch: {
    padding: 4,
  },
  clearText: {
    fontSize: 20,
    color: '#999',
    fontWeight: 'bold',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#60646C',
  },
  emptyText: {
    fontSize: 16,
    color: '#60646C',
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 100,
  },
  itemCard: {
    flex: 1,
    margin: 6,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F3',
  },
  imageContainer: {
    width: '100%',
    height: 120,
    backgroundColor: '#F0F0F3',
    position: 'relative',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFFC00',
    borderColor: '#2D5A27',
    borderWidth: 1.5,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#2D5A27',
    fontSize: 11,
    fontWeight: 'bold',
  },
  outOfStockBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outOfStockText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  infoContainer: {
    padding: 12,
  },
  itemCategory: {
    fontSize: 10,
    color: '#8E8E93',
    fontWeight: '600',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333333',
    height: 38,
    marginTop: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 6,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D5A27',
  },
  itemUOM: {
    fontSize: 11,
    color: '#8E8E93',
  },
  stockInfo: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  inStock: {
    color: '#28a745',
  },
  outOfStock: {
    color: '#dc3545',
  },
  addBtn: {
    backgroundColor: '#2D5A27',
    borderRadius: 8,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  addBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  addBtnDisabled: {
    backgroundColor: '#CCCCCC',
  },
  addBtnText: {
    color: '#FFFC00',
    fontSize: 13,
    fontWeight: 'bold',
  },
  toastContainer: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2D5A27',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  toastCheckmark: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFC00',
    marginRight: 10,
  },
  toastText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  categoriesContainer: {
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D5A27',
    marginBottom: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  categoryBadge: {
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E2E7',
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333333',
  },
});

