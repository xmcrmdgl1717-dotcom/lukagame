import { useState, useEffect } from 'react';
import axios from 'axios';
import { useI18n } from '../i18n/index.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function Ranking({ onBack }) {
  const { t } = useI18n();
  const [tab, setTab] = useState('weekly');
  const [weekly, setWeekly] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [w, m] = await Promise.all([
          axios.get(`${API_URL}/api/leaderboard/weekly`),
          axios.get(`${API_URL}/api/leaderboard/monthly`),
        ]);
        setWeekly(w.data);
        setMonthly(m.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const list = tab === 'weekly' ? weekly : monthly;

  const getRankStyle = (idx) => {
    if (idx === 0) return 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-black shadow-yellow-500/50';
    if (idx === 1) return 'bg-gradient-to-br from-gray-300 to-gray-500 text-black shadow-gray-400/50';
    if (idx === 2) return 'bg-gradient-to-br from-orange-600 to-orange-800 text-white shadow-orange-600/50';
    return 'bg-[#1c0e0e] text-gray-400';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onBack} className="text-gray-400 text-sm hover:text-white">← {t('common.back', '返回')}</button>
        <div className="text-lg font-bold text-orange-400">{t('home.leaderboard', '消费排行榜')}</div>
      </div>

      {/* 切换 Tab */}
      <div className="flex justify-around bg-[#1c0e0e] rounded-lg p-1">
        <button
          onClick={() => setTab('weekly')}
          className={`flex-1 py-2 text-xs font-bold rounded transition ${tab === 'weekly' ? 'bg-red-600 text-white' : 'text-gray-400'}`}
        >
          {t('activity.weekly', '周榜')}
        </button>
        <button
          onClick={() => setTab('monthly')}
          className={`flex-1 py-2 text-xs font-bold rounded transition ${tab === 'monthly' ? 'bg-red-600 text-white' : 'text-gray-400'}`}
        >
          {t('activity.monthly', '月榜')}
        </button>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-20 text-sm">加载中...</div>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <div className="text-5xl mb-4 opacity-30">🏆</div>
          <div className="text-sm">暂无排名数据</div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* 领奖台（前 3 名） */}
          {list.length >= 3 && (
            <div className="flex justify-center items-end gap-2 mb-6 pt-6">
              {/* 第 2 名 */}
              <div className="flex flex-col items-center w-1/3">
                <div className="text-3xl mb-1">🥈</div>
                <div className="w-16 h-16 rounded-full bg-gray-700 border-2 border-gray-400 flex items-center justify-center text-xl font-bold mb-2 overflow-hidden">
                  {list[1].username.slice(0, 1).toUpperCase()}
                </div>
                <div className="text-xs font-bold text-white truncate w-full text-center">{list[1].username}</div>
                <div className="text-[10px] text-orange-400 font-bold mt-1">{list[1].totalCost.toLocaleString()} 🪙</div>
                <div className="w-full h-16 bg-gradient-to-t from-gray-600 to-gray-400 rounded-t mt-2"></div>
              </div>

              {/* 第 1 名 */}
              <div className="flex flex-col items-center w-1/3">
                <div className="text-4xl mb-1 animate-bounce">👑</div>
                <div className="w-20 h-20 rounded-full bg-yellow-600 border-4 border-yellow-400 flex items-center justify-center text-2xl font-bold mb-2 overflow-hidden shadow-lg shadow-yellow-500/30">
                  {list[0].username.slice(0, 1).toUpperCase()}
                </div>
                <div className="text-sm font-black text-yellow-400 truncate w-full text-center">{list[0].username}</div>
                <div className="text-xs text-orange-400 font-bold mt-1">{list[0].totalCost.toLocaleString()} 🪙</div>
                <div className="w-full h-24 bg-gradient-to-t from-yellow-600 to-yellow-400 rounded-t mt-2"></div>
              </div>

              {/* 第 3 名 */}
              <div className="flex flex-col items-center w-1/3">
                <div className="text-3xl mb-1">🥉</div>
                <div className="w-16 h-16 rounded-full bg-orange-900 border-2 border-orange-700 flex items-center justify-center text-xl font-bold mb-2 overflow-hidden">
                  {list[2].username.slice(0, 1).toUpperCase()}
                </div>
                <div className="text-xs font-bold text-white truncate w-full text-center">{list[2].username}</div>
                <div className="text-[10px] text-orange-400 font-bold mt-1">{list[2].totalCost.toLocaleString()} 🪙</div>
                <div className="w-full h-12 bg-gradient-to-t from-orange-800 to-orange-600 rounded-t mt-2"></div>
              </div>
            </div>
          )}

          {/* 第 4 名及以后 */}
          {list.slice(3).map((row, idx) => (
            <div key={idx} className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-3 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs bg-[#1c0e0e] text-gray-400">
                  {idx + 4}
                </span>
                <div>
                  <div className="text-sm font-bold text-white">{row.username}</div>
                  <div className="text-[10px] text-gray-500">VIP{row.vipLevel || 0}</div>
                </div>
              </div>
              <div className="text-orange-400 font-bold text-sm">{row.totalCost.toLocaleString()} 🪙</div>
            </div>
          ))}
        </div>
      )}

      <div className="text-center text-[10px] text-gray-600 pt-4 pb-2">
        排名根据{tab === 'weekly' ? '最近 7 天' : '最近 30 天'}的抽卡消费总额自动计算
      </div>
    </div>
  );
}
