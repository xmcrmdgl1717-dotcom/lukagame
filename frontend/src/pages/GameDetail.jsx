import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { useI18n } from '../i18n/index.jsx';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function GameDetail({ gameId, onBack, onGoBoxDetail }) {
  const { user, currency } = useStore();
  const { t } = useI18n();
  const [game, setGame] = useState(null);
  const [boxes, setBoxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState('');

  useEffect(() => {
    axios.get(`${API_URL}/api/games/${gameId}`)
      .then((res) => { setGame(res.data); setBoxes(res.data.boxes || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [gameId]);

  useEffect(() => {
    if (!user || !gameId) return;
    axios.post(`${API_URL}/api/games/${gameId}/check-access`, { userId: user.id })
      .then((res) => { if (!res.data.allowed) setAccessError(res.data.reason); else setAccessError(''); })
      .catch(() => {});
  }, [user, gameId]);

  const handleEnterBox = (box) => {
    if (!user) return alert('请先登录');
    if (accessError) return alert(accessError);
    onGoBoxDetail(box.id);
  };

  if (loading) return <div className="text-center text-gray-500 py-20">加载中...</div>;
  if (!game) return <div className="text-center text-gray-500 py-20">游戏不存在</div>;

  return (
    <div className="p-4 space-y-4">
      <button onClick={onBack} className="text-gray-400 text-sm hover:text-white">← {t('common.close', '返回首页')}</button>

      <div className="relative rounded-2xl overflow-hidden border border-[#2a2a2a]">
        <div className="h-40 bg-[#0d0d0d] flex items-center justify-center">
          {game.coverUrl ? <img src={game.coverUrl} className="w-full h-full object-cover" /> : <div className="text-6xl">{game.icon}</div>}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
        <div className="absolute bottom-3 left-4 right-4">
          <div className="text-white font-bold text-xl">{game.displayName}</div>
          <div className="text-gray-300 text-xs mt-1">{game.description}</div>
        </div>
      </div>

      {accessError ? (
        <div className="bg-red-900/40 border border-red-600 rounded-xl p-4 text-center">
          <div className="text-red-400 font-bold text-sm">🔒 无法进入</div>
          <div className="text-red-300 text-xs mt-1">{accessError}</div>
        </div>
      ) : (game.minVipLevel > 0 || game.minCoins > 0) && (
        <div className="bg-[#2a1414] border border-orange-700/50 rounded-xl p-3 text-center text-xs">
          <span className="text-gray-400">入场要求：</span>
          {game.minVipLevel > 0 && <span className="text-orange-400 font-bold ml-2">VIP{game.minVipLevel}+</span>}
          {game.minCoins > 0 && (
            <span className="text-yellow-400 font-bold ml-2 flex-inline items-center gap-1">
              余额 <span className="text-yellow-500">{currency.symbol}</span> {game.minCoins.toLocaleString()}+
            </span>
          )}
        </div>
      )}

      <div>
        <div className="text-sm font-bold text-gray-300 mb-3">本游戏的盲盒</div>
        {boxes.length === 0 ? (
          <div className="text-center text-gray-500 py-10 text-sm">暂无盲盒</div>
        ) : (
          <div className="space-y-3">
            {boxes.map((box) => (
              <div
                key={box.id}
                onClick={() => handleEnterBox(box)}
                className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:border-orange-500/60 transition active:scale-[0.98]"
              >
                <div className="w-16 h-20 bg-[#0d0d0d] rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                  {box.coverUrl ? <img src={box.coverUrl} className="w-full h-full object-cover" /> : <span className="text-3xl">📦</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white truncate">{box.name}</div>
                  {box.description && (
                    <div className="text-[10px] text-gray-500 mt-0.5 truncate">{box.description}</div>
                  )}
                  <div className="text-yellow-500 text-sm mt-1 flex items-center gap-1">
                    <span>{currency.symbol}</span>
                    <span>{box.price.toLocaleString()}</span>
                  </div>
                </div>
                <div className="bg-red-600 hover:bg-red-700 text-white text-xs px-5 py-2 rounded-lg font-bold flex-shrink-0">
                  {t('draw.title', '进入')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
