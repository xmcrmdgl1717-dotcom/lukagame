import React, { useState } from 'react';
import axios from 'axios';
import SearchBar from '../../components/SearchBar';
import { useSearch } from '../../hooks/useSearch';

interface TransferLog {
  id: string;
  fromUserId: string;
  toUserId: string;
  cardId: string;
  quantity: number;
  remark: string;
  createdAt: string;
  card: { id: string; name: string; rarity: string; imageUrl: string };
  fromUser: { id: string; username: string };
  toUser: { id: string; username: string };
}

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

const SEARCH_FIELDS = [
  { key: 'fromUser.username', label: '送出用户', type: 'text' as const },
  { key: 'toUser.username', label: '接收用户', type: 'text' as const },
  { key: 'card.name', label: '卡牌名', type: 'text' as const },
  { key: 'createdAt', label: '时间', type: 'date-range' as const },
];

export default function TransferLogList() {
  const [list, setList] = useState<TransferLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<TransferLog | null>(null);

  const { filters, setFilters, filtered, reset } = useSearch(list, SEARCH_FIELDS);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_URL}/api/admin/transfer-logs`, { headers: hdr() });
      setList(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { load(); }, []);

  const handleDelete = async (log: TransferLog) => {
    if (!confirm(`确定删除这笔赠送记录吗？\n送出：${log.fromUser.username}\n接收：${log.toUser.username}\n卡牌：${log.card.name} x${log.quantity}\n\n⚠️ 删除记录不会退还卡牌库存，仅作为审计记录清理。`)) return;
    try {
      await axios.delete(`${API_URL}/api/admin/transfer-logs/${log.id}`, { headers: hdr() });
      load();
    } catch (e: any) {
      alert('删除失败: ' + (e.response?.data?.error || e.message));
    }
  };

  const rarityColor = (r: string) =>
    r === 'SSR' ? 'text-yellow-400' : r === 'SR' ? 'text-purple-400' : 'text-blue-400';

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">🎁 赠送订单管理</h1>
        <div className="text-sm text-gray-500">共 {filtered.length} 条记录</div>
      </div>

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 mb-4 text-sm text-gray-400">
        💡 <span className="text-white font-bold">说明：</span>
        <p className="mt-1">• 这里是用户之间无偿赠与卡牌的所有记录，平台不参与赠与过程，也不收取任何费用。</p>
        <p>• 删除记录仅清理审计日志，不会退还或扣减任何用户库存。</p>
        <p>• 如发现用户通过赠与进行私下交易/变现，可结合此页面取证并冻结账号。</p>
      </div>

      <SearchBar
        fields={SEARCH_FIELDS}
        filters={filters}
        setFilters={setFilters}
        onReset={reset}
        total={list.length}
        filtered={filtered.length}
      />

      {loading ? (
        <div className="text-center text-gray-500 py-20">加载中...</div>
      ) : (
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[#1f1f1f] text-gray-400 text-xs uppercase">
                <tr>
                  <th className="p-3">时间</th>
                  <th className="p-3">卡牌</th>
                  <th className="p-3">数量</th>
                  <th className="p-3">送出用户</th>
                  <th className="p-3">→</th>
                  <th className="p-3">接收用户</th>
                  <th className="p-3">留言</th>
                  <th className="p-3 text-center">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => (
                  <tr key={log.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                    <td className="p-3 text-gray-400 text-xs">{fmt(log.createdAt)}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {log.card?.imageUrl ? (
                          <img src={log.card.imageUrl} className="w-8 h-11 object-cover rounded" />
                        ) : (
                          <div className="w-8 h-11 bg-[#0d0d0d] rounded flex items-center justify-center text-lg">🃏</div>
                        )}
                        <div>
                          <div className="font-bold text-white">{log.card?.name || '未知'}</div>
                          <div className={`text-xs font-bold ${rarityColor(log.card?.rarity || 'R')}`}>
                            {log.card?.rarity}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-yellow-400 font-bold">x{log.quantity}</td>
                    <td className="p-3 text-pink-400 font-bold">{log.fromUser?.username || '-'}</td>
                    <td className="p-3 text-gray-500">→</td>
                    <td className="p-3 text-green-400 font-bold">{log.toUser?.username || '-'}</td>
                    <td className="p-3 text-gray-400 text-xs max-w-[180px] truncate" title={log.remark}>
                      {log.remark || '-'}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => setDetail(log)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded mr-1"
                      >
                        详情
                      </button>
                      <button
                        onClick={() => handleDelete(log)}
                        className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="text-center text-gray-500 py-10">暂无赠送记录</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">🎁 赠送详情</h3>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="bg-[#0d0d0d] rounded-lg p-3 text-center">
                <div className="text-[10px] text-gray-500 mb-1">记录 ID</div>
                <div className="font-mono text-xs text-gray-400">{detail.id}</div>
              </div>

              <div className="flex justify-center gap-4 py-2">
                <div className="text-center">
                  <div className="text-[10px] text-gray-500 mb-1">送出</div>
                  <div className="text-sm font-bold text-pink-400">{detail.fromUser?.username}</div>
                </div>
                <div className="flex items-center text-2xl text-gray-600">→</div>
                <div className="text-center">
                  <div className="text-[10px] text-gray-500 mb-1">接收</div>
                  <div className="text-sm font-bold text-green-400">{detail.toUser?.username}</div>
                </div>
              </div>

              <div className="bg-[#0d0d0d] rounded-lg p-3 flex items-center gap-3">
                {detail.card?.imageUrl ? (
                  <img src={detail.card.imageUrl} className="w-12 h-16 object-cover rounded" />
                ) : (
                  <div className="w-12 h-16 bg-[#1a1a1a] rounded flex items-center justify-center text-2xl">🃏</div>
                )}
                <div className="flex-1">
                  <div className="font-bold">{detail.card?.name}</div>
                  <div className={`text-xs font-bold ${rarityColor(detail.card?.rarity || 'R')}`}>
                    {detail.card?.rarity}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1">数量：x{detail.quantity}</div>
                </div>
              </div>

              {detail.remark && (
                <div className="bg-[#0d0d0d] rounded-lg p-3">
                  <div className="text-[10px] text-gray-500 mb-1">留言</div>
                  <div className="text-sm italic text-gray-300">"{detail.remark}"</div>
                </div>
              )}

              <div className="text-[10px] text-gray-500 text-center">
                赠送时间：{fmt(detail.createdAt)}
              </div>
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
