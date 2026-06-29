import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import Constants from 'expo-constants';

/* ── Types ─────────────────────────────────────────────────── */
export interface Customer {
  id: number;
  customer_name: string;
  email: string;
  linked_shop_id: number | null;
}

export interface Shop {
  id: number;
  name: string;
  code: string;
  is_active: number;
  company_name?: string;
}

export interface Currency {
  symbol: string;
  currency_code: string;
}

export interface CartItem {
  id: number;
  item_code: string;
  item_name: string;
  uom: string;
  selling_price: number;
  image_url: string | null;
  qty: number;
}

type Screen = 'splash' | 'login' | 'register' | 'shop-selection' | 'store';
type Tab    = 'home' | 'cart' | 'history' | 'profile';

interface AppContextType {
  token:          string | null;
  customer:       Customer | null;
  selectedShop:   Shop | null;
  currency:       Currency | null;
  cart:           CartItem[];
  currentScreen:  Screen;
  currentTab:     Tab;
  setCurrentTab:  (t: Tab) => void;
  navigateTo:     (s: Screen) => void;
  finishSplash:   () => void;
  loginUser:      (token: string, customer: Customer) => Promise<void>;
  logoutUser:     () => Promise<void>;
  setShop:        (shop: Shop) => Promise<void>;
  addToCart:      (item: any) => void;
  updateCartQty:  (itemId: number, qty: number) => void;
  removeFromCart: (itemId: number) => void;
  clearCart:      () => void;
  apiCall:        (endpoint: string, method?: string, body?: any) => Promise<any>;
}

/* ── Storage shim (web localStorage / native in-memory) ────── */
const memStore: Record<string, string> = {};
const Storage = {
  get: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      try { return localStorage.getItem(key); } catch { /* ignore */ }
    }
    return memStore[key] ?? null;
  },
  set: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try { localStorage.setItem(key, value); return; } catch { /* ignore */ }
    }
    memStore[key] = value;
  },
  remove: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try { localStorage.removeItem(key); return; } catch { /* ignore */ }
    }
    delete memStore[key];
  },
};

/* ── API base URL resolver ──────────────────────────────────── */
export function getApiBaseUrl(): string {
  // Explicit env override (set EXPO_PUBLIC_API_URL in .env)
  const envUrl = typeof process !== 'undefined'
    ? (process.env.EXPO_PUBLIC_API_URL ?? '')
    : '';
  if (envUrl) return envUrl.replace(/\/$/, '') + '/api/chyta';

  if (Platform.OS === 'web') {
    // Browser: same origin on port 4002
    if (typeof window !== 'undefined') {
      const origin = window.location.hostname;
      return `http://${origin}:4002/api/chyta`;
    }
    return 'http://localhost:4002/api/chyta';
  }

  // Native: resolve Expo dev-server IP
  const debuggerHost =
    Constants.expoConfig?.hostUri ??
    (Constants as any).manifest?.debuggerHost ??
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ??
    '';
  const ip = debuggerHost ? debuggerHost.split(':')[0] : '10.0.2.2'; // 10.0.2.2 = Android emulator host
  return `http://${ip}:4002/api/chyta`;
}

/* ── Context ────────────────────────────────────────────────── */
const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token,         setToken        ] = useState<string | null>(null);
  const [customer,      setCustomer     ] = useState<Customer | null>(null);
  const [selectedShop,  setSelectedShop ] = useState<Shop | null>(null);
  const [currency,      setCurrency     ] = useState<Currency | null>(null);
  const [cart,          setCart         ] = useState<CartItem[]>([]);
  const [currentScreen, setCurrentScreen] = useState<Screen>('splash');
  const [currentTab,    setCurrentTab   ] = useState<Tab>('home');
  const [resolvedScreen, setResolvedScreen] = useState<Screen>('login');

  /* ── restore session on mount ─────────────────────────────── */
  useEffect(() => {
    (async () => {
      const savedToken = await Storage.get('chyta_token');
      const savedCust  = await Storage.get('chyta_customer');
      if (!savedToken || !savedCust) {
        setResolvedScreen('login');
        return;
      }
      const parsedCust: Customer = JSON.parse(savedCust);
      setToken(savedToken);
      setCustomer(parsedCust);

      // Fetch currency config
      try {
        const cRes = await fetch(`${getApiBaseUrl()}/currency`);
        if (cRes.ok) {
          const cData = await cRes.json();
          if (cData.currency) setCurrency(cData.currency);
        }
      } catch { /* ignore */ }

      if (parsedCust.linked_shop_id) {
        /* try to resolve shop details */
        try {
          const res = await fetch(`${getApiBaseUrl()}/shops`, {
            headers: { Authorization: `Bearer ${savedToken}` },
          });
          if (res.ok) {
            const data = await res.json();
            const found: Shop | undefined = (data.shops ?? []).find(
              (s: Shop) => s.id === parsedCust.linked_shop_id,
            );
            if (found) {
              setSelectedShop(found);
              setResolvedScreen('store');
              return;
            }
          }
        } catch { /* offline? fall through */ }
        setResolvedScreen('shop-selection');
      } else {
        setResolvedScreen('shop-selection');
      }
    })();
  }, []);

  /* ── helpers ──────────────────────────────────────────────── */
  const navigateTo = useCallback((s: Screen) => setCurrentScreen(s), []);
  const finishSplash = useCallback(() => setCurrentScreen(resolvedScreen), [resolvedScreen]);

  const loginUser = useCallback(async (userToken: string, userCustomer: Customer) => {
    setToken(userToken);
    setCustomer(userCustomer);
    await Storage.set('chyta_token',    userToken);
    await Storage.set('chyta_customer', JSON.stringify(userCustomer));

    if (userCustomer.linked_shop_id) {
      try {
        const res = await fetch(`${getApiBaseUrl()}/shops`, {
          headers: { Authorization: `Bearer ${userToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          const found: Shop | undefined = (data.shops ?? []).find(
            (s: Shop) => s.id === userCustomer.linked_shop_id,
          );
          if (found) {
            setSelectedShop(found);
            setCurrentScreen('store');
            return;
          }
        }
      } catch { /* ignore */ }
    }
    setCurrentScreen('shop-selection');
  }, []);

  const logoutUser = useCallback(async () => {
    setToken(null);
    setCustomer(null);
    setSelectedShop(null);
    setCart([]);
    setCurrentTab('home');
    await Storage.remove('chyta_token');
    await Storage.remove('chyta_customer');
    setCurrentScreen('login');
  }, []);

  const setShop = useCallback(async (shop: Shop) => {
    setSelectedShop(shop);
    if (customer) {
      const updated = { ...customer, linked_shop_id: shop.id };
      setCustomer(updated);
      await Storage.set('chyta_customer', JSON.stringify(updated));
    }
    /* persist on server (fire-and-forget, non-blocking) */
    if (token) {
      fetch(`${getApiBaseUrl()}/link-shop`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ shop_id: shop.id }),
      }).catch(() => {/* ignore */});
    }
    setCurrentScreen('store');
  }, [customer, token]);

  /* ── cart helpers ─────────────────────────────────────────── */
  const addToCart = useCallback((item: any) => {
    setCart(prev => {
      const idx = prev.findIndex(c => c.id === item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [...prev, {
        id:            Number(item.id),
        item_code:     item.item_code ?? '',
        item_name:     item.item_name ?? '',
        uom:           item.uom ?? 'PCS',
        selling_price: Number(item.selling_price ?? 0),
        image_url:     item.image_url ?? null,
        qty:           1,
      }];
    });
  }, []);

  const updateCartQty = useCallback((itemId: number, qty: number) => {
    if (qty <= 0) { removeFromCart(itemId); return; }
    setCart(prev => prev.map(c => c.id === itemId ? { ...c, qty } : c));
  }, []);

  const removeFromCart = useCallback((itemId: number) => {
    setCart(prev => prev.filter(c => c.id !== itemId));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  /* ── generic API call ─────────────────────────────────────── */
  const apiCall = useCallback(async (
    endpoint: string,
    method: string = 'GET',
    body: any = null,
  ): Promise<any> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const cfg: RequestInit = { method, headers };
    if (body) cfg.body = JSON.stringify(body);

    const url = `${getApiBaseUrl()}${endpoint}`;
    const response = await fetch(url, cfg);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const msg = data?.message ?? `Request failed (${response.status})`;
      if (Platform.OS === 'web') { window.alert(msg); }
      else { Alert.alert('Error', msg); }
      throw new Error(msg);
    }
    return data;
  }, [token]);

  return (
    <AppContext.Provider value={{
      token, customer, selectedShop, currency, cart,
      currentScreen, currentTab, setCurrentTab,
      navigateTo, finishSplash, loginUser, logoutUser, setShop,
      addToCart, updateCartQty, removeFromCart, clearCart,
      apiCall,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
};
