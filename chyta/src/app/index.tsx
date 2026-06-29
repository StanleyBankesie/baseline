import React from 'react';
import { StyleSheet, View, Pressable, SafeAreaView, Platform, StatusBar } from 'react-native';
import { AppProvider, useApp } from '@/context/AppContext';
import { LoginScreen } from '@/components/LoginScreen';
import { RegisterScreen } from '@/components/RegisterScreen';
import { ShopSelectionScreen } from '@/components/ShopSelectionScreen';
import { StoreHomeScreen } from '@/components/StoreHomeScreen';
import { CartScreen } from '@/components/CartScreen';
import { HistoryScreen } from '@/components/HistoryScreen';
import { ProfileScreen } from '@/components/ProfileScreen';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

function AppContent() {
  const { currentScreen, currentTab, setCurrentTab, cart, finishSplash } = useApp();

  // Render sub-screen based on global router state
  const renderStoreTab = () => {
    switch (currentTab) {
      case 'home':
        return <StoreHomeScreen />;
      case 'cart':
        return <CartScreen />;
      case 'history':
        return <HistoryScreen />;
      case 'profile':
        return <ProfileScreen />;
      default:
        return <StoreHomeScreen />;
    }
  };

  const getCartCount = () => {
    return cart.reduce((sum, item) => sum + item.qty, 0);
  };

  if (currentScreen === 'splash') {
    return <AnimatedSplashOverlay onComplete={finishSplash} />;
  }

  if (currentScreen === 'login') {
    return <LoginScreen />;
  }

  if (currentScreen === 'register') {
    return <RegisterScreen />;
  }

  if (currentScreen === 'shop-selection') {
    return <ShopSelectionScreen />;
  }

  const cartCount = getCartCount();

  return (
    <SafeAreaView style={styles.storeContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#2D5A27" />
      
      {/* Active Tab Screen */}
      <View style={styles.mainContent}>
        {renderStoreTab()}
      </View>

      {/* Premium Custom Bottom Navigation Bar */}
      <View style={styles.tabBar}>
        <Pressable
          style={styles.tabItem}
          onPress={() => setCurrentTab('home')}
        >
          <ThemedText style={[styles.tabIcon, currentTab === 'home' && styles.tabIconActive]}>
            🛍️
          </ThemedText>
          <ThemedText style={[styles.tabLabel, currentTab === 'home' && styles.tabLabelActive]}>
            Shop
          </ThemedText>
        </Pressable>

        <Pressable
          style={styles.tabItem}
          onPress={() => setCurrentTab('cart')}
        >
          <View style={styles.cartIconWrapper}>
            <ThemedText style={[styles.tabIcon, currentTab === 'cart' && styles.tabIconActive]}>
              🛒
            </ThemedText>
            {cartCount > 0 ? (
              <View style={styles.cartBadge}>
                <ThemedText style={styles.cartBadgeText}>{cartCount}</ThemedText>
              </View>
            ) : null}
          </View>
          <ThemedText style={[styles.tabLabel, currentTab === 'cart' && styles.tabLabelActive]}>
            Cart
          </ThemedText>
        </Pressable>

        <Pressable
          style={styles.tabItem}
          onPress={() => setCurrentTab('history')}
        >
          <ThemedText style={[styles.tabIcon, currentTab === 'history' && styles.tabIconActive]}>
            📋
          </ThemedText>
          <ThemedText style={[styles.tabLabel, currentTab === 'history' && styles.tabLabelActive]}>
            Orders
          </ThemedText>
        </Pressable>

        <Pressable
          style={styles.tabItem}
          onPress={() => setCurrentTab('profile')}
        >
          <ThemedText style={[styles.tabIcon, currentTab === 'profile' && styles.tabIconActive]}>
            👤
          </ThemedText>
          <ThemedText style={[styles.tabLabel, currentTab === 'profile' && styles.tabLabelActive]}>
            Profile
          </ThemedText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

export default function Index() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  storeContainer: {
    flex: 1,
    backgroundColor: '#F0F0F3',
    ...Platform.select({
      android: {
        paddingTop: StatusBar.currentHeight,
      },
    }),
  },
  mainContent: {
    flex: 1,
    backgroundColor: '#F0F0F3',
  },
  tabBar: {
    flexDirection: 'row',
    height: 64,
    backgroundColor: '#2D5A27',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 12 : 0,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
  },
  tabIcon: {
    fontSize: 20,
    opacity: 0.7,
  },
  tabIconActive: {
    transform: [{ scale: 1.15 }],
    opacity: 1,
  },
  tabLabel: {
    fontSize: 11,
    color: '#8da689',
    fontWeight: '600',
    marginTop: 2,
  },
  tabLabelActive: {
    color: '#FFFC00',
    fontWeight: '700',
  },
  cartIconWrapper: {
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -8,
    right: -12,
    backgroundColor: '#FFFC00',
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2D5A27',
  },
  cartBadgeText: {
    color: '#2D5A27',
    fontSize: 9,
    fontWeight: 'bold',
  },
});
