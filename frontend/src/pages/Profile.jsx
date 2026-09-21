import { useState } from 'react';
import { useStore } from '../store';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function Profile() {
  const { user, setUser } = useStore();
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
    } catch (e) {
      alert(e.response?.data?.error || '兑换失败');
    } finally { setRedeeming(false); }
  };

  const handleSubmitTicket = async () => {
    if (!user) return alert('请先登录');
    if (!ticketTitle.trim() || !ticketContent.trim()) return alert('请填写标题和内容');
    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/api/tickets`, { userId: user.id, title: ticketTitle, content: ticketContent });
      alert('提交成功，客服会尽快回复您！');
      setTicketTitle('');
      setTicketContent('');
    } catch (e) {
      alert('提交失败');
    } finally { setSubmitting(false); }
  };

  const menuItems = [
    { label: '我的订单', icon: '📄' },
    { label: '等级特权', icon: '⭐' },
    { label: '代金券', icon: '🎫' },
    { label: '转诊推荐', icon: '🔗' },
    { label: '交易记录', icon: '🔄' },
    { label: '常见问题', icon: '❓' },
  ];

  return (
    <div className="p-4">
      <div className="bg-gradient-to-br from-[#1c0e0e] to-[#2a1414] border border-[#3d1a1a] rounded-xl p-5 flex gap-4 items-center mb-8 shadow-lg">
        <div className="w-16 h-16 bg-gradient-to-br from-orange-600 to-red-600 rounded-xl flex items-center justify-center text-3xl shadow-inner">👤</div>
        <div>
          <div className="text-xs text-orange-400 font-bold mb-1">LUKA LICENSE</div>
          <div className="text-xl font-black text-white mb-1">LV.1</div>
          <div className="text-xs text-gray-500">ID: {user?.id.slice(0, 8)}</div>
        </div>
      </div>

      {/* 兑换码 */}
      <div className="bg-[#1c0e0e] border border-[#3d1a1a] rounded-xl p-4 mb-6 shadow-lg">
        <div className="text-sm font-bold text-white mb-3">🎁 兑换码</div>
        <div className="flex gap-2">
          <input
            value={redeemCode}
            onChange={(e) => setRedeemCode(e.target.value)}
            placeholder="请输入兑换码"
            className="flex-1 bg-[#2a1414] border border-[#4a1c12] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-orange-500"
          />
          <button
            onClick={handleRedeem}
            disabled={redeeming}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-700 text-white text-sm px-5 py-2 rounded-lg font-bold"
          >
            {redeeming ? '兑换中...' : '兑换'}
          </button>
        </div>
      </div>

      {/* 客服工单 */}
      <div className="bg-[#1c0e0e] border border-[#3d1a1a] rounded-xl p-4 mb-6 shadow-lg">
        <div className="text-sm font-bold text-white mb-3">🎧 联系客服</div>
        <div className="space-y-2">
          <input
            value={ticketTitle}
            onChange={(e) => setTicketTitle(e.target.value)}
            placeholder="问题标题"
            className="w-full bg-[#2a1414] border border-[#4a1c12] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-orange-500"
          />
          <textarea
            value={ticketContent}
            onChange={(e) => setTicketContent(e.target.value)}
            rows="3"
            placeholder="详细描述您的问题..."
            className="w-full bg-[#2a1414] border border-[#4a1c12] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-orange-500"
          ></textarea>
          <button
            onClick={handleSubmitTicket}
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white text-sm py-2 rounded-lg font-bold"
          >
            {submitting ? '提交中...' : '提交工单'}
          </button>
        </div>
      </div>

      <div className="bg-[#1c0e0e] border border-[#3d1a1a] rounded-xl overflow-hidden shadow-lg">
        {menuItems.map((item, index) => (
          <div key={index} className="flex justify-between items-center p-4 border-b border-[#2a1414] last:border-0 hover:bg-[#2a1414] transition-colors cursor-pointer">
            <div className="flex items-center gap-3 text-sm text-gray-300">
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </div>
            <span className="text-gray-600">›</span>
          </div>
        ))}
      </div>

      <button className="w-full mt-8 bg-[#2a1414] border border-[#4d2a2a] text-red-400 py-3 rounded-xl text-sm font-bold shadow-lg hover:bg-[#3d1a1a] transition-colors">
        退出登录
      </button>

      <div className="text-center text-[10px] text-gray-600 mt-8 leading-relaxed">
        <p>隐私政策 | 条款及细则 | 退款政策</p>
        <p>© 2026 LUKA. All rights reserved.</p>
      </div>
    </div>
  );
}
