import axios from 'axios';
import type { DataProvider } from '@refinedev/core';

const API_URL = import.meta.env.VITE_API_URL || 'https://luka-1i4g.onrender.com';

// 自动附加管理员 header 的 axios 实例
const api = axios.create();

api.interceptors.request.use((config) => {
  const adminInfo = JSON.parse(localStorage.getItem('adminInfo') || 'null');
  const password = localStorage.getItem('adminPassword') || '';
  config.headers['x-admin-username'] = adminInfo?.username || '';
  config.headers['x-admin-password'] = password;
  return config;
});

// Refine 会在请求 params 里塞入 pagination/sorters/filters，
// 我们后端不支持这些，直接忽略，全部在前端处理
const cleanParams = (params: any) => {
  if (!params) return {};
  const { pagination, sorters, filters, ...rest } = params;
  return rest;
};

export const dataProvider: DataProvider = {
  getApiUrl: () => API_URL,

  getList: async ({ resource, meta }) => {
    const url = `${API_URL}/api/admin/${resource}`;
    const { data } = await api.get(url, { params: cleanParams(meta) });
    // 后端直接返回数组，包装成 Refine 需要的 { data, total }
    const list = Array.isArray(data) ? data : (data.data || []);
    return { data: list, total: list.length };
  },

  getOne: async ({ resource, id }) => {
    const { data } = await api.get(`${API_URL}/api/admin/${resource}/${id}`);
    return { data };
  },

  create: async ({ resource, variables }) => {
    const { data } = await api.post(`${API_URL}/api/admin/${resource}`, variables);
    return { data: data.data || data };
  },

  update: async ({ resource, id, variables }) => {
    const { data } = await api.put(`${API_URL}/api/admin/${resource}/${id}`, variables);
    return { data: data.data || data };
  },

  deleteOne: async ({ resource, id }) => {
    const { data } = await api.delete(`${API_URL}/api/admin/${resource}/${id}`);
    return { data: data.data || data };
  },

  getMany: async ({ resource, ids }) => {
    const results = await Promise.all(
      ids.map((id) => api.get(`${API_URL}/api/admin/${resource}/${id}`))
    );
    return { data: results.map((r) => r.data) };
  },

  createMany: async () => {
    throw new Error('createMany not implemented');
  },

  deleteMany: async ({ resource, ids }) => {
    await Promise.all(ids.map((id) => api.delete(`${API_URL}/api/admin/${resource}/${id}`)));
    return { data: ids };
  },

  updateMany: async () => {
    throw new Error('updateMany not implemented');
  },

  custom: async ({ url, method, payload }) => {
    const fullUrl = url.startsWith('http') ? url : `${API_URL}${url}`;
    const { data } = await api.request({ url: fullUrl, method: method || 'get', data: payload });
    return { data };
  },
};
