import React, { useState } from 'react';
import { useTable } from '@refinedev/core';
import axios from 'axios';
import SearchBar from '../../components/SearchBar';
import { useSearch } from '../../hooks/useSearch';

interface Withdrawal {
  id: string;
  userId: string;
  amount: number;
  bankCardId: string;
  status: string;
  remark: string;
  createdAt: string;
  processedAt: string | null;
}

const API_URL = import.meta.env.VITE_API_URL || 'https://luka-1i4g.onrender.com';

const hdr = () => {
  const a = JSON.parse(localStorage.getItem('adminInfo') || 'null');
  return {
    'x-admin-username': a?.username || '',
    'x-admin-password': localStorage.getItem('adminPassword') || '',
    'Content-Type': 'application/json',
  };
};

const fmt = (d: string) => {
  if (!d) return '-';
  const t = new Date(d);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')} ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
};

const statusLbl = (s: string) => {
  if (s === 'PENDING') return { text: '待审核', cls: 'bg-yellow-900/60 text-yellow-200' };
  if (s === 'APPROVED') return { text: '已通过', cls: 'bg-blue-900/60 text-blue-200' };
  if (s === 'PAID') return { text: '已打款', cls: 'bg-green-900/60 text-green-200' };
  if (s === 'REJECTED') return { text: '已拒绝', cls: 'bg-red-900/60 text-red-200' };
  return { text: s, cls: 'bg-gray-700 text-gray-300' };
};

const SEARCH_FIELDS = [
  { key: 'status', label: '状态', type: 'select' as const, options: [
    { value: 'PENDING', label: '待审核' },
    { value: 'APPROVED', label: '已通过' },
    { value: 'PAID', label: '已打款' },
    { value: 'REJECTED', label: '已拒绝' },
  ]},
  { key: 'amount', label: '金额(分)', type: 'number-range' as const },
  { key: 'createdAt', label: '申请时间', type: 'date-range' as const },
];

export default function WithdrawalList() {
  const { tableQueryResult } = useTable<Withdrawal>({ resource: 'withdrawals', pagination: { pageSize: 200 } });
  const all = tableQueryResult.data?.data || [];
  const { filters, setFilters, filtered, reset } = useSearch(all, SEARCH_FIELDS);

  const handleApprove = async (w: Withdrawal, approve: boolean) => {
    const action = approve ? '通过' : '拒绝';
    if (!confirm(`确定要${action}这笔提现申请（${(w.amount / 100).toFixed(2)} 元）吗？`)) return;
    const remark = approve ? '' : prompt('请输入拒绝原因：') || '';
    try {
      await axios.put(`${API_URL}/api/admin/withdrawals/${w.id}/approve`, { approve, remark }, { headers: hdr() });
      tableQueryResult.refetch();
    } catch (e: any) {
      alert('操作失败: ' + (e.response?.data?.error || e.message));
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">提现记录</h1>
      </div>

      <SearchBar fields={SEARCH_FIELDS} filters={filters} setFilters={setFilters} onReset={reset} total={all.length} filtered={filtered.length} />

      {tableQueryResult.isLoading ? (
        <div className="text-center text-gray-500 py-20">加载中...</div>
      ) : (
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#1f1f1f] text-gray-400 text-xs uppercase">
              <tr>
                <th className="p-3">用户 ID</th>
                <th className="p-3">金额</th>
                <th className="p-3">状态</th>
                <th className="p-3">申请时间</th>
                <th className="p-3">处理时间</th>
                <th className="p-3">备注</th>
                <th className="p-3 text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((w) => {
                const st = statusLbl(w.status);
                return (
                  <tr key={w.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                    <td className="p-3 font-mono text-xs text-gray-400">{w.userId.slice(0, 12)}...</td>
                    <td className="p-3 text-red-400 font-bold">¥{(w.amount / 100).toFixed(2)}</td>
                    <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded ${st.cls}`}>{st.text}</span></td>
                    <td className="p-3 text-gray-400 text-xs">{fmt(w.createdAt)}</td>
                    <td className="p-3 text-gray-400 text-xs">{fmt(w.processedAt || '')}</td>
                    <td className="p-3 text-gray-500 text-xs max-w-xs truncate">{w.remark || '-'}</td>
                    <td className="p-3 text-center">
                      {w.status === 'PENDING' && (
                        <>
                          <button onClick={() => handleApprove(w, true)} className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1 rounded mr-1">通过</button>
                          <button onClick={() => handleApprove(w, false)} className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded">拒绝</button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={7} className="text-center text-gray-500 py-10">无匹配结果</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
