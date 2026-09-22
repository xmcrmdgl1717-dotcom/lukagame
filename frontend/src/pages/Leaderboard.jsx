import { useState, useEffect } from 'react';
import { useI18n } from '../i18n/index.jsx';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const TABS = [
  { key: 'daily',   label: '日榜', range: '今日 00:00 起' },
  { key: 'weekly',  label: '周榜', range: '近 7 天' },
  { key: 'monthly', label: '月榜', range: '近 30 天' },
];

export default function Leaderboard({ onBack }) {
  const { t } = useI18n();
  const [tab, setTab] = useState('daily');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setList([]);
    axios.get(`${API_URL}/api/leaderboard/${tab}`)
      .then(res => setList(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tab]);

  const getRankStyle = (idx) => {
    if (idx === 0) return 'bg-yellow-500 text-black';
    if (idx === 1) return 'bg-gray-400 text-black';
    if (idx === 2) return 'bg-orange-700 text-white';
    return 'bg-[#1a0f0c] text-gray-500 border border-[#2a1414]';
  };

  const currentTab = TABS.find(x => x.key === tab);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <button onClick={onBack} className="text-gray-400 text-sm hover:text-white">← 返回</button>
        <div className="text-lg font-bold text-orange-400">{t('home.leaderboard', '消费排行榜')}</div>
      </div>

      {/* Tab 切换 */}
      <div className="flex justify-around bg-[#1c0e0e] rounded-lg p-1 mb-2">
        {TABS.map(item => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`flex-1 py-2 text-xs font-bold rounded transition ${
              tab === item.key ? 'bg-orange-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* 时间范围说明 */}
      <div className="text-center text-[10px] text-gray-500 mb-2">
        📅 {currentTab?.range} 的消费统计
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
