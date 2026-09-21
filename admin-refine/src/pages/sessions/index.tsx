import React, { useEffect, useState } from 'react';
import axios from 'axios';
import SearchBar from '../../components/SearchBar';
import { useSearch } from '../../hooks/useSearch';

interface S { id: string; adminId: string; adminName: string; ip: string; userAgent: string; createdAt: string; lastActiveAt: string; }

const API_URL = import.meta.env.VITE_API_URL || 'https://luka-1i4g.onrender.com';
const hdr = () => { const a = JSON.parse(localStorage.getItem('adminInfo') || 'null'); return { 'x-admin-username': a?.username || '', 'x-admin-password': localStorage.getItem('adminPassword') || '' }; };
const fmt = (d: string) => !d ? '-' : (() => { const t = new Date(d); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')} ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`; })();
const ua = (s: string) => {
  if (!s) return { b: '未知', o: '未知' };
  const b = s.includes('Edg') ? 'Edge' : s.includes('Chrome') ? 'Chrome' : s.includes('Safari') ? 'Safari' : s.includes('Firefox') ? 'Firefox' : '未知';
  const o = s.includes('Windows') ? 'Windows' : s.includes('Mac') ? 'macOS' : s.includes('Linux') ? 'Linux' : s.includes('Android') ? 'Android' : s.includes('iPhone') ? 'iOS' : '未知';
  return { b, o };
};

const SEARCH_FIELDS = [
  { key: 'adminName', label: '管理员', type: 'text' as const },
  { key: 'ip', label: 'IP', type: 'text' as const },
  { key: 'createdAt', label: '登录时间', type: 'date-range' as const },
];

export default function SessionList() {
  const [list, setList] = useState<S[]>([]);
  const [loading, setLoading] = useState(true);
  const { filters, setFilters, filtered, reset } = useSearch(list, SEARCH_FIELDS);

  const load = async () => {
    setLoading(true);
    try { const { data } = await axios.get(`${API_URL}/api/admin/sessions`, { headers: hdr() }); setList(data); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const cleanup = async () => {
    if (!confirm('清理 30 天前的会话记录？')) return;
    try { const { data } = await axios.delete(`${API_URL}/api/admin/sessions/cleanup`, { headers: hdr() }); alert(`已清理 ${data.deleted} 条`); load(); }
    catch (e: any) { alert('失败: ' + (e.response?.data?.error || e.message)); }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6"><h1 className="text-2xl font-bold">会话管理</h1></div>

      <SearchBar fields={SEARCH_FIELDS} filters={filters} setFilters={setFilters} onReset={reset} total={list.length} filtered={filtered.length}
        actions={<button onClick={cleanup} className="bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white text-xs px-3 py-1.5 rounded">清理 30 天前</button>} />

      {loading ? <div className="text-center text-gray-500 py-20">加载中...</div> : (
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#1f1f1f] text-gray-400 text-xs uppercase">
              <tr><th className="p-3">管理员</th><th className="p-3">IP</th><th className="p-3">设备</th><th className="p-3">登录时间</th><th className="p-3">最近活跃</th></tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const u = ua(s.userAgent);
                return (
                  <tr key={s.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                    <td className="p-3 font-bold">{s.adminName}</td>
                    <td className="p-3 text-gray-400 font-mono text-xs">{s.ip || '未知'}</td>
                    <td className="p-3 text-gray-400 text-xs">{u.o} · {u.b}</td>
                    <td className="p-3 text-gray-400 text-xs">{fmt(s.createdAt)}</td>
                    <td className="p-3 text-gray-400 text-xs">{fmt(s.lastActiveAt)}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={5} className="text-center text-gray-500 py-10">无匹配结果</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
