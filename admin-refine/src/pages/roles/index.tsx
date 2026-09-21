import React, { useState, useEffect } from 'react';
import axios from 'axios';
import SearchBar from '../../components/SearchBar';
import { useSearch } from '../../hooks/useSearch';

interface R { id: string; name: string; displayName: string; description: string; permissions: string; isSystem: boolean; adminCount?: number; createdAt: string; }
interface P { key: string; label: string; group: string; }

const API_URL = import.meta.env.VITE_API_URL || 'https://luka-1i4g.onrender.com';
const hdr = () => { const a = JSON.parse(localStorage.getItem('adminInfo') || 'null'); return { 'x-admin-username': a?.username || '', 'x-admin-password': localStorage.getItem('adminPassword') || '', 'Content-Type': 'application/json' }; };

const SEARCH_FIELDS = [
  { key: 'displayName', label: '显示名', type: 'text' as const },
  { key: 'name', label: '标识', type: 'text' as const },
  { key: 'isSystem', label: '类型', type: 'select' as const, options: [{ value: 'true', label: '系统' }, { value: 'false', label: '自定义' }] },
  { key: 'createdAt', label: '创建时间', type: 'date-range' as const },
];

export default function RoleList() {
  const [roles, setRoles] = useState<R[]>([]);
  const [perms, setPerms] = useState<P[]>([]);
  const [loading, setLoading] = useState(true);

  const { filters, setFilters, filtered, reset } = useSearch(roles, SEARCH_FIELDS);

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [form, setForm] = useState({ id: '', name: '', displayName: '', description: '', permissionsArr: [] as string[] });
  const [saving, setSaving] = useState(false);

  const [showView, setShowView] = useState(false);
  const [viewRole, setViewRole] = useState<R | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [r, p] = await Promise.all([
        axios.get(`${API_URL}/api/admin/roles`, { headers: hdr() }),
        axios.get(`${API_URL}/api/admin/permissions`, { headers: hdr() }),
      ]);
      setRoles(r.data); setPerms(p.data);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const groups = perms.reduce<Record<string, P[]>>((a, p) => { (a[p.group] = a[p.group] || []).push(p); return a; }, {});

  const openCreate = () => { setModalMode('create'); setForm({ id: '', name: '', displayName: '', description: '', permissionsArr: [] }); setShowModal(true); };
  const openEdit = (r: R) => {
    if (r.name === 'super') return;
    setModalMode('edit');
    setForm({ id: r.id, name: r.name, displayName: r.displayName, description: r.description, permissionsArr: r.permissions ? r.permissions.split(',') : [] });
    setShowModal(true);
  };

  const togglePerm = (k: string) => setForm((f) => ({ ...f, permissionsArr: f.permissionsArr.includes(k) ? f.permissionsArr.filter((x) => x !== k) : [...f.permissionsArr, k] }));
  const toggleGroup = (g: string, checked: boolean) => {
    const keys = groups[g].map((p) => p.key);
    setForm((f) => ({ ...f, permissionsArr: checked ? Array.from(new Set([...f.permissionsArr, ...keys])) : f.permissionsArr.filter((k) => !keys.includes(k)) }));
  };

  const save = async () => {
    if (!form.displayName) return alert('请填写显示名');
    if (modalMode === 'create' && !form.name) return alert('请填写标识');
    setSaving(true);
    try {
      if (modalMode === 'create') {
        await axios.post(`${API_URL}/api/admin/roles`, { name: form.name, displayName: form.displayName, description: form.description, permissions: form.permissionsArr }, { headers: hdr() });
      } else {
        await axios.put(`${API_URL}/api/admin/roles/${form.id}`, { displayName: form.displayName, description: form.description, permissions: form.permissionsArr }, { headers: hdr() });
      }
      setShowModal(false); load();
    } catch (e: any) { alert('失败: ' + (e.response?.data?.error || e.message)); } finally { setSaving(false); }
  };

  const del = async (r: R) => {
    if (r.isSystem) return alert('系统角色不可删除');
    if (!confirm(`删除角色「${r.displayName}」？`)) return;
    try { await axios.delete(`${API_URL}/api/admin/roles/${r.id}`, { headers: hdr() }); load(); }
    catch (e: any) { alert('失败: ' + (e.response?.data?.error || e.message)); }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">角色管理</h1>
        <button onClick={openCreate} className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded font-bold">+ 新建角色</button>
      </div>

      <SearchBar fields={SEARCH_FIELDS} filters={filters} setFilters={setFilters} onReset={reset} total={roles.length} filtered={filtered.length} />

      {loading ? <div className="text-center text-gray-500 py-20">加载中...</div> : (
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#1f1f1f] text-gray-400 text-xs uppercase">
              <tr><th className="p-3">显示名</th><th className="p-3">标识</th><th className="p-3">描述</th><th className="p-3">权限数</th><th className="p-3">管理员数</th><th className="p-3">类型</th><th className="p-3 text-center">操作</th></tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const pc = r.permissions ? r.permissions.split(',').filter(Boolean).length : 0;
                return (
                  <tr key={r.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                    <td className="p-3 font-bold">{r.displayName}</td>
                    <td className="p-3 text-gray-400 font-mono text-xs">{r.name}</td>
                    <td className="p-3 text-gray-400 text-xs max-w-[200px] truncate">{r.description || '-'}</td>
                    <
