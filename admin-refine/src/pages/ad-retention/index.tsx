import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://luka-1i4g.onrender.com';
const hdr = () => ({
  'x-admin-username': JSON.parse(localStorage.getItem('adminInfo') || 'null')?.username || '',
  'x-admin-password': localStorage.getItem('adminPassword') || '',
});

interface ChannelRetention {
  channelId: string;
  channelName: string;
  channelIcon: string;
  channelType: string;
  registerCount: number;
  paidUserCount: number;
  payRate: string;
  totalRevenue: number;
  avgLTV: number;
  retentionD1: string;
  retentionD3: string;
  retentionD7: string;
  retentionD14: string;
  retentionD30: string;
  cost: number;
  roi: string;
  cac: number;
}

interface Summary {
  totalRegisters: number;
  totalPaidUsers: number;
  totalRevenue: number;
  totalCost: number;
  payRate: string;
  roi: string;
  avgLTV: number;
  cac: number;
}

interface ApiResponse {
  list: ChannelRetention[];
  summary: Summary;
  range: { days: number; since: string };
}

const yuan = (cents: number) => `¥${(cents / 100).toFixed(2)}`;

const roiColor = (roi: string) => {
  const r = parseFloat(roi);
  if (r >= 150) return 'text-green-400';
  if (r >= 100) return 'text-yellow-400';
  if (r > 0) return 'text-red-400';
  return 'text-gray-500';
};

const retentionColor = (rate: string) => {
  const r = parseFloat(rate);
  if (r >= 30) return 'text-green-400';
  if (r >= 15) return 'text-yellow-400';
  if (r > 0) return 'text-orange-400';
  return 'text-gray-500';
};

const TYPE_LABELS: Record<string, string> = {
  PAID: '💸 付费', KOL: '👤 KOL', ORGANIC: '🌱 自然',
};

export default function AdRetentionReport() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<keyof ChannelRetention>('roi');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_URL}/api/admin/reports/ad-retention?days=${days}`, { headers: hdr() });
      setData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [days]);

  if (loading) return <div className="text-center text-gray-500 py-20">加载中...</div>;
  if (!data) return <div className="text-center text-gray-500 py-20">加载失败</div>;

  const { list, summary } = data;

  const sorted = [...list].sort((a, b) => {
    const va = a[sortKey];
    const vb = b[sortKey];
    let cmp = 0;
    if (typeof va === 'number' && typeof vb === 'number') cmp = va - vb;
    else cmp = parseFloat(String(va)) - parseFloat(String(vb));
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const toggleSort = (key: keyof ChannelRetention) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const SortHeader = ({ k, label, align = 'left' }: { k: keyof ChannelRetention; label: string; align?: 'left' | 'center' | 'right' }) => (
    <th
      className={`p-3 cursor-pointer hover:text-white select-none whitespace-nowrap text-${align}`}
      onClick={() => toggleSort(k)}
    >
      {label}
      {sortKey === k && (
        <span className="ml-1 text-red-500">{sortDir === 'asc' ? '▲' : '▼'}</span>
      )}
    </th>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">📈 广告留存报表</h1>
          <div className="text-xs text-gray-500 mt-1">
            按投放渠道评估用户质量：注册 → 付费 → 留存 → LTV → ROI
          </div>
        </div>
        <div className="flex gap-2">
          {[7, 14, 30, 60, 90].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`text-xs px-3 py-1.5 rounded font-bold transition ${
                days === d ? 'bg-red-600 text-white' : 'bg-[#2a2a2a] text-gray-400 hover:bg-[#3a3a3a]'
              }`}
            >
              近 {d} 天
            </button>
          ))}
        </div>
      </div>

      {/* 汇总卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="text-[10px] text-gray-500 mb-1">总注册</div>
          <div className="text-lg font-black text-blue-400">{summary.totalRegisters.toLocaleString()}</div>
        </div>
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="text-[10px] text-gray-500 mb-1">总付费用户</div>
          <div className="text-lg font-black text-cyan-400">{summary.totalPaidUsers.toLocaleString()}</div>
        </div>
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="text-[10px] text-gray-500 mb-1">综合付费率</div>
          <div className="text-lg font-black text-green-400">{summary.payRate}%</div>
        </div>
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="text-[10px] text-gray-500 mb-1">总营收</div>
          <div className="text-lg font-black text-orange-400">{yuan(summary.totalRevenue)}</div>
        </div>
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="text-[10px] text-gray-500 mb-1">总花费</div>
          <div className="text-lg font-black text-red-400">{yuan(summary.totalCost)}</div>
        </div>
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="text-[10px] text-gray-500 mb-1">综合 ROI</div>
          <div className={`text-lg font-black ${roiColor(summary.roi)}`}>{summary.roi}%</div>
        </div>
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="text-[10px] text-gray-500 mb-1">平均 LTV</div>
          <div className="text-lg font-black text-yellow-400">{yuan(summary.avgLTV)}</div>
        </div>
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="text-[10px] text-gray-500 mb-1">平均 CAC</div>
          <div className="text-lg font-black text-purple-400">{yuan(summary.cac)}</div>
        </div>
      </div>

      {/* 说明 */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 mb-4 text-sm text-gray-400">
        💡 <span className="text-white font-bold">指标说明：</span>
        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-xs">
          <div>• <span className="text-white">留存 D1/D3/D7</span> = 注册后第 N 天有登录行为</div>
          <div>• <span className="text-white">LTV</span> = 渠道累计营收 / 注册用户数</div>
          <div>• <span className="text-white">CAC</span> = 渠道总花费 / 注册用户数</div>
          <div>• <span className="text-white">ROI</span> = 渠道累计营收 / 渠道总花费</div>
        </div>
        <div className="mt-3 text-yellow-200 text-[11px]">
          ⚠️ 判定健康度：ROI ≥ 150% 优秀，100% - 150% 合格，&lt; 100% 亏损需要优化。LTV &gt; CAC 才能盈利。
        </div>
      </div>

      {/* 主表 */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#1f1f1f] text-gray-400 text-xs uppercase">
              <tr>
                <th className="p-3">渠道</th>
                <SortHeader k="registerCount" label="注册数" align="center" />
                <SortHeader k="paidUserCount" label="付费用户" align="center" />
                <SortHeader k="payRate" label="付费率" align="center" />
                <SortHeader k="retentionD1" label="D1" align="center" />
                <SortHeader k="retentionD3" label="D3" align="center" />
                <SortHeader k="retentionD7" label="D7" align="center" />
                <SortHeader k="retentionD30" label="D30" align="center" />
                <SortHeader k="avgLTV" label="LTV" align="center" />
                <SortHeader k="cost" label="花费" align="center" />
                <SortHeader k="cac" label="CAC" align="center" />
                <SortHeader k="roi" label="ROI" align="center" />
              </tr>
            </thead>
            <tbody>
              {sorted.map(c => (
                <tr key={c.channelId} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{c.channelIcon || '📡'}</span>
                      <div>
                        <div className="font-bold text-white">{c.channelName}</div>
                        <div className="text-[10px] text-gray-500">{TYPE_LABELS[c.channelType] || c.channelType}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-center text-blue-400 font-bold">{c.registerCount}</td>
                  <td className="p-3 text-center text-cyan-400 font-bold">{c.paidUserCount}</td>
                  <td className="p-3 text-center">
                    <span className={`font-bold ${parseFloat(c.payRate) >= 5 ? 'text-green-400' : parseFloat(c.payRate) >= 2 ? 'text-yellow-400' : 'text-gray-500'}`}>
                      {c.payRate}%
                    </span>
                  </td>
                  <td className={`p-3 text-center font-bold ${retentionColor(c.retentionD1)}`}>{c.retentionD1}%</td>
                  <td className={`p-3 text-center font-bold ${retentionColor(c.retentionD3)}`}>{c.retentionD3}%</td>
                  <td className={`p-3 text-center font-bold ${retentionColor(c.retentionD7)}`}>{c.retentionD7}%</td>
                  <td className={`p-3 text-center font-bold ${retentionColor(c.retentionD30)}`}>{c.retentionD30}%</td>
                  <td className="p-3 text-center text-yellow-400 font-bold">{yuan(c.avgLTV)}</td>
                  <td className="p-3 text-center text-red-400">{yuan(c.cost)}</td>
                  <td className="p-3 text-center text-purple-400">{yuan(c.cac)}</td>
                  <td className={`p-3 text-center font-black ${roiColor(c.roi)}`}>{c.roi}%</td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr><td colSpan={12} className="text-center text-gray-500 py-10">暂无投放渠道数据</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ROI 可视化 */}
      {sorted.length > 0 && (
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 mt-4">
          <div className="text-sm font-bold mb-4">🎯 各渠道 ROI 对比</div>
          <div className="space-y-2">
            {sorted.map(c => {
              const roi = parseFloat(c.roi) || 0;
              const widthPct = Math.min(roi, 300) / 3; // 300% ROI = 100% 宽度
              const color = roi >= 150 ? 'from-green-500 to-emerald-500'
                : roi >= 100 ? 'from-yellow-500 to-orange-500'
                : 'from-red-500 to-red-600';
              return (
                <div key={c.channelId} className="flex items-center gap-3">
                  <div className="w-32 text-xs flex items-center gap-1.5 flex-shrink-0">
                    <span>{c.channelIcon || '📡'}</span>
                    <span className="text-gray-300 truncate">{c.channelName}</span>
                  </div>
                  <div className="flex-1 h-6 bg-[#0d0d0d] rounded-full overflow-hidden relative">
                    <div
                      className={`h-full bg-gradient-to-r ${color} transition-all`}
                      style={{ width: `${widthPct}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-black text-white drop-shadow">{c.roi}%</span>
                    </div>
                  </div>
                  <div className="w-20 text-right text-[10px] text-gray-500 flex-shrink-0">
                    {c.registerCount} 注册
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 text-[10px] text-gray-500 text-center">
            柱状条长度按 ROI 比例展示（300% 为满格）
          </div>
        </div>
      )}
    </div>
  );
}
