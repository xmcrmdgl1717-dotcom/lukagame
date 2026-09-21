import React from 'react';
import { useTable } from '@refinedev/core';
import SearchBar from '../../components/SearchBar';
import { useSearch } from '../../hooks/useSearch';

interface DrawLog {
  id: string;
  userId: string;
  boxId: string;
  cost: number;
  count: number;
  outputValue: number;
  createdAt: string;
  user: { username: string };
  box: { name: string };
}

const API_URL = import.meta.env.VITE_API_URL || 'https://luka-1i4g.onrender.com';

const fmt = (d: string) => {
  if (!d) return '-';
  const t = new Date(d);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')} ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}:${String(t.getSeconds()).padStart(2, '0')}`;
};

const SEARCH_FIELDS = [
  { key: 'user.username', label: '用户名', type: 'text' as const, field: 'user.username' },
  { key: 'box.name', label: '盲盒名', type: 'text' as const, field: 'box.name' },
  { key: 'cost', label: '消耗金币', type: 'number-range' as const },
  { key: 'count', label: '抽卡次数', type: 'number-range' as const },
  { key: 'createdAt', label: '时间', type: 'date-range' as const },
];

export default function DrawLogList() {
  const { tableQueryResult } = useTable<DrawLog>({ resource: 'drawlogs', pagination: { pageSize: 500 } });
  const all = tableQueryResult.data?.data || [];
  const { filters, setFilters, filtered, reset } = useSearch(all, SEARCH_FIELDS);

  const handleExport = async () => {
    try {
      const adminInfo = JSON.parse(localStorage.getItem('adminInfo') || 'null');
      const password = localStorage.getItem('adminPassword') || '';
      const res = await fetch(`${API_URL}/api/admin/export/drawlogs`, {
        headers: {
          'x-admin-username': adminInfo?.username || '',
          'x-admin-password': password,
        },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `drawlogs_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('导出失败');
    }
  };

  const totalCost = filtered.reduce((s, l) => s + l.cost, 0);
  const totalOutput = filtered.reduce((s, l) => s + l.outputValue, 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">抽奖记录</h1>
        <div className="text-sm text-gray-500">共 {filtered.length} 条记录</div>
      </div>

      {/* 汇总卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">总消耗金币</div>
          <div className="text-xl font-bold text-red-400">{totalCost.toLocaleString()}</div>
        </div>
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">总产出价值</div>
          <div className="text-xl font-bold text-green-400">{totalOutput.toLocaleString()}</div>
        </div>
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">产出/消耗比</div>
          <div className="text-xl font-bold text-yellow-400">
            {totalCost > 0 ? ((totalOutput / totalCost) * 100).toFixed(2) : '0.00'}%
          </div>
        </div>
      </div>

      <SearchBar
        fields={SEARCH_FIELDS}
        filters={filters}
        setFilters={setFilters}
        onReset={reset}
        total={all.length}
        filtered={filtered.length}
        actions={
          <button onClick={handleExport} className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded font-bold">
            📥 导出 CSV
          </button>
        }
      />

      {tableQueryResult.isLoading ? (
        <div className="text-center text-gray-500 py-20">加载中...</div>
      ) : (
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[#1f1f1f] text-gray-400 text-xs uppercase">
                <tr>
                  <th className="p-3">时间</th>
                  <th className="p-3">用户</th>
                  <th className="p-3">盲盒</th>
                  <th className="p-3">抽卡次数</th>
                  <th className="p-3">消耗金币</th>
                  <th className="p-3">产出价值</th>
                  <th className="p-3">盈亏</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => {
                  const profit = l.outputValue - l.cost;
                  return (
                    <tr key={l.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                      <td className="p-3 text-gray-400 text-xs">{fmt(l.createdAt)}</td>
                      <td className="p-3 font-bold">{l.user?.username || '-'}</td>
                      <td className="p-3 text-gray-300">{l.box?.name || '-'}</td>
                      <td className="p-3 text-blue-400">{l.count}</td>
                      <td className="p-3 text-red-400 font-bold">-{l.cost.toLocaleString()}</td>
                      <td className="p-3 text-green-400 font-bold">+{l.outputValue.toLocaleString()}</td>
                      <td className={`p-3 font-bold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {profit >= 0 ? '+' : ''}{profit.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && <tr><td colSpan={7} className="text-center text-gray-500 py-10">无匹配结果</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
