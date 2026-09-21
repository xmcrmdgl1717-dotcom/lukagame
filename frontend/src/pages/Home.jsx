import { useState } from 'react';
import { useStore } from '../store';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function Home() {
  const { user, boxes, updateCoins, setUser } = useStore();
  const [drawing, setDrawing] = useState(false);
  const [drawnResult, setDrawnResult] = useState([]);

  const handleDraw = async (box, count) => {
    if (!user) return alert('请先登录！');
    if (user.coins < box.price * count) return alert('金币不足，请先充值！');
    
    try {
      const res = await axios.post(`${API_URL}/api/draw`, { userId: user.id, boxId: box.id, count });
      updateCoins(-(box.price * count));
      
      // 刷新用户数据（同步库存和金币）
      const updatedUser = await axios.post(`${API_URL}/api/login`, { username: user.username, password: user.password || '123' });
      setUser(updatedUser.data);
      
      setDrawnResult(res.data.drawnCards);
      setDrawing(true);
    } catch (e) { 
      alert(e.response?.data?.error || '抽卡失败，请重试'); 
    }
  };

  // 辅助函数：按名字在已有盲盒里找，找不到就用默认假数据
  const getBox = (name, defaultPrice) => boxes.find(b => b.name.toLowerCase().includes(name.toLowerCase())) || { id: name, name, price: defaultPrice };

  return (
    <div className="p-4 space-y-6">
      {/* 1. 顶部 Banner 区 */}
      <div className="bg-gradient-to-br from-[#2d1410] to-[#4a1c12] border border-[#6b2a1e] rounded-2xl p-5 relative overflow-hidden">
        <div className="text-center mb-4">
          <div className="text-gray-400 text-[10px] mb-2 tracking-widest">LOG IN TO VIEW YOUR LUKA SCORE</div>
          <div className="text-3xl font-black text-orange-400">81,500 🪙</div>
        </div>
        <div className="flex justify-around text-center text-[10px] text-gray-300">
          <div className="bg-black/30 p-2 rounded-lg w-1/4"><span className="block text-orange-500 font-bold">TOP 1</span>30,000 🪙</div>
          <div className="bg-black/30 p-2 rounded-lg w-1/4"><span className="block text-orange-500 font-bold">TOP 2</span>10,000 🪙</div>
          <div className="bg-black/30 p-2 rounded-lg w-1/4"><span className="block text-orange-500 font-bold">TOP 3</span>4,000 🪙</div>
        </div>
      </div>

      {/* 2. 功能模块区 */}
      <div className="grid grid-cols-3 gap-3 text-center">
        {['Influencer Promos', 'Raffles', 'Leaderboard'].map((item, idx) => (
          <div key={idx} className="bg-[#1c0e0e] border border-[#3d1a1a] rounded-xl p-3 flex flex-col items-center">
            <div className="w-10 h-10 bg-gray-800 rounded-lg mb-2 flex items-center justify-center text-xl">🎖️</div>
            <div className="text-[10px] text-gray-400">{item}</div>
          </div>
        ))}
      </div>

      {/* 3. PACKS 标题 */}
      <div className="text-center text-xs font-bold text-gray-400 tracking-widest my-6">PACKS</div>

      {/* 4. 神秘包 */}
      <div className="bg-gradient-to-r from-red-900 to-red-700 rounded-2xl p-5 border border-red-500 relative overflow-hidden shadow-lg">
        <div className="text-3xl text-red-400 font-black mb-2 opacity-80">???</div>
        <div className="text-center mb-4">
          <img src="https://via.placeholder.com/100x120/333/fff?text=LUKA" className="mx-auto rounded shadow-lg transform rotate-6 border border-white/20" alt="Luka Pack" />
        </div>
        <div className="text-white font-bold text-sm mb-1">666666 🪙</div>
      </div>

      {/* 5. HEAVEN & HELL 包 */}
      <div className="bg-[#1a0f0c] border border-[#3d1a1a] rounded-2xl p-4 relative overflow-hidden shadow-lg">
        <div className="flex justify-between items-center mb-3">
          <div className="text-orange-400 font-bold text-sm tracking-wide">HEAVEN & HELL</div>
          <div className="bg-orange-600 text-white text-[10px] px-2 py-0.5 rounded shadow">Leaderboard</div>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <img src="https://via.placeholder.com/80x100/333/fff?text=H%26H" className="rounded shadow-md border border-orange-500/30" alt="H&H" />
          </div>
          <div className="flex-1 text-right">
            <div className="text-white text-sm font-bold mb-1">450 🪙</div>
            <button 
              onClick={() => handleDraw(getBox('Heaven', 450), 1)}
              className="bg-orange-600 text-white text-xs px-5 py-2 rounded-lg font-bold hover:bg-orange-700 transition"
            >
              开箱
            </button>
          </div>
        </div>
      </div>

      {/* 6. Great / Ultra / Master 分类区 */}
      <div className="space-y-4">
        {[
          { name: 'GREAT', price: 75, color: 'from-blue-900 to-blue-700', img: 'https://via.placeholder.com/60x80/333/fff?text=G' },
          { name: 'ULTRA', price: 300, color: 'from-purple-900 to-purple-700', img: 'https://via.placeholder.com/60x80/333/fff?text=U' },
          { name: 'MASTER', price: 450, color: 'from-yellow-900 to-yellow-700', img: 'https://via.placeholder.com/60x80/333/fff?text=M' }
        ].map((cat, idx) => (
          <div key={idx} className={`bg-gradient-to-br ${cat.color} rounded-2xl p-4 border border-white/10 shadow-lg flex items-center justify-between`}>
            <div className="flex gap-2">
              <img src={cat.img} className="w-10 h-14 rounded shadow" alt={cat.name} />
              <img src={cat.img} className="w-10 h-14 rounded shadow" alt={cat.name} />
            </div>
            <div className="text-right">
              <div className="text-white text-sm font-bold">{cat.name}</div>
              <div className="text-orange-300 text-xs font-bold mb-1">{cat.price} 🪙</div>
              <button 
                onClick={() => handleDraw(getBox(cat.name, cat.price), 1)}
                className="bg-white/20 text-white text-[10px] px-4 py-1 rounded font-bold hover:bg-white/30 transition"
              >
                开箱
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 7. 页脚信息 */}
      <div className="text-center text-[10px] text-gray-600 pt-6 pb-2 leading-relaxed">
        POKEMON TRADING CARD GAME ONLINE<br/>
        Terms & Conditions · Privacy Policy · Blog
      </div>

      {/* 抽卡结果弹窗 */}
      {drawing && drawnResult.length > 0 && (
        <div className="fixed inset-0 bg-black/95 flex flex-col items-center justify-center z-[100] p-4">
          <div className="text-2xl font-bold text-red-500 mb-8 animate-pulse">抽卡结果</div>
          <div className="flex flex-wrap justify-center gap-4">
            {drawnResult.map((card, idx) => (
              <div key={idx} className="w-24 h-32 bg-[#1c0e0e] rounded-lg border border-red-500 flex flex-col items-center justify-center shadow-lg">
                <span className="text-3xl mb-1">🃏</span>
                <span className="text-xs text-white">{card.name}</span>
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
