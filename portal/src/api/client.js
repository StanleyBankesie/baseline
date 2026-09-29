import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const getBaseUrl = () => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:4002/api/portal';
  }
  return 'http://localhost:4002/api/portal';
};

export const API_BASE_URL = getBaseUrl();

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('portal_token');
      if (token) {
        config.headers.Authorization = 'Bearer ' + token;
      }
    } catch (e) {
      console.warn('Failed to load portal token', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      await AsyncStorage.multiRemove(['portal_token', 'portal_user', 'portal_employee']);
    }
    return Promise.reject(error);
  }
);

export default apiClient;
