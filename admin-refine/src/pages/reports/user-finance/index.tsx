import React, { useEffect, useState } from 'react';
import axios from 'axios';
import SearchBar from '../../../components/SearchBar';
import { useSearch } from '../../../hooks/useSearch';

const API_URL = import.meta.env.VITE_API_URL || 'https://luka-1i4g.onrender.com';
const hdr = () => ({
  'x-admin-username': JSON.parse(localStorage.getItem('adminInfo') || 'null')?.username || '',
  'x-admin-password': localStorage.getItem('adminPassword') || '',
});

const SEARCH_FIELDS = [
  { key: 'username', label: '用户名', type: 'text' as const },
  { key: 'vipLevel', label: 'VIP 等级', type: 'select' as const, options: Array.from({ length: 10 }, (_, i) => ({ value: String(i), label: `VIP${i}` })) },
  { key: 'totalRecharge', label: '总充值(分)', type: 'number-range' as const },
  { key: 'coins', label: '当前余额', type: 'number-range' as const },
];

export default function ReportUserFinance() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_URL}/api/admin/reports/user-finance`, { headers: hdr() })
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, []);

  const all = data?.list || [];
  const { filters, setFilters, filtered, reset } = useSearch(all, SEARCH_FIELDS);

  if (loading) return <div className="text-center text-gray-500 py-20">加载中...</div>;
  if (!data) return <div className="text-center text-gray-500 py-20">加载失败</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">用户资金报表</h1>
        <div className="text-sm text-gray-500">Top {filtered.length} 用户（按累计充值降序）</div>
      </div>

      <SearchBar fields={SEARCH_FIELDS} filters={filters} setFilters={setFilters} onReset={reset} total={all.length} filtered={filtered.length} />

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#1f1f1f] text-gray-400 text-xs uppercase">
              <tr>
                <th className="p-3">排名</th>
                <th className="p-3">用户名</th>
                <th className="p-3">VIP</th>
                <th className="p-3">累计充值</th>
                <th className="p-3">累计消耗</th>
                <th className="p-3">当前余额</th>
                <th className="p-3">充值次数</th>
                <th className="p-3">注册时间</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u: any, idx: number) => (
                <tr key={u.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                  <td className="p-3 text-gray-500 text-xs">{idx + 1}</td>
                  <td className="p-3 font-bold">{u.username}</td>
                  <td className="p-3"><span className="text-xs bg-orange-900/60 text-orange-200 px-2 py-0.5 rounded">VIP{u.vipLevel}</span></td>
                  <td className="p-3 text-green-400 font-bold">¥{(u.totalRecharge / 100).toFixed(2)}</td>
                  <td className="p-3 text-red-400">{u.totalConsume.toLocaleString()}</td>
                  <td className="p-3 text-yellow-400 font-bold">{u.coins.toLocaleString()}</td>
                  <td className="p-3 text-blue-400">{u.rechargeCount}</td>
                  <td className="p-3 text-gray-500 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={8} className="text-center text-gray-500 py-10">无匹配结果</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
