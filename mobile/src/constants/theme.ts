/**
 * Application Brand & Design System Theme
 * Aligned with OmniSuite web application brand identity & color palette
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0F172A',
    textSecondary: '#64748B',
    textMuted: '#94A3B8',
    background: '#F8FAFC',
    backgroundElement: '#FFFFFF',
    backgroundSurface: '#F1F5F9',
    backgroundSelected: '#E2E8F0',
    border: '#E2E8F0',
    
    // OmniSuite Brand Blend
    brandNavy: '#0E3646',
    brandNavyLight: '#173D50',
    brandNavyDark: '#061A22',
    primary: '#0E3646',
    primaryYellow: '#F9B514',
    primaryGreen: '#2E8B1F',
    
    secondaryYellow: '#F9B514',
    secondaryYellowLight: '#FBCD49',
    secondaryOrange: '#F57C00',
    
    statusSuccess: '#2E8B1F',
    statusWarning: '#F57C00',
    statusError: '#EF4444',
    statusInfo: '#0E3646',
    statusPending: '#6B7280',
    
    cardBg: '#FFFFFF',
    headerBg: '#0E3646',
    headerText: '#FFFFFF',
    tabBarBg: '#0E3646',
    tabBarActive: '#F9B514',
    tabBarInactive: '#94A3B8',
  },
  dark: {
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    background: '#0B192C',
    backgroundElement: '#172A45',
    backgroundSurface: '#1E293B',
    backgroundSelected: '#2A3E59',
    border: '#2A3E59',
    
    // OmniSuite Brand Blend
    brandNavy: '#0E3646',
    brandNavyLight: '#3B86A8',
    brandNavyDark: '#061A22',
    primary: '#3B86A8',
    primaryYellow: '#F9B514',
    primaryGreen: '#2E8B1F',
    
    secondaryYellow: '#F9B514',
    secondaryYellowLight: '#FBCD49',
    secondaryOrange: '#F57C00',
    
    statusSuccess: '#2E8B1F',
    statusWarning: '#F57C00',
    statusError: '#EF4444',
    statusInfo: '#5FA2C4',
    statusPending: '#9CA3AF',
    
    cardBg: '#172A45',
    headerBg: '#0B192C',
    headerText: '#FFFFFF',
    tabBarBg: '#0B192C',
    tabBarActive: '#F9B514',
    tabBarInactive: '#64748B',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'System',
    mono: 'Courier',
  },
  android: {
    sans: 'Roboto',
    mono: 'monospace',
  },
  default: {
    sans: 'normal',
    mono: 'monospace',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const MaxContentWidth = 800;
export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
