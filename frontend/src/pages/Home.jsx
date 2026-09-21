import { useState, useEffect } from 'react';
import { useStore } from '../store';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function Home({ onShowLogin }) {
  const { user, boxes, updateCoins, setUser } = useStore();
  const [drawing, setDrawing] = useState(false);
  const [drawnResult, setDrawnResult] = useState([]);
  const [banners, setBanners] = useState([]);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    axios.get(`${API_URL}/api/banners`).then(res => setBanners(res.data)).catch(() => {});
    axios.get(`${API_URL}/api/leaderboard/weekly`).then(res => setLeaderboard(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (banners.length === 0) return;
    const timer = setInterval(() => setCurrentBanner(prev => (prev + 1) % banners.length), 3000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const handleBannerClick = (link) => {
    if (link && link !== '#') window.open(link, '_blank');
  };

  const handleDraw = async (box, count) => {
    if (!user) return onShowLogin();
    if (user.coins < box.price * count) return alert('金币不足，请先充值！');
    try {
      const res = await axios.post(`${API_URL}/api/draw`, { userId: user.id, boxId: box.id, count });
      updateCoins(-(box.price * count));
      const updatedUser = await axios.post(`${API_URL}/api/login`, { username: user.username, password: user.password || '123' });
      setUser(updatedUser.data);
      setDrawnResult(res.data.drawnCards);
      setDrawing(true);
    } catch (e) { alert(e.response?.data?.error || '抽卡失败'); }
  };

  const getBox = (name, defaultPrice) => boxes.find(b => b.name.toLowerCase().includes(name.toLowerCase())) || { id: name, name, price: defaultPrice };

  return (
    <div className="p-4 space-y-6">
      {/* 1. 顶部轮播图 */}
      <div className="relative overflow-hidden rounded-2xl border border-[#3a1a1a] shadow-2xl">
        {banners.length === 0 ? (
          <div className="w-full h-48 bg-gradient-to-br from-[#2d1410] to-[#4a1c12] flex items-center justify-center text-gray-500 text-sm">暂无轮播图</div>
        ) : (
          <>
            <div className="flex transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${currentBanner * 100}%)` }}>
              {banners.map(b => (
                <div key={b.id} className="w-full flex-shrink-0 relative cursor-pointer" onClick={() => handleBannerClick(b.link)}>
                  <img src={b.imageUrl} alt={b.title} className="w-full h-48 object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/60 to-transparent"></div>
                </div>
              ))}
            </div>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-20">
              {banners.map((_, idx) => (
                <button key={idx} onClick={(e) => { e.stopPropagation(); setCurrentBanner(idx); }}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${currentBanner === idx ? 'bg-orange-500 w-4' : 'bg-gray-500/50'}`} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* 2. 周消耗榜 */}
      <div className="bg-gradient-to-br from-[#2d1410] to-[#4a1c12] border border-[#6b2a1e] rounded-2xl p-5 shadow-lg">
        <div className="text-center mb-3">
          <div className="text-orange-400 font-bold text-sm tracking-widest mb-1">1 Week Spending Leaderboard</div>
          <div className="text-gray-300 text-[10px]">The more you open, the higher your rank!</div>
        </div>
        {leaderboard.length === 0 ? (
          <div className="text-center text-gray-500 text-xs py-4">暂无数据</div>
        ) : (
          <div className="space-y-2">
            {leaderboard.slice(0, 3).map((row, idx) => (
              <div key={idx} className="flex justify-between items-center bg-black/30 rounded-lg px-3 py-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-300' : 'text-orange-400'}`}>TOP {idx + 1}</span>
                  <span className="text-white">{row.username}</span>
                </div>
                <span className="text-orange-500 font-bold">{row.totalCost.toLocaleString()} 🪙</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. 功能模块 */}
      <div className="grid grid-cols-3 gap-3 text-center">
        {['Influencer Promos', 'Raffles', 'Leaderboard'].map((item, idx) => (
          <div key={idx} className="bg-[#1c0e0e] border border-[#3d1a1a] rounded-xl p-3 flex flex-col items-center">
            <div className="w-10 h-10 bg-gray-800 rounded-lg mb-2 flex items-center justify-center text-xl">🎖️</div>
            <div className="text-[10px] text-gray-400">{item}</div>
          </div>
        ))}
      </div>

      <div className="text-center text-xs font-bold text-gray-400 tracking-widest my-6">PACKS</div>

      {/* 4. 神秘包 */}
      <div className="bg-gradient-to-r from-red-900 to-red-700 rounded-2xl p-5 border border-red-500 relative overflow-hidden shadow-lg">
        <div className="text-3xl text-red-400 font-black mb-2 opacity-80">???</div>
        <div className="text-center mb-4">
          <img src="https://via.placeholder.com/100x120/333/fff?text=LUKA" className="mx-auto rounded shadow-lg transform rotate-6 border border-white/20" alt="Luka Pack" />
        </div>
        <div className="text-white font-bold text-sm mb-1">666666 🪙</div>
      </div>

      {/* 5. HEAVEN & HELL */}
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
            <button onClick={() => handleDraw(getBox('Heaven', 450), 1)}
              className="bg-orange-600 text-white text-xs px-5 py-2 rounded-lg font-bold hover:bg-orange-700 transition">开箱</button>
          </div>
        </div>
      </div>

      {/* 6. Great / Ultra / Master */}
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
              <button onClick={() => handleDraw(getBox(cat.name, cat.price), 1)}
                className="bg-white/20 text-white text-[10px] px-4 py-1 rounded font-bold hover:bg-white/30 transition">开箱</button>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center text-[10px] text-gray-600 pt-6 pb-2 leading-relaxed">
        POKEMON TRADING CARD GAME ONLINE<br/>
        Terms & Conditions · Privacy Policy · Blog
      </div>

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
