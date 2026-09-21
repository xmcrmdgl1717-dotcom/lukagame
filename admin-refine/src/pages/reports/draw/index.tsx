import React, { useEffect, useState } from 'react';
import axios from 'axios';
import SimpleBarChart from '../../../components/SimpleBarChart';

const API_URL = import.meta.env.VITE_API_URL || 'https://luka-1i4g.onrender.com';
const hdr = () => ({
  'x-admin-username': JSON.parse(localStorage.getItem('adminInfo') || 'null')?.username || '',
  'x-admin-password': localStorage.getItem('adminPassword') || '',
});

export default function ReportDraw() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_URL}/api/admin/reports/draw?days=${days}`, { headers: hdr() });
      setData(data);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [days]);

  if (loading) return <div className="text-center text-gray-500 py-20">加载中...</div>;
  if (!data) return <div className="text-center text-gray-500 py-20">加载失败</div>;

  const s = data.summary;
  const roi = s.totalCost > 0 ? ((s.totalOutput / s.totalCost) * 100).toFixed(2) : '0.00';

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">抽奖报表</h1>
        <div className="flex gap-2">
          {[7, 14, 30].map((d) => (
            <button key={d} onClick={() => setDays(d)} className={`text-xs px-3 py-1.5 rounded font-bold ${days === d ? 'bg-red-600 text-white' : 'bg-[#2a2a2a] text-gray-400'}`}>
              近 {d} 天
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">抽卡总次数</div>
          <div className="text-2xl font-bold text-blue-400">{s.totalCount}</div>
        </div>
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">总消耗</div>
          <div className="text-2xl font-bold text-red-400">{s.totalCost.toLocaleString()}</div>
        </div>
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">总产出价值</div>
          <div className="text-2xl font-bold text-yellow-400">{s.totalOutput.toLocaleString()}</div>
        </div>
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">产出/消耗比</div>
          <div className="text-2xl font-bold text-green-400">{roi}%</div>
        </div>
      </div>

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 mb-6">
        <div className="text-sm font-bold mb-4">每日抽卡次数</div>
        <SimpleBarChart data={data.daily.map((d: any) => ({ label: d.date.slice(5), value: d.count }))} color="#3b82f6" />
      </div>

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#1f1f1f] text-gray-400 text-xs uppercase">
            <tr>
              <th className="p-3">日期</th>
              <th className="p-3">抽卡次数</th>
              <th className="p-3">参与用户数</th>
              <th className="p-3">消耗金币</th>
              <th className="p-3">产出价值</th>
              <th className="p-3">产出率</th>
            </tr>
          </thead>
          <tbody>
            {data.daily.map((d: any) => (
              <tr key={d.date} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                <td className="p-3 text-gray-300">{d.date}</td>
                <td className="p-3 text-blue-400 font-bold">{d.count}</td>
                <td className="p-3 text-cyan-400">{d.uniqueUsers}</td>
                <td className="p-3 text-red-400">{d.cost.toLocaleString()}</td>
                <td className="p-3 text-yellow-400">{d.output.toLocaleString()}</td>
                <td className="p-3 text-green-400 font-bold">{d.roi}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
