import React, { useEffect, useState } from 'react';
import axios from 'axios';
import SearchBar from '../../components/SearchBar';
import { useSearch } from '../../hooks/useSearch';

interface Order {
  id: string;
  userId: string;
  userName: string;
  items: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  status: string;
  trackingNo: string;
  expressCompany: string;
  remark: string;
  adminRemark: string;
  createdAt: string;
  processedAt: string | null;
  shippedAt: string | null;
}

const API_URL = import.meta.env.VITE_API_URL || 'https://luka-1i4g.onrender.com';
const hdr = () => ({
  'x-admin-username': JSON.parse(localStorage.getItem('adminInfo') || 'null')?.username || '',
  'x-admin-password': localStorage.getItem('adminPassword') || '',
  'Content-Type': 'application/json',
});

const fmt = (d: string) => !d ? '-' : (() => { const t = new Date(d); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')} ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`; })();

const STATUS_MAP: Record<string, { text: string; cls: string }> = {
  PENDING: { text: '待处理', cls: 'bg-yellow-900/60 text-yellow-200' },
  PROCESSING: { text: '处理中', cls: 'bg-blue-900/60 text-blue-200' },
  SHIPPED: { text: '已发货', cls: 'bg-green-900/60 text-green-200' },
  DONE: { text: '已完成', cls: 'bg-gray-700 text-gray-300' },
  REJECTED: { text: '已拒绝', cls: 'bg-red-900/60 text-red-200' },
};

const SEARCH_FIELDS = [
  { key: 'userName', label: '用户名', type: 'text' as const },
  { key: 'receiverName', label: '收货人', type: 'text' as const },
  { key: 'status', label: '状态', type: 'select' as const, options: [
    { value: 'PENDING', label: '待处理' }, { value: 'PROCESSING', label: '处理中' },
    { value: 'SHIPPED', label: '已发货' }, { value: 'DONE', label: '已完成' }, { value: 'REJECTED', label: '已拒绝' },
  ]},
  { key: 'createdAt', label: '提交时间', type: 'date-range' as const },
];

export default function CardOrderList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Order | null>(null);
  const { filters, setFilters, filtered, reset } = useSearch(orders, SEARCH_FIELDS);

  const load = async () => {
    setLoading(true);
    try { const { data } = await axios.get(`${API_URL}/api/admin/card-orders`, { headers: hdr() }); setOrders(data); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const update = async (id: string, payload: any) => {
    try { await axios.put(`${API_URL}/api/admin/card-orders/${id}`, payload, { headers: hdr() }); load(); setDetail(null); }
    catch (e: any) { alert('操作失败: ' + (e.response?.data?.error || e.message)); }
  };

  const parseItems = (s: string) => { try { return JSON.parse(s); } catch { return []; } };

  const pendingCount = orders.filter(o => o.status === 'PENDING').length;
  const processingCount = orders.filter(o => o.status === 'PROCESSING').length;
  const shippedCount = orders.filter(o => o.status === 'SHIPPED').length;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">卡片订单</h1>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">待处理</div>
          <div className="text-2xl font-bold text-yellow-400">{pendingCount}</div>
        </div>
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">处理中</div>
          <div className="text-2xl font-bold text-blue-400">{processingCount}</div>
        </div>
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">已发货</div>
          <div className="text-2xl font-bold text-green-400">{shippedCount}</div>
        </div>
      </div>

      <SearchBar fields={SEARCH_FIELDS} filters={filters} setFilters={setFilters} onReset={reset} total={orders.length} filtered={filtered.length} />

      {loading ? <div className="text-center text-gray-500 py-20">加载中...</div> : (
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#1f1f1f] text-gray-400 text-xs uppercase">
              <tr><th className="p-3">订单号</th><th className="p-3">用户</th><th className="p-3">卡牌</th><th className="p-3">收货人</th><th className="p-3">状态</th><th className="p-3">提交时间</th><th className="p-3 text-center">操作</th></tr>
            </thead>
            <tbody>
              {filtered.map(o => {
                const st = STATUS_MAP[o.status] || { text: o.status, cls: 'bg-gray-700' };
                const items = parseItems(o.items);
                return (
                  <tr key={o.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                    <td className="p-3 font-mono text-xs text-gray-500">{o.id.slice(0, 8)}</td>
                    <td className="p-3 font-bold">{o.userName}</td>
                    <td className="p-3 text-gray-300">{items.length} 张</td>
                    <td className="p-3 text-gray-300">{o.receiverName}</td>
                    <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded ${st.cls}`}>{st.text}</span></td>
                    <td className="p-3 text-gray-400 text-xs">{fmt(o.createdAt)}</td>
                    <td className="p-3 text-center">
                      <button onClick={() => setDetail(o)} className="bg-blue-600 text-white text-xs px-3 py-1 rounded">查看</button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={7} className="text-center text-gray-500 py-10">暂无订单</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">订单详情</h3>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-white text-2xl">×</button>
            </div>

            <div className="space-y-3 text-sm mb-4">
              <div className="flex gap-3"><span className="text-gray-500 w-24">订单号：</span><span className="font-mono text-xs">{detail.id}</span></div>
              <div className="flex gap-3"><span className="text-gray-500 w-24">用户：</span><span className="font-bold">{detail.userName}</span></div>
              <div className="flex gap-3"><span className="text-gray-500 w-24">状态：</span><span className={`text-xs px-2 py-0.5 rounded ${STATUS_MAP[detail.status]?.cls}`}>{STATUS_MAP[detail.status]?.text}</span></div>
              <div className="flex gap-3"><span className="text-gray-500 w-24">提交时间：</span><span>{fmt(detail.createdAt)}</span></div>
              {detail.shippedAt && <div className="flex gap-3"><span className="text-gray-500 w-24">发货时间：</span><span>{fmt(detail.shippedAt)}</span></div>}
            </div>

            <div className="border-t border-[#2a2a2a] pt-4 mb-4">
              <div className="text-sm font-bold mb-2">卡牌明细</div>
              <div className="space-y-2">
                {parseItems(detail.items).map((it: any, i: number) => (
                  <div key={i} className="flex justify-between bg-[#0d0d0d] rounded p-2 text-sm">
                    <span>{it.cardName}</span><span className="text-gray-400">x{it.quantity || 1}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-[#2a2a2a] pt-4 mb-4">
              <div className="text-sm font-bold mb-2">收货信息</div>
              <div className="bg-[#0d0d0d] rounded p-3 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">收货人：</span><span>{detail.receiverName}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">电话：</span><span className="font-mono">{detail.receiverPhone}</span></div>
                <div className="flex justify-between gap-3"><span className="text-gray-500 flex-shrink-0">地址：</span><span className="text-right">{detail.receiverAddress}</span></div>
                {detail.remark && <div className="flex justify-between"><span className="text-gray-500">用户备注：</span><span>{detail.remark}</span></div>}
              </div>
            </div>

            {detail.status === 'PENDING' && (
              <div className="flex gap-2">
                <button onClick={() => update(detail.id, { status: 'PROCESSING' })} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-sm font-bold">通过审核</button>
                <button onClick={() => {
                  const r = prompt('请输入拒绝原因：');
                  if (r !== null) update(detail.id, { status: 'REJECTED', adminRemark: r });
                }} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded text-sm font-bold">拒绝</button>
              </div>
            )}

            {detail.status === 'PROCESSING' && (
              <div className="space-y-2">
                <input id="tracking-input" placeholder="快递单号" defaultValue={detail.trackingNo} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-sm text-white" />
                <input id="company-input" placeholder="快递公司" defaultValue={detail.expressCompany} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-sm text-white" />
                <button onClick={() => {
                  const trackingNo = (document.getElementById('tracking-input') as HTMLInputElement)?.value;
                  const expressCompany = (document.getElementById('company-input') as HTMLInputElement)?.value;
                  if (!trackingNo) return alert('请填写快递单号');
                  update(detail.id, { status: 'SHIPPED', trackingNo, expressCompany });
                }} className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded text-sm font-bold">确认发货</button>
              </div>
            )}

            {detail.status === 'SHIPPED' && (
              <div className="space-y-2">
                <div className="text-sm bg-[#0d0d0d] p-3 rounded">
                  <div>快递公司：{detail.expressCompany || '-'}</div>
                  <div>快递单号：<span className="font-mono">{detail.trackingNo}</span></div>
                </div>
                <button onClick={() => update(detail.id, { status: 'DONE' })} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-sm font-bold">标记为已完成</button>
              </div>
            )}

            <div className="flex justify-end mt-4">
              <button onClick={() => setDetail(null)} className="px-4 py-2 bg-[#2a2a2a] rounded text-sm">关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
