import React, { useState } from 'react';
import { useTable, useCreate, useDelete } from '@refinedev/core';
import SearchBar from '../../components/SearchBar';
import { useSearch } from '../../hooks/useSearch';
import { useSensitiveConfirm } from '../../components/SensitiveConfirm';

interface N { id: string; userId: string | null; title: string; content: string; createdAt: string; reads: Array<{ id: string; userId: string }>; }

const fmt = (d: string) => !d ? '-' : (() => { const t = new Date(d); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')} ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`; })();

const SEARCH_FIELDS = [
  { key: 'title', label: '标题', type: 'text' as const },
  { key: 'userId', label: '类型', type: 'select' as const, options: [{ value: '__ALL__', label: '全员通知' }] },
  { key: 'createdAt', label: '创建时间', type: 'date-range' as const },
];

export default function NotificationList() {
  const { tableQueryResult } = useTable<N>({ resource: 'notifications', pagination: { pageSize: 200 } });
  const { mutate: create_ } = useCreate();
  const { mutate: delete_ } = useDelete();
  const { confirm } = useSensitiveConfirm();

  const all = tableQueryResult.data?.data || [];
  const { filters, setFilters, filtered, reset } = useSearch(all, SEARCH_FIELDS);

  const [n, setN] = useState({ userId: '', title: '', content: '' });
  const [creating, setCreating] = useState(false);

  const createFn = async () => {
    if (!n.title || !n.content) return alert('请填写标题和内容');
    const isBroadcast = !n.userId;
    const ok = await confirm(
      isBroadcast
        ? `即将向「全员」发布通知「${n.title}」。\n\n所有用户都会收到这条消息。`
        : `即将向指定用户（ID：${n.userId}）发送通知「${n.title}」。`
    );
    if (!ok) return;
    setCreating(true);
    create_({ resource: 'notifications', values: { userId: n.userId || null, title: n.title, content: n.content } }, {
      onSuccess: () => { setN({ userId: '', title: '', content: '' }); setCreating(false); tableQueryResult.refetch(); },
      onError: () => setCreating(false),
    });
  };

  const del = async (x: N) => {
    const readCount = x.reads?.length || 0;
    const ok = await confirm(
      `即将删除通知「${x.title}」。\n\n${x.userId ? '指定用户通知' : '全员通知'} · 已读 ${readCount} 人\n\n删除后，用户端「消息中心」将不再显示这条记录。`
    );
    if (!ok) return;
    delete_({ resource: 'notifications', id: x.id }, { onSuccess: () => tableQueryResult.refetch() });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6"><h1 className="text-2xl font-bold">通知管理</h1></div>

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 mb-4">
        <div className="text-sm font-bold mb-3">发布新通知</div>
        <div className="space-y-2">
          <input value={n.userId} onChange={(e) => setN({ ...n, userId: e.target.value })} placeholder="指定用户 ID（留空=全员）" className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-sm text-white" />
          <input value={n.title} onChange={(e) => setN({ ...n, title: e.target.value })} placeholder="标题" className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-sm text-white" />
          <textarea rows={3} value={n.content} onChange={(e) => setN({ ...n, content: e.target.value })} placeholder="内容" className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-sm text-white"></textarea>
          <div className="flex justify-end">
            <button onClick={createFn} disabled={creating} className="bg-green-600 text-white text-sm px-6 py-2 rounded font-bold disabled:opacity-50">{creating ? '发布中...' : '📣 发布'}</button>
          </div>
        </div>
      </div>

      <SearchBar fields={SEARCH_FIELDS} filters={filters} setFilters={setFilters} onReset={reset} total={all.length} filtered={filtered.length} />

      <div className="space-y-3">
        {filtered.map((x) => (
          <div key={x.id} className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-bold">{x.title}</div>
                <div className="text-xs text-gray-500 mt-1">{x.userId ? `指定用户: ${x.userId.slice(0, 8)}...` : '📢 全员通知'} · {fmt(x.createdAt)}</div>
              </div>
              <div className="flex gap-2">
                <span className="text-xs bg-blue-900/60 text-blue-200 px-2 py-0.5 rounded">已读 {x.reads?.length || 0}</span>
                <button onClick={() => del(x)} className="bg-red-600 text-white text-xs px-3 py-1 rounded">删除</button>
              </div>
            </div>
            <div className="text-sm text-gray-300 bg-[#0d0d0d] rounded p-3 mt-2">{x.content}</div>
          </div>
        ))}
        {filtered.length === 0 && <div className="text-center text-gray-500 py-10">无匹配结果</div>}
      </div>
    </div>
  );
}
