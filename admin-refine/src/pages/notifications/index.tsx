import React, { useState } from 'react';
import { useTable, useCreate, useDelete } from '@refinedev/core';

interface NotificationItem {
  id: string;
  userId: string | null;
  title: string;
  content: string;
  createdAt: string;
  reads: Array<{ id: string; userId: string; readAt: string }>;
}

const formatDate = (d: string) => {
  if (!d) return '-';
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
};

export default function NotificationList() {
  const { tableQueryResult } = useTable<NotificationItem>({
    resource: 'notifications',
    pagination: { pageSize: 100 },
  });

  const { mutate: createNotification } = useCreate();
  const { mutate: deleteNotification } = useDelete();

  const [newNotification, setNewNotification] = useState({ userId: '', title: '', content: '' });
  const [creating, setCreating] = useState(false);

  const notifications = tableQueryResult.data?.data || [];

  const handleCreate = () => {
    if (!newNotification.title || !newNotification.content) return alert('请填写标题和内容');
    setCreating(true);
    createNotification(
      {
        resource: 'notifications',
        values: {
          userId: newNotification.userId || null,
          title: newNotification.title,
          content: newNotification.content,
        },
      },
      {
        onSuccess: () => {
          setNewNotification({ userId: '', title: '', content: '' });
          setCreating(false);
          tableQueryResult.refetch();
        },
        onError: (err: any) => {
          alert('发布失败: ' + (err?.message || '未知错误'));
          setCreating(false);
        },
      }
    );
  };

  const handleDelete = (n: NotificationItem) => {
    if (!confirm(`确定要删除通知「${n.title}」吗？`)) return;
    deleteNotification(
      { resource: 'notifications', id: n.id },
      {
        onSuccess: () => tableQueryResult.refetch(),
        onError: (err: any) => alert('删除失败: ' + (err?.message || '未知错误')),
      }
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">通知管理</h1>
        <div className="text-sm text-gray-500">共 {notifications.length} 条通知</div>
      </div>

      {/* 发布通知 */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 mb-6">
        <div className="text-sm font-bold mb-3">发布新通知</div>
        <div className="space-y-2">
          <input
            value={newNotification.userId}
            onChange={(e) => setNewNotification({ ...newNotification, userId: e.target.value })}
            placeholder="指定用户 ID（留空表示全员通知）"
            className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-sm focus:outline-none focus:border-red-500"
          />
          <input
            value={newNotification.title}
            onChange={(e) => setNewNotification({ ...newNotification, title: e.target.value })}
            placeholder="通知标题"
            className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-sm focus:outline-none focus:border-red-500"
          />
          <textarea
            rows={3}
            value={newNotification.content}
            onChange={(e) => setNewNotification({ ...newNotification, content: e.target.value })}
            placeholder="通知内容"
            className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-sm focus:outline-none focus:border-red-500"
          ></textarea>
          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-500">
              留空用户 ID 会发送给所有用户；指定用户 ID 则只发送给该用户
            </div>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm px-6 py-2 rounded font-bold"
            >
              {creating ? '发布中...' : '📣 发布通知'}
            </button>
          </div>
        </div>
      </div>

      {/* 列表 */}
      {tableQueryResult.isLoading ? (
        <div className="text-center text-gray-500 py-20">加载中...</div>
      ) : notifications.length === 0 ? (
        <div className="text-center text-gray-500 py-20">暂无通知</div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div key={n.id} className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-bold">{n.title}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {n.userId ? `指定用户: ${n.userId.slice(0, 8)}...` : '📢 全员通知'} ·{' '}
                    {formatDate(n.createdAt)}
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className="text-xs bg-blue-900/60 text-blue-200 px-2 py-0.5 rounded">
                    已读 {n.reads?.length || 0}
                  </span>
                  <button
                    onClick={() => handleDelete(n)}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded"
                  >
                    删除
                  </button>
                </div>
              </div>
              <div className="text-sm text-gray-300 bg-[#0d0d0d] rounded p-3 mt-2">{n.content}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
