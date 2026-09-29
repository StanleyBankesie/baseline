import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [token, setToken] = useState(null);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('portal_token');
      const storedUser = await AsyncStorage.getItem('portal_user');
      const storedEmp = await AsyncStorage.getItem('portal_employee');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        if (storedEmp) setEmployee(JSON.parse(storedEmp));
        refreshProfile();
      }
    } catch (e) {
      console.warn('Failed to restore session', e);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProfile = async () => {
    try {
      const res = await apiClient.get('/auth/me');
      setUser(res.data.user);
      setEmployee(res.data.employee);
      setRequiresPasswordChange(Boolean(res.data.requiresPasswordChange));
      await AsyncStorage.setItem('portal_user', JSON.stringify(res.data.user));
      await AsyncStorage.setItem('portal_employee', JSON.stringify(res.data.employee));
    } catch (e) {
      console.warn('Profile refresh error', e);
    }
  };

  const login = async (identifier, password, rememberMe = true) => {
    const res = await apiClient.post('/auth/login', {
      identifier: identifier.trim(),
      password,
      rememberMe,
    });

    const { token: newToken, user: newUser, employee: newEmp, requiresPasswordChange: reqChange } = res.data;

    setToken(newToken);
    setUser(newUser);
    setEmployee(newEmp);
    setRequiresPasswordChange(Boolean(reqChange));

    await AsyncStorage.setItem('portal_token', newToken);
    await AsyncStorage.setItem('portal_user', JSON.stringify(newUser));
    await AsyncStorage.setItem('portal_employee', JSON.stringify(newEmp));

    return res.data;
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout').catch(() => {});
    } finally {
      setToken(null);
      setUser(null);
      setEmployee(null);
      setRequiresPasswordChange(false);
      await AsyncStorage.multiRemove(['portal_token', 'portal_user', 'portal_employee']);
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    const res = await apiClient.post('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    setRequiresPasswordChange(false);
    return res.data;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        employee,
        token,
        requiresPasswordChange,
        isLoading,
        login,
        logout,
        changePassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
