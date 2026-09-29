import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client';

const AuthContext = createContext({
  customer: null,
  token: null,
  isLoading: true,
  requiresPasswordChange: false,
  login: async () => {},
  logout: async () => {},
  refreshProfile: async () => {},
});

export function CustomerAuthProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);

  useEffect(() => {
    loadStoredSession();
  }, []);

  const loadStoredSession = async () => {
    try {
      const [storedToken, storedCustomer] = await AsyncStorage.multiGet([
        'omnisuite_customer_token',
        'omnisuite_customer_profile',
      ]);

      if (storedToken[1]) {
        setToken(storedToken[1]);
        if (storedCustomer[1]) {
          setCustomer(JSON.parse(storedCustomer[1]));
        }
        await fetchCurrentProfile(storedToken[1]);
      }
    } catch (e) {
      console.warn('Error loading customer session', e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCurrentProfile = async (currentToken) => {
    try {
      const res = await apiClient.get('/me', {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      if (res.data.customer) {
        setCustomer(res.data.customer);
        setRequiresPasswordChange(Boolean(res.data.requiresPasswordChange));
        await AsyncStorage.setItem(
          'omnisuite_customer_profile',
          JSON.stringify(res.data.customer)
        );
      }
    } catch (e) {
      if (e.response && e.response.status === 401) {
        await logout();
      }
    }
  };

  const login = async (username, password) => {
    const res = await apiClient.post('/auth/login', { username, password });
    const { token: receivedToken, customer: customerData, requiresPasswordChange: pwdChange } = res.data;

    setToken(receivedToken);
    setCustomer(customerData);
    setRequiresPasswordChange(Boolean(pwdChange));

    await AsyncStorage.multiSet([
      ['omnisuite_customer_token', receivedToken],
      ['omnisuite_customer_profile', JSON.stringify(customerData)],
    ]);

    return res.data;
  };

  const refreshProfile = async () => {
    if (token) {
      await fetchCurrentProfile(token);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.multiRemove([
        'omnisuite_customer_token',
        'omnisuite_customer_profile',
      ]);
    } catch {}
    setToken(null);
    setCustomer(null);
    setRequiresPasswordChange(false);
  };

  return (
    <AuthContext.Provider
      value={{
        customer,
        token,
        isLoading,
        requiresPasswordChange,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useCustomerAuth() {
  return useContext(AuthContext);
}
