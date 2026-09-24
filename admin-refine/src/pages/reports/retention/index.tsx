import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://luka-1i4g.onrender.com';
const hdr = () => ({
  'x-admin-username': JSON.parse(localStorage.getItem('adminInfo') || 'null')?.username || '',
  'x-admin-password': localStorage.getItem('adminPassword') || '',
});

interface RetentionDay {
  day: number;
  cohort: number;
  retained: number;
  rate: string;
}

interface RetentionData {
  range: { days: number; since: string; to: string };
  core: {
    totalUsers: number;
    newUsersInRange: number;
    paidUserCount: number;
    newPaidUserCount: number;
    payRate: string;
    totalRevenue: number;
    revenueInRange: number;
    arpu: number;
    arppu: number;
  };
  amountDistribution: Array<{ label: string; min: number; max: number; count: number }>;
  repeat: {
    repeatBuyers: number;
    repeatRate: string;
    multiPayBuckets: Array<{ label: string; count: number }>;
  };
  retention: RetentionDay[];
  daily: Array<{
    date: string;
    newPaidUsers: number;
    revenue: number;
    orderCount: number;
    repeatRevenue: number;
  }>;
}

const yuan = (cents: number) => `¥${(cents / 100).toFixed(2)}`;

export default function ReportRetention() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<RetentionData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_URL}/api/admin/reports/retention?days=${days}`, { headers: hdr() });
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

  const { core, amountDistribution, repeat, retention, daily } = data;
  const maxDistCount = Math.max(...amountDistribution.map(d => d.count), 1);
  const maxMultiCount = Math.max(...repeat.multiPayBuckets.map(b => b.count), 1);
  const maxDailyRevenue = Math.max(...daily.map(d => d.revenue), 1);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">💹 付费留存报表</h1>
          <div className="text-xs text-gray-500 mt-1">
            统计区间：近 {days} 天 · 数据实时计算
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

      {/* 核心指标卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="text-[10px] text-gray-500 mb-1">总用户数</div>
          <div className="text-xl font-black text-blue-400">{core.totalUsers.toLocaleString()}</div>
        </div>
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="text-[10px] text-gray-500 mb-1">付费用户数</div>
          <div className="text-xl font-black text-cyan-400">{core.paidUserCount.toLocaleString()}</div>
        </div>
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="text-[10px] text-gray-500 mb-1">付费率</div>
          <div className="text-xl font-black text-green-400">{core.payRate}%</div>
        </div>
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="text-[10px] text-gray-500 mb-1">ARPU</div>
          <div className="text-lg font-black text-yellow-400">{yuan(core.arpu)}</div>
        </div>
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="text-[10px] text-gray-500 mb-1">ARPPU</div>
          <div className="text-lg font-black text-orange-400">{yuan(core.arppu)}</div>
        </div>
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="text-[10px] text-gray-500 mb-1">总营收</div>
          <div className="text-lg font-black text-red-400">{yuan(core.totalRevenue)}</div>
        </div>
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="text-[10px] text-gray-500 mb-1">区间营收</div>
          <div className="text-lg font-black text-pink-400">{yuan(core.revenueInRange)}</div>
        </div>
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="text-[10px] text-gray-500 mb-1">区间新付费</div>
          <div className="text-xl font-black text-purple-400">{core.newPaidUserCount}</div>
        </div>
      </div>

      {/* 充值金额分布 + 复购分布 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4">
          <div className="text-sm font-bold mb-4">💰 用户充值金额分布</div>
          <div className="space-y-2.5">
            {amountDistribution.map(d => {
              const pct = maxDistCount > 0 ? (d.count / maxDistCount) * 100 : 0;
              const totalPct = core.totalUsers > 0 ? ((d.count / core.totalUsers) * 100).toFixed(1) : '0.0';
              return (
                <div key={d.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">{d.label}</span>
                    <span className="text-gray-300 font-bold">{d.count} 人 · {totalPct}%</span>
                  </div>
                  <div className="h-2 bg-[#0d0d0d] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-cyan-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4">
          <div className="text-sm font-bold mb-1">🔁 用户充值次数分布</div>
          <div className="text-xs text-gray-500 mb-4">
            复购用户（≥2 次）：{repeat.repeatBuyers} 人 · 复购率 <span className="text-cyan-400 font-bold">{repeat.repeatRate}%</span>
          </div>
          <div className="space-y-2.5">
            {repeat.multiPayBuckets.map(b => {
              const pct = maxMultiCount > 0 ? (b.count / maxMultiCount) * 100 : 0;
              return (
                <div key={b.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">充值 {b.label}</span>
                    <span className="text-gray-300 font-bold">{b.count} 人</span>
                  </div>
                  <div className="h-2 bg-[#0d0d0d] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 首充后留存 */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <div className="text-sm font-bold">📊 首充后留存（按用户首次付费日为第 0 天）</div>
            <div className="text-xs text-gray-500 mt-1">
              留存定义：首次付费后第 N 天有登录行为。同一用户在不同里程碑会被重复计入对应队列。
            </div>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-3">
          {retention.map(r => {
            const numRate = parseFloat(r.rate);
            const color = numRate >= 30 ? 'text-green-400' : numRate >= 15 ? 'text-yellow-400' : 'text-red-400';
            return (
              <div key={r.day} className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg p-3 text-center">
                <div className="text-[10px] text-gray-500 mb-1">第 {r.day} 天</div>
                <div className={`text-2xl font-black ${color}`}>{r.rate}%</div>
                <div className="text-[10px] text-gray-500 mt-2">
                  {r.retained} / {r.cohort} 人
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-3 text-[11px] text-yellow-200 leading-relaxed">
          💡 <span className="font-bold">解读：</span>
          第 1 天留存 30% 以上为健康，低于 15% 需要关注首充后的用户引导。
          ARPPU 与复购率是评估付费深度的核心指标，配合「VIP分布报表」可定位大R用户群体。
        </div>
      </div>

      {/* 每日趋势 */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 mb-6">
        <div className="text-sm font-bold mb-4">📈 每日付费趋势</div>
        <div className="space-y-2">
          {daily.map(d => {
            const pct = (d.revenue / maxDailyRevenue) * 100;
            const repeatPct = d.revenue > 0 ? (d.repeatRevenue / d.revenue) * 100 : 0;
            return (
              <div key={d.date} className="flex items-center gap-3">
                <div className="w-20 text-xs text-gray-400 flex-shrink-0">{d.date.slice(5)}</div>
                <div className="flex-1 h-5 bg-[#0d0d0d] rounded-full overflow-hidden relative">
                  <div
                    className="h-full bg-gradient-to-r from-red-500 to-orange-500 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                  {repeatPct > 0 && (
                    <div
                      className="h-full absolute top-0 left-0 bg-gradient-to-r from-cyan-500 to-blue-500 opacity-70"
                      style={{ width: `${(repeatPct * pct) / 100}%` }}
                    />
                  )}
                </div>
                <div className="w-32 text-right text-xs flex-shrink-0">
                  <span className="text-orange-400 font-bold">{yuan(d.revenue)}</span>
                  <span className="text-gray-500 ml-2">· {d.orderCount} 单</span>
                </div>
              </div>
            );
          })}
          {daily.length === 0 && (
            <div className="text-center text-gray-500 py-10">区间内暂无数据</div>
          )}
        </div>
        <div className="flex gap-4 mt-4 text-[10px] text-gray-500">
          <div className="flex items-center gap-1">
            <div className="w-3 h-2 bg-gradient-to-r from-red-500 to-orange-500 rounded"></div>
            <span>总营收</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded opacity-70"></div>
            <span>复购收入（首充之后的贡献）</span>
          </div>
        </div>
      </div>

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 text-sm text-gray-400">
        💡 <span className="text-white font-bold">指标说明：</span>
        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-xs">
          <div>• <span className="text-white">付费率</span> = 付费用户 / 总用户</div>
          <div>• <span className="text-white">ARPU</span> = 总营收 / 总用户（每用户平均贡献）</div>
          <div>• <span className="text-white">ARPPU</span> = 总营收 / 付费用户（每付费用户平均贡献）</div>
          <div>• <span className="text-white">复购率</span> = 充值 ≥2 次的用户 / 付费用户</div>
        </div>
      </div>
    </div>
  );
}
