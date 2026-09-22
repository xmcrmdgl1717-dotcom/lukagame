import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { useI18n } from '../i18n/index.jsx';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function Orders() {
  const { user } = useStore();
  const { t } = useI18n();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    axios.get(`${API_URL}/api/orders/${user.id}`)
      .then(res => setOrders(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return <div className="text-center text-gray-500 py-20 text-sm">请先登录</div>;

  return (
    <div className="p-4">
      <div className="text-center text-lg font-bold mb-6 text-orange-400">{t('profile.orders', '我的订单')}</div>
      {loading ? (
        <div className="text-center text-gray-500 text-sm py-8">加载中...</div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-20 text-gray-500">
          <div className="text-5xl mb-4 opacity-30">📄</div>
          <div className="text-sm">{t('orders.empty', '暂无订单记录')}</div>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(o => (
            <div key={o.id} className="bg-[#1c0e0e] border border-[#3d1a1a] rounded-xl p-4 shadow-lg">
              <div className="flex justify-between items-start mb-2">
                <div className="text-xs text-gray-500">#{o.id.slice(0, 12)}</div>
                <span className={`text-xs px-2 py-0.5 rounded ${o.status === 'PAID' ? 'bg-green-900/60 text-green-200' : 'bg-yellow-900/60 text-yellow-200'}`}>
                  {o.status === 'PAID' ? t('status.paid', '已支付') : t('status.pending', '待支付')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-white font-bold">{o.option.coins} + {o.option.bonus} 🪙</div>
                  <div className="text-xs text-gray-500 mt-1">{new Date(o.createdAt).toLocaleString()}</div>
                </div>
                <div className="text-red-400 font-bold">¥{(o.amount / 100).toFixed(2)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
