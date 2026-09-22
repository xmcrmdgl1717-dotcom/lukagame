import { useState, useEffect } from 'react';
import axios from 'axios';
import { useStore } from '../store';
import { useI18n } from '../i18n/index.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function RechargeModal({ onClose }) {
  const { user, setUser } = useStore();
  const { t } = useI18n();
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    axios.get(`${API_URL}/api/recharge-options`).then(res => { setOptions(res.data); setLoading(false); });
  }, []);

  const handleRecharge = async (option) => {
    if (!user) return alert('请先登录');
    if (!confirm(`确认支付 ¥${(option.price / 100).toFixed(2)}，获得 ${option.coins + option.bonus} 金币吗？`)) return;
    setProcessing(true);
    try {
      const res = await axios.post(`${API_URL}/api/recharge`, { userId: user.id, optionId: option.id });
      const updatedUser = await axios.post(`${API_URL}/api/login`, { username: user.username, password: user.password || '123' });
      setUser(updatedUser.data);
      alert(`充值成功！获得 ${res.data.coinsAdded} 金币`);
      onClose();
    } catch (e) { alert('充值失败: ' + (e.response?.data?.error || e.message)); }
    finally { setProcessing(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[300] p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-[#1a0f0c] border border-[#3d1a1a] rounded-2xl p-5 relative">
        <button onClick={onClose} className="absolute top-3 right-4 text-gray-500 hover:text-white text-2xl">&times;</button>
        <h2 className="text-center text-orange-400 font-bold mb-4">{t('nav.recharge', '充值')}</h2>

        {loading ? (
          <div className="text-center text-gray-500 py-8">加载中...</div>
        ) : options.length === 0 ? (
          <div className="text-center text-gray-500 py-8">暂无可用的充值套餐</div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {options.map(opt => (
              <div key={opt.id} onClick={() => handleRecharge(opt)} className="bg-[#2a1414] border border-[#4a1c12] rounded-lg p-3 text-center cursor-pointer hover:border-orange-500 transition">
                <div className="text-lg font-black text-yellow-500">{opt.coins}</div>
                <div className="text-[10px] text-gray-400 mb-1">金币</div>
                {opt.bonus > 0 && <div className="text-[10px] text-green-400 mb-1">+{opt.bonus}</div>}
                <div className="text-xs font-bold text-white mt-2">¥{(opt.price / 100).toFixed(2)}</div>
              </div>
            ))}
          </div>
        )}

        {processing && <div className="text-center text-orange-400 mt-4 text-sm">支付处理中...</div>}
        <p className="text-[10px] text-gray-600 text-center mt-4">模拟支付环境，点击任意套餐即可完成充值</p>
      </div>
    </div>
  );
}
