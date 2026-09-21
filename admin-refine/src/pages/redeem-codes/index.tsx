import React, { useState } from 'react';
import { useTable, useCreate, useDelete } from '@refinedev/core';
import axios from 'axios';
import SearchBar from '../../components/SearchBar';
import { useSearch } from '../../hooks/useSearch';

interface C { id: string; code: string; coins: number; maxUses: number; usedCount: number; isActive: boolean; createdAt: string; }

const API_URL = import.meta.env.VITE_API_URL || 'https://luka-1i4g.onrender.com';
const fmt = (d: string) => !d ? '-' : (() => { const t = new Date(d); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')} ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`; })();

const SEARCH_FIELDS = [
  { key: 'code', label: '兑换码', type: 'text' as const },
  { key: 'coins', label: '金币', type: 'number-range' as const },
  { key: 'isActive', label: '状态', type: 'select' as const, options: [{ value: 'true', label: '启用' }, { value: 'false', label: '停用' }] },
  { key: 'createdAt', label: '创建时间', type: 'date-range' as const },
];

export default function RedeemList() {
  const { tableQueryResult } = useTable<C>({ resource: 'redeem-codes', pagination: { pageSize: 500 } });
  const { mutate: create_ } = useCreate();
  const { mutate: delete_ } = useDelete();

  const all = tableQueryResult.data?.data || [];
  const { filters, setFilters, filtered, reset } = useSearch(all, SEARCH_FIELDS);

  const [n, setN] = useState({ code: '', coins: 100, maxUses: 1 });
  const [creating, setCreating] = useState(false);
  const [batch, setBatch] = useState({ count: 10, coins: 100, maxUses: 1, prefix: 'LUKA' });
  const [batching, setBatching] = useState(false);

  const createFn = () => {
    if (!n.code) return alert('请输入兑换码');
    setCreating(true);
    create_({ resource: 'redeem-codes', values: n }, { onSuccess: () => { setN({ code: '', coins: 100, maxUses: 1 }); setCreating(false); tableQueryResult.refetch(); }, onError: () => setCreating(false) });
  };

  const batchFn = async () => {
    if (batch.count < 1 || batch.count > 100) return alert('数量 1-100');
    if (!confirm(`生成 ${batch.count} 个兑换码？每个 ${batch.coins} 金币`)) return;
    setBatching(true);
    try {
      const a = JSON.parse(localStorage.getItem('adminInfo') || 'null');
      const p = localStorage.getItem('adminPassword') || '';
      const { data } = await axios.post(`${API_URL}/api/admin/redeem-codes/batch`, batch, { headers: { 'x-admin-username': a?.username || '', 'x-admin-password': p } });
      alert(`生成 ${data.codes.length} 个：\n${data.codes.join('\n')}`);
      tableQueryResult.refetch();
    } catch (e: any) { alert('失败: ' + (e.response?.data?.error || e.message)); } finally { setBatching(false); }
  };

  const del = (c: C) => { if (confirm(`删除「${c.code}」？`)) delete_({ resource: 'redeem-codes', id: c.id }, { onSuccess: () => tableQueryResult.refetch() }); };

  return (
    <div>
      <div className="flex justify-between items-center mb-6"><h1 className="text-2xl font-bold">兑换码</h1></div>

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 mb-4">
        <div className="text-sm font-bold mb-3">单个添加</div>
        <div className="flex flex-wrap gap-2 items-center">
          <input value={n.code} onChange={(e) => setN({ ...n, code: e.target.value.toUpperCase() })} placeholder="兑换码" className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm w-44 text-white font-mono" />
          <input type="number" value={n.coins} onChange={(e) => setN({ ...n, coins: parseInt(e.target.value) || 0 })} placeholder="金币" className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm w-24 text-white" />
          <input type="number" value={n.maxUses} onChange={(e) => setN({ ...n, maxUses: parseInt(e.target.value) || 1 })} placeholder="最多使用" className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm w-24 text-white" />
          <button onClick={createFn} disabled={creating} className="bg-green-600 text-white text-sm px-4 py-1.5 rounded font-bold disabled:opacity-50">{creating ? '添加中...' : '+ 添加'}</button>
        </div>
      </div>

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 mb-4">
        <div className="text-sm font-bold mb-3">批量生成</div>
        <div className="flex flex-wrap gap-2 items-center">
          <input type="number" value={batch.count} onChange={(e) => setBatch({ ...batch, count: parseInt(e.target.value) || 1 })} placeholder="数量（最多100）" className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm w-32 text-white" />
          <input type="number" value={batch.coins} onChange={(e) => setBatch({ ...batch, coins: parseInt(e.target.value) || 0 })} placeholder="每个金币" className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm w-28 text-white" />
          <input type="number" value={batch.maxUses} onChange={(e) => setBatch({ ...batch, maxUses: parseInt(e.target.value) || 1 })} placeholder="限用次数" className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm w-28 text-white" />
          <input value={batch.prefix} onChange={(e) => setBatch({ ...batch, prefix: e.target.value.toUpperCase() })} placeholder="前缀" className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm w-24 text-white font-mono" />
          <button onClick={batchFn} disabled={batching} className="bg-purple-600 text-white text-sm px-4 py-1.5 rounded font-bold disabled:opacity-50">{batching ? '生成中...' : '⚡ 批量生成'}</button>
        </div>
      </div>

      <SearchBar fields={SEARCH_FIELDS} filters={filters} setFilters={setFilters} onReset={reset} total={all.length} filtered={filtered.length} />

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#1f1f1f] text-gray-400 text-xs uppercase">
            <tr><th className="p-3">兑换码</th><th className="p-3">金币</th><th className="p-3">已用/上限</th><th className="p-3">状态</th><th className="p-3">创建时间</th><th className="p-3 text-center">操作</th></tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                <td className="p-3 font-mono text-orange-400">{c.code}</td>
                <td className="p-3 text-yellow-500 font-bold">+{c.coins}</td>
                <td className="p-3 text-gray-400">{c.usedCount}/{c.maxUses}</td>
                <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded ${c.isActive ? 'bg-green-900/60 text-green-200' : 'bg-red-900/60 text-red-200'}`}>{c.isActive ? '启用' : '停用'}</span></td>
                <td className="p-3 text-gray-500 text-xs">{fmt(c.createdAt)}</td>
                <td className="p-3 text-center"><button onClick={() => del(c)} className="bg-red-600 text-white text-xs px-3 py-1 rounded">删除</button></td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="text-center text-gray-500 py-10">无匹配结果</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
