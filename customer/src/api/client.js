import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const getBaseUrl = () => {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      return `http://${window.location.hostname}:4002/api/customer-portal`;
    }
    return 'http://localhost:4002/api/customer-portal';
  }

  // Native: Automatically resolve host IP from Expo dev server
  const debuggerHost =
    Constants.expoConfig?.hostUri ??
    Constants.manifest?.debuggerHost ??
    Constants.manifest2?.extra?.expoGo?.debuggerHost ??
    '';
  const host = debuggerHost ? debuggerHost.split(':')[0] : (Platform.OS === 'android' ? '10.0.2.2' : 'localhost');
  return `http://${host}:4002/api/customer-portal`;
};

const apiClient = axios.create({
  baseURL: getBaseUrl(),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('omnisuite_customer_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn('Failed to retrieve token from storage', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      try {
        await AsyncStorage.multiRemove([
          'omnisuite_customer_token',
          'omnisuite_customer_profile',
        ]);
      } catch {}
    }
    return Promise.reject(error);
  }
);

export default apiClient;
