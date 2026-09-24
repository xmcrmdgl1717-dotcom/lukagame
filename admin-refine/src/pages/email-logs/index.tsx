import React, { useEffect, useState } from 'react';
import axios from 'axios';
import SearchBar from '../../components/SearchBar';
import { useSearch } from '../../hooks/useSearch';
import { useSensitiveConfirm } from '../../components/SensitiveConfirm';

const API_URL = import.meta.env.VITE_API_URL || 'https://luka-1i4g.onrender.com';
const hdr = () => ({
  'x-admin-username': JSON.parse(localStorage.getItem('adminInfo') || 'null')?.username || '',
  'x-admin-password': localStorage.getItem('adminPassword') || '',
  'Content-Type': 'application/json',
});

const fmt = (d: string) => {
  if (!d) return '-';
  const t = new Date(d);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')} ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}:${String(t.getSeconds()).padStart(2, '0')}`;
};

const TYPE_LABELS: Record<string, { text: string; icon: string; cls: string }> = {
  WELCOME: { text: '欢迎邮件', icon: '👋', cls: 'bg-blue-900/60 text-blue-200' },
  RECHARGE: { text: '充值通知', icon: '💰', cls: 'bg-green-900/60 text-green-200' },
  VIP_UPGRADE: { text: 'VIP升级', icon: '👑', cls: 'bg-orange-900/60 text-orange-200' },
  SHIP: { text: '发货通知', icon: '📦', cls: 'bg-cyan-900/60 text-cyan-200' },
};

const STATUS_LABELS: Record<string, { text: string; cls: string }> = {
  SENT: { text: '✓ 已发送', cls: 'bg-green-900/60 text-green-200' },
  FAILED: { text: '✗ 失败', cls: 'bg-red-900/60 text-red-200' },
  PENDING: { text: '⏳ 发送中', cls: 'bg-yellow-900/60 text-yellow-200' },
};

interface Log {
  id: string;
  userId: string | null;
  toEmail: string;
  type: string;
  subject: string;
  status: string;
  error: string;
  createdAt: string;
  sentAt: string | null;
  user: { id: string; username: string } | null;
}

const SEARCH_FIELDS = [
  { key: 'toEmail', label: '收件邮箱', type: 'text' as const },
  { key: 'subject', label: '标题', type: 'text' as const },
  { key: 'type', label: '类型', type: 'select' as const, options: Object.entries(TYPE_LABELS).map(([k, v]) => ({ value: k, label: v.text })) },
  { key: 'status', label: '状态', type: 'select' as const, options: [{ value: 'SENT', label: '已发送' }, { value: 'FAILED', label: '失败' }] },
  { key: 'createdAt', label: '时间', type: 'date-range' as const },
];

export default function EmailLogList() {
  const [list, setList] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Log | null>(null);
  const { confirm } = useSensitiveConfirm();

  const { filters, setFilters, filtered, reset } = useSearch(list, SEARCH_FIELDS);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_URL}/api/admin/email-logs`, { headers: hdr() });
      setList(data);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const del = async (log: Log) => {
    const ok = await confirm(`即将删除邮件日志记录：\n\n收件人：${log.toEmail}\n标题：${log.subject}\n\n删除后仅移除日志，不影响已发送的邮件。`);
    if (!ok) return;
    try {
      await axios.delete(`${API_URL}/api/admin/email-logs/${log.id}`, { headers: hdr() });
      load();
    } catch (e: any) { alert('删除失败'); }
  };

  const resend = async (log: Log) => {
    if (log.status === 'SENT') {
      const ok = await confirm(`该邮件已发送成功，确认重新发送吗？\n\n收件人：${log.toEmail}`);
      if (!ok) return;
    }
    try {
      await axios.post(`${API_URL}/api/admin/email-logs/${log.id}/resend`, {}, { headers: hdr() });
      alert('✅ 已重新发送');
      load();
    } catch (e: any) { alert('重发失败: ' + (e.response?.data?.error || e.message)); }
  };

  const sentCount = list.filter(l => l.status === 'SENT').length;
  const failedCount = list.filter(l => l.status === 'FAILED').length;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">📨 邮件日志</h1>
          <div className="text-xs text-gray-500 mt-1">
            共 {list.length} 条 · 成功 <span className="text-green-400">{sentCount}</span> · 失败 <span className="text-red-400">{failedCount}</span>
          </div>
        </div>
        <button onClick={load} className="bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white text-xs px-3 py-1.5 rounded font-bold">🔄 刷新</button>
      </div>

      <SearchBar fields={SEARCH_FIELDS} filters={filters} setFilters={setFilters} onReset={reset} total={list.length} filtered={filtered.length} />

      {loading ? (
        <div className="text-center text-gray-500 py-20">加载中...</div>
      ) : (
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[#1f1f1f] text-gray-400 text-xs uppercase">
                <tr>
                  <th className="p-3">时间</th>
                  <th className="p-3">类型</th>
                  <th className="p-3">收件人</th>
                  <th className="p-3">标题</th>
                  <th className="p-3">状态</th>
                  <th className="p-3 text-center">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 500).map(log => {
                  const t = TYPE_LABELS[log.type] || { text: log.type, icon: '📧', cls: 'bg-gray-700' };
                  const st = STATUS_LABELS[log.status] || { text: log.status, cls: 'bg-gray-700' };
                  return (
                    <tr key={log.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                      <td className="p-3 text-gray-400 text-xs whitespace-nowrap">{fmt(log.createdAt)}</td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-0.5 rounded font-bold ${t.cls}`}>
                          {t.icon} {t.text}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="text-xs font-mono text-cyan-300">{log.toEmail}</div>
                        {log.user && <div className="text-[10px] text-gray-500">@{log.user.username}</div>}
                      </td>
                      <td className="p-3 text-gray-300 max-w-[280px] truncate" title={log.subject}>{log.subject}</td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-0.5 rounded font-bold ${st.cls}`}>{st.text}</span>
                      </td>
                      <td className="p-3 text-center">
                        <button onClick={() => setDetail(log)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded mr-1">详情</button>
                        <button onClick={() => resend(log)} className="bg-orange-600 hover:bg-orange-700 text-white text-xs px-2 py-1 rounded mr-1">重发</button>
                        <button onClick={() => del(log)} className="bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded">删除</button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && <tr><td colSpan={6} className="text-center text-gray-500 py-10">暂无邮件日志</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">📧 邮件详情</h3>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
            </div>
            <div className="space-y-3 text-sm">
              <div><span className="text-gray-500 w-20 inline-block">收件人：</span><span className="font-mono text-cyan-300">{detail.toEmail}</span></div>
              {detail.user && <div><span className="text-gray-500 w-20 inline-block">关联用户：</span><span className="text-white">{detail.user.username}</span></div>}
              <div><span className="text-gray-500 w-20 inline-block">类型：</span><span>{(TYPE_LABELS[detail.type] || {}).text || detail.type}</span></div>
              <div><span className="text-gray-500 w-20 inline-block">标题：</span><span className="text-white font-bold">{detail.subject}</span></div>
              <div><span className="text-gray-500 w-20 inline-block">状态：</span>
                <span className={`text-xs px-2 py-0.5 rounded font-bold ${(STATUS_LABELS[detail.status] || {}).cls}`}>
                  {(STATUS_LABELS[detail.status] || {}).text || detail.status}
                </span>
              </div>
              <div><span className="text-gray-500 w-20 inline-block">创建时间：</span><span className="text-gray-300">{fmt(detail.createdAt)}</span></div>
              {detail.sentAt && <div><span className="text-gray-500 w-20 inline-block">发送时间：</span><span className="text-gray-300">{fmt(detail.sentAt)}</span></div>}
              {detail.error && (
                <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3">
                  <div className="text-red-400 text-xs font-bold mb-1">❌ 错误信息</div>
                  <div className="text-red-300 text-xs font-mono break-all">{detail.error}</div>
                </div>
              )}
            </div>
            <div className="flex justify-end mt-6">
              <button onClick={() => setDetail(null)} className="px-4 py-2 bg-[#2a2a2a] rounded text-sm">关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
