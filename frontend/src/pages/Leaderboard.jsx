import { useState, useEffect } from 'react';
import { useI18n } from '../i18n/index.jsx';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const RANK_TABS = [
  { key: 'daily',   label: '日榜', range: '今日 00:00 起' },
  { key: 'weekly',  label: '周榜', range: '近 7 天' },
  { key: 'monthly', label: '月榜', range: '近 30 天' },
];

const CARD_TABS = [
  { key: 'ALL', label: '全部' },
  { key: 'SSR', label: 'SSR' },
  { key: 'SR',  label: 'SR' },
  { key: 'R',   label: 'R' },
];

const rarityColor = (r) =>
  r === 'SSR' ? 'text-yellow-400' : r === 'SR' ? 'text-purple-400' : 'text-blue-400';

const rarityBg = (r) =>
  r === 'SSR' ? 'from-yellow-500 to-orange-600'
  : r === 'SR' ? 'from-purple-500 to-pink-600'
  : 'from-blue-500 to-cyan-600';

export default function Leaderboard({ onBack }) {
  const { t } = useI18n();
  const [mainTab, setMainTab] = useState('daily'); // 'daily' | 'weekly' | 'monthly' | 'cards'
  const [cardRarity, setCardRarity] = useState('ALL');
  const [list, setList] = useState([]);
  const [cardList, setCardList] = useState([]);
  const [loading, setLoading] = useState(true);

  // 消费榜单
  useEffect(() => {
    if (mainTab === 'cards') return;
    setLoading(true);
    setList([]);
    axios.get(`${API_URL}/api/leaderboard/${mainTab}`)
      .then(res => setList(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [mainTab]);

  // 卡牌排行榜
  useEffect(() => {
    if (mainTab !== 'cards') return;
    setLoading(true);
    setCardList([]);
    axios.get(`${API_URL}/api/leaderboard/cards?rarity=${cardRarity}&limit=20`)
      .then(res => setCardList(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [mainTab, cardRarity]);

  const getRankStyle = (idx) => {
    if (idx === 0) return 'bg-yellow-500 text-black';
    if (idx === 1) return 'bg-gray-400 text-black';
    if (idx === 2) return 'bg-orange-700 text-white';
    return 'bg-[#1a0f0c] text-gray-500 border border-[#2a1414]';
  };

  const currentRange = RANK_TABS.find(x => x.key === mainTab)?.range;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <button onClick={onBack} className="text-gray-400 text-sm hover:text-white">← 返回</button>
        <div className="text-lg font-bold text-orange-400">🏆 排行榜</div>
      </div>

      {/* 主 Tab */}
      <div className="grid grid-cols-4 gap-1 bg-[#1c0e0e] rounded-lg p-1">
        {[
          { key: 'daily', label: '日榜' },
          { key: 'weekly', label: '周榜' },
          { key: 'monthly', label: '月榜' },
          { key: 'cards', label: '卡牌榜' },
        ].map(item => (
          <button
            key={item.key}
            onClick={() => setMainTab(item.key)}
            className={`py-2 text-xs font-bold rounded transition ${
              mainTab === item.key
                ? (item.key === 'cards' ? 'bg-purple-600 text-white shadow' : 'bg-orange-600 text-white shadow')
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* 消费榜单 */}
      {mainTab !== 'cards' && (
        <>
          <div className="text-center text-[10px] text-gray-500 mb-2">
            📅 {currentRange} 的消费统计
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
        </>
      )}

      {/* 卡牌排行榜 */}
      {mainTab === 'cards' && (
        <>
          <div className="flex gap-2 justify-center mb-2">
            {CARD_TABS.map(item => (
              <button
                key={item.key}
                onClick={() => setCardRarity(item.key)}
                className={`text-[11px] px-3 py-1 rounded-full font-bold transition ${
                  cardRarity === item.key
                    ? 'bg-purple-600 text-white shadow'
                    : 'bg-[#2a1414] text-gray-400'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="text-center text-[10px] text-gray-500 mb-2">
            🎴 按全服持有量排序 · Top 20
          </div>

          {loading ? (
            <div className="text-center text-gray-500 py-20 text-sm">加载中...</div>
          ) : cardList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <div className="text-5xl mb-4 opacity-30">🎴</div>
              <div className="text-sm">暂无持有数据</div>
            </div>
          ) : (
            <div className="space-y-3">
              {cardList.map((c, idx) => (
                <div key={c.cardId} className="bg-[#1c0e0e] border border-[#3d1a1a] rounded-xl p-3 flex items-center gap-3 shadow-lg">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${getRankStyle(idx)}`}>
                    {idx + 1}
                  </span>
                  <div className={`w-12 h-16 rounded overflow-hidden bg-gradient-to-br ${rarityBg(c.rarity)} p-0.5 flex-shrink-0`}>
                    <div className="w-full h-full bg-[#0d0d0d] rounded flex items-center justify-center overflow-hidden">
                      {c.imageUrl ? (
                        <img src={c.imageUrl} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl">🃏</span>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-bold text-white truncate">{c.name}</span>
                      <span className={`text-[10px] font-bold ${rarityColor(c.rarity)}`}>{c.rarity}</span>
                    </div>
                    <div className="text-[10px] text-gray-500">
                      {c.holderCount} 位用户持有
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-orange-400 font-bold text-sm">{c.totalQuantity.toLocaleString()}</div>
                    <div className="text-[9px] text-gray-500">张</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div className="bg-[#1c0e0e] border border-[#3d1a1a] rounded-xl p-3 text-[10px] text-gray-500 leading-relaxed">
        💡 排行榜数据每 5 分钟更新一次。卡牌排行榜统计的是全服所有用户的库存总量，与个人持有量无关。
      </div>
    </div>
  );
}
