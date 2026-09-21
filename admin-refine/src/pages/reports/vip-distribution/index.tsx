import React, { useEffect, useState } from 'react';
import axios from 'axios';
import SimpleBarChart from '../../../components/SimpleBarChart';

const API_URL = import.meta.env.VITE_API_URL || 'https://luka-1i4g.onrender.com';
const hdr = () => ({
  'x-admin-username': JSON.parse(localStorage.getItem('adminInfo') || 'null')?.username || '',
  'x-admin-password': localStorage.getItem('adminPassword') || '',
});

export default function ReportVipDistribution() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_URL}/api/admin/reports/vip-distribution`, { headers: hdr() })
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center text-gray-500 py-20">加载中...</div>;
  if (!data) return <div className="text-center text-gray-500 py-20">加载失败</div>;

  const totalUsers = data.list.reduce((s: number, x: any) => s + x.userCount, 0) || 1;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">VIP 分布报表</h1>
        <div className="text-sm text-gray-500">共 {totalUsers} 位用户</div>
      </div>

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 mb-6">
        <div className="text-sm font-bold mb-4">各 VIP 等级用户数</div>
        <SimpleBarChart
          data={data.list.map((d: any) => ({ label: d.name, value: d.userCount }))}
          color="#a855f7"
        />
      </div>

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#1f1f1f] text-gray-400 text-xs uppercase">
            <tr>
              <th className="p-3">VIP 等级</th>
              <th className="p-3">用户数</th>
              <th className="p-3">占比</th>
              <th className="p-3">累计充值</th>
              <th className="p-3">累计消耗</th>
              <th className="p-3">人均充值</th>
            </tr>
          </thead>
          <tbody>
            {data.list.map((d: any) => {
              const percent = ((d.userCount / totalUsers) * 100).toFixed(1);
              const avg = d.userCount > 0 ? d.totalRecharge / d.userCount / 100 : 0;
              return (
                <tr key={d.level} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                  <td className="p-3"><span className="text-xs bg-orange-900/60 text-orange-200 px-2 py-0.5 rounded font-bold">{d.name}</span></td>
                  <td className="p-3 text-blue-400 font-bold">{d.userCount}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-[#0d0d0d] rounded-full h-2 overflow-hidden max-w-[100px]">
                        <div className="h-full bg-purple-500" style={{ width: `${percent}%` }}></div>
                      </div>
                      <span className="text-gray-400 text-xs">{percent}%</span>
                    </div>
                  </td>
                  <td className="p-3 text-green-400 font-bold">¥{(d.totalRecharge / 100).toFixed(2)}</td>
                  <td className="p-3 text-red-400">{d.totalConsume.toLocaleString()}</td>
                  <td className="p-3 text-yellow-400">¥{avg.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
