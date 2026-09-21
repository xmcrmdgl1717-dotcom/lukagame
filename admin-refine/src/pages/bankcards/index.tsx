import React from 'react';
import { useTable, useDelete } from '@refinedev/core';
import SearchBar from '../../components/SearchBar';
import { useSearch } from '../../hooks/useSearch';

interface BankCard {
  id: string;
  userId: string;
  cardNumber: string;
  bankName: string;
  holderName: string;
  isDefault: boolean;
  createdAt: string;
  user: { username: string };
}

const fmt = (d: string) => {
  if (!d) return '-';
  const t = new Date(d);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')} ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
};

const maskCard = (num: string) => {
  if (!num || num.length < 8) return num;
  return `${num.slice(0, 4)} **** **** ${num.slice(-4)}`;
};

const SEARCH_FIELDS = [
  { key: 'user.username', label: '用户名', type: 'text' as const, field: 'user.username' },
  { key: 'bankName', label: '银行', type: 'text' as const },
  { key: 'holderName', label: '持卡人', type: 'text' as const },
];

export default function BankCardList() {
  const { tableQueryResult } = useTable<BankCard>({ resource: 'bankcards', pagination: { pageSize: 100 } });
  const { mutate: delete_ } = useDelete();

  const all = tableQueryResult.data?.data || [];
  const { filters, setFilters, filtered, reset } = useSearch(all, SEARCH_FIELDS);

  const handleDelete = (c: BankCard) => {
    if (!confirm(`确定要删除「${c.user?.username || ''}」的这张银行卡吗？`)) return;
    delete_({ resource: 'bankcards', id: c.id }, {
      onSuccess: () => tableQueryResult.refetch(),
      onError: (e: any) => alert('删除失败: ' + (e?.message || '')),
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">绑卡管理</h1>
        <div className="text-sm text-gray-500">共 {all.length} 条绑卡记录</div>
      </div>

      <SearchBar fields={SEARCH_FIELDS} filters={filters} setFilters={setFilters} onReset={reset} total={all.length} filtered={filtered.length} />

      {tableQueryResult.isLoading ? (
        <div className="text-center text-gray-500 py-20">加载中...</div>
      ) : (
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#1f1f1f] text-gray-400 text-xs uppercase">
              <tr>
                <th className="p-3">用户</th>
                <th className="p-3">卡号</th>
                <th className="p-3">银行</th>
                <th className="p-3">持卡人</th>
                <th className="p-3">默认</th>
                <th className="p-3">绑定时间</th>
                <th className="p-3 text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                  <td className="p-3 font-bold">{c.user?.username || '-'}</td>
                  <td className="p-3 text-gray-400 font-mono text-xs">{maskCard(c.cardNumber)}</td>
                  <td className="p-3 text-gray-300">{c.bankName || '-'}</td>
                  <td className="p-3 text-gray-300">{c.holderName || '-'}</td>
                  <td className="p-3">
                    {c.isDefault ? <span className="text-xs bg-green-900/60 text-green-200 px-2 py-0.5 rounded">默认</span> : <span className="text-gray-600 text-xs">-</span>}
                  </td>
                  <td className="p-3 text-gray-500 text-xs">{fmt(c.createdAt)}</td>
                  <td className="p-3 text-center">
                    <button onClick={() => handleDelete(c)} className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded">删除</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="text-center text-gray-500 py-10">无匹配结果</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
