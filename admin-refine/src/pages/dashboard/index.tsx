import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://luka-1i4g.onrender.com';

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const adminInfo = JSON.parse(localStorage.getItem('adminInfo') || 'null');
    const password = localStorage.getItem('adminPassword') || '';
    axios
      .get(`${API_URL}/api/admin/stats`, {
        headers: {
          'x-admin-username': adminInfo?.username || '',
          'x-admin-password': password,
        },
      })
      .then((res) => setStats(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-500">加载中...</div>;

  const cards = [
    { label: '用户总数', value: stats.userCount ?? 0, color: 'text-blue-400' },
    { label: '卡牌总数', value: stats.cardCount ?? 0, color: 'text-yellow-400' },
    { label: '盲盒总数', value: stats.boxCount ?? 0, color: 'text-green-400' },
    { label: '订单总数', value: stats.orderCount ?? 0, color: 'text-purple-400' },
    { label: '待处理工单', value: stats.openTicketCount ?? 0, color: 'text-orange-400' },
    { label: '总收入', value: `¥${((stats.totalRevenue || 0) / 100).toFixed(2)}`, color: 'text-red-400' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">仪表盘</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 text-center">
            <div className="text-xs text-gray-500 mb-2">{c.label}</div>
            <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
