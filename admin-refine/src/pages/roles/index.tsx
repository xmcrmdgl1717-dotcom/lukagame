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
                    <td className="p-3 text-yellow-400 font-bold">{pc}</td>
                    <td className="p-3 text-blue-400">{r.adminCount ?? 0}</td>
                    <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded ${r.isSystem ? 'bg-orange-900/60 text-orange-200' : 'bg-blue-900/60 text-blue-200'}`}>{r.isSystem ? '系统' : '自定义'}</span></td>
                    <td className="p-3 text-center">
                      <button onClick={() => { setViewRole(r); setShowView(true); }} className="bg-gray-600 text-white text-xs px-3 py-1 rounded mr-1">查看</button>
                      <button onClick={() => openEdit(r)} disabled={r.name === 'super'} className="bg-blue-600 disabled:opacity-30 text-white text-xs px-3 py-1 rounded mr-1">编辑</button>
                      <button onClick={() => del(r)} disabled={r.isSystem} className="bg-red-600 disabled:opacity-30 text-white text-xs px-3 py-1 rounded">删除</button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={7} className="text-center text-gray-500 py-10">无匹配结果</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">{modalMode === 'create' ? '新建角色' : `编辑角色: ${form.displayName}`}</h3>
            <div className="space-y-3 text-sm mb-4">
              {modalMode === 'create' && <div><label className="block text-gray-400 mb-1 text-xs">角色标识（英文）</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })} placeholder="例如 vip_cs" className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white font-mono" /></div>}
              <div><label className="block text-gray-400 mb-1 text-xs">显示名</label><input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" /></div>
              <div><label className="block text-gray-400 mb-1 text-xs">描述</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" /></div>
            </div>
            <div className="border-t border-[#2a2a2a] pt-4 space-y-3">
              {Object.entries(groups).map(([g, ps]) => {
                const all = ps.every((p) => form.permissionsArr.includes(p.key));
                return (
                  <div key={g} className="bg-[#0d0d0d] rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <input type="checkbox" checked={all} onChange={(e) => toggleGroup(g, e.target.checked)} className="cursor-pointer" />
                      <div className="text-sm font-bold text-orange-400">{g}</div>
                      <div className="text-xs text-gray-500">({ps.filter((p) => form.permissionsArr.includes(p.key)).length}/{ps.length})</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {ps.map((p) => (
                        <label key={p.key} className={`text-xs px-2 py-1 rounded cursor-pointer ${form.permissionsArr.includes(p.key) ? 'bg-blue-600 text-white' : 'bg-[#1a1a1a] text-gray-400'}`}>
                          <input type="checkbox" className="hidden" checked={form.permissionsArr.includes(p.key)} onChange={() => togglePerm(p.key)} />
                          {p.label}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-[#2a2a2a] rounded text-sm">取消</button>
              <button onClick={save} disabled={saving} className="px-6 py-2 bg-blue-600 rounded text-sm font-bold disabled:opacity-50">{saving ? '保存中...' : '保存'}</button>
            </div>
          </div>
        </div>
      )}

      {showView && viewRole && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">查看角色: {viewRole.displayName}</h3>
            <div className="space-y-3">
              {Object.entries(groups).map(([g, ps]) => {
                const owned = ps.filter((p) => viewRole.name === 'super' || viewRole.permissions.split(',').includes(p.key));
                if (!owned.length) return null;
                return (
                  <div key={g} className="bg-[#0d0d0d] rounded-lg p-3">
                    <div className="text-sm font-bold text-orange-400 mb-2">{g} ({owned.length})</div>
                    <div className="flex flex-wrap gap-2">
                      {owned.map((p) => <span key={p.key} className="text-xs bg-green-900/60 text-green-200 px-2 py-1 rounded">{p.label}</span>)}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end mt-6"><button onClick={() => setShowView(false)} className="px-4 py-2 bg-[#2a2a2a] rounded text-sm">关闭</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
