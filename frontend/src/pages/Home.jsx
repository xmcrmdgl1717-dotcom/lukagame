import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { useI18n } from '../i18n/index.jsx';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function Home({ onShowLogin, onGoGame, onGoLeaderboard, onGoBoxDetail }) {
  const { user } = useStore();
  const { t } = useI18n();
  const [banners, setBanners] = useState([]);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [games, setGames] = useState([]);
  const [featuredBoxes, setFeaturedBoxes] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    axios.get(`${API_URL}/api/banners`).then(res => setBanners(res.data)).catch(() => {});
    axios.get(`${API_URL}/api/games`).then(res => setGames(res.data)).catch(() => {});
    axios.get(`${API_URL}/api/boxes?featured=true`).then(res => setFeaturedBoxes(res.data)).catch(() => {});
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

  const handleBoxClick = (box) => {
    if (!user) return onShowLogin();
    onGoBoxDetail(box.id);
  };

  return (
    <div className="p-4 space-y-6">
      {/* 轮播图 */}
      <div className="relative overflow-hidden rounded-2xl border border-[#3a1a1a] shadow-2xl">
        {banners.length === 0 ? (
          <div className="w-full h-48 bg-gradient-to-br from-[#2d1410] to-[#4a1c12] flex items-center justify-center text-gray-500 text-sm">暂无轮播图</div>
        ) : (
          <>
            <div className="flex transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${currentBanner * 100}%)` }}>
              {banners.map(b => (
                <div key={b.id} className="w-full flex-shrink-0 relative cursor-pointer" onClick={() => handleBannerClick(b.link)}>
                  <img src={b.imageUrl} alt={b.title} className="w-full h-48 object-cover" />
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

      {/* 排行榜 */}
      <div className="bg-gradient-to-br from-[#2d1410] to-[#4a1c12] border border-[#6b2a1e] rounded-2xl p-5 shadow-lg">
        <div className="flex justify-between items-center mb-3">
          <div className="text-orange-400 font-bold text-sm tracking-widest">{t('home.leaderboard', '一周消费排行榜')}</div>
          <button onClick={onGoLeaderboard} className="text-[10px] text-orange-500 hover:text-orange-400 transition underline">
            查看完整榜单
          </button>
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
                  <span className="text-[10px] bg-orange-900/60 text-orange-200 px-1.5 py-0.5 rounded">VIP{row.vipLevel}</span>
                </div>
                <span className="text-orange-500 font-bold">{row.totalCost.toLocaleString()} 🪙</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 游戏专区 */}
      {games.length > 0 && (
        <div>
          <div className="text-center text-xs font-bold text-gray-400 tracking-widest mb-3">{t('home.games', '游戏专区')}</div>
          <div className="grid grid-cols-2 gap-3">
            {games.map((g) => (
              <div
                key={g.id}
                onClick={() => onGoGame(g)}
                className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden cursor-pointer hover:border-orange-600 transition shadow-lg"
              >
                <div className="h-28 bg-[#0d0d0d] flex items-center justify-center relative">
                  {g.coverUrl ? (
                    <img src={g.coverUrl} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-5xl">{g.icon || '🎮'}</div>
                  )}
                  {g.minVipLevel > 0 && (
                    <span className="absolute top-2 right-2 text-[10px] bg-orange-600 text-white px-1.5 py-0.5 rounded">VIP{g.minVipLevel}+</span>
                  )}
                </div>
                <div className="p-2 text-center">
                  <div className="text-sm font-bold text-white truncate">{g.displayName}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5 truncate">{g.description || t('home.enter', '进入抽奖')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 推荐盲盒 */}
      {featuredBoxes.length > 0 && (
        <div>
          <div className="text-center text-xs font-bold text-gray-400 tracking-widest my-3">{t('home.featured', '推荐盲盒')}</div>
          <div className="space-y-3">
            {featuredBoxes.map((box) => (
              <div
                key={box.id}
                onClick={() => handleBoxClick(box)}
                className="bg-[#1a0f0c] border border-[#3d1a1a] rounded-2xl p-4 relative overflow-hidden shadow-lg cursor-pointer hover:border-orange-500/60 transition active:scale-[0.98]"
              >
                <div className="flex justify-between items-center mb-3">
                  <div className="text-orange-400 font-bold text-sm tracking-wide">{box.name}</div>
                  {box.game?.displayName && (
                    <div className="bg-orange-600 text-white text-[10px] px-2 py-0.5 rounded shadow">{box.game.displayName}</div>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    {box.coverUrl ? (
                      <img src={box.coverUrl} className="w-20 h-24 object-cover rounded shadow-md border border-orange-500/30" />
                    ) : (
                      <div className="w-20 h-24 bg-[#0d0d0d] rounded flex items-center justify-center text-4xl">📦</div>
                    )}
                  </div>
                  <div className="flex-1 text-right">
                    <div className="text-white text-sm font-bold mb-2">{box.price.toLocaleString()} 🪙</div>
                    <div className="bg-orange-600 text-white text-xs px-5 py-2 rounded-lg font-bold inline-block">
                      立即开盒
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-center text-[10px] text-gray-600 pt-6 pb-2 leading-relaxed">
        POKEMON TRADING CARD GAME ONLINE<br/>
        Terms & Conditions · Privacy Policy · Blog
      </div>
    </div>
  );
}
