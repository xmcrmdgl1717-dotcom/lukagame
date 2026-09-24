import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://luka-1i4g.onrender.com';

const hdr = () => ({
  'x-admin-username': JSON.parse(localStorage.getItem('adminInfo') || 'null')?.username || '',
  'x-admin-password': localStorage.getItem('adminPassword') || '',
});

const rarityColor = (r: string) =>
  r === 'SSR' ? 'text-yellow-400' : r === 'SR' ? 'text-purple-400' : 'text-blue-400';

const rarityBg = (r: string) =>
  r === 'SSR' ? 'from-yellow-500 to-orange-600'
  : r === 'SR' ? 'from-purple-500 to-pink-600'
  : 'from-blue-500 to-cyan-600';

interface CardRank {
  cardId: string;
  name: string;
  rarity: string;
  imageUrl: string;
  description: string;
  totalQuantity: number;
  holderCount: number;
}

export default function ReportCardRanking() {
  const [list, setList] = useState<CardRank[]>([]);
  const [loading, setLoading] = useState(true);
  const [rarity, setRarity] = useState('ALL');
  const [limit, setLimit] = useState(20);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_URL}/api/leaderboard/cards?rarity=${rarity}&limit=${limit}`, { headers: hdr() });
      setList(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [rarity, limit]);

  const totalQty = list.reduce((s, c) => s + c.totalQuantity, 0);
  const totalHolders = list.reduce((s, c) => s + c.holderCount, 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">🏆 卡牌排行榜</h1>
        <div className="text-sm text-gray-500">
          {list.length} 张卡 · 合计 {totalQty.toLocaleString()} 张 · {totalHolders} 次持有
        </div>
      </div>

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 mb-4 text-sm text-gray-400">
        💡 <span className="text-white font-bold">说明：</span>
        <p className="mt-1">• 按全服所有用户持有的卡牌总量降序排列，反映"最稀有的卡 / 最泛滥的卡"。</p>
        <p>• 持有用户数：拥有至少 1 张该卡的用户数。持有总量：所有用户持有数量的总和。</p>
        <p>• 该榜单是实时统计，可用于调整盲盒概率、策划稀缺活动等运营决策。</p>
      </div>

      {/* 筛选 */}
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <span className="text-xs text-gray-500 mr-1">稀有度：</span>
        {[
          { key: 'ALL', label: '全部' },
          { key: 'SSR', label: 'SSR' },
          { key: 'SR', label: 'SR' },
          { key: 'R', label: 'R' },
        ].map(item => (
          <button
            key={item.key}
            onClick={() => setRarity(item.key)}
            className={`text-xs px-3 py-1.5 rounded font-bold transition ${
              rarity === item.key ? 'bg-red-600 text-white' : 'bg-[#2a2a2a] text-gray-400 hover:bg-[#3a3a3a]'
            }`}
          >
            {item.label}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-gray-500">显示数量：</span>
          <select
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value))}
            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-white"
          >
            <option value={20}>Top 20</option>
            <option value={50}>Top 50</option>
            <option value={100}>Top 100</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-20">加载中...</div>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <div className="text-5xl mb-4 opacity-30">🎴</div>
          <div className="text-sm">暂无持有数据</div>
        </div>
      ) : (
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[#1f1f1f] text-gray-400 text-xs uppercase">
                <tr>
                  <th className="p-3 w-12">排名</th>
                  <th className="p-3">卡牌</th>
                  <th className="p-3">稀有度</th>
                  <th className="p-3 text-center">持有用户数</th>
                  <th className="p-3 text-center">持有总量</th>
                  <th className="p-3 text-center">人均持有</th>
                  <th className="p-3">说明</th>
                </tr>
              </thead>
              <tbody>
                {list.map((c, idx) => {
                  const avg = c.holderCount > 0 ? (c.totalQuantity / c.holderCount).toFixed(2) : '0';
                  const rankStyle =
                    idx === 0 ? 'bg-yellow-500 text-black'
                    : idx === 1 ? 'bg-gray-400 text-black'
                    : idx === 2 ? 'bg-orange-700 text-white'
                    : 'bg-[#0d0d0d] text-gray-500';
                  return (
                    <tr key={c.cardId} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                      <td className="p-3">
                        <span className={`inline-block w-8 h-8 rounded-full text-center leading-8 text-xs font-bold ${rankStyle}`}>
                          {idx + 1}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-14 rounded overflow-hidden bg-gradient-to-br ${rarityBg(c.rarity)} p-0.5 flex-shrink-0`}>
                            <div className="w-full h-full bg-[#0d0d0d] rounded flex items-center justify-center overflow-hidden">
                              {c.imageUrl ? (
                                <img src={c.imageUrl} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-lg">🃏</span>
                              )}
                            </div>
                          </div>
                          <div>
                            <div className="font-bold text-white">{c.name}</div>
                            <div className="text-[10px] text-gray-500 font-mono">{c.cardId.slice(0, 8)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`text-xs font-bold ${rarityColor(c.rarity)}`}>{c.rarity}</span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="text-cyan-400 font-bold">{c.holderCount}</span>
                        <span className="text-[10px] text-gray-500 ml-1">人</span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="text-orange-400 font-bold">{c.totalQuantity.toLocaleString()}</span>
                        <span className="text-[10px] text-gray-500 ml-1">张</span>
                      </td>
                      <td className="p-3 text-center text-gray-300">{avg}</td>
                      <td className="p-3 text-gray-500 text-xs max-w-[300px] truncate" title={c.description || '-'}>
                        {c.description || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
