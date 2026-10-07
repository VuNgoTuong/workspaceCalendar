import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { API_CONFIG } from '../../constants/api';
import { getKeycloak } from '../../utils/keycloak';
import { getCookie, setCookie, deleteCookie } from '../../utils/cookie';

let isRefreshing = false;
let failedQueue: { resolve: (token: string) => void; reject: (err: any) => void }[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

class BaseAPI {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: API_CONFIG.TIMEOUT,
      paramsSerializer: {
        serialize: (params) => {
          const searchParams = new URLSearchParams();
          Object.entries(params).forEach(([key, value]) => {
            if (value === undefined || value === null) return;
            if (Array.isArray(value)) {
              value.forEach((item) => searchParams.append(key, String(item)));
            } else {
              searchParams.append(key, String(value));
            }
          });
          return searchParams.toString();
        },
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request Interceptor
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        const keycloak = getKeycloak();

        // Keycloak Token 
        if (keycloak?.authenticated) {
          try {
            await keycloak.updateToken(30);
            if (keycloak.token) {
              config.headers.Authorization = `Bearer ${keycloak.token}`;
              return config;
            }
          } catch (error) {
            console.error(error);
          }
        }

        // Manual Token from cookie
        const token = getCookie('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response Interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config;
        if (!originalRequest) {
          return Promise.reject(error);
        }

        const keycloak = getKeycloak();
        const requestUrl = originalRequest.url || '';
        const isLoginRequest = requestUrl.includes('login') || requestUrl.includes('Login');
        const isRefreshTokenRequest = requestUrl.includes('refresh-token') || requestUrl.includes('refreshToken');

        if (error.response?.status === 401 && !isLoginRequest && !isRefreshTokenRequest) {
          const authMethod = localStorage.getItem('AUTH_METHOD');

          if (keycloak?.authenticated) {
            keycloak.login();
            return Promise.reject(error);
          } else if (authMethod === 'manual') {
            const refreshToken = getCookie('refreshToken');
            
            if (refreshToken) {
              if (isRefreshing) {
                return new Promise((resolve, reject) => {
                  failedQueue.push({ resolve, reject });
                })
                  .then((token) => {
                    if (originalRequest.headers) {
                      originalRequest.headers.Authorization = `Bearer ${token}`;
                    }
                    return this.axiosInstance(originalRequest);
                  })
                  .catch((err) => {
                    return Promise.reject(err);
                  });
              }

              isRefreshing = true;

              try {
                const expiredToken = getCookie('token');
                const headers: Record<string, string> = {
                  'Content-Type': 'application/json',
                };
                if (expiredToken) {
                  headers['Authorization'] = `Bearer ${expiredToken}`;
                }

                // refresh token 
                const response = await axios.post(`${API_CONFIG.BASE_URL}/Auth/refresh-token`, {
                  refreshToken: refreshToken,
                }, {
                  headers
                });

                const newToken = response.data?.token;
                const newRefreshToken = response.data?.refreshToken;

                if (newToken) {
                  setCookie('token', newToken); 
                  if (newRefreshToken) {
                    setCookie('refreshToken', newRefreshToken);
                  }

                  if (originalRequest.headers) {
                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                  }

                  processQueue(null, newToken);
                  isRefreshing = false;

                  return this.axiosInstance(originalRequest);
                } else {
                  throw new Error('No token returned from refresh API');
                }
              } catch (refreshError) {
                processQueue(refreshError, null);
                isRefreshing = false;
                this.handleSessionClear();
                return Promise.reject(refreshError);
              }
            }
          }
          
          this.handleSessionClear();
        }

        if (error.response?.status === 403 && !isLoginRequest) {
          if (window.location.pathname !== '/403') {
            window.location.href = '/403';
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private handleSessionClear(): void {
    deleteCookie('token');
    deleteCookie('refreshToken');
    localStorage.removeItem('is-authenticated');
    localStorage.removeItem('auth-user');
    localStorage.removeItem('AUTH_METHOD');
    localStorage.removeItem('LOGIN_TYPE');
    sessionStorage.removeItem('LOCAL_LOGOUT');
    
    // Redirect to login page
    window.location.href = '/login';
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.put<T>(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.patch<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.delete<T>(url, config);
    return response.data;
  }
}

export const baseAPI = new BaseAPI();
export default baseAPI;
