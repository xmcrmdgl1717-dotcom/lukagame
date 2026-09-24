import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const rarityColor = (r) =>
  r === 'SSR' ? 'text-yellow-400' : r === 'SR' ? 'text-purple-400' : 'text-blue-400';

const rarityBorder = (r) =>
  r === 'SSR' ? 'border-yellow-400 shadow-yellow-500/50'
  : r === 'SR' ? 'border-purple-500 shadow-purple-500/40'
  : 'border-blue-500 shadow-blue-500/30';

const rarityGlow = (r) =>
  r === 'SSR' ? 'shadow-[0_0_30px_rgba(250,204,21,0.8)]'
  : r === 'SR' ? 'shadow-[0_0_20px_rgba(168,85,247,0.6)]'
  : 'shadow-[0_0_12px_rgba(59,130,246,0.4)]';

const fmtTime = (d) => {
  if (!d) return '';
  const t = new Date(d);
  const diff = Math.floor((Date.now() - t.getTime()) / 1000);
  if (diff < 60) return `${diff}秒前`;
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  return `${Math.floor(diff / 86400)}天前`;
};

export default function DrawDetail({ boxId, onBack, onGoInventory }) {
  const { user, setUser } = useStore();
  const [box, setBox] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentDraws, setRecentDraws] = useState([]);
  const [showPool, setShowPool] = useState(false);

  // 抽奖流程状态
  const [phase, setPhase] = useState('idle'); // idle | countdown | revealing | done
  const [countdown, setCountdown] = useState(3);
  const [drawnCards, setDrawnCards] = useState([]);
  const [revealIdx, setRevealIdx] = useState(0);
  const [pendingCount, setPendingCount] = useState(1);
  const timerRef = useRef(null);

  // 加载盲盒详情
  useEffect(() => {
    setLoading(true);
    axios.get(`${API_URL}/api/boxes/${boxId}`)
      .then(res => setBox(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [boxId]);

  // 加载动态
  useEffect(() => {
    const loadRecent = () => {
      axios.get(`${API_URL}/api/boxes/${boxId}/recent-draws`)
        .then(res => setRecentDraws(res.data || []))
        .catch(() => {});
    };
    loadRecent();
    const timer = setInterval(loadRecent, 15000);
    return () => clearInterval(timer);
  }, [boxId]);

  // 清理计时器
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const startDraw = async (count) => {
    if (!user) return alert('请先登录');
    if (!box) return;
    const totalCost = box.price * count;
    if (user.coins < totalCost) return alert(`金币不足！需要 ${totalCost.toLocaleString()} 🪙`);

    setPendingCount(count);

    // 1. 请求后端抽奖
    try {
      const res = await axios.post(`${API_URL}/api/draw`, { userId: user.id, boxId: box.id, count });
      const cards = res.data.drawnCards || [];
      setDrawnCards(cards);
      setRevealIdx(0);

      // 2. 进入倒计时动画
      setPhase('countdown');
      setCountdown(3);

      let cd = 3;
      const tick = () => {
        cd -= 1;
        if (cd > 0) {
          setCountdown(cd);
          timerRef.current = setTimeout(tick, 700);
        } else {
          setCountdown(0); // GO!
          timerRef.current = setTimeout(() => {
            // 3. 进入揭晓
            setPhase('revealing');
            revealNext(cards, 0);
          }, 500);
        }
      };
      timerRef.current = setTimeout(tick, 700);

      // 4. 立刻刷新用户（余额已扣）
      const updated = await axios.post(`${API_URL}/api/login`, { username: user.username, password: user.password || '123' });
      setUser(updated.data);
    } catch (e) {
      alert('抽奖失败: ' + (e.response?.data?.error || e.message));
      setPhase('idle');
    }
  };

  const revealNext = (cards, idx) => {
    if (idx >= cards.length) {
      // 全部揭晓完
      timerRef.current = setTimeout(() => setPhase('done'), 400);
      return;
    }
    setRevealIdx(idx + 1);
    // 每张间隔 250ms，SSR 慢一点给足特效时间
    const card = cards[idx];
    const delay = card.rarity === 'SSR' ? 900 : card.rarity === 'SR' ? 500 : 250;
    timerRef.current = setTimeout(() => revealNext(cards, idx + 1), delay);
  };

  const closeResult = () => {
    setPhase('idle');
    setDrawnCards([]);
    setRevealIdx(0);
    // 刷新动态
    axios.get(`${API_URL}/api/boxes/${boxId}/recent-draws`).then(res => setRecentDraws(res.data || [])).catch(() => {});
  };

  if (loading) return <div className="text-center text-gray-500 py-20 text-sm">加载中...</div>;
  if (!box) return <div className="text-center text-gray-500 py-20 text-sm">盲盒不存在或已下架</div>;

  const isDrawing = phase !== 'idle';
  const hasSSR = drawnCards.some(c => c.rarity === 'SSR');

  return (
    <div className="space-y-4 pb-32 relative">
      {/* 返回 */}
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="text-gray-400 text-sm hover:text-white">← 返回</button>
        {box.game && (
          <span className="text-[10px] bg-orange-600/80 text-white px-2 py-0.5 rounded">
            {box.game.icon} {box.game.displayName}
          </span>
        )}
      </div>

      {/* 大封面 */}
      <div className="relative rounded-2xl overflow-hidden border border-[#3d1a1a] shadow-2xl">
        <div className="w-full aspect-video bg-gradient-to-br from-[#2d1410] via-[#3a1c14] to-[#4a1c12] flex items-center justify-center relative">
          {box.coverUrl ? (
            <img src={box.coverUrl} className="w-full h-full object-cover" />
          ) : (
            <span className="text-8xl opacity-50">📦</span>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent"></div>
          <div className="absolute bottom-4 left-4 right-4">
            <div className="text-2xl font-black text-white drop-shadow-lg">{box.name}</div>
            {box.description && (
              <div className="text-xs text-gray-300 mt-1 line-clamp-2">{box.description}</div>
            )}
          </div>
          {box.allowTransfer && (
            <div className="absolute top-3 right-3 bg-purple-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg">
              🎁 可转让
            </div>
          )}
        </div>
      </div>

      {/* 全服抽奖动态 */}
      <div className="bg-[#1c0e0e] border border-[#3d1a1a] rounded-xl p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-bold text-orange-400">🔥 全服动态</span>
          <div className="flex-1 h-px bg-[#3d1a1a]"></div>
          <span className="text-[10px] text-gray-500">实时更新</span>
        </div>
        {recentDraws.length === 0 ? (
          <div className="text-center text-gray-500 text-[11px] py-3">暂无抽奖记录，来做第一个！</div>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
            {recentDraws.slice(0, 10).map(d => (
              <div key={d.id} className="flex-shrink-0 bg-[#0d0d0d] rounded-lg px-2.5 py-1.5 text-[10px] whitespace-nowrap">
                <span className="text-white font-bold">{d.username}</span>
                <span className="text-gray-500 ml-1">抽了</span>
                <span className="text-orange-400 font-bold ml-1">{d.count}次</span>
                <span className="text-gray-600 ml-2">{fmtTime(d.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 概率公示 */}
      <div className="bg-[#1c0e0e] border border-[#3d1a1a] rounded-xl overflow-hidden">
        <button
          onClick={() => setShowPool(!showPool)}
          className="w-full flex justify-between items-center px-4 py-3 text-sm font-bold text-white hover:bg-[#2a1414] transition"
        >
          <span>📊 概率公示（{box.pool.length} 种卡牌）</span>
          <span className="text-gray-500 text-xs">{showPool ? '收起 ▲' : '展开 ▼'}</span>
        </button>
        {showPool && (
          <div className="border-t border-[#3d1a1a] max-h-72 overflow-y-auto">
            {box.pool.map(item => (
              <div key={item.cardId} className="flex items-center gap-3 px-3 py-2 border-b border-[#2a1414] last:border-0">
                <div className="w-8 h-11 rounded bg-[#0d0d0d] flex items-center justify-center overflow-hidden flex-shrink-0">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg">🃏</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white truncate">{item.name}</div>
                  <div className={`text-[10px] font-bold ${rarityColor(item.rarity)}`}>{item.rarity}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-orange-400">{item.probability}%</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 底部固定：抽奖按钮 */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-[#140a0a]/95 border-t border-[#332222] p-3 backdrop-blur-md z-40" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}>
        <div className="flex gap-2 items-center">
          <div className="flex-shrink-0 text-center pr-2 border-r border-[#332222]">
            <div className="text-[10px] text-gray-500">单价</div>
            <div className="text-sm font-black text-yellow-500 whitespace-nowrap">{box.price.toLocaleString()} 🪙</div>
          </div>
          <button
            onClick={() => startDraw(1)}
            disabled={isDrawing}
            className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold py-3 rounded-xl shadow-lg disabled:opacity-50 transition active:scale-95"
          >
            <div className="text-sm">单抽</div>
            <div className="text-[10px] opacity-80">{box.price.toLocaleString()} 🪙</div>
          </button>
          <button
            onClick={() => startDraw(10)}
            disabled={isDrawing}
            className="flex-1 bg-gradient-to-r from-red-600 to-pink-600 text-white font-bold py-3 rounded-xl shadow-lg disabled:opacity-50 transition active:scale-95 relative overflow-hidden"
          >
            <div className="text-sm">十连抽</div>
            <div className="text-[10px] opacity-80">{(box.price * 10).toLocaleString()} 🪙</div>
            <div className="absolute top-0 right-0 bg-yellow-500 text-black text-[8px] font-black px-1.5 py-0.5 rounded-bl-lg">HOT</div>
          </button>
        </div>
      </div>

      {/* 倒计时全屏覆盖 */}
      {phase === 'countdown' && (
        <div className="fixed inset-0 bg-black/95 z-[300] flex flex-col items-center justify-center">
          <div className="text-orange-400 text-sm mb-8 animate-pulse">准备开奖...</div>
          <div className="text-white font-black" style={{ fontSize: '160px', lineHeight: 1, textShadow: '0 0 60px rgba(251,146,60,0.8)' }}>
            {countdown > 0 ? countdown : 'GO!'}
          </div>
          <div className="mt-12 flex gap-2">
            {[...Array(pendingCount)].map((_, i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-full bg-orange-500 animate-pulse"
                style={{ animationDelay: `${i * 100}ms` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* 揭晓动画 */}
      {phase === 'revealing' && (
        <div className="fixed inset-0 bg-black/95 z-[300] flex flex-col items-center justify-center p-4">
          <div className="text-orange-400 text-xs mb-6">
            揭晓中 {revealIdx} / {drawnCards.length}
          </div>
          <div className="flex flex-wrap justify-center gap-3 max-w-md">
            {drawnCards.slice(0, revealIdx).map((card, i) => (
              <div
                key={i}
                className={`relative w-20 h-28 rounded-lg border-2 ${rarityBorder(card.rarity)} ${rarityGlow(card.rarity)} bg-gradient-to-br from-[#1c0e0e] to-[#2a1414] flex flex-col items-center justify-center overflow-hidden animate-[popIn_0.4s_ease]`}
                style={{ animationFillMode: 'both' }}
              >
                {card.imageUrl ? (
                  <img src={card.imageUrl} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl">🃏</span>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 py-0.5">
                  <div className="text-[8px] text-white text-center truncate px-1">{card.name}</div>
                  <div className={`text-[8px] font-black text-center ${rarityColor(card.rarity)}`}>{card.rarity}</div>
                </div>
                {card.rarity === 'SSR' && (
                  <div className="absolute inset-0 border-2 border-yellow-400 rounded-lg animate-ping opacity-30 pointer-events-none"></div>
                )}
              </div>
            ))}
            {drawnCards.slice(revealIdx).map((_, i) => (
              <div
                key={`placeholder-${i}`}
                className="w-20 h-28 rounded-lg border-2 border-[#3d1a1a] bg-[#0d0d0d] flex items-center justify-center text-2xl animate-pulse"
              >
                <span className="opacity-30">?</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 结果页 */}
      {phase === 'done' && (
        <div className="fixed inset-0 bg-black/95 z-[300] flex flex-col items-center justify-center p-4 overflow-y-auto">
          {hasSSR && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-yellow-500/20 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-orange-500/20 rounded-full blur-3xl animate-pulse"></div>
            </div>
          )}

          <div className="relative z-10 flex flex-col items-center w-full max-w-md">
            <div className={`text-2xl font-black mb-2 ${hasSSR ? 'text-yellow-400 animate-bounce' : 'text-orange-400'}`}>
              {hasSSR ? '🎉 SSR 降临！' : '✨ 抽卡完成'}
            </div>
            <div className="text-xs text-gray-500 mb-6">本次共获得 {drawnCards.length} 张卡牌</div>

            <div className="flex flex-wrap justify-center gap-3 mb-6">
              {drawnCards.map((card, i) => (
                <div
                  key={i}
                  className={`relative w-24 h-32 rounded-lg border-2 ${rarityBorder(card.rarity)} ${rarityGlow(card.rarity)} bg-gradient-to-br from-[#1c0e0e] to-[#2a1414] flex flex-col items-center justify-center overflow-hidden`}
                >
                  {card.imageUrl ? (
                    <img src={card.imageUrl} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl">🃏</span>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 py-1">
                    <div className="text-[9px] text-white text-center truncate px-1">{card.name}</div>
                    <div className={`text-[9px] font-black text-center ${rarityColor(card.rarity)}`}>{card.rarity}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 w-full">
              <button
                onClick={closeResult}
                className="flex-1 bg-[#2a1414] text-white py-3 rounded-xl text-sm font-bold border border-[#4a1c12]"
              >
                再来一次
              </button>
              <button
                onClick={() => { closeResult(); onGoInventory && onGoInventory(); }}
                className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 text-white py-3 rounded-xl text-sm font-bold"
              >
                查看库存
              </button>
            </div>
          </div>

          <style>{`
            @keyframes popIn {
              0% { transform: scale(0.3) rotateY(180deg); opacity: 0; }
              60% { transform: scale(1.15) rotateY(0deg); opacity: 1; }
              100% { transform: scale(1) rotateY(0deg); opacity: 1; }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
