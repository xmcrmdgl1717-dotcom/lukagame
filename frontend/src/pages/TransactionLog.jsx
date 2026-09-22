import { useState, useEffect } from 'react';
import { useStore } from '../store';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const TYPE_MAP = {
  RECHARGE:   { text: '充值',     color: 'text-green-400',  icon: '📥' },
  CONSUME:    { text: '抽卡消耗', color: 'text-red-400',    icon: '🎰' },
  REWARD:     { text: '任务奖励', color: 'text-yellow-400', icon: '🎁' },
  WITHDRAWAL: { text: '提现',     color: 'text-purple-400', icon: '📤' },
  VIP_BONUS:  { text: 'VIP奖励',  color: 'text-orange-400', icon: '👑' },
};

const FILTERS = [
  { key: '', label: '全部' },
  { key: 'RECHARGE', label: '充值' },
  { key: 'CONSUME', label: '消耗' },
  { key: 'REWARD', label: '奖励' },
];

const fmt = (d) => {
  const t = new Date(d);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')} ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}:${String(t.getSeconds()).padStart(2, '0')}`;
};

export default function TransactionLog({ onBack }) {
  const { user } = useStore();
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(true);
  const pageSize = 20;

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (type) params.append('type', type);
      const res = await axios.get(`${API_URL}/api/user/transactions/${user.id}?${params.toString()}`);
      setList(res.data.list || []);
      setTotal(res.data.total || 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [user, page, type]);

  if (!user) return <div className="text-center text-gray-500 py-20 text-sm">请先登录</div>;

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onBack} className="text-gray-400 text-sm hover:text-white">← 返回</button>
        <h2 className="text-lg font-bold text-orange-400">账变明细</h2>
      </div>

      {/* 余额卡片 */}
      <div className="bg-gradient-to-br from-[#2d1410] to-[#4a1c12] border border-[#6b2a1e] rounded-2xl p-5 mb-4 text-center">
        <div className="text-xs text-gray-400 mb-1">当前余额</div>
        <div className="text-3xl font-black text-yellow-400">{user.coins.toLocaleString()} 🪙</div>
      </div>

      {/* 类型筛选 */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => { setType(f.key); setPage(1); }}
            className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap font-bold transition ${type === f.key ? 'bg-orange-600 text-white' : 'bg-[#1c0e0e] text-gray-400 border border-[#3d1a1a]'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-20 text-sm">加载中...</div>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <div className="text-5xl mb-4 opacity-30">📊</div>
          <div className="text-sm">暂无账变记录</div>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((t) => {
            const info = TYPE_MAP[t.type] || { text: t.type, color: 'text-gray-300', icon: '•' };
            return (
              <div key={t.id} className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-3">
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{info.icon}</span>
                    <span className={`text-sm font-bold ${info.color}`}>{info.text}</span>
                  </div>
                  <div className={`text-base font-black ${t.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {t.amount >= 0 ? '+' : ''}{t.amount.toLocaleString()}
                  </div>
                </div>
                <div className="flex justify-between items-center text-[10px] text-gray-500">
                  <div>{t.remark || '-'}</div>
                  <div className="font-mono">余额: {t.balance.toLocaleString()}</div>
                </div>
                <div className="text-[10px] text-gray-600 mt-1">{fmt(t.createdAt)}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-4">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 bg-[#2a1414] rounded text-xs disabled:opacity-30">上一页</button>
          <span className="text-xs text-gray-400">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1 bg-[#2a1414] rounded text-xs disabled:opacity-30">下一页</button>
        </div>
      )}
    </div>
  );
}
