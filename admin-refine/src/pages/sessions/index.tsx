import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface SessionItem {
  id: string;
  adminId: string;
  adminName: string;
  ip: string;
  userAgent: string;
  createdAt: string;
  lastActiveAt: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'https://luka-1i4g.onrender.com';

const getHeaders = () => {
  const adminInfo = JSON.parse(localStorage.getItem('adminInfo') || 'null');
  const password = localStorage.getItem('adminPassword') || '';
  return {
    'x-admin-username': adminInfo?.username || '',
    'x-admin-password': password,
  };
};

const formatDate = (d: string) => {
  if (!d) return '-';
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
};

// 简易 UA 解析
const parseUA = (ua: string) => {
  if (!ua) return { browser: '未知', os: '未知' };
  const browser = ua.includes('Edg') ? 'Edge'
    : ua.includes('Chrome') ? 'Chrome'
    : ua.includes('Safari') ? 'Safari'
    : ua.includes('Firefox') ? 'Firefox'
    : '未知';
  const os = ua.includes('Windows') ? 'Windows'
    : ua.includes('Mac') ? 'macOS'
    : ua.includes('Linux') ? 'Linux'
    : ua.includes('Android') ? 'Android'
    : ua.includes('iPhone') ? 'iOS'
    : '未知';
  return { browser, os };
};

export default function SessionList() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_URL}/api/admin/sessions`, { headers: getHeaders() });
      setSessions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const cleanup = async () => {
    if (!confirm('确定清理 30 天前的历史会话记录吗？')) return;
    try {
      const { data } = await axios.delete(`${API_URL}/api/admin/sessions/cleanup`, { headers: getHeaders() });
      alert(`已清理 ${data.deleted} 条记录`);
      fetchSessions();
    } catch (e: any) {
      alert('清理失败: ' + (e.response?.data?.error || e.message));
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">会话管理</h1>
        <div className="flex gap-2 items-center">
          <div className="text-sm text-gray-500">最近 7 天共 {sessions.length} 条会话</div>
          <button
            onClick={cleanup}
            className="bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white text-xs px-3 py-1.5 rounded"
          >
            清理 30 天前
          </button>
        </div>
      </div>

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 mb-4 text-sm text-gray-400">
        💡 该页面显示管理员的登录记录，用于安全审计。若发现异常登录（陌生 IP、非工作时段），请及时修改密码。
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-20">加载中...</div>
      ) : sessions.length === 0 ? (
        <div className="text-center text-gray-500 py-20">暂无会话记录</div>
      ) : (
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#1f1f1f] text-gray-400 text-xs uppercase">
              <tr>
                <th className="p-3">管理员</th>
                <th className="p-3">IP 地址</th>
                <th className="p-3">设备</th>
                <th className="p-3">登录时间</th>
                <th className="p-3">最近活跃</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => {
                const ua = parseUA(s.userAgent);
                return (
                  <tr key={s.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                    <td className="p-3 font-bold">{s.adminName}</td>
                    <td className="p-3 text-gray-400 font-mono text-xs">{s.ip || '未知'}</td>
                    <td className="p-3 text-gray-400 text-xs">
                      {ua.os} · {ua.browser}
                    </td>
                    <td className="p-3 text-gray-400 text-xs">{formatDate(s.createdAt)}</td>
                    <td className="p-3 text-gray-400 text-xs">{formatDate(s.lastActiveAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
