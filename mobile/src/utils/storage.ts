/**
 * Storage Abstraction Utility
 * Supports cross-platform persistence across React Native (AsyncStorage) and Web PWA (localStorage).
 * Automatically resolves computer local IP address for physical phone connectivity.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const STORAGE_KEYS = {
  AUTH_TOKEN: 'omnisuite_mobile_token',
  REFRESH_TOKEN: 'omnisuite_mobile_refresh_token',
  USER_DATA: 'omnisuite_mobile_user',
  ACTIVE_BRANCH: 'omnisuite_mobile_active_branch',
  SERVER_URL: 'omnisuite_mobile_server_url',
  THEME_MODE: 'omnisuite_mobile_theme',
  OFFLINE_CACHE_PREFIX: 'omnisuite_cache_',
  PENDING_MUTATIONS: 'omnisuite_pending_mutations',
};

/**
 * Dynamically resolves the host computer's backend API URL (port 5000)
 * Works seamlessly on Physical Devices (Expo Go), Android Emulator, iOS Simulator, and Web PWA.
 */
export function getAutoBackendUrl(): string {
  try {
    const hostUri = Constants.expoConfig?.hostUri || (Constants.manifest as any)?.debuggerHost;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
        return `http://${ip}:5000/api`;
      }
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
      const host = window.location.hostname;
      if (host && host !== 'localhost' && host !== '127.0.0.1') {
        return `http://${host}:5000/api`;
      }
    }
  } catch {}

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000/api';
  }

  return 'http://localhost:5000/api';
}

export const DEFAULT_SERVER_URL = getAutoBackendUrl();

export const Storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        return localStorage.getItem(key);
      }
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
        return;
      }
      await AsyncStorage.setItem(key, value);
    } catch {}
  },

  async removeItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
        return;
      }
      await AsyncStorage.removeItem(key);
    } catch {}
  },

  // Specialized helpers
  async getAuthToken(): Promise<string | null> {
    return this.getItem(STORAGE_KEYS.AUTH_TOKEN);
  },

  async setAuthToken(token: string): Promise<void> {
    return this.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
  },

  async getRefreshToken(): Promise<string | null> {
    return this.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  },

  async setRefreshToken(token: string): Promise<void> {
    return this.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
  },

  async getUserData(): Promise<any | null> {
    const raw = await this.getItem(STORAGE_KEYS.USER_DATA);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  async setUserData(user: any): Promise<void> {
    return this.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user || null));
  },

  async getActiveBranch(): Promise<any | null> {
    const raw = await this.getItem(STORAGE_KEYS.ACTIVE_BRANCH);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  async setActiveBranch(branch: any): Promise<void> {
    return this.setItem(STORAGE_KEYS.ACTIVE_BRANCH, JSON.stringify(branch || null));
  },

  async getServerUrl(): Promise<string> {
    const custom = await this.getItem(STORAGE_KEYS.SERVER_URL);
    return custom || getAutoBackendUrl();
  },

  async setServerUrl(url: string): Promise<void> {
    return this.setItem(STORAGE_KEYS.SERVER_URL, url);
  },

  async clearAuth(): Promise<void> {
    await this.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    await this.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    await this.removeItem(STORAGE_KEYS.USER_DATA);
    await this.removeItem(STORAGE_KEYS.ACTIVE_BRANCH);
  },

  // Offline PWA cache helpers
  async getCache(cacheKey: string): Promise<any | null> {
    const raw = await this.getItem(`${STORAGE_KEYS.OFFLINE_CACHE_PREFIX}${cacheKey}`);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed?.data || null;
    } catch {
      return null;
    }
  },

  async setCache(cacheKey: string, data: any): Promise<void> {
    const payload = {
      timestamp: Date.now(),
      data,
    };
    return this.setItem(`${STORAGE_KEYS.OFFLINE_CACHE_PREFIX}${cacheKey}`, JSON.stringify(payload));
  },
};
