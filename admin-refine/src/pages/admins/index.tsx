import React, { useState, useEffect } from 'react';
import { useTable, useCreate, useUpdate, useDelete } from '@refinedev/core';
import axios from 'axios';
import SearchBar from '../../components/SearchBar';
import { useSearch } from '../../hooks/useSearch';

interface A { id: string; username: string; roleId: string | null; role: string; roleDisplayName: string; isActive: boolean; createdAt: string; lastLoginAt: string; }
interface R { id: string; name: string; displayName: string; isSystem: boolean; }

const API_URL = import.meta.env.VITE_API_URL || 'https://luka-1i4g.onrender.com';
const fmt = (d: string) => !d ? '-' : (() => { const t = new Date(d); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')} ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`; })();

const SEARCH_FIELDS = [
  { key: 'username', label: '用户名', type: 'text' as const },
  { key: 'role', label: '角色', type: 'select' as const, options: [
    { value: 'super', label: '超级管理员' }, { value: 'admin', label: '管理员' },
    { value: 'operator', label: '运营专员' }, { value: 'support', label: '客服专员' },
  ]},
  { key: 'isActive', label: '状态', type: 'select' as const, options: [{ value: 'true', label: '启用' }, { value: 'false', label: '停用' }] },
  { key: 'createdAt', label: '创建时间', type: 'date-range' as const },
];

export default function AdminList() {
  const { tableQueryResult } = useTable<A>({ resource: 'admins', pagination: { pageSize: 100 } });
  const { mutate: create_ } = useCreate();
  const { mutate: update_ } = useUpdate();
  const { mutate: delete_ } = useDelete();

  const all = tableQueryResult.data?.data || [];
  const { filters, setFilters, filtered, reset } = useSearch(all, SEARCH_FIELDS);

  const [roles, setRoles] = useState<R[]>([]);
  const [n, setN] = useState({ username: '', password: '', roleId: '' });
  const [creating, setCreating] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [ed, setEd] = useState<any>({ password: '', roleId: '', isActive: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const a = JSON.parse(localStorage.getItem('adminInfo') || 'null');
    const p = localStorage.getItem('adminPassword') || '';
    axios.get(`${API_URL}/api/admin/roles`, { headers: { 'x-admin-username': a?.username || '', 'x-admin-password': p } }).then((res) => {
      setRoles(res.data);
      const def = res.data.find((r: R) => r.name !== 'super');
      if (def) setN((x) => ({ ...x, roleId: def.id }));
    }).catch(() => {});
  }, []);

  const createFn = () => {
    if (!n.username || !n.password || !n.roleId) return alert('请填写完整');
    setCreating(true);
    create_({ resource: 'admins', values: n }, { onSuccess: () => { setN({ username: '', password: '', roleId: roles.find((r) => r.name !== 'super')?.id || '' }); setCreating(false); tableQueryResult.refetch(); }, onError: (e: any) => { alert('失败: ' + (e?.message || '')); setCreating(false); } });
  };

  const save = () => {
    setSaving(true);
    const v: any = { isActive: ed.isActive, roleId: ed.roleId };
    if (ed.password) v.password = ed.password;
    update_({ resource: 'admins', id: ed.id, values: v }, { onSuccess: () => { setShowEdit(false); setSaving(false); tableQueryResult.refetch(); }, onError: (e: any) => { alert('失败: ' + (e?.message || '')); setSaving(false); } });
  };

  const del = (a: A) => { if (confirm(`删除「${a.username}」？`)) delete_({ resource: 'admins', id: a.id }, { onSuccess: () => tableQueryResult.refetch() }); };

  return (
    <div>
      <div className="flex justify-between items-center mb-6"><h1 className="text-2xl font-bold">管理员列表</h1></div>

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 mb-4">
        <div className="text-sm font-bold mb-3">新增管理员</div>
        <div className="flex flex-wrap gap-2 items-center">
          <input value={n.username} onChange={(e) => setN({ ...n, username: e.target.value })} placeholder="用户名" className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm w-40 text-white" />
          <input type="password" value={n.password} onChange={(e) => setN({ ...n, password: e.target.value })} placeholder="密码" className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm w-40 text-white" />
          <select value={n.roleId} onChange={(e) => setN({ ...n, roleId: e.target.value })} className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm w-48 text-white">
            <option value="">-- 选择角色 --</option>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.displayName} ({r.name})</option>)}
          </select>
          <button onClick={createFn} disabled={creating} className="bg-green-600 text-white text-sm px-4 py-1.5 rounded font-bold disabled:opacity-50">{creating ? '添加中...' : '+ 添加'}</button>
        </div>
      </div>

      <SearchBar fields={SEARCH_FIELDS} filters={filters} setFilters={setFilters} onReset={reset} total={all.length} filtered={filtered.length} />

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#1f1f1f] text-gray-400 text-xs uppercase">
            <tr><th className="p-3">用户名</th><th className="p-3">角色</th><th className="p-3">状态</th><th className="p-3">最近登录</th><th className="p-3 text-center">操作</th></tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                <td className="p-3 font-bold">{a.username}</td>
                <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded ${a.role === 'super' ? 'bg-red-900/60 text-red-200' : a.role === 'admin' ? 'bg-orange-900/60 text-orange-200' : 'bg-blue-900/60 text-blue-200'}`}>{a.roleDisplayName || a.role}</span></td>
                <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded ${a.isActive ? 'bg-green-900/60 text-green-200' : 'bg-red-900/60 text-red-200'}`}>{a.isActive ? '启用' : '停用'}</span></td>
                <td className="p-3 text-gray-400 text-xs">{fmt(a.lastLoginAt)}</td>
                <td className="p-3 text-center">
                  <button onClick={() => { setEd({ id: a.id, username: a.username, password: '', roleId: a.roleId || '', isActive: a.isActive, role: a.role }); setShowEdit(true); }} disabled={a.role === 'super'} className="bg-blue-600 disabled:opacity-30 text-white text-xs px-3 py-1 rounded mr-1">编辑</button>
                  <button onClick={() => del(a)} disabled={a.role === 'super'} className="bg-red-600 disabled:opacity-30 text-white text-xs px-3 py-1 rounded">删除</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={5} className="text-center text-gray-500 py-10">无匹配结果</td></tr>}
          </tbody>
        </table>
      </div>

      {showEdit && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">编辑管理员: {ed.username}</h3>
            <div className="space-y-3 text-sm">
              <div><label className="block text-gray-400 mb-1 text-xs">重置密码（留空不改）</label><input type="password" value={ed.password || ''} onChange={(e) => setEd({ ...ed, password: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" /></div>
              <div><label className="block text-gray-400 mb-1 text-xs">角色</label>
                <select value={ed.roleId || ''} onChange={(e) => setEd({ ...ed, roleId: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white">
                  <option value="">-- 选择角色 --</option>
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.displayName}</option>)}
                </select></div>
              <div><label className="block text-gray-400 mb-1 text-xs">状态</label>
                <select value={String(ed.isActive)} onChange={(e) => setEd({ ...ed, isActive: e.target.value === 'true' })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white">
                  <option value="true">启用</option><option value="false">停用</option>
                </select></div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setShowEdit(false)} className="px-4 py-2 bg-[#2a2a2a] rounded text-sm">取消</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 bg-blue-600 rounded text-sm font-bold disabled:opacity-50">{saving ? '保存中...' : '保存'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
