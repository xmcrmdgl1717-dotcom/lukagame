import React, { useState } from 'react';
import { useTable, useUpdate, useDelete } from '@refinedev/core';
import axios from 'axios';
import SearchBar from '../../components/SearchBar';
import { useSearch } from '../../hooks/useSearch';

interface T {
  id: string; title: string; content: string; status: string;
  createdAt: string; user: { username: string };
  replies: Array<{ id: string; fromAdmin: boolean; content: string; createdAt: string }>;
}

const API_URL = import.meta.env.VITE_API_URL || 'https://luka-1i4g.onrender.com';
const fmt = (d: string) => !d ? '-' : (() => { const t = new Date(d); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')} ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`; })();
const stLbl = (s: string) => s === 'OPEN' ? { t: '待处理', c: 'bg-yellow-900/60 text-yellow-200' } : s === 'PROCESSING' ? { t: '处理中', c: 'bg-blue-900/60 text-blue-200' } : { t: '已关闭', c: 'bg-gray-700 text-gray-300' };

const SEARCH_FIELDS = [
  { key: 'title', label: '标题', type: 'text' as const },
  { key: 'user.username', label: '用户名', type: 'text' as const, field: 'user.username' },
  { key: 'status', label: '状态', type: 'select' as const, options: [{ value: 'OPEN', label: '待处理' }, { value: 'PROCESSING', label: '处理中' }, { value: 'CLOSED', label: '已关闭' }] },
  { key: 'createdAt', label: '创建时间', type: 'date-range' as const },
];

export default function TicketList() {
  const { tableQueryResult } = useTable<T>({ resource: 'tickets', pagination: { pageSize: 200 } });
  const { mutate: update_ } = useUpdate();
  const { mutate: delete_ } = useDelete();

  const all = tableQueryResult.data?.data || [];
  const { filters, setFilters, filtered, reset } = useSearch(all, SEARCH_FIELDS);

  const [replies, setReplies] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<Record<string, boolean>>({});

  const reply = async (t: T) => {
    const c = replies[t.id];
    if (!c?.trim()) return alert('请输入回复');
    setSending((s) => ({ ...s, [t.id]: true }));
    try {
      const a = JSON.parse(localStorage.getItem('adminInfo') || 'null');
      const p = localStorage.getItem('adminPassword') || '';
      await axios.post(`${API_URL}/api/admin/tickets/${t.id}/reply`, { content: c }, { headers: { 'x-admin-username': a?.username || '', 'x-admin-password': p } });
      setReplies((r) => ({ ...r, [t.id]: '' }));
      tableQueryResult.refetch();
    } catch (e: any) { alert('失败: ' + (e.response?.data?.error || e.message)); } finally { setSending((s) => ({ ...s, [t.id]: false })); }
  };

  const close = async (t: T) => {
    if (!confirm('关闭工单？')) return;
    try {
      const a = JSON.parse(localStorage.getItem('adminInfo') || 'null');
      const p = localStorage.getItem('adminPassword') || '';
      await axios.put(`${API_URL}/api/admin/tickets/${t.id}/close`, {}, { headers: { 'x-admin-username': a?.username || '', 'x-admin-password': p } });
      tableQueryResult.refetch();
    } catch (e: any) { alert('失败: ' + (e.response?.data?.error || e.message)); }
  };

  const del = (t: T) => { if (confirm(`删除工单「${t.title}」？`)) delete_({ resource: 'tickets', id: t.id }, { onSuccess: () => tableQueryResult.refetch() }); };

  return (
    <div>
      <div className="flex justify-between items-center mb-6"><h1 className="text-2xl font-bold">客服工单</h1></div>

      <SearchBar fields={SEARCH_FIELDS} filters={filters} setFilters={setFilters} onReset={reset} total={all.length} filtered={filtered.length} />

      <div className="space-y-3">
        {filtered.map((t) => {
          const s = stLbl(t.status);
          return (
            <div key={t.id} className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-bold">{t.title}</div>
                  <div className="text-xs text-gray-500 mt-1">来自: {t.user?.username} · {fmt(t.createdAt)}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${s.c}`}>{s.t}</span>
              </div>
              <div className="text-sm text-gray-300 bg-[#0d0d0d] rounded p-3 mb-3">{t.content}</div>
              {t.replies?.length > 0 && (
                <div className="space-y-2 mb-3 border-l-2 border-[#2a2a2a] pl-3">
                  {t.replies.map((r) => (
                    <div key={r.id} className={`text-xs ${r.fromAdmin ? 'text-orange-300' : 'text-gray-400'}`}>
                      <span className="font-bold">{r.fromAdmin ? '👨‍💼 客服' : '👤 用户'}: </span>{r.content}
                      <span className="text-gray-600 ml-2">{fmt(r.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input value={replies[t.id] || ''} onChange={(e) => setReplies((r) => ({ ...r, [t.id]: e.target.value }))} placeholder="输入回复..." disabled={t.status === 'CLOSED'} className="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm text-white disabled:opacity-50" />
                <button onClick={() => reply(t)} disabled={sending[t.id] || t.status === 'CLOSED'} className="bg-blue-600 text-white text-xs px-4 py-1.5 rounded font-bold disabled:opacity-50">{sending[t.id] ? '发送中...' : '回复'}</button>
                {t.status !== 'CLOSED' && <button onClick={() => close(t)} className="bg-gray-600 text-white text-xs px-4 py-1.5 rounded">关闭</button>}
                <button onClick={() => del(t)} className="bg-red-600 text-white text-xs px-4 py-1.5 rounded">删除</button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div className="text-center text-gray-500 py-10">无匹配结果</div>}
      </div>
    </div>
  );
}
