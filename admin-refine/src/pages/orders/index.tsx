import React from 'react';
import { useTable } from '@refinedev/core';
import axios from 'axios';
import SearchBar from '../../components/SearchBar';
import { useSearch } from '../../hooks/useSearch';
import { useSensitiveConfirm } from '../../components/SensitiveConfirm';

interface O { id: string; amount: number; coins: number; status: string; createdAt: string; paidAt: string; user: { username: string }; option: { coins: number; bonus: number }; }

const API_URL = import.meta.env.VITE_API_URL || 'https://luka-1i4g.onrender.com';
const fmt = (d: string) => !d ? '-' : (() => { const t = new Date(d); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')} ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`; })();

const SEARCH_FIELDS = [
  { key: 'user.username', label: '用户名', type: 'text' as const, field: 'user.username' },
  { key: 'status', label: '订单状态', type: 'select' as const, options: [{ value: 'PAID', label: '已支付' }, { value: 'PENDING', label: '待支付' }] },
  { key: 'amount', label: '金额(分)', type: 'number-range' as const },
  { key: 'coins', label: '到账金币', type: 'number-range' as const },
  { key: 'createdAt', label: '创建时间', type: 'date-range' as const },
];

export default function OrderList() {
  const { tableQueryResult } = useTable<O>({ resource: 'orders', pagination: { pageSize: 500 } });
  const all = tableQueryResult.data?.data || [];
  const { confirm } = useSensitiveConfirm();

  const { filters, setFilters, filtered, reset } = useSearch(all, SEARCH_FIELDS);

  const markPaid = async (o: O) => {
    const ok = await confirm(
      `即将手动为订单「${o.id.slice(0, 8)}」补单。\n\n用户：${o.user.username}\n金额：¥${(o.amount / 100).toFixed(2)}\n到账金币：${o.coins}\n\n⚠️ 此操作会立即为用户增加 ${o.coins} 金币，并计入累计充值金额，请确认已收到款项。`
    );
    if (!ok) return;
    try {
      const a = JSON.parse(localStorage.getItem('adminInfo') || 'null');
      const p = localStorage.getItem('adminPassword') || '';
      await axios.put(`${API_URL}/api/admin/orders/${o.id}/paid`, {}, { headers: { 'x-admin-username': a?.username || '', 'x-admin-password': p } });
      tableQueryResult.refetch();
    } catch (e: any) { alert('失败: ' + (e.response?.data?.error || e.message)); }
  };

  const handleExport = async () => {
    const a = JSON.parse(localStorage.getItem('adminInfo') || 'null');
    const p = localStorage.getItem('adminPassword') || '';
    const res = await fetch(`${API_URL}/api/admin/export/orders`, { headers: { 'x-admin-username': a?.username || '', 'x-admin-password': p } });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const el = document.createElement('a');
    el.href = url; el.download = `orders_${Date.now()}.csv`; el.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6"><h1 className="text-2xl font-bold">订单管理</h1></div>

      <SearchBar fields={SEARCH_FIELDS} filters={filters} setFilters={setFilters} onReset={reset} total={all.length} filtered={filtered.length}
        actions={<button onClick={handleExport} className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded font-bold">📥 导出 CSV</button>} />

      {tableQueryResult.isLoading ? (
        <div className="text-center text-gray-500 py-20">加载中...</div>
      ) : (
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[#1f1f1f] text-gray-400 text-xs uppercase">
                <tr><th className="p-3">订单号</th><th className="p-3">用户</th><th className="p-3">套餐</th><th className="p-3">金额</th><th className="p-3">金币</th><th className="p-3">状态</th><th className="p-3">时间</th><th className="p-3 text-center">操作</th></tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                    <td className="p-3 text-gray-500 text-xs">{o.id.slice(0, 8)}</td>
                    <td className="p-3">{o.user?.username}</td>
                    <td className="p-3 text-gray-400">{o.option?.coins ?? 0} + {o.option?.bonus ?? 0}</td>
                    <td className="p-3 text-red-400 font-bold">¥{((o.amount || 0) / 100).toFixed(2)}</td>
                    <td className="p-3 text-yellow-400 font-bold">{o.coins}</td>
                    <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded ${o.status === 'PAID' ? 'bg-green-900/60 text-green-200' : 'bg-yellow-900/60 text-yellow-200'}`}>{o.status}</span></td>
                    <td className="p-3 text-gray-400 text-xs">{fmt(o.createdAt)}</td>
                    <td className="p-3 text-center">{o.status !== 'PAID' && <button onClick={() => markPaid(o)} className="bg-green-600 text-white text-xs px-3 py-1 rounded">补单</button>}</td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={8} className="text-center text-gray-500 py-10">无匹配结果</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
