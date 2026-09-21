import { useState, useEffect } from 'react';
import { useStore } from '../store';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function Activity() {
  const { user, setUser } = useStore();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    if (!user) { setLoading(false); return; }
    try {
      const res = await axios.get(`${API_URL}/api/tasks/${user.id}`);
      setTasks(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchTasks(); }, [user]);

  const handleClaim = async (taskId) => {
    try {
      const res = await axios.post(`${API_URL}/api/tasks/claim`, { userId: user.id, taskId });
      alert(`领取成功！获得 ${res.data.reward} 金币`);
      // 刷新用户金币
      const updated = await axios.post(`${API_URL}/api/login`, { username: user.username, password: user.password || '123' });
      setUser(updated.data);
      fetchTasks();
    } catch (e) {
      alert(e.response?.data?.error || '领取失败');
    }
  };

  if (!user) return <div className="text-center text-gray-500 py-20">请先登录</div>;

  return (
    <div className="p-4">
      <div className="text-center text-lg font-bold mb-6 text-orange-400">每日任务</div>
      {loading ? (
        <div className="text-center text-gray-500 text-sm py-8">加载中...</div>
      ) : tasks.length === 0 ? (
        <div className="text-center text-gray-500 text-sm py-8">暂无任务</div>
      ) : (
        <div className="space-y-3">
          {tasks.map(t => {
            const percent = Math.min((t.progress / t.targetCount) * 100, 100);
            const canClaim = t.progress >= t.targetCount && !t.isClaimed;
            return (
              <div key={t.taskId} className="bg-[#1c0e0e] border border-[#3d1a1a] rounded-xl p-4 shadow-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="text-sm font-bold text-white">{t.title}</div>
                    <div className="text-[10px] text-gray-500 mt-1">{t.description}</div>
                  </div>
                  <div className="text-xs text-yellow-500 font-bold whitespace-nowrap ml-2">+{t.rewardCoins} 🪙</div>
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all" style={{ width: `${percent}%` }}></div>
                  </div>
                  <div className="text-[10px] text-gray-400 whitespace-nowrap">{t.progress}/{t.targetCount}</div>
                  {t.isClaimed ? (
                    <span className="text-xs text-gray-500 px-3 py-1">已领取</span>
                  ) : canClaim ? (
                    <button onClick={() => handleClaim(t.taskId)} className="bg-red-600 hover:bg-red-700 text-white text-xs px-4 py-1 rounded font-bold">领取</button>
                  ) : (
                    <span className="text-xs text-gray-600 px-3 py-1">进行中</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
