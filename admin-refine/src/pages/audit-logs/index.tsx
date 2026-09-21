import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface AuditLogItem {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  targetType: string;
  targetId: string;
  detail: string;
  ip: string;
  createdAt: string;
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
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}:${String(dt.getSeconds()).padStart(2, '0')}`;
};

// 操作类型 → 中文 + 颜色
const actionMeta = (action: string) => {
  if (action.startsWith('user.')) return { label: '用户', color: 'text-blue-400' };
  if (action.startsWith('card.')) return { label: '卡牌', color: 'text-yellow-400' };
  if (action.startsWith('box.')) return { label: '盲盒', color: 'text-green-400' };
  if (action.startsWith('recharge.')) return { label: '充值', color: 'text-purple-400' };
  if (action.startsWith('order.')) return { label: '订单', color: 'text-orange-400' };
  if (action.startsWith('banner.')) return { label: '轮播图', color: 'text-cyan-400' };
  if (action.startsWith('task.')) return { label: '任务', color: 'text-pink-400' };
  if (action.startsWith('redeem.')) return { label: '兑换码', color: 'text-yellow-400' };
  if (action.startsWith('notification.')) return { label: '通知', color: 'text-red-400' };
  if (action.startsWith('ticket.')) return { label: '工单', color: 'text-teal-400' };
  if (action.startsWith('admin.')) return { label: '管理员', color: 'text-red-500' };
  if (action.startsWith('role.')) return { label: '角色', color: 'text-orange-500' };
  return { label: '其他', color: 'text-gray-400' };
};

const actionVerb = (action: string) => {
  const verb = action.split('.')[1] || '';
  const verbs: Record<string, string> = {
    create: '新增',
    update: '编辑',
    delete: '删除',
    batch: '批量生成',
    reply: '回复',
    close: '关闭',
    paid: '补单',
    probability: '概率配置',
  };
  return verbs[verb] || verb;
};

export default function AuditLogList() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('');
  const [filterAdmin, setFilterAdmin] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterAction) params.append('action', filterAction);
      if (filterAdmin) params.append('adminName', filterAdmin);
      const { data } = await axios.get(
        `${API_URL}/api/admin/audit-logs?${params.toString()}`,
        { headers: getHeaders() }
      );
      setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const parseDetail = (detail: string) => {
    try {
      const obj = JSON.parse(detail);
      return Object.entries(obj)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
    } catch {
      return detail;
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">操作日志</h1>
        <div className="text-sm text-gray-500">共 {logs.length} 条记录（最多显示 500 条）</div>
      </div>

      {/* 筛选 */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 mb-4 flex flex-wrap gap-2 items-center">
        <input
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          placeholder="按操作类型筛选（如 user.delete）"
          className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm w-64 focus:outline-none focus:border-red-500"
        />
        <input
          value={filterAdmin}
          onChange={(e) => setFilterAdmin(e.target.value)}
          placeholder="按管理员名筛选"
          className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm w-48 focus:outline-none focus:border-red-500"
        />
        <button
          onClick={fetchLogs}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-1.5 rounded font-bold"
        >
          🔍 筛选
        </button>
        <button
          onClick={() => {
            setFilterAction('');
            setFilterAdmin('');
            setTimeout(fetchLogs, 0);
          }}
          className="bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white text-sm px-4 py-1.5 rounded"
        >
          清空
        </button>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-20">加载中...</div>
      ) : logs.length === 0 ? (
        <div className="text-center text-gray-500 py-20">暂无日志记录</div>
      ) : (
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#1f1f1f] text-gray-400 text-xs uppercase">
                <tr>
                  <th className="p-3 whitespace-nowrap">时间</th>
                  <th className="p-3">管理员</th>
                  <th className="p-3">模块</th>
                  <th className="p-3">操作</th>
                  <th className="p-3">目标类型</th>
                  <th className="p-3">目标 ID</th>
                  <th className="p-3">详情</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const meta = actionMeta(log.action);
                  return (
                    <tr key={log.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                      <td className="p-3 text-gray-400 text-xs whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="p-3 font-bold">{log.adminName}</td>
                      <td className={`p-3 font-bold ${meta.color}`}>{meta.label}</td>
                      <td className="p-3 text-gray-300">{actionVerb(log.action)}</td>
                      <td className="p-3 text-gray-500 text-xs">{log.targetType || '-'}</td>
                      <td className="p-3 text-gray-500 text-xs font-mono">
                        {log.targetId ? log.targetId.slice(0, 12) : '-'}
                      </td>
                      <td className="p-3 text-gray-400 text-xs max-w-[300px] truncate" title={parseDetail(log.detail)}>
                        {parseDetail(log.detail) || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
