/**
 * OmniSuite Mobile Main Application Entry & Routing
 * Connected to MySQL backend API server with role-based navigation and offline PWA capability.
 */

import React from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  SafeAreaView,
  Platform,
  StatusBar,
  Text,
} from 'react-native';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { Colors } from '../constants/theme';
import { LoginScreen } from '../components/LoginScreen';
import { BranchSelectionScreen } from '../components/BranchSelectionScreen';
import { DashboardScreen } from '../components/DashboardScreen';
import { ModulesScreen } from '../components/ModulesScreen';
import { PosScreen } from '../components/PosScreen';
import { NotificationsScreen } from '../components/NotificationsScreen';
import { ProfileScreen } from '../components/ProfileScreen';
import { AnimatedSplashOverlay } from '../components/animated-icon';

function MainAppShell() {
  const { currentScreen, currentTab, setCurrentTab, themeMode, finishSplash, isOffline } = useAuth() as any;
  const modeKey: 'light' | 'dark' = themeMode === 'light' ? 'light' : 'dark';
  const colors = Colors[modeKey];

  if (currentScreen === 'splash') {
    return <AnimatedSplashOverlay onComplete={finishSplash} />;
  }

  if (currentScreen === 'login') {
    return <LoginScreen />;
  }

  if (currentScreen === 'branch-select') {
    return <BranchSelectionScreen />;
  }

  const renderActiveTab = () => {
    switch (currentTab) {
      case 'home':
        return <DashboardScreen />;
      case 'modules':
        return <ModulesScreen />;
      case 'pos':
        return <PosScreen />;
      case 'notifications':
        return <NotificationsScreen />;
      case 'profile':
        return <ProfileScreen />;
      default:
        return <DashboardScreen />;
    }
  };

  return (
    <SafeAreaView style={[styles.appContainer, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.brandNavy}
      />

      {/* Offline PWA Banner Indicator */}
      {isOffline ? (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>⚡ Offline Mode — Working with Cached Data & Local Sync</Text>
        </View>
      ) : null}

      {/* Active Tab Screen Content */}
      <View style={styles.mainContent}>{renderActiveTab()}</View>

      {/* Custom Bottom Tab Bar */}
      <View style={[styles.tabBar, { backgroundColor: colors.brandNavy }]}>
        {/* Tab 1: Dashboard Home */}
        <Pressable style={styles.tabItem} onPress={() => setCurrentTab('home')}>
          <Text style={[styles.tabIcon, currentTab === 'home' && styles.tabIconActive]}>📊</Text>
          <Text style={[styles.tabLabel, currentTab === 'home' && styles.tabLabelActive]}>Dashboard</Text>
        </Pressable>

        {/* Tab 2: Modules Directory */}
        <Pressable style={styles.tabItem} onPress={() => setCurrentTab('modules')}>
          <Text style={[styles.tabIcon, currentTab === 'modules' && styles.tabIconActive]}>🗂️</Text>
          <Text style={[styles.tabLabel, currentTab === 'modules' && styles.tabLabelActive]}>Modules</Text>
        </Pressable>

        {/* Tab 3: Touch POS */}
        <Pressable style={styles.tabItem} onPress={() => setCurrentTab('pos')}>
          <View style={styles.posIconBadgeCircle}>
            <Text style={[styles.tabIcon, currentTab === 'pos' && styles.tabIconActive]}>🛒</Text>
          </View>
          <Text style={[styles.tabLabel, currentTab === 'pos' && styles.tabLabelActive]}>POS</Text>
        </Pressable>

        {/* Tab 4: Notifications & Approvals */}
        <Pressable style={styles.tabItem} onPress={() => setCurrentTab('notifications')}>
          <Text style={[styles.tabIcon, currentTab === 'notifications' && styles.tabIconActive]}>🔔</Text>
          <Text style={[styles.tabLabel, currentTab === 'notifications' && styles.tabLabelActive]}>Alerts</Text>
        </Pressable>

        {/* Tab 5: User Profile & Branch */}
        <Pressable style={styles.tabItem} onPress={() => setCurrentTab('profile')}>
          <Text style={[styles.tabIcon, currentTab === 'profile' && styles.tabIconActive]}>👤</Text>
          <Text style={[styles.tabLabel, currentTab === 'profile' && styles.tabLabelActive]}>Profile</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

export default function Index() {
  return (
    <AuthProvider>
      <MainAppShell />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    ...Platform.select({
      android: {
        paddingTop: StatusBar.currentHeight,
      },
    }),
  },
  offlineBanner: {
    backgroundColor: '#F57C00',
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  offlineBannerText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  mainContent: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    height: 64,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
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
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 2,
  },
  tabLabelActive: {
    color: '#F9B514',
    fontWeight: '700',
  },
  posIconBadgeCircle: {
    position: 'relative',
  },
});
