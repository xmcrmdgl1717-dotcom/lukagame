import { useState } from 'react';
import { useStore } from '../store';
import { useI18n } from '../i18n/index.jsx';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function Profile({ onGoOrders, onGoCardOrders, onGoNotifications, onGoArticles, onGoStatic, onGoVip, onGoWithdraw }) {
  const { user, setUser } = useStore();
  const { t } = useI18n();
  const [redeemCode, setRedeemCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketContent, setTicketContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleRedeem = async () => {
    if (!user) return alert('请先登录');
    if (!redeemCode.trim()) return alert('请输入兑换码');
    setRedeeming(true);
    try {
      const res = await axios.post(`${API_URL}/api/redeem`, { userId: user.id, code: redeemCode });
      alert(`兑换成功！获得 ${res.data.coins} 金币`);
      setRedeemCode('');
      const updated = await axios.post(`${API_URL}/api/login`, { username: user.username, password: user.password || '123' });
      setUser(updated.data);
    } catch (e) { alert(e.response?.data?.error || '兑换失败'); }
    finally { setRedeeming(false); }
  };

  const handleSubmitTicket = async () => {
    if (!user) return alert('请先登录');
    if (!ticketTitle.trim() || !ticketContent.trim()) return alert('请填写标题和内容');
    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/api/tickets`, { userId: user.id, title: ticketTitle, content: ticketContent });
      alert('提交成功！'); setTicketTitle(''); setTicketContent('');
    } catch (e) { alert('提交失败'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="p-4">
      {/* 用户卡片 - 点击进 VIP 中心 */}
      <div
        onClick={onGoVip}
        className="bg-gradient-to-br from-[#1c0e0e] to-[#2a1414] border border-[#3d1a1a] rounded-xl p-5 flex gap-4 items-center mb-6 shadow-lg cursor-pointer hover:border-orange-600/50 transition"
      >
        <div className="w-16 h-16 bg-gradient-to-br from-orange-600 to-red-600 rounded-xl flex items-center justify-center text-3xl shadow-inner">👤</div>
        <div className="flex-1">
          <div className="text-xs text-orange-400 font-bold mb-1">LUKA LICENSE</div>
          <div className="text-xl font-black text-white mb-1">VIP{user?.vipLevel || 0}</div>
          <div className="text-xs text-gray-500">ID: {user?.id?.slice(0, 8)}</div>
        </div>
        <span className="text-gray-600 text-2xl">›</span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <button onClick={onGoOrders} className="bg-[#1c0e0e] border border-[#3d1a1a] rounded-xl p-4 flex items-center gap-3 shadow-lg hover:bg-[#2a1414] transition">
          <span className="text-2xl">📄</span><span className="text-sm text-white font-bold">{t('profile.orders', '我的订单')}</span>
        </button>
        <button onClick={onGoCardOrders} className="bg-[#1c0e0e] border border-[#3d1a1a] rounded-xl p-4 flex items-center gap-3 shadow-lg hover:bg-[#2a1414] transition">
          <span className="text-2xl">📦</span><span className="text-sm text-white font-bold">{t('cardorder.title', '卡片发货')}</span>
        </button>
        <button onClick={onGoNotifications} className="bg-[#1c0e0e] border border-[#3d1a1a] rounded-xl p-4 flex items-center gap-3 shadow-lg hover:bg-[#2a1414] transition">
          <span className="text-2xl">🔔</span><span className="text-sm text-white font-bold">{t('profile.notifications', '消息中心')}</span>
        </button>
        <button onClick={onGoArticles} className="bg-[#1c0e0e] border border-[#3d1a1a] rounded-xl p-4 flex items-center gap-3 shadow-lg hover:bg-[#2a1414] transition">
          <span className="text-2xl">📰</span><span className="text-sm text-white font-bold">{t('profile.articles', '新闻资讯')}</span>
        </button>
        {/* 新增：提现入口 */}
        <button onClick={onGoWithdraw} className="col-span-2 bg-gradient-to-r from-[#2d1410] to-[#4a1c12] border border-[#6b2a1e] rounded-xl p-4 flex items-center gap-3 shadow-lg hover:border-orange-500 transition">
          <span className="text-2xl">💸</span>
          <div className="text-left flex-1">
            <div className="text-sm text-white font-bold">提现中心</div>
            <div className="text-[10px] text-gray-400 mt-0.5">将金币兑换为现金</div>
          </div>
          <span className="text-gray-600 text-2xl">›</span>
        </button>
      </div>

      <div className="bg-[#1c0e0e] border border-[#3d1a1a] rounded-xl p-4 mb-4 shadow-lg">
        <div className="text-sm font-bold text-white mb-3">🎁 {t('profile.redeem', '兑换码')}</div>
        <div className="flex gap-2">
          <input value={redeemCode} onChange={(e) => setRedeemCode(e.target.value)} placeholder={t('profile.redeem', '请输入兑换码')} className="flex-1 bg-[#2a1414] border border-[#4a1c12] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-orange-500" />
          <button onClick={handleRedeem} disabled={redeeming} className="bg-red-600 hover:bg-red-700 disabled:bg-gray-700 text-white text-sm px-5 py-2 rounded-lg font-bold">{redeeming ? '...' : t('common.confirm', '兑换')}</button>
        </div>
      </div>

      <div className="bg-[#1c0e0e] border border-[#3d1a1a] rounded-xl p-4 mb-4 shadow-lg">
        <div className="text-sm font-bold text-white mb-3">🎧 {t('profile.support', '联系客服')}</div>
        <div className="space-y-2">
          <input value={ticketTitle} onChange={(e) => setTicketTitle(e.target.value)} placeholder="问题标题" className="w-full bg-[#2a1414] border border-[#4a1c12] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-orange-500" />
          <textarea value={ticketContent} onChange={(e) => setTicketContent(e.target.value)} rows="3" placeholder="详细描述..." className="w-full bg-[#2a1414] border border-[#4a1c12] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-orange-500"></textarea>
          <button onClick={handleSubmitTicket} disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white text-sm py-2 rounded-lg font-bold">{submitting ? '...' : t('common.submit', '提交工单')}</button>
        </div>
      </div>

      <div className="bg-[#1c0e0e] border border-[#3d1a1a] rounded-xl overflow-hidden shadow-lg mb-4">
        {[
          { label: t('profile.about', '关于我们'), icon: 'ℹ️', slug: 'about' },
          { label: t('profile.terms', '用户协议'), icon: '📜', slug: 'terms' },
          { label: t('profile.privacy', '隐私政策'), icon: '🔒', slug: 'privacy' },
          { label: t('profile.contact', '联系我们'), icon: '📞', slug: 'contact' },
        ].map((item, i) => (
          <div key={i} onClick={() => onGoStatic(item.slug)} className="flex justify-between items-center p-4 border-b border-[#2a1414] last:border-0 hover:bg-[#2a1414] cursor-pointer transition">
            <div className="flex items-center gap-3 text-sm text-gray-300"><span className="text-lg">{item.icon}</span><span>{item.label}</span></div>
            <span className="text-gray-600">›</span>
          </div>
        ))}
      </div>

      <button className="w-full bg-[#2a1414] border border-[#4d2a2a] text-red-400 py-3 rounded-xl text-sm font-bold shadow-lg hover:bg-[#3d1a1a] transition">{t('auth.logout', '退出登录')}</button>
    </div>
  );
}
