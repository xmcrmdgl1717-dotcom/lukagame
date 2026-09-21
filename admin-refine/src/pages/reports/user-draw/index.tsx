import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://luka-1i4g.onrender.com';
const hdr = () => ({
  'x-admin-username': JSON.parse(localStorage.getItem('adminInfo') || 'null')?.username || '',
  'x-admin-password': localStorage.getItem('adminPassword') || '',
});

export default function ReportUserDraw() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_URL}/api/admin/reports/user-draw?days=${days}`, { headers: hdr() });
      setData(data);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [days]);

  if (loading) return <div className="text-center text-gray-500 py-20">加载中...</div>;
  if (!data) return <div className="text-center text-gray-500 py-20">加载失败</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">用户抽奖报表</h1>
        <div className="flex gap-2">
          {[7, 14, 30].map((d) => (
            <button key={d} onClick={() => setDays(d)} className={`text-xs px-3 py-1.5 rounded font-bold ${days === d ? 'bg-red-600 text-white' : 'bg-[#2a2a2a] text-gray-400'}`}>
              近 {d} 天
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 mb-4 text-sm text-gray-400">
        💡 按用户的抽奖消费降序排列，展示 Top 100 活跃抽奖用户。数据可与「排行榜」联动。
      </div>

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#1f1f1f] text-gray-400 text-xs uppercase">
            <tr>
              <th className="p-3">排名</th>
              <th className="p-3">用户名</th>
              <th className="p-3">VIP</th>
              <th className="p-3">抽卡次数</th>
              <th className="p-3">消耗金币</th>
              <th className="p-3">产出价值</th>
              <th className="p-3">盈亏</th>
            </tr>
          </thead>
          <tbody>
            {data.list.length === 0 && <tr><td colSpan={7} className="text-center text-gray-500 py-10">暂无数据</td></tr>}
            {data.list.map((u: any, idx: number) => {
              const profit = u.output - u.cost;
              return (
                <tr key={u.userId} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                  <td className="p-3">
                    <span className={`inline-block w-8 h-8 rounded-full text-center leading-8 text-xs font-bold ${
                      idx === 0 ? 'bg-yellow-500 text-black' :
                      idx === 1 ? 'bg-gray-400 text-black' :
                      idx === 2 ? 'bg-orange-700 text-white' :
                      'bg-[#0d0d0d] text-gray-400'
                    }`}>
                      {idx + 1}
                    </span>
                  </td>
                  <td className="p-3 font-bold">{u.username}</td>
                  <td className="p-3"><span className="text-xs bg-orange-900/60 text-orange-200 px-2 py-0.5 rounded">VIP{u.vipLevel}</span></td>
                  <td className="p-3 text-blue-400 font-bold">{u.count}</td>
                  <td className="p-3 text-red-400 font-bold">{u.cost.toLocaleString()}</td>
                  <td className="p-3 text-yellow-400 font-bold">{u.output.toLocaleString()}</td>
                  <td className={`p-3 font-bold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {profit >= 0 ? '+' : ''}{profit.toLocaleString()}
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
