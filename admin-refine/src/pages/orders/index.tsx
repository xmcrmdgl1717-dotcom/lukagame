import React from 'react';
import { useTable, useUpdate } from '@refinedev/core';

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

  const { mutate: customRequest } = useUpdate();

  const orders = tableQueryResult.data?.data || [];

  const markPaid = (order: OrderItem) => {
    if (!confirm(`确定将该订单标记为已支付，并为用户「${order.user.username}」增加 ${order.coins} 金币？`)) return;
    customRequest(
      {
        resource: 'orders',
        id: order.id,
        values: {},
        meta: {
          // 因为后端接口是 PUT /api/admin/orders/:id/paid
          // 我们需要自定义 meta 让 dataProvider 用正确路径
        },
      },
      {
        onSuccess: () => tableQueryResult.refetch(),
        onError: (err: any) => alert('操作失败: ' + (err?.message || '未知错误')),
      }
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">订单管理</h1>
        <div className="text-sm text-gray-500">共 {orders.length} 条订单</div>
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
