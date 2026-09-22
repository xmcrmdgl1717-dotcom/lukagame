import { useState, useEffect } from 'react';
import { useI18n } from '../i18n/index.jsx';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function Leaderboard({ onBack }) {
  const { t } = useI18n();
  const [tab, setTab] = useState('weekly');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    axios.get(`${API_URL}/api/leaderboard/${tab}`)
      .then(res => setList(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tab]);

  const getRankStyle = (idx) => {
    if (idx === 0) return 'bg-yellow-500 text-black';
    if (idx === 1) return 'bg-gray-400 text-black';
    if (idx === 2) return 'bg-orange-700 text-white';
    return 'bg-[#1a0f0c] text-gray-500 border border-[#2a1414]';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <button onClick={onBack} className="text-gray-400 text-sm hover:text-white">← 返回</button>
        <div className="text-lg font-bold text-orange-400">{t('home.leaderboard', '消费排行榜')}</div>
      </div>

      {/* 切换 tabs */}
      <div className="flex justify-around bg-[#1c0e0e] rounded-lg p-1 mb-4">
        <button onClick={() => setTab('weekly')} className={`flex-1 py-2 text-xs font-bold rounded ${tab === 'weekly' ? 'bg-orange-600 text-white' : 'text-gray-400'}`}>
          周榜
        </button>
        <button onClick={() => setTab('monthly')} className={`flex-1 py-2 text-xs font-bold rounded ${tab === 'monthly' ? 'bg-orange-600 text-white' : 'text-gray-400'}`}>
          月榜
        </button>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-20 text-sm">加载中...</div>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <div className="text-5xl mb-4 opacity-30">🏆</div>
          <div className="text-sm">暂无榜单数据</div>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((row, idx) => (
            <div key={idx} className="bg-[#1c0e0e] border border-[#3d1a1a] rounded-xl p-4 flex justify-between items-center shadow-lg">
              <div className="flex items-center gap-3">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${getRankStyle(idx)}`}>
                  {idx + 1}
                </span>
                <span className="text-white font-bold">{row.username}</span>
                <span className="text-[10px] bg-orange-900/60 text-orange-200 px-2 py-0.5 rounded">
                  VIP{row.vipLevel}
                </span>
              </div>
              <span className="text-orange-400 font-bold text-sm">
                {row.totalCost.toLocaleString()} 🪙
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
