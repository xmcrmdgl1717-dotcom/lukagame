import { useState, useEffect } from 'react';
import { useStore } from '../store';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function Notifications() {
  const { user } = useStore();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await axios.get(`${API_URL}/api/notifications/${user.id}`);
      setList(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchNotifications(); }, [user]);

  const markRead = async (id) => {
    try {
      await axios.put(`${API_URL}/api/notifications/${id}/read`, { userId: user.id });
      setList(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (e) { console.error(e); }
  };

  if (!user) return <div className="text-center text-gray-500 py-20">请先登录</div>;

  return (
    <div className="p-4">
      <div className="text-center text-lg font-bold mb-6 text-orange-400">消息中心</div>
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
            <div
              key={n.id}
              onClick={() => !n.isRead && markRead(n.id)}
              className={`border rounded-xl p-4 shadow-lg cursor-pointer transition ${n.isRead ? 'bg-[#1c0e0e] border-[#3d1a1a]' : 'bg-[#2a1414] border-orange-700'}`}
            >
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
