import React, { useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { CustomerAuthProvider, useCustomerAuth } from './src/context/CustomerAuthContext';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';

import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import CustomerAppNavigator from './src/navigation/CustomerAppNavigator';
import FirstLoginChangePasswordScreen from './src/screens/FirstLoginChangePasswordScreen';

const RootStack = createNativeStackNavigator();

function RootNavigator() {
  const { token, requiresPasswordChange, isLoading } = useCustomerAuth();
  const { theme, mode } = useTheme();
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg.primary }]}>
        <ActivityIndicator size="large" color={theme.secondary.DEFAULT} />
      </View>
    );
  }

  const navigationTheme = {
    ...(mode === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(mode === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: theme.bg.primary,
      card: theme.bg.header,
      text: theme.bg.text,
      border: theme.bg.border,
      primary: theme.brand.DEFAULT,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!token ? (
          <RootStack.Screen name="Login" component={LoginScreen} />
        ) : requiresPasswordChange ? (
          <RootStack.Screen name="FirstLoginChangePassword" component={FirstLoginChangePasswordScreen} />
        ) : (
          <RootStack.Screen name="App" component={CustomerAppNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <CustomerAuthProvider>
        <RootNavigator />
      </CustomerAuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
