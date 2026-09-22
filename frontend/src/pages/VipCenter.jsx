import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { useI18n } from '../i18n/index.jsx';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function VipCenter({ onBack }) {
  const { user } = useStore();
  const { t } = useI18n();
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    axios.get(`${API_URL}/api/user/vip-info/${user.id}`)
      .then(res => setInfo(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return <div className="text-center text-gray-500 py-20 text-sm">请先登录</div>;
  if (loading) return <div className="text-center text-gray-500 py-20 text-sm">加载中...</div>;
  if (!info) return <div className="text-center text-red-500 py-20 text-sm">加载失败</div>;

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-6">
        <button onClick={onBack} className="text-gray-400 text-sm hover:text-white">← {t('common.cancel', '返回')}</button>
        <h2 className="text-lg font-bold text-orange-400">{t('profile.vip', 'VIP 中心')}</h2>
      </div>

      {/* 当前等级卡片 */}
      <div className="bg-gradient-to-br from-[#b83d22] to-[#9a2c18] rounded-2xl p-6 mb-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-2 right-3 text-6xl opacity-20">👑</div>
        <div className="relative z-10">
          <div className="text-white/70 text-xs mb-1">{t('vip.currentLevel', '当前等级')}</div>
          <div className="text-4xl font-black text-white mb-4 drop-shadow-lg">{info.currentName}</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-black/30 rounded-lg p-3">
              <div className="text-white/60 text-[10px] mb-1">累计充值</div>
              <div className="text-white font-bold">¥{(info.totalRecharge / 100).toFixed(2)}</div>
            </div>
            <div className="bg-black/30 rounded-lg p-3">
              <div className="text-white/60 text-[10px] mb-1">累计消耗</div>
              <div className="text-white font-bold">{info.totalConsume.toLocaleString()} 🪙</div>
            </div>
          </div>
        </div>
      </div>

      {/* 下一等级进度 */}
      {!info.isMaxLevel && (
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-2xl p-5 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-gray-400">{t('vip.nextLevel', '下一等级')}</div>
            <div className="text-lg font-bold text-orange-400">{info.nextName}</div>
          </div>

          {/* 充值进度 */}
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-gray-400">充值进度</span>
              <span className="text-gray-500">{info.rechargeProgress}%</span>
            </div>
            <div className="bg-[#0d0d0d] rounded-full h-2.5 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-500" style={{ width: `${info.rechargeProgress}%` }}></div>
            </div>
            {info.needRecharge > 0 && (
              <div className="text-xs text-gray-500 mt-1.5">
                还需充值 <span className="text-red-400 font-bold">¥{(info.needRecharge / 100).toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* 消耗进度 */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-gray-400">消耗进度</span>
              <span className="text-gray-500">{info.consumeProgress}%</span>
            </div>
            <div className="bg-[#0d0d0d] rounded-full h-2.5 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all duration-500" style={{ width: `${info.consumeProgress}%` }}></div>
            </div>
            {info.needConsume > 0 && (
              <div className="text-xs text-gray-500 mt-1.5">
                还需消耗 <span className="text-yellow-400 font-bold">{info.needConsume.toLocaleString()} 🪙</span>
              </div>
            )}
          </div>
        </div>
      )}

      {info.isMaxLevel && (
        <div className="bg-gradient-to-r from-yellow-600 to-orange-600 rounded-2xl p-5 mb-6 text-center">
          <div className="text-2xl font-black text-white">{t('vip.maxLevel', '👑 已达最高等级')}</div>
        </div>
      )}

      {/* VIP 特权 */}
      {info.benefits && info.benefits.length > 0 && (
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-2xl p-5">
          <div className="text-sm font-bold text-orange-400 mb-4">{t('profile.vipBenefits', 'VIP 特权')}</div>
          <div className="space-y-3">
            {info.benefits.map((b: any, idx: number) => (
              <div key={idx} className="flex items-start gap-3">
                <span className="text-lg">{b.icon || '✨'}</span>
                <div className="flex-1">
                  <div className="text-sm text-white font-bold">{b.title || b}</div>
                  {b.description && <div className="text-xs text-gray-500 mt-1">{b.description}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(!info.benefits || info.benefits.length === 0) && (
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-2xl p-8 text-center">
          <div className="text-4xl mb-3 opacity-30">🎁</div>
          <div className="text-sm text-gray-500">暂未配置该等级的特权</div>
          <div className="text-xs text-gray-600 mt-2">管理员可在后台「VIP等级设置」中配置 benefits 字段</div>
        </div>
      )}
    </div>
  );
}
