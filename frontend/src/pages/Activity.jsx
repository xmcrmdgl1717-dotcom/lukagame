import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { useI18n } from '../i18n/index.jsx';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function Activity() {
  const { user, setUser } = useStore();
  const { t } = useI18n();
  const [tab, setTab] = useState('tasks');
  const [tasks, setTasks] = useState([]);
  const [weekly, setWeekly] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    if (!user) { setLoading(false); return; }
    try {
      const res = await axios.get(`${API_URL}/api/tasks/${user.id}`);
      setTasks(res.data);
    } catch (e) {}
    setLoading(false);
  };

  const fetchLeaderboards = async () => {
    try {
      const [w, m] = await Promise.all([
        axios.get(`${API_URL}/api/leaderboard/weekly`),
        axios.get(`${API_URL}/api/leaderboard/monthly`),
      ]);
      setWeekly(w.data);
      setMonthly(m.data);
    } catch (e) {}
  };

  useEffect(() => { fetchTasks(); fetchLeaderboards(); }, [user]);

  const handleClaim = async (taskId) => {
    try {
      const res = await axios.post(`${API_URL}/api/tasks/claim`, { userId: user.id, taskId });
      alert(`领取成功！获得 ${res.data.reward} 金币`);
      const updated = await axios.post(`${API_URL}/api/login`, { username: user.username, password: user.password || '123' });
      setUser(updated.data);
      fetchTasks();
    } catch (e) { alert(e.response?.data?.error || '领取失败'); }
  };

  return (
    <div className="p-4">
      <div className="flex justify-around bg-[#1c0e0e] rounded-lg p-1 mb-6">
        <button onClick={() => setTab('tasks')} className={`flex-1 py-2 text-xs font-bold rounded ${tab === 'tasks' ? 'bg-red-600 text-white' : 'text-gray-400'}`}>{t('activity.tasks', '每日任务')}</button>
        <button onClick={() => setTab('weekly')} className={`flex-1 py-2 text-xs font-bold rounded ${tab === 'weekly' ? 'bg-red-600 text-white' : 'text-gray-400'}`}>{t('activity.weekly', '周榜')}</button>
        <button onClick={() => setTab('monthly')} className={`flex-1 py-2 text-xs font-bold rounded ${tab === 'monthly' ? 'bg-red-600 text-white' : 'text-gray-400'}`}>{t('activity.monthly', '月榜')}</button>
      </div>

      {tab === 'tasks' && (
        <>
          {!user ? (
            <div className="text-center text-gray-500 py-20 text-sm">请先登录</div>
          ) : loading ? (
            <div className="text-center text-gray-500 text-sm py-8">加载中...</div>
          ) : tasks.length === 0 ? (
            <div className="text-center text-gray-500 text-sm py-8">暂无任务</div>
          ) : (
            <div className="space-y-3">
              {tasks.map(t_item => {
                const percent = Math.min((t_item.progress / t_item.targetCount) * 100, 100);
                const canClaim = t_item.progress >= t_item.targetCount && !t_item.isClaimed;
                return (
                  <div key={t_item.taskId} className="bg-[#1c0e0e] border border-[#3d1a1a] rounded-xl p-4 shadow-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="text-sm font-bold text-white">{t_item.title}</div>
                        <div className="text-[10px] text-gray-500 mt-1">{t_item.description}</div>
                      </div>
                      <div className="text-xs text-yellow-500 font-bold whitespace-nowrap ml-2">+{t_item.rewardCoins} 🪙</div>
                    </div>
                    <div className="flex items-center gap-3 mt-3">
                      <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-orange-500 to-red-500" style={{ width: `${percent}%` }}></div>
                      </div>
                      <div className="text-[10px] text-gray-400 whitespace-nowrap">{t_item.progress}/{t_item.targetCount}</div>
                      {t_item.isClaimed ? (
                        <span className="text-xs text-gray-500 px-3 py-1">{t('activity.claimed', '已领取')}</span>
                      ) : canClaim ? (
                        <button onClick={() => handleClaim(t_item.taskId)} className="bg-red-600 text-white text-xs px-4 py-1 rounded font-bold">{t('activity.claim', '领取')}</button>
                      ) : (
                        <span className="text-xs text-gray-600 px-3 py-1">{t('activity.progress', '进行中')}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {(tab === 'weekly' || tab === 'monthly') && (
        <div className="space-y-2">
          {(tab === 'weekly' ? weekly : monthly).length === 0 ? (
            <div className="text-center text-gray-500 text-sm py-8">暂无数据</div>
          ) : (
            (tab === 'weekly' ? weekly : monthly).map((row, idx) => (
              <div key={idx} className="bg-[#1c0e0e] border border-[#3d1a1a] rounded-xl p-4 flex justify-between items-center shadow-lg">
                <div className="flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${idx === 0 ? 'bg-yellow-500 text-black' : idx === 1 ? 'bg-gray-400 text-black' : idx === 2 ? 'bg-orange-700 text-white' : 'bg-gray-800 text-gray-400'}`}>
                    {idx + 1}
                  </span>
                  <span className="text-white font-bold">{row.username}</span>
                </div>
                <span className="text-orange-400 font-bold text-sm">{row.totalCost.toLocaleString()} 🪙</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
