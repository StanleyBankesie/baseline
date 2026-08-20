/**
 * Axios API Client for OmniSuite Mobile App
 * Connects directly to backend (server folder).
 * Supports automatic IP resolution, automatic endpoint fallback retries,
 * Bearer auth, active branch context, and offline PWA caching.
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { Storage, getAutoBackendUrl } from '../utils/storage';

class ApiClient {
  private instance: AxiosInstance;
  private currentBaseUrl: string = getAutoBackendUrl();

  constructor() {
    this.instance = axios.create({
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request Interceptor: Attach Auth Token and Active Branch
    this.instance.interceptors.request.use(
      async (config) => {
        // Resolve auto base URL
        const serverUrl = await Storage.getServerUrl();
        if (serverUrl) {
          config.baseURL = serverUrl;
          this.currentBaseUrl = serverUrl;
        }

        // Attach JWT token
        const token = await Storage.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Attach Active Branch Header
        const activeBranch = await Storage.getActiveBranch();
        if (activeBranch && activeBranch.id) {
          config.headers['x-branch-id'] = String(activeBranch.id);
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response Interceptor: Automatic Retry on Network Fallback & Offline Cache
    this.instance.interceptors.response.use(
      async (response) => {
        if (response.config.method?.toUpperCase() === 'GET' && response.data) {
          const cacheKey = response.config.url?.replace(/[^a-zA-Z0-9]/g, '_') || '';
          if (cacheKey) {
            Storage.setCache(cacheKey, response.data).catch(() => {});
          }
        }
        return response;
      },
      async (error) => {
        const config = error.config as AxiosRequestConfig & { _fallbackTried?: boolean };

        // Retry on fallback URL if initial local network connection failed
        if (config && !config._fallbackTried && (error.code === 'ERR_NETWORK' || !error.response)) {
          config._fallbackTried = true;
          const currentUrl = config.baseURL || this.currentBaseUrl;

          let fallbackUrl = '';
          if (!currentUrl.includes('localhost') && !currentUrl.includes('127.0.0.1')) {
            fallbackUrl = 'http://localhost:5000/api';
          } else {
            fallbackUrl = 'https://demoserver.omnisuite-erp.com/api';
          }

          try {
            config.baseURL = fallbackUrl;
            this.currentBaseUrl = fallbackUrl;
            await Storage.setServerUrl(fallbackUrl);
            return await this.instance.request(config);
          } catch (retryError) {
            // Secondary fallback attempt
          }
        }

        // Return offline cached response for GET requests
        if (config && config.method?.toUpperCase() === 'GET') {
          const cacheKey = config.url?.replace(/[^a-zA-Z0-9]/g, '_') || '';
          if (cacheKey) {
            const cachedData = await Storage.getCache(cacheKey);
            if (cachedData) {
              return {
                data: cachedData,
                status: 200,
                statusText: 'OK (Offline Cache)',
                headers: {},
                config,
                isOfflineCache: true,
              };
            }
          }
        }
        return Promise.reject(error);
      }
    );
  }

  public get<T = any>(url: string, config?: AxiosRequestConfig) {
    return this.instance.get<T>(url, config);
  }

  public post<T = any>(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.instance.post<T>(url, data, config);
  }

  public put<T = any>(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.instance.put<T>(url, data, config);
  }

  public delete<T = any>(url: string, config?: AxiosRequestConfig) {
    return this.instance.delete<T>(url, config);
  }

  public getBaseUrl(): string {
    return this.currentBaseUrl;
  }
}

export const api = new ApiClient();
