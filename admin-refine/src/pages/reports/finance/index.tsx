import React, { useEffect, useState } from 'react';
import axios from 'axios';
import SimpleBarChart from '../../../components/SimpleBarChart';

const API_URL = import.meta.env.VITE_API_URL || 'https://luka-1i4g.onrender.com';
const hdr = () => ({
  'x-admin-username': JSON.parse(localStorage.getItem('adminInfo') || 'null')?.username || '',
  'x-admin-password': localStorage.getItem('adminPassword') || '',
});

export default function ReportFinance() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_URL}/api/admin/reports/finance?days=${days}`, { headers: hdr() });
      setData(data);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [days]);

  if (loading) return <div className="text-center text-gray-500 py-20">加载中...</div>;
  if (!data) return <div className="text-center text-gray-500 py-20">加载失败</div>;

  const s = data.summary;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">资金报表</h1>
        <div className="flex gap-2">
          {[7, 14, 30].map((d) => (
            <button key={d} onClick={() => setDays(d)} className={`text-xs px-3 py-1.5 rounded font-bold ${days === d ? 'bg-red-600 text-white' : 'bg-[#2a2a2a] text-gray-400'}`}>
              近 {d} 天
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">总充值</div>
          <div className="text-2xl font-bold text-green-400">¥{(s.totalRecharge / 100).toFixed(2)}</div>
        </div>
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">总消耗</div>
          <div className="text-2xl font-bold text-red-400">{s.totalConsume.toLocaleString()} 🪙</div>
        </div>
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">总产出价值</div>
          <div className="text-2xl font-bold text-yellow-400">{s.totalOutput.toLocaleString()}</div>
        </div>
      </div>

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 mb-6">
        <div className="text-sm font-bold mb-4">每日充值 vs 消耗</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-green-400 mb-2">充值额（元）</div>
            <SimpleBarChart data={data.daily.map((d: any) => ({ label: d.date.slice(5), value: d.recharge / 100 }))} color="#22c55e" formatValue={(v) => `¥${v.toFixed(2)}`} />
          </div>
          <div>
            <div className="text-xs text-red-400 mb-2">消耗金币</div>
            <SimpleBarChart data={data.daily.map((d: any) => ({ label: d.date.slice(5), value: d.consume }))} color="#dc2626" />
          </div>
        </div>
      </div>

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#1f1f1f] text-gray-400 text-xs uppercase">
            <tr>
              <th className="p-3">日期</th>
              <th className="p-3">充值额</th>
              <th className="p-3">消耗金币</th>
              <th className="p-3">产出价值</th>
              <th className="p-3">净盈亏</th>
            </tr>
          </thead>
          <tbody>
            {data.daily.map((d: any) => {
              const net = d.consume - d.output;
              return (
                <tr key={d.date} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                  <td className="p-3 text-gray-300">{d.date}</td>
                  <td className="p-3 text-green-400 font-bold">¥{(d.recharge / 100).toFixed(2)}</td>
                  <td className="p-3 text-red-400">{d.consume.toLocaleString()}</td>
                  <td className="p-3 text-yellow-400">{d.output.toLocaleString()}</td>
                  <td className={`p-3 font-bold ${net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {net.toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
