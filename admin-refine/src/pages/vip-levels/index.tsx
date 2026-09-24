import React, { useState } from 'react';
import { useTable, useCreate, useUpdate, useDelete } from '@refinedev/core';
import SearchBar from '../../components/SearchBar';
import { useSearch } from '../../hooks/useSearch';

interface Vip {
  id: string;
  level: number;
  name: string;
  sortOrder: number;
  iconUrl: string;
  rechargeAmount: number;
  consumeAmount: number;
  benefits: string;
  isActive: boolean;
}

const SEARCH_FIELDS = [
  { key: 'name', label: '等级名称', type: 'text' as const },
  { key: 'level', label: '等级号', type: 'number-range' as const },
  { key: 'isActive', label: '状态', type: 'select' as const, options: [{ value: 'true', label: '启用' }, { value: 'false', label: '停用' }] },
];

const fmtMoney = (cents: number) => `¥${(cents / 100).toFixed(2)}`;

export default function VipLevels() {
  const { tableQueryResult } = useTable<Vip>({ resource: 'vip-levels', pagination: { pageSize: 100 } });
  const { mutate: create_ } = useCreate();
  const { mutate: update_ } = useUpdate();
  const { mutate: delete_ } = useDelete();

  const all = tableQueryResult.data?.data || [];
  const { filters, setFilters, filtered, reset } = useSearch(all, SEARCH_FIELDS);

  const [showEdit, setShowEdit] = useState(false);
  const [ed, setEd] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [n, setN] = useState({
    level: 0, name: '', sortOrder: 0, iconUrl: '',
    rechargeAmount: 0, consumeAmount: 0, benefits: '',
  });
  const [creating, setCreating] = useState(false);

  const handleCreate = () => {
    if (!n.name) return alert('请输入等级名称');
    setCreating(true);
    create_({ resource: 'vip-levels', values: n }, {
      onSuccess: () => {
        setShowCreate(false);
        setN({ level: 0, name: '', sortOrder: 0, iconUrl: '', rechargeAmount: 0, consumeAmount: 0, benefits: '' });
        setCreating(false);
        tableQueryResult.refetch();
      },
      onError: (e: any) => { alert('添加失败: ' + (e?.message || '')); setCreating(false); },
    });
  };

  const handleSave = () => {
    setSaving(true);
    update_({
      resource: 'vip-levels',
      id: ed.id,
      values: {
        name: ed.name, sortOrder: ed.sortOrder, iconUrl: ed.iconUrl,
        rechargeAmount: ed.rechargeAmount, consumeAmount: ed.consumeAmount,
        benefits: ed.benefits, isActive: ed.isActive,
      },
    }, {
      onSuccess: () => { setShowEdit(false); setSaving(false); tableQueryResult.refetch(); },
      onError: (e: any) => { alert('保存失败: ' + (e?.message || '')); setSaving(false); },
    });
  };

  const handleDelete = (v: Vip) => {
    if (v.level === 0) return alert('VIP0 不可删除');
    if (!confirm(`确定要删除「${v.name}」吗？`)) return;
    delete_({ resource: 'vip-levels', id: v.id }, {
      onSuccess: () => tableQueryResult.refetch(),
      onError: (e: any) => alert('删除失败: ' + (e?.message || '')),
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">VIP等级计算与权益</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded font-bold"
        >
          + 新建等级
        </button>
      </div>

      <SearchBar
        fields={SEARCH_FIELDS}
        filters={filters}
        setFilters={setFilters}
        onReset={reset}
        total={all.length}
        filtered={filtered.length}
      />

      {tableQueryResult.isLoading ? (
        <div className="text-center text-gray-500 py-20">加载中...</div>
      ) : (
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#1f1f1f] text-gray-400 text-xs uppercase">
              <tr>
                <th className="p-3">序号</th>
                <th className="p-3">VIP等级</th>
                <th className="p-3">排序</th>
                <th className="p-3">VIP图标</th>
                <th className="p-3">充值门槛</th>
                <th className="p-3">消耗门槛</th>
                <th className="p-3">状态</th>
                <th className="p-3 text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v, idx) => (
                <tr key={v.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                  <td className="p-3 text-gray-500 text-xs">{idx + 1}</td>
                  <td className="p-3 font-bold text-orange-400">{v.name}</td>
                  <td className="p-3 text-gray-400">{v.sortOrder}</td>
                  <td className="p-3">
                    {v.iconUrl ? (
                      <img src={v.iconUrl} className="w-8 h-8 object-cover rounded" />
                    ) : (
                      <span className="text-2xl">👑</span>
                    )}
                  </td>
                  <td className="p-3 text-green-400">{fmtMoney(v.rechargeAmount)}</td>
                  <td className="p-3 text-yellow-400">{v.consumeAmount.toLocaleString()}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${v.isActive ? 'bg-green-900/60 text-green-200' : 'bg-red-900/60 text-red-200'}`}>
                      {v.isActive ? '启用' : '停用'}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => { setEd({ ...v }); setShowEdit(true); }}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded mr-1"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDelete(v)}
                      disabled={v.level === 0}
                      className="bg-red-600 hover:bg-red-700 disabled:opacity-30 text-white text-xs px-3 py-1 rounded"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center text-gray-500 py-10">无匹配结果</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">新建 VIP 等级</h3>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1 text-xs">等级号</label>
                  <input type="number" value={n.level} onChange={(e) => setN({ ...n, level: parseInt(e.target.value) || 0 })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1 text-xs">名称</label>
                  <input value={n.name} onChange={(e) => setN({ ...n, name: e.target.value })} placeholder="VIP10" className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
                </div>
              </div>
              <div>
                <label className="block text-gray-400 mb-1 text-xs">图标 URL（可选）</label>
                <input value={n.iconUrl} onChange={(e) => setN({ ...n, iconUrl: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1 text-xs">充值门槛（分）</label>
                  <input type="number" value={n.rechargeAmount} onChange={(e) => setN({ ...n, rechargeAmount: parseInt(e.target.value) || 0 })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1 text-xs">消耗门槛</label>
                  <input type="number" value={n.consumeAmount} onChange={(e) => setN({ ...n, consumeAmount: parseInt(e.target.value) || 0 })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
                </div>
              </div>
              <div>
                <label className="block text-gray-400 mb-1 text-xs">排序</label>
                <input type="number" value={n.sortOrder} onChange={(e) => setN({ ...n, sortOrder: parseInt(e.target.value) || 0 })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-[#2a2a2a] rounded text-sm">取消</button>
              <button onClick={handleCreate} disabled={creating} className="px-4 py-2 bg-green-600 rounded text-sm font-bold disabled:opacity-50">
                {creating ? '添加中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEdit && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">编辑 {ed.name}</h3>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-gray-400 mb-1 text-xs">名称</label>
                <input value={ed.name || ''} onChange={(e) => setEd({ ...ed, name: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
              </div>
              <div>
                <label className="block text-gray-400 mb-1 text-xs">图标 URL</label>
                <input value={ed.iconUrl || ''} onChange={(e) => setEd({ ...ed, iconUrl: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
                {ed.iconUrl && <img src={ed.iconUrl} className="mt-2 h-12 rounded" />}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1 text-xs">充值门槛（分）</label>
                  <input type="number" value={ed.rechargeAmount ?? 0} onChange={(e) => setEd({ ...ed, rechargeAmount: parseInt(e.target.value) || 0 })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1 text-xs">消耗门槛</label>
                  <input type="number" value={ed.consumeAmount ?? 0} onChange={(e) => setEd({ ...ed, consumeAmount: parseInt(e.target.value) || 0 })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1 text-xs">排序</label>
                  <input type="number" value={ed.sortOrder ?? 0} onChange={(e) => setEd({ ...ed, sortOrder: parseInt(e.target.value) || 0 })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1 text-xs">状态</label>
                  <select value={String(ed.isActive)} onChange={(e) => setEd({ ...ed, isActive: e.target.value === 'true' })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white">
                    <option value="true">启用</option>
                    <option value="false">停用</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setShowEdit(false)} className="px-4 py-2 bg-[#2a2a2a] rounded text-sm">取消</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 rounded text-sm font-bold disabled:opacity-50">
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
