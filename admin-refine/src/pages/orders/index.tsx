import React from 'react';
import { useTable, useUpdate } from '@refinedev/core';
import axios from 'axios';

interface OrderItem {
  id: string;
  amount: number;
  coins: number;
  status: string;
  createdAt: string;
  paidAt: string;
  user: { username: string };
  option: { coins: number; bonus: number };
}

const API_URL = import.meta.env.VITE_API_URL || 'https://luka-1i4g.onrender.com';

const formatDate = (d: string) => {
  if (!d) return '-';
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
};

export default function OrderList() {
  const { tableQueryResult } = useTable<OrderItem>({
    resource: 'orders',
    pagination: { pageSize: 200 },
  });

  const orders = tableQueryResult.data?.data || [];

  const markPaid = async (order: OrderItem) => {
    if (!confirm(`确定将该订单标记为已支付，并为用户「${order.user.username}」增加 ${order.coins} 金币？`)) return;
    try {
      const adminInfo = JSON.parse(localStorage.getItem('adminInfo') || 'null');
      const password = localStorage.getItem('adminPassword') || '';
      await axios.put(
        `${API_URL}/api/admin/orders/${order.id}/paid`,
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
      alert('操作失败: ' + (e.response?.data?.error || e.message));
    }
  };

  const handleExport = async () => {
    try {
      const adminInfo = JSON.parse(localStorage.getItem('adminInfo') || 'null');
      const password = localStorage.getItem('adminPassword') || '';
      const res = await fetch(`${API_URL}/api/admin/export/orders`, {
        headers: {
          'x-admin-username': adminInfo?.username || '',
          'x-admin-password': password,
        },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orders_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('导出失败');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">订单管理</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded font-bold"
          >
            📥 导出 CSV
          </button>
          <div className="text-sm text-gray-500">共 {orders.length} 条订单</div>
        </div>
      </div>

      {tableQueryResult.isLoading ? (
        <div className="text-center text-gray-500 py-20">加载中...</div>
      ) : (
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[#1f1f1f] text-gray-400 text-xs uppercase">
                <tr>
                  <th className="p-3">订单号</th>
                  <th className="p-3">用户</th>
                  <th className="p-3">套餐</th>
                  <th className="p-3">金额</th>
                  <th className="p-3">金币</th>
                  <th className="p-3">状态</th>
                  <th className="p-3">创建时间</th>
                  <th className="p-3 text-center">操作</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                    <td className="p-3 text-gray-500 text-xs">{o.id.slice(0, 8)}</td>
                    <td className="p-3">{o.user?.username || '-'}</td>
                    <td className="p-3 text-gray-400">
                      {o.option?.coins ?? 0} + {o.option?.bonus ?? 0}
                    </td>
                    <td className="p-3 text-red-400 font-bold">
                      ¥{((o.amount || 0) / 100).toFixed(2)}
                    </td>
                    <td className="p-3 text-yellow-400 font-bold">{o.coins}</td>
                    <td className="p-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          o.status === 'PAID'
                            ? 'bg-green-900/60 text-green-200'
                            : 'bg-yellow-900/60 text-yellow-200'
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="p-3 text-gray-400 text-xs">{formatDate(o.createdAt)}</td>
                    <td className="p-3 text-center">
                      {o.status !== 'PAID' && (
                        <button
                          onClick={() => markPaid(o)}
                          className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1 rounded"
                        >
                          手动补单
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center text-gray-500 py-10">
                      暂无订单
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
