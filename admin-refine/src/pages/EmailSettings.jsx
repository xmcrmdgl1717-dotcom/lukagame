import { useState, useEffect } from 'react';
import { useStore } from '../store';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const SUBSCRIPTIONS = [
  { key: 'emailWelcome', icon: '👋', title: '欢迎邮件', desc: '注册成功时发送欢迎信息' },
  { key: 'emailRecharge', icon: '💰', title: '充值通知', desc: '每次充值成功后收到到账通知' },
  { key: 'emailVip', icon: '👑', title: 'VIP 升级通知', desc: 'VIP 升级并发放奖励时提醒' },
  { key: 'emailShip', icon: '📦', title: '发货通知', desc: '卡片订单发货后收到物流信息' },
];

export default function EmailSettings({ onBack }) {
  const { user } = useStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState('');
  const [settings, setSettings] = useState({
    emailWelcome: true, emailRecharge: true, emailVip: true, emailShip: true,
  });

  useEffect(() => {
    if (!user) return;
    axios.get(`${API_URL}/api/user/email-settings/${user.id}`)
      .then(res => {
        setEmail(res.data.email || '');
        setSettings({
          emailWelcome: res.data.emailWelcome,
          emailRecharge: res.data.emailRecharge,
          emailVip: res.data.emailVip,
          emailShip: res.data.emailShip,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const toggle = (key) => {
    setSettings(s => ({ ...s, [key]: !s[key] }));
  };

  const save = async () => {
    if (!user) return;
    const trimmed = email.trim();
    if (trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return alert('邮箱格式不正确');
    }
    setSaving(true);
    try {
      await axios.put(`${API_URL}/api/user/email-settings/${user.id}`, { email: trimmed, ...settings });
      alert('✅ 保存成功');
    } catch (e) {
      alert('保存失败: ' + (e.response?.data?.error || e.message));
    } finally {
      setSaving(false);
    }
  };

  if (!user) return <div className="text-center text-gray-500 py-20 text-sm">请先登录</div>;
  if (loading) return <div className="text-center text-gray-500 py-20 text-sm">加载中...</div>;

  const enabledCount = Object.values(settings).filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <button onClick={onBack} className="text-gray-400 text-sm hover:text-white">← 返回</button>
        <div className="text-lg font-bold text-orange-400">📧 邮件通知设置</div>
      </div>

      <div className="bg-[#1c0e0e] border border-[#3d1a1a] rounded-xl p-4">
        <div className="text-sm font-bold text-white mb-2">✉️ 接收邮箱</div>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="w-full bg-[#0d0d0d] border border-[#2a1414] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-orange-500"
        />
        <div className="text-[10px] text-gray-500 mt-2">
          填写邮箱后，平台会在重要事件（充值、升级、发货等）向此邮箱发送通知。留空则不发送。
        </div>
      </div>

      <div className="bg-[#1c0e0e] border border-[#3d1a1a] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-bold text-white">🔔 订阅类型</div>
          <div className="text-[10px] text-gray-500">已启用 {enabledCount} / {SUBSCRIPTIONS.length}</div>
        </div>

        <div className="space-y-2">
          {SUBSCRIPTIONS.map(s => (
            <div
              key={s.key}
              onClick={() => toggle(s.key)}
              className={`cursor-pointer bg-[#0d0d0d] border rounded-lg p-3 flex items-center gap-3 transition ${
                settings[s.key] ? 'border-orange-600/60' : 'border-[#2a1414] opacity-60'
              }`}
            >
              <span className="text-2xl">{s.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white">{s.title}</div>
                <div className="text-[10px] text-gray-500">{s.desc}</div>
              </div>
              <div className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 relative ${
                settings[s.key] ? 'bg-orange-600' : 'bg-[#2a1414]'
              }`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                  settings[s.key] ? 'left-[18px]' : 'left-0.5'
                }`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#1c0e0e] border border-[#3d1a1a] rounded-xl p-3 text-[10px] text-gray-500 leading-relaxed">
        💡 关闭订阅不会影响其他功能，仅停止接收对应类型的邮件。平台内「消息中心」仍会正常收到通知。
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold py-3 rounded-xl shadow-lg disabled:opacity-50"
      >
        {saving ? '保存中...' : '保存设置'}
      </button>
    </div>
  );
}
