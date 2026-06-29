import React, { useEffect, useState } from 'react';
import { StyleSheet, Pressable, ActivityIndicator, View, ScrollView } from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { useApp, Shop } from '@/context/AppContext';

export const ShopSelectionScreen: React.FC = () => {
  const { customer, setShop, apiCall, logoutUser } = useApp();
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchShops = async () => {
      try {
        const data = await apiCall('/shops');
        if (data?.shops) {
          setShops(data.shops);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchShops();
  }, []);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <ThemedText style={styles.welcomeText}>Hello, {customer?.customer_name}</ThemedText>
          <Pressable style={styles.logoutBtn} onPress={logoutUser}>
            <ThemedText style={styles.logoutText}>Sign Out</ThemedText>
          </Pressable>
        </View>
        <ThemedText style={styles.title}>Select a Shop</ThemedText>
        <ThemedText style={styles.subtitle}>Choose a shop branch to start shopping. We'll remember your choice for next time.</ThemedText>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2D5A27" />
          <ThemedText style={styles.loadingText}>Fetching available shops...</ThemedText>
        </View>
      ) : shops.length === 0 ? (
        <View style={styles.center}>
          <ThemedText style={styles.emptyText}>No active shops found.</ThemedText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.grid}>
            {shops.map((shop) => (
              <Pressable
                key={shop.id}
                style={({ pressed }) => [
                  styles.shopCard,
                  pressed && styles.shopCardPressed
                ]}
                onPress={() => setShop(shop)}
              >
                <View style={styles.shopBadge}>
                  <ThemedText style={styles.shopBadgeText}>{shop.code?.substring(0, 3) || 'SHP'}</ThemedText>
                </View>
                <View style={styles.shopInfo}>
                  <ThemedText style={styles.shopName}>{shop.name}</ThemedText>
                  <ThemedText style={styles.shopCode}>Code: {shop.code}</ThemedText>
                </View>
                <View style={styles.shopAction}>
                  <ThemedText style={styles.arrow}>→</ThemedText>
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  header: {
    marginBottom: 28,
    marginTop: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#60646C',
  },
  logoutBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5c5c5',
    backgroundColor: '#fff5f5',
  },
  logoutText: {
    color: '#d9534f',
    fontSize: 13,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D5A27',
  },
  subtitle: {
    fontSize: 14,
    color: '#60646C',
    marginTop: 6,
    lineHeight: 20,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 64,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#60646C',
  },
  emptyText: {
    fontSize: 16,
    color: '#60646C',
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  grid: {
    gap: 16,
  },
  shopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F3',
  },
  shopCardPressed: {
    transform: [{ scale: 0.98 }],
    backgroundColor: '#F8F9FA',
    borderColor: '#2D5A27',
  },
  shopBadge: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#2D5A27',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopBadgeText: {
    color: '#FFFC00',
    fontSize: 14,
    fontWeight: 'bold',
  },
  shopInfo: {
    flex: 1,
    marginLeft: 16,
  },
  shopName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  shopCode: {
    fontSize: 13,
    color: '#60646C',
    marginTop: 2,
  },
  shopAction: {
    paddingLeft: 8,
  },
  arrow: {
    fontSize: 22,
    color: '#2D5A27',
    fontWeight: 'bold',
  },
});
