'use client';

import axios from 'axios';
import { useAuth } from './auth-store';

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5300/api';

export const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = useAuth.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<string | null> | null = null;

async function refreshToken(): Promise<string | null> {
  const { refreshToken: rt, setTokens, logout } = useAuth.getState();
  if (!rt) return null;
  try {
    const { data } = await axios.post(`${baseURL}/auth/refresh`, { refreshToken: rt });
    setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    return data.accessToken as string;
  } catch {
    logout();
    return null;
  }
}

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      refreshing = refreshing ?? refreshToken();
      const token = await refreshing;
      refreshing = null;
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  },
);
