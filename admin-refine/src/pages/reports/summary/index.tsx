import React, { useEffect, useState } from 'react';
import axios from 'axios';
import SimpleBarChart from '../../../components/SimpleBarChart';

const API_URL = import.meta.env.VITE_API_URL || 'https://luka-1i4g.onrender.com';

const hdr = () => {
  const a = JSON.parse(localStorage.getItem('adminInfo') || 'null');
  return {
    'x-admin-username': a?.username || '',
    'x-admin-password': localStorage.getItem('adminPassword') || '',
  };
};

export default function ReportSummary() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_URL}/api/admin/reports/summary?days=${days}`, { headers: hdr() });
      setData(data);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [days]);

  if (loading) return <div className="text-center text-gray-500 py-20">加载中...</div>;
  if (!data) return <div className="text-center text-gray-500 py-20">加载失败</div>;

  const s = data.summary;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">汇总报表</h1>
        <div className="flex gap-2">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`text-xs px-3 py-1.5 rounded font-bold ${days === d ? 'bg-red-600 text-white' : 'bg-[#2a2a2a] text-gray-400 hover:bg-[#3a3a3a]'}`}
            >
              近 {d} 天
            </button>
          ))}
        </div>
      </div>

      {/* 概览卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">新增用户</div>
          <div className="text-xl font-bold text-blue-400">{s.newUsers}</div>
        </div>
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">活跃用户</div>
          <div className="text-xl font-bold text-cyan-400">{s.activeUsers}</div>
        </div>
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">充值总额</div>
          <div className="text-xl font-bold text-green-400">¥{(s.totalRevenue / 100).toFixed(2)}</div>
        </div>
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">消耗金币</div>
          <div className="text-xl font-bold text-red-400">{s.totalConsume.toLocaleString()}</div>
        </div>
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">抽卡次数</div>
          <div className="text-xl font-bold text-yellow-400">{s.totalDrawCount}</div>
        </div>
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">订单数</div>
          <div className="text-xl font-bold text-purple-400">{s.orderCount}</div>
        </div>
      </div>

      {/* 趋势图 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4">
          <div className="text-sm font-bold mb-4">每日充值额（元）</div>
          <SimpleBarChart
            data={data.daily.map((d: any) => ({ label: d.date.slice(5), value: d.revenue / 100 }))}
            color="#22c55e"
            formatValue={(v) => `¥${v.toFixed(2)}`}
          />
        </div>
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4">
          <div className="text-sm font-bold mb-4">每日抽卡次数</div>
          <SimpleBarChart
            data={data.daily.map((d: any) => ({ label: d.date.slice(5), value: d.drawCount }))}
            color="#dc2626"
          />
        </div>
      </div>

      {/* 表格 */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#1f1f1f] text-gray-400 text-xs uppercase">
            <tr>
              <th className="p-3">日期</th>
              <th className="p-3">充值额</th>
              <th className="p-3">消耗金币</th>
              <th className="p-3">抽卡次数</th>
            </tr>
          </thead>
          <tbody>
            {data.daily.map((d: any) => (
              <tr key={d.date} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                <td className="p-3 text-gray-300">{d.date}</td>
                <td className="p-3 text-green-400 font-bold">¥{(d.revenue / 100).toFixed(2)}</td>
                <td className="p-3 text-red-400">{d.consume.toLocaleString()}</td>
                <td className="p-3 text-yellow-400">{d.drawCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
