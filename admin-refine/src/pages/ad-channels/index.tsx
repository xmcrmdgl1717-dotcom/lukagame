import React, { useState } from 'react';
import { useTable, useCreate, useUpdate, useDelete } from '@refinedev/core';
import SearchBar from '../../components/SearchBar';
import { useSearch } from '../../hooks/useSearch';

interface Channel {
  id: string;
  name: string;
  displayName: string;
  type: string;
  icon: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
  campaignCount?: number;
  kolCount?: number;
}

const TYPE_LABELS: Record<string, string> = { PAID: '付费广告', KOL: '博主合作', ORGANIC: '自然流量' };
const SEARCH_FIELDS = [
  { key: 'displayName', label: '渠道名', type: 'text' as const },
  { key: 'type', label: '类型', type: 'select' as const, options: [
    { value: 'PAID', label: '付费广告' }, { value: 'KOL', label: '博主合作' }, { value: 'ORGANIC', label: '自然流量' },
  ]},
];

export default function AdChannelList() {
  const { tableQueryResult } = useTable<Channel>({ resource: 'ad-channels', pagination: { pageSize: 100 } });
  const { mutate: create_ } = useCreate();
  const { mutate: update_ } = useUpdate();
  const { mutate: delete_ } = useDelete();

  const all = tableQueryResult.data?.data || [];
  const { filters, setFilters, filtered, reset } = useSearch(all, SEARCH_FIELDS);

  const [showCreate, setShowCreate] = useState(false);
  const [n, setN] = useState({ name: '', displayName: '', type: 'PAID', icon: '', description: '', sortOrder: 0 });
  const [creating, setCreating] = useState(false);

  const [showEdit, setShowEdit] = useState(false);
  const [ed, setEd] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const handleCreate = () => {
    if (!n.name || !n.displayName) return alert('请填写标识和名称');
    setCreating(true);
    create_({ resource: 'ad-channels', values: n }, {
      onSuccess: () => {
        setShowCreate(false);
        setN({ name: '', displayName: '', type: 'PAID', icon: '', description: '', sortOrder: 0 });
        setCreating(false); tableQueryResult.refetch();
      },
      onError: (e: any) => { alert('添加失败: ' + (e?.message || '')); setCreating(false); },
    });
  };

  const handleSave = () => {
    setSaving(true);
    update_({ resource: 'ad-channels', id: ed.id, values: {
      displayName: ed.displayName, type: ed.type, icon: ed.icon, description: ed.description, isActive: ed.isActive, sortOrder: ed.sortOrder,
    }}, {
      onSuccess: () => { setShowEdit(false); setSaving(false); tableQueryResult.refetch(); },
      onError: (e: any) => { alert('保存失败: ' + (e?.message || '')); setSaving(false); },
    });
  };

  const handleDelete = (c: Channel) => {
    if (!confirm(`确定删除渠道「${c.displayName}」吗？`)) return;
    delete_({ resource: 'ad-channels', id: c.id }, {
      onSuccess: () => tableQueryResult.refetch(),
      onError: (e: any) => alert('删除失败: ' + (e?.message || '')),
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">投放渠道</h1>
        <button onClick={() => setShowCreate(true)} className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded font-bold">+ 新增渠道</button>
      </div>

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 mb-4 text-sm text-gray-400">
        💡 渠道是投流的最上层单位（如 Facebook、TikTok、KOL 合作）。用户通过渠道链接注册时会带上 UTM 参数，系统自动关联。
      </div>

      <SearchBar fields={SEARCH_FIELDS} filters={filters} setFilters={setFilters} onReset={reset} total={all.length} filtered={filtered.length} />

      {tableQueryResult.isLoading ? (
        <div className="text-center text-gray-500 py-20">加载中...</div>
      ) : (
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#1f1f1f] text-gray-400 text-xs uppercase">
              <tr><th className="p-3">图标</th><th className="p-3">标识</th><th className="p-3">名称</th><th className="p-3">类型</th><th className="p-3">活动数</th><th className="p-3">KOL数</th><th className="p-3">状态</th><th className="p-3 text-center">操作</th></tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                  <td className="p-3 text-2xl">{c.icon || '📡'}</td>
                  <td className="p-3 font-mono text-gray-400 text-xs">{c.name}</td>
                  <td className="p-3 font-bold">{c.displayName}</td>
                  <td className="p-3 text-gray-300 text-xs">{TYPE_LABELS[c.type] || c.type}</td>
                  <td className="p-3 text-blue-400 text-center">{c.campaignCount ?? 0}</td>
                  <td className="p-3 text-purple-400 text-center">{c.kolCount ?? 0}</td>
                  <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded ${c.isActive ? 'bg-green-900/60 text-green-200' : 'bg-red-900/60 text-red-200'}`}>{c.isActive ? '启用' : '停用'}</span></td>
                  <td className="p-3 text-center">
                    <button onClick={() => { setEd({ ...c }); setShowEdit(true); }} className="bg-blue-600 text-white text-xs px-3 py-1 rounded mr-1">编辑</button>
                    <button onClick={() => handleDelete(c)} className="bg-red-600 text-white text-xs px-3 py-1 rounded">删除</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={8} className="text-center text-gray-500 py-10">暂无渠道</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">新增渠道</h3>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1 text-xs">标识（英文）</label>
                  <input value={n.name} onChange={(e) => setN({ ...n, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })} placeholder="facebook" className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white font-mono" />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1 text-xs">图标</label>
                  <input value={n.icon} onChange={(e) => setN({ ...n, icon: e.target.value })} placeholder="📘" className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white text-2xl text-center" />
                </div>
              </div>
              <div>
                <label className="block text-gray-400 mb-1 text-xs">显示名</label>
                <input value={n.displayName} onChange={(e) => setN({ ...n, displayName: e.target.value })} placeholder="Facebook" className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
              </div>
              <div>
                <label className="block text-gray-400 mb-1 text-xs">类型</label>
                <select value={n.type} onChange={(e) => setN({ ...n, type: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white">
                  <option value="PAID">付费广告</option><option value="KOL">博主合作</option><option value="ORGANIC">自然流量</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-400 mb-1 text-xs">描述</label>
                <input value={n.description} onChange={(e) => setN({ ...n, description: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
              </div>
              <div>
                <label className="block text-gray-400 mb-1 text-xs">排序</label>
                <input type="number" value={n.sortOrder} onChange={(e) => setN({ ...n, sortOrder: parseInt(e.target.value) || 0 })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1 text-xs">图标</label>
                  <input value={ed.icon || ''} onChange={(e) => setEd({ ...ed, icon: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white text-2xl text-center" />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1 text-xs">排序</label>
                  <input type="number" value={ed.sortOrder ?? 0} onChange={(e) => setEd({ ...ed, sortOrder: parseInt(e.target.value) || 0 })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
                </div>
              </div>
              <div>
                <label className="block text-gray-400 mb-1 text-xs">显示名</label>
                <input value={ed.displayName || ''} onChange={(e) => setEd({ ...ed, displayName: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
              </div>
              <div>
                <label className="block text-gray-400 mb-1 text-xs">类型</label>
                <select value={ed.type || 'PAID'} onChange={(e) => setEd({ ...ed, type: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white">
                  <option value="PAID">付费广告</option><option value="KOL">博主合作</option><option value="ORGANIC">自然流量</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-400 mb-1 text-xs">描述</label>
                <input value={ed.description || ''} onChange={(e) => setEd({ ...ed, description: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
              </div>
              <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" checked={ed.isActive || false} onChange={(e) => setEd({ ...ed, isActive: e.target.checked })} />启用</label>
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
