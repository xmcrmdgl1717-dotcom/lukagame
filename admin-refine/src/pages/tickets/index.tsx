import React, { useState } from 'react';
import { useTable, useUpdate, useDelete } from '@refinedev/core';
import axios from 'axios';

interface TicketItem {
  id: string;
  title: string;
  content: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  user: { username: string };
  replies: Array<{
    id: string;
    fromAdmin: boolean;
    content: string;
    createdAt: string;
  }>;
}

const API_URL = import.meta.env.VITE_API_URL || 'https://luka-1i4g.onrender.com';

const formatDate = (d: string) => {
  if (!d) return '-';
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
};

const statusLabel = (status: string) => {
  if (status === 'OPEN') return { text: '待处理', cls: 'bg-yellow-900/60 text-yellow-200' };
  if (status === 'PROCESSING') return { text: '处理中', cls: 'bg-blue-900/60 text-blue-200' };
  return { text: '已关闭', cls: 'bg-gray-700 text-gray-300' };
};

export default function TicketList() {
  const { tableQueryResult } = useTable<TicketItem>({
    resource: 'tickets',
    pagination: { pageSize: 100 },
  });

  const { mutate: updateTicket } = useUpdate();
  const { mutate: deleteTicket } = useDelete();

  const [replies, setReplies] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<Record<string, boolean>>({});

  const tickets = tableQueryResult.data?.data || [];

  const handleReply = async (ticket: TicketItem) => {
    const content = replies[ticket.id];
    if (!content || !content.trim()) return alert('请输入回复内容');

    setSending((s) => ({ ...s, [ticket.id]: true }));
    try {
      const adminInfo = JSON.parse(localStorage.getItem('adminInfo') || 'null');
      const password = localStorage.getItem('adminPassword') || '';
      await axios.post(
        `${API_URL}/api/admin/tickets/${ticket.id}/reply`,
        { content },
        {
          headers: {
            'x-admin-username': adminInfo?.username || '',
            'x-admin-password': password,
          },
        }
      );
      setReplies((r) => ({ ...r, [ticket.id]: '' }));
      tableQueryResult.refetch();
    } catch (e: any) {
      alert('回复失败: ' + (e.response?.data?.error || e.message));
    } finally {
      setSending((s) => ({ ...s, [ticket.id]: false }));
    }
  };

  const handleClose = (ticket: TicketItem) => {
    if (!confirm('确定要关闭该工单吗？')) return;
    updateTicket(
      {
        resource: 'tickets',
        id: ticket.id,
        values: {},
        meta: { action: 'close' }, // 后端接口是 PUT /api/admin/tickets/:id/close，在下面用 custom 替代
      },
      {
        onSuccess: () => tableQueryResult.refetch(),
        onError: async () => {
          // 回退到原生请求
          try {
            const adminInfo = JSON.parse(localStorage.getItem('adminInfo') || 'null');
            const password = localStorage.getItem('adminPassword') || '';
            await axios.put(
              `${API_URL}/api/admin/tickets/${ticket.id}/close`,
              {},
              {
                headers: {
                  'x-admin-username': adminInfo?.username || '',
                  'x-admin-password': password,
                },
              }
            );
            tableQueryResult.refetch();
          } catch (e: any) {
            alert('关闭失败: ' + (e.response?.data?.error || e.message));
          }
        },
      }
    );
  };

  const handleDelete = (ticket: TicketItem) => {
    if (!confirm(`确定要删除工单「${ticket.title}」吗？`)) return;
    deleteTicket(
      { resource: 'tickets', id: ticket.id },
      {
        onSuccess: () => tableQueryResult.refetch(),
        onError: (err: any) => alert('删除失败: ' + (err?.message || '未知错误')),
      }
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">客服工单</h1>
        <div className="text-sm text-gray-500">共 {tickets.length} 条工单</div>
      </div>

      {tableQueryResult.isLoading ? (
        <div className="text-center text-gray-500 py-20">加载中...</div>
      ) : tickets.length === 0 ? (
        <div className="text-center text-gray-500 py-20">暂无工单</div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => {
            const st = statusLabel(t.status);
            return (
              <div key={t.id} className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-bold">{t.title}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      来自：{t.user?.username || '-'} · {formatDate(t.createdAt)}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded ${st.cls}`}>{st.text}</span>
                </div>

                <div className="text-sm text-gray-300 bg-[#0d0d0d] rounded p-3 mb-3">
                  {t.content}
                </div>

                {t.replies && t.replies.length > 0 && (
                  <div className="space-y-2 mb-3 border-l-2 border-[#2a2a2a] pl-3">
                    {t.replies.map((r) => (
                      <div
                        key={r.id}
                        className={`text-xs ${r.fromAdmin ? 'text-orange-300' : 'text-gray-400'}`}
                      >
                        <span className="font-bold">
                          {r.fromAdmin ? '👨‍💼 客服' : '👤 用户'}：
                        </span>
                        {r.content}
                        <span className="text-gray-600 ml-2">{formatDate(r.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    value={replies[t.id] || ''}
                    onChange={(e) => setReplies((r) => ({ ...r, [t.id]: e.target.value }))}
                    placeholder="输入回复内容..."
                    disabled={t.status === 'CLOSED'}
                    className="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  />
                  <button
                    onClick={() => handleReply(t)}
                    disabled={sending[t.id] || t.status === 'CLOSED'}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs px-4 py-1.5 rounded font-bold"
                  >
                    {sending[t.id] ? '发送中...' : '回复'}
                  </button>
                  {t.status !== 'CLOSED' && (
                    <button
                      onClick={() => handleClose(t)}
                      className="bg-gray-600 hover:bg-gray-700 text-white text-xs px-4 py-1.5 rounded"
                    >
                      关闭
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(t)}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs px-4 py-1.5 rounded"
                  >
                    删除
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
