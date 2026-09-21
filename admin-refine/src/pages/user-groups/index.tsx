import React, { useState } from 'react';
import { useTable, useCreate, useUpdate, useDelete } from '@refinedev/core';
import SearchBar from '../../components/SearchBar';
import { useSearch } from '../../hooks/useSearch';

interface UserGroup {
  id: string;
  name: string;
  displayName: string;
  description: string;
  color: string;
  sortOrder: number;
  userCount?: number;
}

const SEARCH_FIELDS = [
  { key: 'displayName', label: '显示名', type: 'text' as const },
  { key: 'name', label: '标识', type: 'text' as const },
];

export default function UserGroupList() {
  const { tableQueryResult } = useTable<UserGroup>({ resource: 'user-groups', pagination: { pageSize: 100 } });
  const { mutate: create_ } = useCreate();
  const { mutate: update_ } = useUpdate();
  const { mutate: delete_ } = useDelete();

  const all = tableQueryResult.data?.data || [];
  const { filters, setFilters, filtered, reset } = useSearch(all, SEARCH_FIELDS);

  const [showEdit, setShowEdit] = useState(false);
  const [ed, setEd] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [n, setN] = useState({ name: '', displayName: '', description: '', color: '#6366f1', sortOrder: 0 });
  const [creating, setCreating] = useState(false);

  const handleCreate = () => {
    if (!n.name || !n.displayName) return alert('请填写标识和显示名');
    setCreating(true);
    create_({ resource: 'user-groups', values: n }, {
      onSuccess: () => {
        setShowCreate(false);
        setN({ name: '', displayName: '', description: '', color: '#6366f1', sortOrder: 0 });
        setCreating(false);
        tableQueryResult.refetch();
      },
      onError: (e: any) => { alert('添加失败: ' + (e?.message || '')); setCreating(false); },
    });
  };

  const handleSave = () => {
    setSaving(true);
    update_({
      resource: 'user-groups', id: ed.id,
      values: { displayName: ed.displayName, description: ed.description, color: ed.color, sortOrder: ed.sortOrder },
    }, {
      onSuccess: () => { setShowEdit(false); setSaving(false); tableQueryResult.refetch(); },
      onError: (e: any) => { alert('保存失败: ' + (e?.message || '')); setSaving(false); },
    });
  };

  const handleDelete = (g: UserGroup) => {
    if (!confirm(`确定要删除「${g.displayName}」吗？`)) return;
    delete_({ resource: 'user-groups', id: g.id }, {
      onSuccess: () => tableQueryResult.refetch(),
      onError: (e: any) => alert('删除失败: ' + (e?.message || '')),
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">用户分组</h1>
        <button onClick={() => setShowCreate(true)} className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded font-bold">+ 新建分组</button>
      </div>

      <SearchBar fields={SEARCH_FIELDS} filters={filters} setFilters={setFilters} onReset={reset} total={all.length} filtered={filtered.length} />

      {tableQueryResult.isLoading ? (
        <div className="text-center text-gray-500 py-20">加载中...</div>
      ) : (
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#1f1f1f] text-gray-400 text-xs uppercase">
              <tr>
                <th className="p-3">颜色</th>
                <th className="p-3">标识</th>
                <th className="p-3">显示名</th>
                <th className="p-3">描述</th>
                <th className="p-3">用户数</th>
                <th className="p-3">排序</th>
                <th className="p-3 text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((g) => (
                <tr key={g.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                  <td className="p-3">
                    <span className="inline-block w-4 h-4 rounded" style={{ backgroundColor: g.color }}></span>
                  </td>
                  <td className="p-3 text-gray-400 font-mono text-xs">{g.name}</td>
                  <td className="p-3 font-bold">{g.displayName}</td>
                  <td className="p-3 text-gray-400 text-xs">{g.description || '-'}</td>
                  <td className="p-3 text-blue-400">{g.userCount ?? 0}</td>
                  <td className="p-3 text-gray-400">{g.sortOrder}</td>
                  <td className="p-3 text-center">
                    <button onClick={() => { setEd({ ...g }); setShowEdit(true); }} className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded mr-1">编辑</button>
                    <button onClick={() => handleDelete(g)} className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded">删除</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="text-center text-gray-500 py-10">无匹配结果</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">新建分组</h3>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-gray-400 mb-1 text-xs">标识（英文）</label>
                <input value={n.name} onChange={(e) => setN({ ...n, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })} placeholder="vip_customer" className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white font-mono" />
              </div>
              <div>
                <label className="block text-gray-400 mb-1 text-xs">显示名</label>
                <input value={n.displayName} onChange={(e) => setN({ ...n, displayName: e.target.value })} placeholder="VIP客户" className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
              </div>
              <div>
                <label className="block text-gray-400 mb-1 text-xs">描述</label>
                <input value={n.description} onChange={(e) => setN({ ...n, description: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1 text-xs">颜色</label>
                  <input type="color" value={n.color} onChange={(e) => setN({ ...n, color: e.target.value })} className="w-full h-10 bg-[#0d0d0d] border border-[#2a2a2a] rounded" />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1 text-xs">排序</label>
                  <input type="number" value={n.sortOrder} onChange={(e) => setN({ ...n, sortOrder: parseInt(e.target.value) || 0 })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-[#2a2a2a] rounded text-sm">取消</button>
              <button onClick={handleCreate} disabled={creating} className="px-4 py-2 bg-green-600 rounded text-sm font-bold disabled:opacity-50">{creating ? '添加中...' : '创建'}</button>
            </div>
          </div>
        </div>
      )}

      {showEdit && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">编辑 {ed.displayName}</h3>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-gray-400 mb-1 text-xs">显示名</label>
                <input value={ed.displayName || ''} onChange={(e) => setEd({ ...ed, displayName: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
              </div>
              <div>
                <label className="block text-gray-400 mb-1 text-xs">描述</label>
                <input value={ed.description || ''} onChange={(e) => setEd({ ...ed, description: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1 text-xs">颜色</label>
                  <input type="color" value={ed.color || '#6366f1'} onChange={(e) => setEd({ ...ed, color: e.target.value })} className="w-full h-10 bg-[#0d0d0d] border border-[#2a2a2a] rounded" />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1 text-xs">排序</label>
                  <input type="number" value={ed.sortOrder ?? 0} onChange={(e) => setEd({ ...ed, sortOrder: parseInt(e.target.value) || 0 })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setShowEdit(false)} className="px-4 py-2 bg-[#2a2a2a] rounded text-sm">取消</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 rounded text-sm font-bold disabled:opacity-50">{saving ? '保存中...' : '保存'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
