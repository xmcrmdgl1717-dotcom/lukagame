import { useEffect, useState } from 'react';
import { useStore } from '../store';

export default function Activity() {
  const { user } = useStore();
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    setTasks([
      { id: 1, title: '卢卡盒子抽卡 1 次', progress: 0, target: 1, reward: 100 },
      { id: 2, title: '从任意礼包抽出 1 张 SSR+ 卡', progress: 0, target: 1, reward: 500 },
      { id: 3, title: '抽取 20 次即可获得随机礼包', progress: 0, target: 20, reward: 1000 },
    ]);
  }, [user]);

  return (
    <div className="p-4">
      <div className="text-center text-lg font-bold mb-6 text-orange-400">每日任务</div>
      {tasks.map(task => (
        <div key={task.id} className="bg-[#1c0e0e] border border-[#3d1a1a] rounded-xl p-4 mb-3 flex justify-between items-center shadow-lg">
          <div>
            <div className="text-sm font-bold text-gray-200 mb-1">{task.title}</div>
            <div className="text-xs text-gray-500">进度: {task.progress}/{task.target}</div>
          </div>
          <div className="text-xs font-bold text-yellow-500">+{task.reward} 🪙</div>
        </div>
      ))}
      <div className="text-center text-gray-500 text-xs mt-10">更多活动敬请期待...</div>
    </div>
  );
}
