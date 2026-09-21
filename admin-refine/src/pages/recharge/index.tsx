import React, { useState } from 'react';
import { useTable, useCreate, useUpdate, useDelete } from '@refinedev/core';
import SearchBar from '../../components/SearchBar';
import { useSearch } from '../../hooks/useSearch';

interface Opt { id: string; coins: number; bonus: number; price: number; isActive: boolean; sortOrder: number; createdAt: string; }

const SEARCH_FIELDS = [
  { key: 'coins', label: '基础金币', type: 'number-range' as const },
  { key: 'price', label: '价格(分)', type: 'number-range' as const },
  { key: 'isActive', label: '状态', type: 'select' as const, options: [{ value: 'true', label: '上架' }, { value: 'false', label: '下架' }] },
  { key: 'createdAt', label: '创建时间', type: 'date-range' as const },
];

export default function RechargeList() {
  const { tableQueryResult } = useTable<Opt>({ resource: 'recharge-options', pagination: { pageSize: 100 } });
  const { mutate: create_ } = useCreate();
  const { mutate: update_ } = useUpdate();
  const { mutate: delete_ } = useDelete();

  const all = tableQueryResult.data?.data || [];
  const { filters, setFilters, filtered, reset } = useSearch(all, SEARCH_FIELDS);

  const [n, setN] = useState({ coins: 300, bonus: 0, price: 3000, sortOrder: 0 });
  const [creating, setCreating] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [ed, setEd] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const createFn = () => {
    if (!n.coins || !n.price) return alert('请填写金币和价格');
    setCreating(true);
    create_({ resource: 'recharge-options', values: n }, { onSuccess: () => { setN({ coins: 300, bonus: 0, price: 3000, sortOrder: 0 }); setCreating(false); tableQueryResult.refetch(); }, onError: () => setCreating(false) });
  };

  const save = () => {
    setSaving(true);
    update_({ resource: 'recharge-options', id: ed.id, values: { coins: ed.coins, bonus: ed.bonus, price: ed.price, sortOrder: ed.sortOrder } }, {
      onSuccess: () => { setShowEdit(false); setSaving(false); tableQueryResult.refetch(); }, onError: () => setSaving(false),
    });
  };

  const toggle = (o: Opt) => update_({ resource: 'recharge-options', id: o.id, values: { isActive: !o.isActive } }, { onSuccess: () => tableQueryResult.refetch() });
  const del = (o: Opt) => { if (confirm(`删除套餐「${o.coins} 金币」？`)) delete_({ resource: 'recharge-options', id: o.id }, { onSuccess: () => tableQueryResult.refetch() }); };

  return (
    <div>
      <div className="flex justify-between items-center mb-6"><h1 className="text-2xl font-bold">充值套餐</h1></div>

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 mb-4">
        <div className="text-sm font-bold mb-3">新增套餐</div>
        <div className="flex flex-wrap gap-2 items-center">
          <input type="number" value={n.coins} onChange={(e) => setN({ ...n, coins: parseInt(e.target.value) || 0 })} placeholder="基础金币" className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm w-28 text-white" />
          <input type="number" value={n.bonus} onChange={(e) => setN({ ...n, bonus: parseInt(e.target.value) || 0 })} placeholder="赠送" className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm w-24 text-white" />
          <input type="number" value={n.price} onChange={(e) => setN({ ...n, price: parseInt(e.target.value) || 0 })} placeholder="价格(分)" className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm w-28 text-white" />
          <input type="number" value={n.sortOrder} onChange={(e) => setN({ ...n, sortOrder: parseInt(e.target.value) || 0 })} placeholder="排序" className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm w-20 text-white" />
          <button onClick={createFn} disabled={creating} className="bg-green-600 text-white text-sm px-4 py-1.5 rounded font-bold disabled:opacity-50">{creating ? '添加中...' : '+ 添加'}</button>
        </div>
      </div>

      <SearchBar fields={SEARCH_FIELDS} filters={filters} setFilters={setFilters} onReset={reset} total={all.length} filtered={filtered.length} />

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#1f1f1f] text-gray-400 text-xs uppercase">
            <tr><th className="p-3">基础金币</th><th className="p-3">赠送</th><th className="p-3">价格</th><th className="p-3">状态</th><th className="p-3">排序</th><th className="p-3 text-center">操作</th></tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                <td className="p-3 text-yellow-400 font-bold">{o.coins}</td>
                <td className="p-3 text-green-400">+{o.bonus}</td>
                <td className="p-3 font-bold">¥{(o.price / 100).toFixed(2)}</td>
                <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded ${o.isActive ? 'bg-green-900/60 text-green-200' : 'bg-red-900/60 text-red-200'}`}>{o.isActive ? '上架' : '下架'}</span></td>
                <td className="p-3 text-gray-400">{o.sortOrder}</td>
                <td className="p-3 text-center">
                  <button onClick={() => { setEd({ ...o }); setShowEdit(true); }} className="bg-blue-600 text-white text-xs px-3 py-1 rounded mr-1">编辑</button>
                  <button onClick={() => toggle(o)} className="bg-orange-600 text-white text-xs px-3 py-1 rounded mr-1">{o.isActive ? '下架' : '上架'}</button>
                  <button onClick={() => del(o)} className="bg-red-600 text-white text-xs px-3 py-1 rounded">删除</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="text-center text-gray-500 py-10">无匹配结果</td></tr>}
          </tbody>
        </table>
      </div>

      {showEdit && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">编辑套餐</h3>
            <div className="space-y-3 text-sm">
              <div><label className="block text-gray-400 mb-1 text-xs">基础金币</label><input type="number" value={ed.coins ?? 0} onChange={(e) => setEd({ ...ed, coins: parseInt(e.target.value) || 0 })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" /></div>
              <div><label className="block text-gray-400 mb-1 text-xs">赠送金币</label><input type="number" value={ed.bonus ?? 0} onChange={(e) => setEd({ ...ed, bonus: parseInt(e.target.value) || 0 })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" /></div>
              <div><label className="block text-gray-400 mb-1 text-xs">价格(分)</label><input type="number" value={ed.price ?? 0} onChange={(e) => setEd({ ...ed, price: parseInt(e.target.value) || 0 })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" /></div>
              <div><label className="block text-gray-400 mb-1 text-xs">排序</label><input type="number" value={ed.sortOrder ?? 0} onChange={(e) => setEd({ ...ed, sortOrder: parseInt(e.target.value) || 0 })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" /></div>
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
