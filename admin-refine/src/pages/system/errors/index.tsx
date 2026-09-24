import React, { useEffect, useState } from 'react';
import axios from 'axios';
import SearchBar from '../../../components/SearchBar';
import { useSearch } from '../../../hooks/useSearch';
import { useSensitiveConfirm } from '../../../components/SensitiveConfirm';

const API_URL = import.meta.env.VITE_API_URL || 'https://luka-1i4g.onrender.com';
const hdr = () => ({
  'x-admin-username': JSON.parse(localStorage.getItem('adminInfo') || 'null')?.username || '',
  'x-admin-password': localStorage.getItem('adminPassword') || '',
});

const fmt = (d: string) => {
  if (!d) return '-';
  const t = new Date(d);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')} ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}:${String(t.getSeconds()).padStart(2, '0')}`;
};

interface ErrorLog {
  id: string;
  userId: string | null;
  username: string;
  message: string;
  stack: string;
  url: string;
  userAgent: string;
  ip: string;
  createdAt: string;
}

const SEARCH_FIELDS = [
  { key: 'username', label: '用户名', type: 'text' as const },
  { key: 'message', label: '错误信息', type: 'text' as const },
  { key: 'ip', label: 'IP', type: 'text' as const },
  { key: 'createdAt', label: '时间', type: 'date-range' as const },
];

export default function ClientErrorList() {
  const [list, setList] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<ErrorLog | null>(null);
  const [days, setDays] = useState(7);
  const { confirm } = useSensitiveConfirm();

  const { filters, setFilters, filtered, reset } = useSearch(list, SEARCH_FIELDS);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_URL}/api/admin/client-errors?days=${days}`, { headers: hdr() });
      setList(data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [days]);

  const del = async (log: ErrorLog) => {
    const ok = await confirm(`确定删除这条错误日志吗？\n\n错误信息：${log.message.slice(0, 80)}`);
    if (!ok) return;
    try {
      await axios.delete(`${API_URL}/api/admin/client-errors/${log.id}`, { headers: hdr() });
      load();
    } catch (e) { alert('删除失败'); }
  };

  const cleanup = async () => {
    const ok = await confirm('即将清理 30 天前的所有错误日志。\n\n此操作不可恢复，仅保留最近 30 天的记录。');
    if (!ok) return;
    try {
      const { data } = await axios.delete(`${API_URL}/api/admin/client-errors/cleanup`, { headers: hdr() });
      alert(`已清理 ${data.deleted} 条`);
      load();
    } catch (e) { alert('清理失败'); }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">🐛 前端错误日志</h1>
          <div className="text-xs text-gray-500 mt-1">共 {list.length} 条记录（近 {days} 天）</div>
        </div>
        <div className="flex gap-2">
          {[1, 7, 30].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`text-xs px-3 py-1.5 rounded font-bold ${days === d ? 'bg-red-600 text-white' : 'bg-[#2a2a2a] text-gray-400'}`}
            >
              {d} 天
            </button>
          ))}
          <button onClick={cleanup} className="text-xs px-3 py-1.5 rounded font-bold bg-[#2a2a2a] text-gray-400 hover:bg-[#3a3a3a]">
            清理 30 天前
          </button>
        </div>
      </div>

      <SearchBar fields={SEARCH_FIELDS} filters={filters} setFilters={setFilters} onReset={reset} total={list.length} filtered={filtered.length} />

      {loading ? (
        <div className="text-center text-gray-500 py-20">加载中...</div>
      ) : (
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#1f1f1f] text-gray-400 text-xs uppercase">
                <tr>
                  <th className="p-3 whitespace-nowrap">时间</th>
                  <th className="p-3">用户</th>
                  <th className="p-3">错误信息</th>
                  <th className="p-3">路径</th>
                  <th className="p-3 text-center">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 500).map(log => (
                  <tr key={log.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                    <td className="p-3 text-gray-400 text-xs whitespace-nowrap">{fmt(log.createdAt)}</td>
                    <td className="p-3">
                      {log.username ? (
                        <span className="text-cyan-300 text-xs">{log.username}</span>
                      ) : (
                        <span className="text-gray-600 text-xs">匿名</span>
                      )}
                    </td>
                    <td className="p-3 text-red-300 text-xs max-w-[400px] truncate" title={log.message}>{log.message}</td>
                    <td className="p-3 text-gray-500 text-xs font-mono max-w-[200px] truncate" title={log.url}>{log.url || '-'}</td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <button onClick={() => setDetail(log)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded mr-1">详情</button>
                      <button onClick={() => del(log)} className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded">删除</button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={5} className="text-center text-gray-500 py-10">✓ 暂无错误记录</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">🐛 错误详情</h3>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex gap-3">
                <span className="text-gray-500 w-24 flex-shrink-0">时间：</span>
                <span className="text-gray-300">{fmt(detail.createdAt)}</span>
              </div>
              <div className="flex gap-3">
                <span className="text-gray-500 w-24 flex-shrink-0">用户：</span>
                <span className="text-gray-300">{detail.username || '匿名'}</span>
              </div>
              <div className="flex gap-3">
                <span className="text-gray-500 w-24 flex-shrink-0">IP：</span>
                <span className="text-gray-300 font-mono text-xs">{detail.ip || '-'}</span>
              </div>
              <div className="flex gap-3">
                <span className="text-gray-500 w-24 flex-shrink-0">URL：</span>
                <span className="text-gray-300 font-mono text-xs break-all">{detail.url || '-'}</span>
              </div>
              <div className="flex gap-3">
                <span className="text-gray-500 w-24 flex-shrink-0">UA：</span>
                <span className="text-gray-400 text-xs break-all">{detail.userAgent || '-'}</span>
              </div>

              <div>
                <div className="text-gray-500 text-xs mb-2">错误信息</div>
                <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3 text-red-300 text-xs font-mono break-all">
                  {detail.message}
                </div>
              </div>

              {detail.stack && (
                <div>
                  <div className="text-gray-500 text-xs mb-2">堆栈</div>
                  <pre className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg p-3 text-gray-400 text-[10px] font-mono whitespace-pre-wrap break-all max-h-[400px] overflow-y-auto">
                    {detail.stack}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-5">
              <button onClick={() => setDetail(null)} className="px-4 py-2 bg-[#2a2a2a] rounded text-sm">关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
