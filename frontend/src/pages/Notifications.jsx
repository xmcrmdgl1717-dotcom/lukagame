import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { useI18n } from '../i18n/index.jsx';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function Notifications({ onRead }) {
  const { user } = useStore();
  const { t } = useI18n();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    axios.get(`${API_URL}/api/notifications/${user.id}`)
      .then(res => {
        setList(res.data);
        res.data.filter(n => !n.isRead).forEach(n => {
          axios.put(`${API_URL}/api/notifications/${n.id}/read`, { userId: user.id }).catch(() => {});
        });
        if (onRead) setTimeout(() => onRead(), 500);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return <div className="text-center text-gray-500 py-20 text-sm">请先登录</div>;

  return (
    <div className="p-4">
      <div className="text-center text-lg font-bold mb-6 text-orange-400">{t('profile.notifications', '消息中心')}</div>
      {loading ? (
        <div className="text-center text-gray-500 text-sm py-8">加载中...</div>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-20 text-gray-500">
          <div className="text-5xl mb-4 opacity-30">🔔</div>
          <div className="text-sm">暂无消息</div>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map(n => (
            <div key={n.id} className={`border rounded-xl p-4 shadow-lg ${n.isRead ? 'bg-[#1c0e0e] border-[#3d1a1a]' : 'bg-[#2a1414] border-orange-700'}`}>
              <div className="flex justify-between items-center mb-1">
                <div className="text-white font-bold text-sm">{n.title}</div>
                {!n.isRead && <span className="w-2 h-2 bg-red-500 rounded-full"></span>}
              </div>
              <div className="text-sm text-gray-300 mb-2">{n.content}</div>
              <div className="text-[10px] text-gray-500">{new Date(n.createdAt).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
