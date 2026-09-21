import React from 'react';
import { useTable } from '@refinedev/core';
import SearchBar from '../../components/SearchBar';
import { useSearch } from '../../hooks/useSearch';

interface Transaction {
  id: string;
  userId: string;
  type: string;
  amount: number;
  balance: number;
  refType: string;
  refId: string;
  remark: string;
  createdAt: string;
}

const fmt = (d: string) => {
  if (!d) return '-';
  const t = new Date(d);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')} ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}:${String(t.getSeconds()).padStart(2, '0')}`;
};

const TYPE_LABELS: Record<string, { text: string; color: string }> = {
  RECHARGE: { text: '充值', color: 'text-green-400' },
  CONSUME: { text: '消耗', color: 'text-red-400' },
  REWARD: { text: '奖励', color: 'text-yellow-400' },
  WITHDRAWAL: { text: '提现', color: 'text-purple-400' },
  VIP_BONUS: { text: 'VIP奖励', color: 'text-orange-400' },
};

const SEARCH_FIELDS = [
  { key: 'type', label: '类型', type: 'select' as const, options: [
    { value: 'RECHARGE', label: '充值' },
    { value: 'CONSUME', label: '消耗' },
    { value: 'REWARD', label: '奖励' },
    { value: 'WITHDRAWAL', label: '提现' },
  ]},
  { key: 'userId', label: '用户 ID', type: 'text' as const },
  { key: 'createdAt', label: '时间', type: 'date-range' as const },
];

export default function TransactionList() {
  const { tableQueryResult } = useTable<Transaction>({ resource: 'transactions', pagination: { pageSize: 500 } });
  const all = tableQueryResult.data?.data || [];
  const { filters, setFilters, filtered, reset } = useSearch(all, SEARCH_FIELDS);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">交易明细</h1>
        <div className="text-sm text-gray-500">共 {filtered.length} 条</div>
      </div>

      <SearchBar fields={SEARCH_FIELDS} filters={filters} setFilters={setFilters} onReset={reset} total={all.length} filtered={filtered.length} />

      {tableQueryResult.isLoading ? (
        <div className="text-center text-gray-500 py-20">加载中...</div>
      ) : (
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[#1f1f1f] text-gray-400 text-xs uppercase">
                <tr>
                  <th className="p-3">时间</th>
                  <th className="p-3">用户 ID</th>
                  <th className="p-3">类型</th>
                  <th className="p-3">金额</th>
                  <th className="p-3">交易后余额</th>
                  <th className="p-3">备注</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const info = TYPE_LABELS[t.type] || { text: t.type, color: 'text-gray-300' };
                  return (
                    <tr key={t.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                      <td className="p-3 text-gray-400 text-xs">{fmt(t.createdAt)}</td>
                      <td className="p-3 font-mono text-xs text-gray-500">{t.userId.slice(0, 12)}...</td>
                      <td className={`p-3 font-bold ${info.color}`}>{info.text}</td>
                      <td className={`p-3 font-bold ${t.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {t.amount >= 0 ? '+' : ''}{t.amount.toLocaleString()}
                      </td>
                      <td className="p-3 text-yellow-400">{t.balance.toLocaleString()}</td>
                      <td className="p-3 text-gray-400 text-xs">{t.remark || '-'}</td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && <tr><td colSpan={6} className="text-center text-gray-500 py-10">无匹配结果</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
