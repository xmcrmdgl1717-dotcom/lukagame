import { useState } from 'react';
import { useStore } from '../store';
import axios from 'axios';

export default function Home() {
  const { user, boxes, updateCoins, setUser } = useStore();
  const [drawing, setDrawing] = useState(false);
  const [drawnResult, setDrawnResult] = useState([]);

  const handleDraw = async (box, count) => {
    if (user.coins < box.price * count) {
      return alert('金币不足，请先充值！');
    }
    
    try {
      const res = await axios.post('http://localhost:3001/api/draw', {
        userId: user.id, 
        boxId: box.id, 
        count
      });
      
      updateCoins(-(box.price * count));
      
      const updatedUser = await axios.post('http://localhost:3001/api/login', { username: 'test' });
      setUser(updatedUser.data);

      setDrawnResult(res.data.drawnCards);
      setDrawing(true);
    } catch (e) {
      alert(e.response?.data?.error || '抽卡失败，请重试');
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <div className="text-3xl font-black italic text-red-500 tracking-wider">LUKA!</div>
        <div className="bg-[#2a1414] text-red-400 text-xs px-3 py-1 rounded-full border border-red-900/50">
          💰 {user.coins.toLocaleString()}
        </div>
      </div>

      <div className="text-sm font-bold mb-3 text-gray-300">热门包裹</div>
      <div className="space-y-4">
        {boxes.map(box => (
          <div key={box.id} className="bg-gradient-to-br from-[#1c0e0e] to-[#2a1414] border border-[#3d1a1a] rounded-xl p-4 flex justify-between items-center shadow-lg">
            <div>
              <div className="text-lg font-bold text-orange-400 mb-1">{box.name}</div>
              <div className="text-xs text-yellow-500 font-bold">{box.price.toLocaleString()} 🪙</div>
            </div>
            <button 
              onClick={() => handleDraw(box, 1)}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-lg shadow-red-900/50 transition-colors"
            >
              开箱
            </button>
          </div>
        ))}
      </div>

      {drawing && drawnResult.length > 0 && (
        <div className="fixed inset-0 bg-black/95 flex flex-col items-center justify-center z-[100] p-4">
          <div className="text-2xl font-bold text-red-500 mb-8 glow-text animate-pulse">抽卡结果</div>
          <div className="flex flex-wrap justify-center gap-4">
            {drawnResult.map((card, idx) => (
              <div key={idx} className="w-28 h-40 bg-[#1c0e0e] rounded-lg border-2 border-red-500 flex flex-col items-center justify-center shadow-lg shadow-red-900/30">
                <span className="text-4xl mb-2">🃏</span>
                <span className="text-sm font-bold text-white mb-1">{card.name}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${card.rarity === 'SSR' ? 'bg-yellow-500 text-black' : card.rarity === 'SR' ? 'bg-purple-500' : 'bg-blue-500'}`}>
                  {card.rarity}
                </span>
              </div>
            ))}
          </div>
          <button 
            onClick={() => { setDrawing(false); setDrawnResult([]); }} 
            className="mt-10 bg-red-600 hover:bg-red-700 px-10 py-3 rounded-full font-bold text-white shadow-lg shadow-red-900/50 transition-colors"
          >
            确认
          </button>
        </div>
      )}
    </div>
  );
}
