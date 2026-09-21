import type { AuthProvider } from '@refinedev/core';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://luka-1i4g.onrender.com';

const ALL_PERMISSIONS = [
  'users', 'cards', 'boxes', 'recharge', 'orders',
  'banners', 'tasks', 'redeem', 'notifications', 'tickets', 'admins'
];

export const authProvider: AuthProvider = {
  login: async ({ username, password }) => {
    try {
      const { data } = await axios.post(`${API_URL}/api/admin/login`, { username, password });
      localStorage.setItem('adminInfo', JSON.stringify(data.admin));
      localStorage.setItem('adminPassword', password);
      return { success: true, redirectTo: '/' };
    } catch (e: any) {
      return {
        success: false,
        error: { name: 'LoginError', message: e.response?.data?.error || '登录失败' },
      };
    }
  },

  logout: async () => {
    localStorage.removeItem('adminInfo');
    localStorage.removeItem('adminPassword');
    return { success: true, redirectTo: '/login' };
  },

  check: async () => {
    const adminInfo = localStorage.getItem('adminInfo');
    if (adminInfo) return { authenticated: true };
    return { authenticated: false, redirectTo: '/login' };
  },

  getIdentity: async () => {
    const adminInfo = JSON.parse(localStorage.getItem('adminInfo') || 'null');
    if (!adminInfo) return null;
    return { id: adminInfo.id, name: adminInfo.username, role: adminInfo.role };
  },

  getPermissions: async () => {
    const adminInfo = JSON.parse(localStorage.getItem('adminInfo') || 'null');
    if (!adminInfo) return [];
    if (adminInfo.role === 'super') return ALL_PERMISSIONS;
    return adminInfo.permissions || [];
  },

  onError: async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('adminInfo');
      localStorage.removeItem('adminPassword');
      return { logout: true, redirectTo: '/login' };
    }
    return { error };
  },
};
