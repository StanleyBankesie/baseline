import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = 'omnisuite_customer_theme';

export const Themes = {
  light: {
    mode: 'light',
    bg: {
      primary: '#F8FAFC',
      card: '#FFFFFF',
      cardSecondary: '#F1F5F9',
      input: '#F8FAFC',
      border: '#E2E8F0',
      header: '#FFFFFF',
      text: '#0F172A',
      textMuted: '#64748B',
      textInverse: '#FFFFFF',
      tabBar: '#FFFFFF',
      tabBarBorder: '#E2E8F0',
    },
    brand: {
      DEFAULT: '#0E3646',
      light: '#173d50',
      dark: '#061a22',
      badge: '#e1eff5',
      badgeText: '#0E3646',
    },
    secondary: {
      DEFAULT: '#D97706',
      light: '#F59E0B',
      badge: '#FEF3C7',
      badgeText: '#92400E',
    },
    status: {
      success: '#16A34A',
      successBg: '#DCFCE7',
      warning: '#D97706',
      warningBg: '#FEF3C7',
      error: '#DC2626',
      errorBg: '#FEE2E2',
      info: '#0E3646',
      infoBg: '#E0F2FE',
    },
  },
  dark: {
    mode: 'dark',
    bg: {
      primary: '#061A22',
      card: '#0E2A38',
      cardSecondary: '#133E53',
      input: '#08212D',
      border: '#1C4A60',
      header: '#0E3646',
      text: '#F8FAFC',
      textMuted: '#94A3B8',
      textInverse: '#061A22',
      tabBar: '#061A22',
      tabBarBorder: '#1C4A60',
    },
    brand: {
      DEFAULT: '#0E3646',
      light: '#173d50',
      dark: '#061a22',
      badge: '#0E3646',
      badgeText: '#94C3DB',
    },
    secondary: {
      DEFAULT: '#F9B514',
      light: '#FBCD49',
      badge: 'rgba(249, 181, 20, 0.15)',
      badgeText: '#F9B514',
    },
    status: {
      success: '#2E8B1F',
      successBg: 'rgba(46, 139, 31, 0.15)',
      warning: '#F57C00',
      warningBg: 'rgba(245, 124, 0, 0.15)',
      error: '#EF4444',
      errorBg: 'rgba(239, 68, 68, 0.15)',
      info: '#0E3646',
      infoBg: 'rgba(14, 54, 70, 0.3)',
    },
  },
};

const ThemeContext = createContext({
  theme: Themes.light,
  mode: 'light',
  toggleTheme: () => {},
  setMode: () => {},
});

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState('light');

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((saved) => {
      if (saved === 'dark' || saved === 'light') {
        setModeState(saved);
      }
    }).catch(() => {});
  }, []);

  const setMode = async (newMode) => {
    setModeState(newMode);
    try {
      await AsyncStorage.setItem(THEME_KEY, newMode);
    } catch {}
  };

  const toggleTheme = () => {
    const next = mode === 'dark' ? 'light' : 'dark';
    setMode(next);
  };

  const currentTheme = Themes[mode] || Themes.light;

  return (
    <ThemeContext.Provider value={{ theme: currentTheme, mode, toggleTheme, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
