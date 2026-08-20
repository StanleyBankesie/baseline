/**
 * Centralized Authentication & Permission Context for OmniSuite Mobile
 * Handles User Login, JWT Tokens, Branch Scope, Role-Based Access Control (RBAC),
 * Theme Mode, Splash Transition, and Offline State.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Storage } from '../utils/storage';
import { api } from '../api/client';

export interface User {
  id: number;
  username: string;
  email?: string;
  full_name?: string;
  role?: string;
  roles?: string[];
  permissions?: string[];
  photo_url?: string;
  branch_id?: number;
  branch_name?: string;
}

export interface Branch {
  id: number;
  branch_name: string;
  code?: string;
  is_active?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  activeBranch: Branch | null;
  userBranches: Branch[];
  permissions: string[];
  initialized: boolean;
  isLoading: boolean;
  isOffline: boolean;
  themeMode: 'light' | 'dark';
  serverUrl: string;
  currentScreen: 'splash' | 'login' | 'branch-select' | 'main';
  currentTab: 'home' | 'modules' | 'pos' | 'notifications' | 'profile';
  finishSplash: () => void;
  setCurrentTab: (tab: 'home' | 'modules' | 'pos' | 'notifications' | 'profile') => void;
  setCurrentScreen: (screen: 'splash' | 'login' | 'branch-select' | 'main') => void;
  login: (u: string, p: string) => Promise<{ success: boolean; message?: string; requiresBranchSelect?: boolean }>;
  logout: () => Promise<void>;
  selectBranch: (branch: Branch) => Promise<void>;
  updateServerUrl: (url: string) => Promise<void>;
  toggleTheme: () => void;
  hasPermission: (permissionKey: string) => boolean;
  hasModuleAccess: (moduleKey: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [activeBranch, setActiveBranchState] = useState<Branch | null>(null);
  const [userBranches, setUserBranches] = useState<Branch[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('dark');
  const [serverUrl, setServerUrlState] = useState('');
  const [currentScreen, setCurrentScreen] = useState<'splash' | 'login' | 'branch-select' | 'main'>('splash');
  const [nextScreen, setNextScreen] = useState<'login' | 'branch-select' | 'main'>('login');
  const [currentTab, setCurrentTab] = useState<'home' | 'modules' | 'pos' | 'notifications' | 'profile'>('home');

  // Load initial stored auth state on mount
  useEffect(() => {
    async function loadAuth() {
      try {
        const storedToken = await Storage.getAuthToken();
        const storedUser = await Storage.getUserData();
        const storedBranch = await Storage.getActiveBranch();
        const storedUrl = await Storage.getServerUrl();
        const storedTheme = await Storage.getItem('omnisuite_mobile_theme');

        setServerUrlState(storedUrl);
        if (storedTheme === 'light' || storedTheme === 'dark') {
          setThemeMode(storedTheme);
        }

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(storedUser);
          setActiveBranchState(storedBranch);
          
          const userPerms = Array.isArray(storedUser.permissions) ? storedUser.permissions : [];
          setPermissions(userPerms);

          if (!storedBranch && storedUser.role !== 'SUPER_ADMIN') {
            await fetchUserBranches(storedToken);
            setNextScreen('branch-select');
          } else {
            setNextScreen('main');
          }
        } else {
          setNextScreen('login');
        }
      } catch {
        setNextScreen('login');
      } finally {
        setInitialized(true);
      }
    }

    loadAuth();
  }, []);

  const finishSplash = () => {
    setCurrentScreen(nextScreen);
  };

  // Fetch branches assigned to user
  const fetchUserBranches = async (authToken?: string) => {
    try {
      const res = await api.get('/auth/user-branches');
      const branchesList: Branch[] = res.data?.branches || res.data || [];
      setUserBranches(branchesList);
      return branchesList;
    } catch {
      return [];
    }
  };

  // Perform User Login
  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.post('/login', { username, password });
      const { token: jwtToken, user: userData, branches } = res.data;

      if (!jwtToken || !userData) {
        setIsLoading(false);
        return { success: false, message: 'Invalid response from server' };
      }

      // Save token and user
      await Storage.setAuthToken(jwtToken);
      await Storage.setUserData(userData);
      setToken(jwtToken);
      setUser(userData);

      // Extract user permissions
      const perms = Array.isArray(userData.permissions) ? userData.permissions : [];
      setPermissions(perms);

      // Branch setup
      const availableBranches: Branch[] = branches || userData.userBranches || [];
      setUserBranches(availableBranches);

      if (availableBranches.length === 1) {
        // Auto-select single branch
        const singleBranch = availableBranches[0];
        await Storage.setActiveBranch(singleBranch);
        setActiveBranchState(singleBranch);
        setCurrentScreen('main');
        setIsLoading(false);
        return { success: true };
      } else if (availableBranches.length > 1) {
        setCurrentScreen('branch-select');
        setIsLoading(false);
        return { success: true, requiresBranchSelect: true };
      } else if (userData.branch_id) {
        const defaultBranch: Branch = {
          id: userData.branch_id,
          branch_name: userData.branch_name || 'Main Branch',
        };
        await Storage.setActiveBranch(defaultBranch);
        setActiveBranchState(defaultBranch);
        setCurrentScreen('main');
        setIsLoading(false);
        return { success: true };
      }

      setCurrentScreen('main');
      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      const errMsg = err?.response?.data?.message || err?.message || 'Network error connecting to backend server.';
      return { success: false, message: errMsg };
    }
  };

  // Select Active Branch
  const selectBranch = async (branch: Branch) => {
    await Storage.setActiveBranch(branch);
    setActiveBranchState(branch);
    setCurrentScreen('main');
  };

  // Logout Action
  const logout = async () => {
    try {
      await api.post('/auth/logout').catch(() => {});
    } catch {}
    await Storage.clearAuth();
    setUser(null);
    setToken(null);
    setActiveBranchState(null);
    setUserBranches([]);
    setPermissions([]);
    setCurrentScreen('login');
  };

  // Server URL update
  const updateServerUrl = async (url: string) => {
    const cleanUrl = url.trim().replace(/\/+$/, '');
    await Storage.setServerUrl(cleanUrl);
    setServerUrlState(cleanUrl);
  };

  // Theme Toggle
  const toggleTheme = () => {
    const nextMode = themeMode === 'dark' ? 'light' : 'dark';
    setThemeMode(nextMode);
    Storage.setItem('omnisuite_mobile_theme', nextMode);
  };

  // Role-Based Permission Check
  const hasPermission = (permissionKey: string): boolean => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'ADMINISTRATOR') return true;
    if (permissions.includes('*') || permissions.includes('all')) return true;
    return permissions.includes(permissionKey);
  };

  // Role-Based Module Check
  const hasModuleAccess = (moduleKey: string): boolean => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'ADMINISTRATOR') return true;
    
    const roleUpper = (user.role || '').toUpperCase();
    if (moduleKey === 'pos' && (roleUpper.includes('CASHIER') || roleUpper.includes('SALES') || roleUpper.includes('STORE'))) return true;
    if (moduleKey === 'inventory' && (roleUpper.includes('STORE') || roleUpper.includes('WAREHOUSE') || roleUpper.includes('INVENTORY'))) return true;
    if (moduleKey === 'sales' && (roleUpper.includes('SALES') || roleUpper.includes('COMMERCIAL'))) return true;

    return permissions.some(p => p.startsWith(`${moduleKey}.`) || p === moduleKey);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        activeBranch,
        userBranches,
        permissions,
        initialized,
        isLoading,
        isOffline,
        themeMode,
        serverUrl,
        currentScreen,
        currentTab,
        finishSplash,
        setCurrentTab,
        setCurrentScreen,
        login,
        logout,
        selectBranch,
        updateServerUrl,
        toggleTheme,
        hasPermission,
        hasModuleAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
