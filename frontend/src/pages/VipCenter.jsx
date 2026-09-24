import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { useI18n } from '../i18n/index.jsx';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function VipCenter({ onBack }) {
  const { user, currency } = useStore();
  const { t } = useI18n();
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    axios.get(`${API_URL}/api/user/vip-info/${user.id}`)
      .then(res => setInfo(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return <div className="text-center text-gray-500 py-20 text-sm">请先登录</div>;
  if (loading) return <div className="text-center text-gray-500 py-20 text-sm">加载中...</div>;
  if (!info) return <div className="text-center text-gray-500 py-20 text-sm">加载失败</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <button onClick={onBack} className="text-gray-400 text-sm hover:text-white">← 返回</button>
        <div className="text-lg font-bold text-orange-400">{t('profile.vip', 'VIP 等级')}</div>
      </div>

      <div className="bg-gradient-to-br from-[#2d1410] via-[#3a1c14] to-[#4a1c12] border border-[#6b2a1e] rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/10 rounded-full blur-3xl"></div>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="text-xs text-orange-400/80 font-bold tracking-widest mb-1">{t('vip.currentLevel', '当前等级')}</div>
            <div className="text-3xl font-black text-orange-400 drop-shadow-lg">VIP{info.currentLevel}</div>
            <div className="text-sm text-gray-300 mt-1">{info.currentName}</div>
          </div>
          <div className="text-6xl">{info.currentIcon || '👑'}</div>
        </div>
      </div>

      {!info.isMaxLevel ? (
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-bold text-gray-300">{t('vip.nextLevel', '下一等级')}：<span className="text-orange-400">{info.nextName}</span></span>
            <span className="text-2xl">{info.nextIcon || '👑'}</span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>{t('vip.rechargeRequired', '累计充值')}</span>
                <span>¥{(info.totalRecharge / 100).toFixed(2)}</span>
              </div>
              <div className="h-2 bg-[#0d0d0d] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all" style={{ width: `${info.rechargeProgress}%` }}></div>
              </div>
              {info.needRecharge > 0 && (
                <div className="text-[10px] text-gray-500 mt-1">还需 ¥{(info.needRecharge / 100).toFixed(2)}</div>
              )}
            </div>

            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>{t('vip.consumeRequired', '累计消耗')}</span>
                <span className="flex items-center gap-1">
                  <span className="text-yellow-500">{currency.symbol}</span>
                  <span>{info.totalConsume.toLocaleString()}</span>
                </span>
              </div>
              <div className="h-2 bg-[#0d0d0d] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all" style={{ width: `${info.consumeProgress}%` }}></div>
              </div>
              {info.needConsume > 0 && (
                <div className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                  <span>还需</span>
                  <span className="text-yellow-500">{currency.symbol}</span>
                  <span>{info.needConsume.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-yellow-700/40 to-orange-700/40 border border-yellow-600 rounded-xl p-4 text-center">
          <div className="text-yellow-400 font-bold text-sm">🏆 {t('vip.maxLevel', '已达最高等级')}</div>
        </div>
      )}

      {info.benefits && info.benefits.length > 0 && (
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4">
          <div className="text-sm font-bold text-orange-400 mb-3">🎁 {t('profile.vipBenefits', 'VIP 特权')}</div>
          <div className="space-y-2">
            {info.benefits.map((b, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm text-gray-300">
                <span className="text-orange-400">✓</span>
                <span>{typeof b === 'string' ? b : b.name || JSON.stringify(b)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 text-xs text-gray-400 leading-relaxed">
        💡 每次充值或抽卡消费都会累计到 VIP 等级，达到条件自动升级并发放奖励（每级赠送 {currency.name}）。升级后会在「消息中心」收到通知。
      </div>
    </div>
  );
}
