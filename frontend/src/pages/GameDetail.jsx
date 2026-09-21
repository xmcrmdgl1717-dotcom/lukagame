import { useState, useEffect } from 'react';
import { useStore } from '../store';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function GameDetail({ gameId, onBack }) {
  const { user, updateCoins, setUser } = useStore();
  const [game, setGame] = useState(null);
  const [boxes, setBoxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState('');
  const [drawing, setDrawing] = useState(false);
  const [drawnResult, setDrawnResult] = useState([]);
  const [selectedBox, setSelectedBox] = useState(null);
  const [drawCount, setDrawCount] = useState(1);

  useEffect(() => {
    axios.get(`${API_URL}/api/games/${gameId}`)
      .then((res) => {
        setGame(res.data);
        setBoxes(res.data.boxes || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [gameId]);

  // 检查入场条件
  useEffect(() => {
    if (!user || !gameId) return;
    axios.post(`${API_URL}/api/games/${gameId}/check-access`, { userId: user.id })
      .then((res) => {
        if (!res.data.allowed) setAccessError(res.data.reason);
        else setAccessError('');
      })
      .catch(() => {});
  }, [user, gameId]);

  const handleDraw = async (box) => {
    if (!user) return;
    if (accessError) return alert(accessError);
    if (user.coins < box.price * drawCount) return alert('金币不足');

    try {
      const res = await axios.post(`${API_URL}/api/draw`, {
        userId: user.id, boxId: box.id, count: drawCount,
      });
      updateCoins(-(box.price * drawCount));
      const updatedUser = await axios.post(`${API_URL}/api/login`, { username: user.username, password: user.password || '123' });
      setUser(updatedUser.data);
      setDrawnResult(res.data.drawnCards);
      setDrawing(true);
      setSelectedBox(null);
    } catch (e) {
      alert(e.response?.data?.error || '抽卡失败');
    }
  };

  if (loading) return <div className="text-center text-gray-500 py-20">加载中...</div>;
  if (!game) return <div className="text-center text-gray-500 py-20">游戏不存在</div>;

  return (
    <div className="p-4 space-y-4">
      {/* 顶部返回 */}
      <button onClick={onBack} className="text-gray-400 text-sm hover:text-white">← 返回首页</button>

      {/* 游戏头部 */}
      <div className="relative rounded-2xl overflow-hidden border border-[#2a2a2a]">
        <div className="h-40 bg-[#0d0d0d] flex items-center justify-center">
          {game.coverUrl ? (
            <img src={game.coverUrl} className="w-full h-full object-cover" />
          ) : (
            <div className="text-6xl">{game.icon}</div>
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
        <div className="absolute bottom-3 left-4 right-4">
          <div className="text-white font-bold text-xl">{game.displayName}</div>
          <div className="text-gray-300 text-xs mt-1">{game.description}</div>
        </div>
      </div>

      {/* 入场条件提示 */}
      {accessError ? (
        <div className="bg-red-900/40 border border-red-600 rounded-xl p-4 text-center">
          <div className="text-red-400 font-bold text-sm">🔒 无法进入</div>
          <div className="text-red-300 text-xs mt-1">{accessError}</div>
        </div>
      ) : (
        game.minVipLevel > 0 || game.minCoins > 0 ? (
          <div className="bg-[#2a1414] border border-orange-700/50 rounded-xl p-3 text-center text-xs">
            <span className="text-gray-400">入场要求：</span>
            {game.minVipLevel > 0 && <span className="text-orange-400 font-bold ml-2">VIP{game.minVipLevel}+</span>}
            {game.minCoins > 0 && <span className="text-yellow-400 font-bold ml-2">余额 {game.minCoins.toLocaleString()} 🪙+</span>}
          </div>
        ) : null
      )}

      {/* 盲盒列表 */}
      <div>
        <div className="text-sm font-bold text-gray-300 mb-3">本游戏的盲盒</div>
        {boxes.length === 0 ? (
          <div className="text-center text-gray-500 py-10 text-sm">暂无盲盒</div>
        ) : (
          <div className="space-y-3">
            {boxes.map((box) => (
              <div key={box.id} className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 flex items-center gap-3">
                <div className="w-16 h-20 bg-[#0d0d0d] rounded flex items-center justify-center">
                  {box.coverUrl ? (
                    <img src={box.coverUrl} className="w-full h-full object-cover rounded" />
                  ) : (
                    <span className="text-3xl">📦</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-white">{box.name}</div>
                  <div className="text-yellow-500 text-sm mt-1">{box.price.toLocaleString()} 🪙</div>
                </div>
                <button
                  onClick={() => setSelectedBox(box)}
                  disabled={!!accessError}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-30 text-white text-xs px-5 py-2 rounded-lg font-bold"
                >
                  抽奖
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 抽奖弹窗 */}
      {selectedBox && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4">
          <div className="bg-[#161616] rounded-2xl border border-[#2a2a2a] p-6 w-full max-w-sm">
            <h3 className="text-center font-bold text-lg mb-4 text-orange-400">{selectedBox.name}</h3>
            <div className="text-center mb-4">
              <div className="text-sm text-gray-400 mb-1">单价</div>
              <div className="text-2xl font-bold text-yellow-500">{selectedBox.price.toLocaleString()} 🪙</div>
            </div>
            <div className="mb-4">
              <div className="text-sm text-gray-400 mb-2 text-center">抽奖次数</div>
              <div className="flex gap-2 justify-center">
                {[1, 10, 50].map((n) => (
                  <button
                    key={n}
                    onClick={() => setDrawCount(n)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold ${drawCount === n ? 'bg-red-600 text-white' : 'bg-[#2a2a2a] text-gray-400'}`}
                  >
                    {n}次
                  </button>
                ))}
              </div>
              <div className="text-center text-xs text-gray-500 mt-2">
                总计：{(selectedBox.price * drawCount).toLocaleString()} 🪙
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setSelectedBox(null)} className="flex-1 bg-[#2a2a2a] text-white py-3 rounded-lg text-sm font-bold">
                取消
              </button>
              <button
                onClick={() => handleDraw(selectedBox)}
                className="flex-1 bg-gradient-to-r from-red-600 to-orange-600 text-white py-3 rounded-lg text-sm font-bold shadow-lg"
              >
                点击抽奖
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 抽卡结果 */}
      {drawing && drawnResult.length > 0 && (
        <div className="fixed inset-0 bg-black/95 flex flex-col items-center justify-center z-[100] p-4">
          <div className="text-2xl font-bold text-red-500 mb-8 animate-pulse">抽卡结果</div>
          <div className="flex flex-wrap justify-center gap-3">
            {drawnResult.map((card, idx) => (
              <div key={idx} className="w-20 h-28 bg-[#1c0e0e] rounded-lg border border-red-500 flex flex-col items-center justify-center">
                <span className="text-3xl mb-1">🃏</span>
                <span className="text-[10px] text-white">{card.name}</span>
                <span className="text-[10px] text-yellow-500 font-bold">{card.rarity}</span>
              </div>
            ))}
          </div>
          <button onClick={() => { setDrawing(false); setDrawnResult([]); }} className="mt-8 bg-red-600 px-8 py-3 rounded-full font-bold text-sm">确认</button>
        </div>
      )}
    </div>
  );
}
