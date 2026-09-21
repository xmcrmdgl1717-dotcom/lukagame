import React, { useEffect, useState } from 'react';
import axios from 'axios';
import SearchBar from '../../components/SearchBar';
import { useSearch } from '../../hooks/useSearch';

interface L { id: string; adminId: string; adminName: string; action: string; targetType: string; targetId: string; detail: string; ip: string; createdAt: string; }

const API_URL = import.meta.env.VITE_API_URL || 'https://luka-1i4g.onrender.com';
const hdr = () => { const a = JSON.parse(localStorage.getItem('adminInfo') || 'null'); return { 'x-admin-username': a?.username || '', 'x-admin-password': localStorage.getItem('adminPassword') || '' }; };
const fmt = (d: string) => !d ? '-' : (() => { const t = new Date(d); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')} ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}:${String(t.getSeconds()).padStart(2, '0')}`; })();

const meta = (a: string) => {
  if (a.startsWith('user.')) return { l: '用户', c: 'text-blue-400' };
  if (a.startsWith('card.')) return { l: '卡牌', c: 'text-yellow-400' };
  if (a.startsWith('box.')) return { l: '盲盒', c: 'text-green-400' };
  if (a.startsWith('recharge.')) return { l: '充值', c: 'text-purple-400' };
  if (a.startsWith('order.')) return { l: '订单', c: 'text-orange-400' };
  if (a.startsWith('banner.')) return { l: '轮播图', c: 'text-cyan-400' };
  if (a.startsWith('task.')) return { l: '任务', c: 'text-pink-400' };
  if (a.startsWith('redeem.')) return { l: '兑换码', c: 'text-yellow-400' };
  if (a.startsWith('notification.')) return { l: '通知', c: 'text-red-400' };
  if (a.startsWith('ticket.')) return { l: '工单', c: 'text-teal-400' };
  if (a.startsWith('admin.')) return { l: '管理员', c: 'text-red-500' };
  if (a.startsWith('role.')) return { l: '角色', c: 'text-orange-500' };
  return { l: '其他', c: 'text-gray-400' };
};

const verb = (a: string) => ({ create: '新增', update: '编辑', delete: '删除', batch: '批量生成', reply: '回复', close: '关闭', paid: '补单', probability: '概率配置', cleanup: '清理' }[a.split('.')[1] || ''] || a.split('.')[1]);

const SEARCH_FIELDS = [
  { key: 'action', label: '操作类型', type: 'select' as const, options: [
    { value: 'user.', label: '用户相关' }, { value: 'card.', label: '卡牌相关' },
    { value: 'box.', label: '盲盒相关' }, { value: 'order.', label: '订单相关' },
    { value: 'admin.', label: '管理员相关' }, { value: 'role.', label: '角色相关' },
  ]},
  { key: 'adminName', label: '管理员', type: 'text' as const },
  { key: 'targetType', label: '目标类型', type: 'text' as const },
  { key: 'createdAt', label: '时间', type: 'date-range' as const },
];

export default function AuditLogList() {
  const [logs, setLogs] = useState<L[]>([]);
  const [loading, setLoading] = useState(true);

  const { filters, setFilters, filtered, reset } = useSearch(logs, [
    ...SEARCH_FIELDS.slice(0, 3),
    SEARCH_FIELDS[3],
  ]);

  const load = async () => {
    setLoading(true);
    try { const { data } = await axios.get(`${API_URL}/api/admin/audit-logs`, { headers: hdr() }); setLogs(data); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const parse = (d: string) => { try { return Object.entries(JSON.parse(d)).map(([k, v]) => `${k}: ${v}`).join(', '); } catch { return d; } };

  return (
    <div>
      <div className="flex justify-between items-center mb-6"><h1 className="text-2xl font-bold">操作日志</h1></div>

      <SearchBar fields={SEARCH_FIELDS} filters={filters} setFilters={setFilters} onReset={reset} total={logs.length} filtered={filtered.length} />

      {loading ? <div className="text-center text-gray-500 py-20">加载中...</div> : (
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#1f1f1f] text-gray-400 text-xs uppercase">
                <tr><th className="p-3 whitespace-nowrap">时间</th><th className="p-3">管理员</th><th className="p-3">模块</th><th className="p-3">操作</th><th className="p-3">目标</th><th className="p-3">详情</th></tr>
              </thead>
              <tbody>
                {filtered.slice(0, 500).map((l) => {
                  const m = meta(l.action);
                  return (
                    <tr key={l.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                      <td className="p-3 text-gray-400 text-xs whitespace-nowrap">{fmt(l.createdAt)}</td>
                      <td className="p-3 font-bold">{l.adminName}</td>
                      <td className={`p-3 font-bold ${m.c}`}>{m.l}</td>
                      <td className="p-3 text-gray-300">{verb(l.action)}</td>
                      <td className="p-3 text-gray-500 text-xs font-mono">{l.targetId ? l.targetId.slice(0, 12) : '-'}</td>
                      <td className="p-3 text-gray-400 text-xs max-w-[300px] truncate" title={parse(l.detail)}>{parse(l.detail) || '-'}</td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && <tr><td colSpan={6} className="text-center text-gray-500 py-10">无匹配结果</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
