import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://luka-1i4g.onrender.com';
const hdr = () => ({
  'x-admin-username': JSON.parse(localStorage.getItem('adminInfo') || 'null')?.username || '',
  'x-admin-password': localStorage.getItem('adminPassword') || '',
});

export default function AdReport() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('channels');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_URL}/api/admin/reports/ad?days=${days}`, { headers: hdr() });
      setData(data);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [days]);

  if (loading) return <div className="text-center text-gray-500 py-20">加载中...</div>;
  if (!data) return <div className="text-center text-gray-500 py-20">加载失败</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">广告报表</h1>
        <div className="flex gap-2">
          {[7, 14, 30, 90].map(d => (
            <button key={d} onClick={() => setDays(d)} className={`text-xs px-3 py-1.5 rounded font-bold ${days === d ? 'bg-red-600 text-white' : 'bg-[#2a2a2a] text-gray-400'}`}>近 {d} 天</button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('channels')} className={`text-sm px-4 py-2 rounded-lg font-bold ${tab === 'channels' ? 'bg-red-600 text-white' : 'bg-[#2a2a2a] text-gray-400'}`}>按渠道</button>
        <button onClick={() => setTab('campaigns')} className={`text-sm px-4 py-2 rounded-lg font-bold ${tab === 'campaigns' ? 'bg-red-600 text-white' : 'bg-[#2a2a2a] text-gray-400'}`}>按活动</button>
      </div>

      {tab === 'channels' && (
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#1f1f1f] text-gray-400 text-xs uppercase">
              <tr>
                <th className="p-3">渠道</th>
                <th className="p-3">注册数</th>
                <th className="p-3">付费用户</th>
                <th className="p-3">付费率</th>
                <th className="p-3">总收入</th>
                <th className="p-3">花费</th>
                <th className="p-3">ROI</th>
              </tr>
            </thead>
            <tbody>
              {data.channels.map((c: any) => (
                <tr key={c.channelId} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                  <td className="p-3"><span className="text-xl mr-2">{c.channelIcon || '📡'}</span><span className="font-bold">{c.channelName}</span></td>
                  <td className="p-3 text-blue-400 font-bold">{c.registerCount}</td>
                  <td className="p-3 text-green-400">{c.paidUserCount}</td>
                  <td className="p-3 text-yellow-400">{c.payRate}%</td>
                  <td className="p-3 text-green-400 font-bold">¥{(c.totalRevenue / 100).toFixed(2)}</td>
                  <td className="p-3 text-red-400">¥{(c.cost / 100).toFixed(2)}</td>
                  <td className={`p-3 font-bold ${parseFloat(c.roi) >= 100 ? 'text-green-400' : 'text-red-400'}`}>{c.roi}%</td>
                </tr>
              ))}
              {data.channels.length === 0 && <tr><td colSpan={7} className="text-center text-gray-500 py-10">暂无数据</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'campaigns' && (
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#1f1f1f] text-gray-400 text-xs uppercase">
              <tr>
                <th className="p-3">活动名</th>
                <th className="p-3">渠道</th>
                <th className="p-3">UTM</th>
                <th className="p-3">注册数</th>
                <th className="p-3">付费用户</th>
                <th className="p-3">付费率</th>
                <th className="p-3">总收入</th>
                <th className="p-3">花费</th>
                <th className="p-3">ROI</th>
              </tr>
            </thead>
            <tbody>
              {data.campaigns.map((c: any) => (
                <tr key={c.campaignId} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                  <td className="p-3 font-bold">{c.campaignName}</td>
                  <td className="p-3 text-gray-400">{c.channelName}</td>
                  <td className="p-3 font-mono text-xs text-gray-500">{c.utmCampaign || '-'}</td>
                  <td className="p-3 text-blue-400 font-bold">{c.registerCount}</td>
                  <td className="p-3 text-green-400">{c.paidUserCount}</td>
                  <td className="p-3 text-yellow-400">{c.payRate}%</td>
                  <td className="p-3 text-green-400 font-bold">¥{(c.totalRevenue / 100).toFixed(2)}</td>
                  <td className="p-3 text-red-400">¥{(c.cost / 100).toFixed(2)}</td>
                  <td className={`p-3 font-bold ${parseFloat(c.roi) >= 100 ? 'text-green-400' : 'text-red-400'}`}>{c.roi}%</td>
                </tr>
              ))}
              {data.campaigns.length === 0 && <tr><td colSpan={9} className="text-center text-gray-500 py-10">暂无数据</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
