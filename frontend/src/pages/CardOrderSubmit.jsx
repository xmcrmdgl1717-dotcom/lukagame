import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { useI18n } from '../i18n/index.jsx';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const STATUS_MAP = {
  PENDING: { key: 'status.pending', text: '待处理', cls: 'bg-yellow-900/60 text-yellow-200' },
  PROCESSING: { key: 'status.processing', text: '处理中', cls: 'bg-blue-900/60 text-blue-200' },
  SHIPPED: { key: 'status.shipped', text: '已发货', cls: 'bg-green-900/60 text-green-200' },
  DONE: { key: 'status.done', text: '已完成', cls: 'bg-gray-700 text-gray-300' },
  REJECTED: { key: 'status.rejected', text: '已拒绝', cls: 'bg-red-900/60 text-red-200' },
};

const fmt = (d) => {
  if (!d) return '-';
  const t = new Date(d);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')} ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
};

export default function CardOrders({ onGoSubmit }) {
  const { user } = useStore();
  const { t } = useI18n();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    axios.get(`${API_URL}/api/card-orders/${user.id}`)
      .then(res => setOrders(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const parseItems = (s) => { try { return JSON.parse(s); } catch { return []; } };

  if (!user) return <div className="text-center text-gray-500 py-20 text-sm">请先登录</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-orange-400">{t('cardorder.title', '我的卡片订单')}</h2>
        <button onClick={onGoSubmit} className="bg-orange-600 hover:bg-orange-700 text-white text-xs px-4 py-1.5 rounded-full font-bold">
          + {t('cardorder.submit', '申请发货')}
        </button>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-20 text-sm">加载中...</div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <div className="text-5xl mb-4 opacity-30">📦</div>
          <div className="text-sm">暂无订单</div>
          <button onClick={onGoSubmit} className="mt-4 text-orange-400 text-sm underline">{t('cardorder.submit', '去申请发货')} →</button>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(o => {
            const items = parseItems(o.items);
            const st = STATUS_MAP[o.status] || { text: o.status, cls: 'bg-gray-700' };
            return (
              <div key={o.id} onClick={() => setDetail(o)} className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 cursor-pointer hover:border-orange-600/50 transition">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-xs text-gray-500 font-mono">#{o.id.slice(0, 8)}</div>
                  <span className={`text-xs px-2 py-0.5 rounded ${st.cls}`}>{t(st.key, st.text)}</span>
                </div>
                <div className="flex gap-2 mb-2">
                  {items.slice(0, 3).map((it, i) => (
                    <div key={i} className="w-12 h-16 bg-[#0d0d0d] rounded border border-[#2a2a2a] flex items-center justify-center text-xl">🃏</div>
                  ))}
                  {items.length > 3 && (
                    <div className="w-12 h-16 bg-[#0d0d0d] rounded border border-[#2a2a2a] flex items-center justify-center text-xs text-gray-500">+{items.length - 3}</div>
                  )}
                </div>
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <div>{items.length} {t('cardorder.cards', '张')} · {o.receiverName}</div>
                  <div>{fmt(o.createdAt)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
          <div className="bg-[#1a0f0c] border border-[#3d1a1a] rounded-2xl w-full max-w-sm max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b border-[#2a1414]">
              <div className="text-sm font-bold text-orange-400">{t('cardorder.detail', '订单详情')}</div>
              <button onClick={() => setDetail(null)} className="text-gray-400 text-2xl">×</button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <div className="text-xs text-gray-500 mb-2">{t('cardorder.items', '卡牌明细')}</div>
                <div className="space-y-1">
                  {parseItems(detail.items).map((it, i) => (
                    <div key={i} className="flex justify-between bg-[#0d0d0d] rounded p-2 text-xs">
                      <span>{it.cardName}</span>
                      <span className="text-gray-400">x{it.quantity || 1}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-500 mb-2">{t('cardorder.receiver_info', '收货信息')}</div>
                <div className="bg-[#0d0d0d] rounded p-3 space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-gray-500">{t('cardorder.receiver', '收货人')}：</span><span>{detail.receiverName}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">{t('cardorder.phone', '电话')}：</span><span className="font-mono">{detail.receiverPhone}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-gray-500 flex-shrink-0">{t('cardorder.address', '地址')}：</span><span className="text-right">{detail.receiverAddress}</span></div>
                </div>
              </div>

              {detail.trackingNo && (
                <div>
                  <div className="text-xs text-gray-500 mb-2">{t('cardorder.logistics', '物流信息')}</div>
                  <div className="bg-[#0d0d0d] rounded p-3 space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-gray-500">{t('cardorder.express', '快递公司')}：</span><span>{detail.expressCompany || '-'}</span></div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">{t('cardorder.tracking_no', '快递单号')}：</span>
                      <span className="font-mono text-orange-400">{detail.trackingNo}</span>
                    </div>
                    <button onClick={() => { navigator.clipboard.writeText(detail.trackingNo); alert('已复制'); }} className="w-full mt-2 bg-[#2a1414] text-orange-400 text-xs py-1.5 rounded">{t('cardorder.copy', '复制单号')}</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
