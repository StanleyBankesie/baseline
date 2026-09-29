import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

import DashboardScreen from '../screens/DashboardScreen';
import SalesOrdersScreen from '../screens/SalesOrdersScreen';
import InvoicesScreen from '../screens/InvoicesScreen';
import DeliveriesScreen from '../screens/DeliveriesScreen';
import AccountGLScreen from '../screens/AccountGLScreen';
import ProfileMenuScreen from '../screens/ProfileMenuScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabNavigator() {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: {
          backgroundColor: theme.bg.header,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: theme.bg.border,
        },
        headerTitleStyle: {
          color: theme.bg.text,
          fontSize: 16,
          fontWeight: '800',
        },
        tabBarStyle: {
          backgroundColor: theme.bg.tabBar,
          borderTopColor: theme.bg.tabBarBorder,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: theme.brand.DEFAULT,
        tabBarInactiveTintColor: theme.bg.textMuted,
        tabBarIcon: ({ color, size, focused }) => {
          let iconName;
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Orders') iconName = focused ? 'cart' : 'cart-outline';
          else if (route.name === 'Invoices') iconName = focused ? 'document-text' : 'document-text-outline';
          else if (route.name === 'Deliveries') iconName = focused ? 'car' : 'car-outline';
          else if (route.name === 'Account') iconName = focused ? 'wallet' : 'wallet-outline';
          else if (route.name === 'Menu') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} options={{ title: 'Client Portal' }} />
      <Tab.Screen name="Orders" component={SalesOrdersScreen} options={{ title: 'Sales Orders' }} />
      <Tab.Screen name="Invoices" component={InvoicesScreen} options={{ title: 'Sales History' }} />
      <Tab.Screen name="Deliveries" component={DeliveriesScreen} options={{ title: 'Delivery Notes' }} />
      <Tab.Screen name="Account" component={AccountGLScreen} options={{ title: 'GL Statement' }} />
      <Tab.Screen name="Menu" component={ProfileMenuScreen} options={{ title: 'Account Menu' }} />
    </Tab.Navigator>
  );
}

export default function CustomerAppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={TabNavigator} />
    </Stack.Navigator>
  );
}
