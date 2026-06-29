import React from 'react';
import { StyleSheet, Pressable, View } from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { useApp } from '@/context/AppContext';

export const ProfileScreen: React.FC = () => {
  const { customer, selectedShop, logoutUser, navigateTo } = useApp();

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>Account Profile</ThemedText>
      <ThemedText style={styles.subtitle}>Manage your customer settings and links</ThemedText>

      {/* Info Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <ThemedText style={styles.avatarText}>
            {customer?.customer_name?.charAt(0).toUpperCase() || 'C'}
          </ThemedText>
        </View>
        <ThemedText style={styles.name}>{customer?.customer_name}</ThemedText>
        <ThemedText style={styles.email}>{customer?.email}</ThemedText>
      </View>

      {/* Connection Info */}
      <View style={styles.card}>
        <ThemedText style={styles.cardTitle}>Linked Shop Location</ThemedText>
        <View style={styles.shopDetail}>
          <View style={styles.shopBadge}>
            <ThemedText style={styles.shopBadgeText}>
              {selectedShop?.code?.substring(0, 3) || 'SHP'}
            </ThemedText>
          </View>
          <View style={styles.shopInfo}>
            <ThemedText style={styles.shopName}>{selectedShop?.name || 'No Shop Linked'}</ThemedText>
            <ThemedText style={styles.shopCode}>Code: {selectedShop?.code || 'N/A'}</ThemedText>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.switchBtn,
            pressed && styles.switchBtnPressed
          ]}
          onPress={() => navigateTo('shop-selection')}
        >
          <ThemedText style={styles.switchBtnText}>Change Shop Location</ThemedText>
        </Pressable>
      </View>

      {/* Actions */}
      <View style={styles.actionContainer}>
        <Pressable
          style={({ pressed }) => [
            styles.logoutBtn,
            pressed && styles.logoutBtnPressed
          ]}
          onPress={logoutUser}
        >
          <ThemedText style={styles.logoutBtnText}>Sign Out of Chyta</ThemedText>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <ThemedText style={styles.footerText}>Chyta E-Commerce v1.0.0</ThemedText>
        <ThemedText style={styles.footerSub}>Connected to ERP API Backend</ThemedText>
      </View>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
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
    marginBottom: 24,
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#F0F0F3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2D5A27',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2.5,
    borderColor: '#FFFC00',
  },
  avatarText: {
    color: '#FFFC00',
    fontSize: 32,
    fontWeight: 'bold',
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  email: {
    fontSize: 14,
    color: '#60646C',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F0F0F3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginBottom: 14,
  },
  shopDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shopBadge: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#2D5A27',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopBadgeText: {
    color: '#FFFC00',
    fontSize: 12,
    fontWeight: 'bold',
  },
  shopInfo: {
    flex: 1,
    marginLeft: 14,
  },
  shopName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  shopCode: {
    fontSize: 12,
    color: '#60646C',
    marginTop: 2,
  },
  switchBtn: {
    width: '100%',
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#2D5A27',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  switchBtnPressed: {
    backgroundColor: '#f4fbf4',
  },
  switchBtnText: {
    color: '#2D5A27',
    fontSize: 14,
    fontWeight: 'bold',
  },
  actionContainer: {
    gap: 12,
  },
  logoutBtn: {
    width: '100%',
    height: 48,
    backgroundColor: '#fff5f5',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5c5c5',
  },
  logoutBtnPressed: {
    backgroundColor: '#ffebeb',
  },
  logoutBtnText: {
    color: '#d9534f',
    fontSize: 14,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
  },
  footerSub: {
    fontSize: 10,
    color: '#BBB',
    marginTop: 2,
  },
});
