import { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://luka-1i4g.onrender.com';

export interface AdminMenu {
  id: string;
  parentId: string | null;
  title: string;
  type: string;        // MENU / DIRECTORY
  icon: string;
  path: string;
  component: string;
  permission: string;
  sortOrder: number;
  isVisible: boolean;
  isActive: boolean;
  children?: AdminMenu[];
}

const getHeaders = () => {
  const adminInfo = JSON.parse(localStorage.getItem('adminInfo') || 'null');
  const password = localStorage.getItem('adminPassword') || '';
  return {
    'x-admin-username': adminInfo?.username || '',
    'x-admin-password': password,
  };
};

export function useMenuTree() {
  const [menus, setMenus] = useState<AdminMenu[] | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMenus = async () => {
    const adminInfo = localStorage.getItem('adminInfo');
    if (!adminInfo) { setLoading(false); return; }
    try {
      const { data } = await axios.get(`${API_URL}/api/admin/menus`, { headers: getHeaders() });
      setMenus(data);
    } catch (e) {
      console.error('拉取菜单失败', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMenus(); }, []);

  return { menus, loading, refetch: fetchMenus };
}
