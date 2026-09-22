import { useEffect, useState } from 'react';
import axios from 'axios';
import { useStore } from '../store';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function Popup({ currentPath }) {
  const { user } = useStore();
  const [popups, setPopups] = useState([]);
  const [current, setCurrent] = useState(null);

  useEffect(() => {
    axios.get(`${API_URL}/api/popups`).then((res) => {
      setPopups(res.data || []);
    }).catch(() => {});
  }, [currentPath]);

  // 找出第一个符合条件的弹窗
  useEffect(() => {
    if (!popups.length) return;

    const now = Date.now();
    const matched = popups.find((p) => {
      // 1. 时间范围
      if (p.startAt && new Date(p.startAt).getTime() > now) return false;
      if (p.endAt && new Date(p.endAt).getTime() < now) return false;

      // 2. 位置匹配
      if (p.position === 'HOME' && currentPath !== '/') return false;
      if (p.position === 'PATH' && p.positionPath && !currentPath.startsWith(p.positionPath)) return false;

      // 3. VIP 范围（需要登录）
      if (user) {
        if (user.vipLevel < p.targetVipMin || user.vipLevel > p.targetVipMax) return false;
      } else {
        // 未登录时，若弹窗限定 VIP > 0，则不展示
        if (p.targetVipMin > 0) return false;
      }

      // 4. 用户标签
      if (p.targetTags && user) {
        const userTags = (user.tags || '').split(',').filter(Boolean);
        const requiredTags = p.targetTags.split(',').filter(Boolean);
        if (requiredTags.length > 0 && !requiredTags.some((t) => userTags.includes(t))) return false;
      }

      // 5. 注册天数
      if (user && user.createdAt) {
        const days = Math.floor((now - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        if (days < p.registerDaysMin || days > p.registerDaysMax) return false;
      }

      // 6. 最低充值
      if (user && user.totalRecharge < p.minRecharge) return false;

      // 7. 频率限制（localStorage）
      const key = `popup_${p.id}`;
      const freqData = JSON.parse(localStorage.getItem(key) || '{}');
      const today = new Date().toISOString().slice(0, 10);

      if (p.frequency === 'ONCE' && freqData.shown) return false;
      if (p.frequency === 'DAILY' && freqData.lastDate === today && (freqData.dailyCount || 0) >= p.dailyLimit) return false;
      if (p.frequency === 'SESSION' && sessionStorage.getItem(key)) return false;

      return true;
    });

    if (matched) {
      const delay = (matched.delay || 0) * 1000;
      const timer = setTimeout(() => {
        setCurrent(matched);
        // 记录曝光
        axios.post(`${API_URL}/api/popups/${matched.id}/view`).catch(() => {});

        // 记录频率
        const key = `popup_${matched.id}`;
        const freqData = JSON.parse(localStorage.getItem(key) || '{}');
        const today = new Date().toISOString().slice(0, 10);
        const newData = {
          shown: true,
          lastDate: today,
          dailyCount: freqData.lastDate === today ? (freqData.dailyCount || 0) + 1 : 1,
        };
        localStorage.setItem(key, JSON.stringify(newData));
        sessionStorage.setItem(key, '1');
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [popups, user, currentPath]);

  const handleClose = () => {
    if (current) axios.post(`${API_URL}/api/popups/${current.id}/close`).catch(() => {});
    setCurrent(null);
  };

  const handleClick = () => {
    if (!current) return;
    axios.post(`${API_URL}/api/popups/${current.id}/click`).catch(() => {});
    if (current.buttonLink) {
      if (current.buttonLink.startsWith('http')) {
        window.open(current.buttonLink, '_blank');
      } else {
        window.location.href = current.buttonLink;
      }
    }
    setCurrent(null);
  };

  if (!current) return null;

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[300] p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-[#1a0f0c] border border-[#3d1a1a] rounded-2xl overflow-hidden shadow-2xl relative animate-[fadeIn_0.3s_ease]">
        <button
          onClick={handleClose}
          className="absolute top-2 right-2 w-8 h-8 bg-black/50 hover:bg-black/80 text-white rounded-full flex items-center justify-center z-10 text-xl"
        >×</button>

        {current.imageUrl && (
          <img src={current.imageUrl} className="w-full object-cover max-h-72" alt={current.title} />
        )}

        <div className="p-5">
          {current.title && <div className="font-bold text-lg text-orange-400 mb-2 text-center">{current.title}</div>}
          {current.content && (
            <div
              className="text-sm text-gray-300 mb-4 text-center whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: current.content }}
            />
          )}
          {current.buttonText && (
            <button
              onClick={handleClick}
              className="w-full bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold py-3 rounded-xl shadow-lg"
            >
              {current.buttonText}
            </button>
          )}
        </div>
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
