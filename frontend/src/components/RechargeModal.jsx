import { useState, useEffect } from 'react';
import axios from 'axios';
import { useStore } from '../store';
import { useI18n } from '../i18n/index.jsx';
import { formatPrice, getPreferredFiat } from '../utils/price';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function RechargeModal({ onClose }) {
  const { user, setUser, currency } = useStore();
  const { t } = useI18n();

  const [options, setOptions] = useState([]);
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // 加载套餐 + 支付通道
  useEffect(() => {
    Promise.all([
      axios.get(`${API_URL}/api/recharge-options`),
      axios.get(`${API_URL}/api/payment-channels`),
    ]).then(([optRes, chRes]) => {
      setOptions(optRes.data || []);
      const chs = chRes.data || [];
      setChannels(chs);
      if (chs.length > 0) setActiveChannel(chs[0]);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, []);

  const handleRecharge = async (option) => {
    if (!user) return alert('请先登录');

    // 决定使用的币种
    const fiatCode = activeChannel?.currencyCode
      || getPreferredFiat(currency)?.code
      || 'USD';

    const fiat = currency.fiats.find(f => f.code === fiatCode);
    const priceStr = formatPrice(option.totalCoins, fiat);

    if (!confirm(`确认支付 ${priceStr}，获得 ${option.totalCoins} ${currency.name}吗？`)) return;

    setProcessing(true);
    try {
      const res = await axios.post(`${API_URL}/api/recharge`, {
        userId: user.id,
        optionId: option.id,
        currencyCode: fiatCode,
      });
      const updatedUser = await axios.post(`${API_URL}/api/login`, {
        username: user.username,
        password: user.password || '123',
      });
      setUser(updatedUser.data);
      alert(`充值成功！获得 ${res.data.coinsAdded} ${currency.name}`);
      onClose();
    } catch (e) {
      alert('充值失败: ' + (e.response?.data?.error || e.message));
    } finally {
      setProcessing(false);
    }
  };

  // 计算当前显示的币种
  const activeFiat = activeChannel?.currency
    ? currency.fiats.find(f => f.code === activeChannel.currencyCode)
    : getPreferredFiat(currency);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[300] p-4 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#1a0f0c] border border-[#3d1a1a] rounded-2xl p-5 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-gray-500 hover:text-white text-2xl z-10"
        >
          &times;
        </button>
        <h2 className="text-center text-orange-400 font-bold mb-4">
          {t('nav.recharge', '充值')} {currency.name}
        </h2>

        {loading ? (
          <div className="text-center text-gray-500 py-8">加载中...</div>
        ) : options.length === 0 ? (
          <div className="text-center text-gray-500 py-8">暂无可用的充值套餐</div>
        ) : (
          <>
            {/* 支付通道选择 */}
            {channels.length > 0 && (
              <div className="mb-4">
                <div className="text-[10px] text-gray-500 mb-2">选择支付方式</div>
                <div className="flex gap-2 flex-wrap">
                  {channels.map((ch) => {
                    const isActive = activeChannel?.id === ch.id;
                    const fiat = currency.fiats.find(f => f.code === ch.currencyCode);
                    return (
                      <button
                        key={ch.id}
                        onClick={() => setActiveChannel(ch)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition text-left ${
                          isActive
                            ? 'bg-orange-600/20 border-orange-500'
                            : 'bg-[#2a1414] border-[#4a1c12] hover:border-orange-600'
                        }`}
                      >
                        {ch.iconUrl ? (
                          <img src={ch.iconUrl} className="w-6 h-6 object-contain" />
                        ) : (
                          <span className="text-lg">
                            {ch.name === 'alipay' ? '🅰️' : ch.name === 'wechat' ? '💬' : ch.name === 'stripe' ? '💳' : '💰'}
                          </span>
                        )}
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">
                            {ch.displayName}
                          </div>
                          <div className="text-[9px] text-gray-500">
                            {fiat ? `${fiat.flag} ${fiat.code}` : ch.currencyCode}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 结算币种提示 */}
            {activeFiat && (
              <div className="bg-[#0d0d0d] border border-[#2a1414] rounded-lg p-2.5 mb-3 text-[10px] text-gray-400 flex items-center gap-2">
                <span className="text-base">{activeFiat.flag || '💱'}</span>
                <div className="flex-1">
                  当前结算币种：<span className="text-orange-400 font-bold">{activeFiat.name} ({activeFiat.code})</span>
                </div>
                <div className="text-gray-600">
                  1 {activeFiat.code} = {activeFiat.ratio} 💎
                </div>
              </div>
            )}

            {/* 套餐网格 */}
            <div className="grid grid-cols-3 gap-3">
              {options.map((opt) => {
                const totalCoins = opt.totalCoins ?? (opt.coins + (opt.bonus || 0));
                const priceStr = activeFiat
                  ? formatPrice(totalCoins, activeFiat)
                  : (opt.prices?.USD ? `$${opt.prices.USD.toFixed(2)}` : '-');

                return (
                  <div
                    key={opt.id}
                    onClick={() => handleRecharge(opt)}
                    className="bg-[#2a1414] border border-[#4a1c12] rounded-lg p-3 text-center cursor-pointer hover:border-orange-500 transition relative"
                  >
                    <div className="text-lg font-black text-yellow-500 flex items-center justify-center gap-0.5">
                      <span className="text-base">{currency.symbol}</span>
                      <span>{opt.coins}</span>
                    </div>
                    <div className="text-[10px] text-gray-400 mb-1">{currency.name}</div>
                    {opt.bonus > 0 && (
                      <div className="text-[10px] text-green-400 mb-1">
                        +{opt.bonus} 赠送
                      </div>
                    )}
                    <div className="text-xs font-bold text-white mt-2 pt-2 border-t border-[#3d1a1a]">
                      {priceStr}
                    </div>
                  </div>
                );
              })}
            </div>

            {processing && (
              <div className="text-center text-orange-400 mt-4 text-sm">支付处理中...</div>
            )}

            <p className="text-[10px] text-gray-600 text-center mt-4">
              {channels.length > 0
                ? '选择支付方式后，价格按对应币种自动换算'
                : '模拟支付环境，点击任意套餐即可完成充值'}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
