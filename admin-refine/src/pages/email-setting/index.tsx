import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://luka-1i4g.onrender.com';
const hdr = () => ({
  'x-admin-username': JSON.parse(localStorage.getItem('adminInfo') || 'null')?.username || '',
  'x-admin-password': localStorage.getItem('adminPassword') || '',
  'Content-Type': 'application/json',
});

const PRESETS: Record<string, { host: string; port: number; secure: boolean }> = {
  'QQ 邮箱': { host: 'smtp.qq.com', port: 465, secure: true },
  '163 邮箱': { host: 'smtp.163.com', port: 465, secure: true },
  'Gmail': { host: 'smtp.gmail.com', port: 587, secure: false },
  'Outlook': { host: 'smtp.office365.com', port: 587, secure: false },
  '阿里云邮件推送': { host: 'smtpdm.aliyun.com', port: 465, secure: true },
};

export default function EmailSettingPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [form, setForm] = useState({
    enabled: false,
    host: '',
    port: 587,
    secure: false,
    user: '',
    pass: '',
    fromName: 'LUKA 抽卡平台',
    fromEmail: '',
    passConfigured: false,
  });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_URL}/api/admin/email-setting`, { headers: hdr() });
      setForm({ ...data });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const applyPreset = (key: string) => {
    const p = PRESETS[key];
    if (!p) return;
    setForm(f => ({ ...f, host: p.host, port: p.port, secure: p.secure }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload: any = {
        enabled: form.enabled,
        host: form.host,
        port: form.port,
        secure: form.secure,
        user: form.user,
        fromName: form.fromName,
        fromEmail: form.fromEmail,
      };
      // 只有用户输入了新密码才提交
      if (form.pass && form.pass !== '********') payload.pass = form.pass;

      const { data } = await axios.put(`${API_URL}/api/admin/email-setting`, payload, { headers: hdr() });
      setForm({ ...data });
      alert('✅ 保存成功');
    } catch (e: any) {
      alert('保存失败: ' + (e.response?.data?.error || e.message));
    } finally {
      setSaving(false);
    }
  };

  const testSend = async () => {
    if (!testTo || !testTo.includes('@')) return alert('请输入有效的测试邮箱');
    setTesting(true);
    try {
      await axios.post(`${API_URL}/api/admin/email-setting/test`, { to: testTo }, { headers: hdr() });
      alert(`✅ 测试邮件已发送到 ${testTo}\n请检查收件箱（可能在垃圾邮件中）`);
    } catch (e: any) {
      alert('❌ 发送失败: ' + (e.response?.data?.error || e.message));
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <div className="text-center text-gray-500 py-20">加载中...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">📧 邮件配置</h1>
          <div className="text-xs text-gray-500 mt-1">配置 SMTP 服务器，用于发送注册、充值、升级、发货通知</div>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} className="w-4 h-4" />
            <span className={form.enabled ? 'text-green-400 font-bold' : 'text-gray-500'}>{form.enabled ? '已启用' : '已停用'}</span>
          </label>
        </div>
      </div>

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 mb-4 text-sm text-gray-400">
        💡 <span className="text-white font-bold">配置说明：</span>
        <p className="mt-1">• <strong className="text-white">QQ 邮箱</strong>：设置 → 账户 → 开启 SMTP 服务 → 获取授权码作为密码</p>
        <p>• <strong className="text-white">Gmail</strong>：需开启两步验证 + 生成应用专用密码</p>
        <p>• <strong className="text-white">163/阿里云</strong>：登录后在设置里开启 SMTP，使用授权码</p>
        <p>• 关闭「启用」开关后，业务仍正常运行，只是不发邮件</p>
      </div>

      {/* 快捷预设 */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 mb-4">
        <div className="text-sm font-bold mb-3">⚡ 快捷预设</div>
        <div className="flex flex-wrap gap-2">
          {Object.keys(PRESETS).map(k => (
            <button
              key={k}
              onClick={() => applyPreset(k)}
              className="text-xs px-3 py-1.5 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white rounded font-bold transition"
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      {/* SMTP 表单 */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-6 mb-4">
        <div className="text-sm font-bold mb-4">🔧 SMTP 服务器配置</div>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-gray-400 mb-1 text-xs">SMTP 服务器地址</label>
              <input value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} placeholder="smtp.qq.com" className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white font-mono" />
            </div>
            <div>
              <label className="block text-gray-400 mb-1 text-xs">端口</label>
              <input type="number" value={form.port} onChange={(e) => setForm({ ...form, port: parseInt(e.target.value) || 587 })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="checkbox" checked={form.secure} onChange={(e) => setForm({ ...form, secure: e.target.checked })} />
            <span>使用 SSL/TLS 加密连接（端口 465 需勾选，587 通常不勾选）</span>
          </label>

          <div>
            <label className="block text-gray-400 mb-1 text-xs">SMTP 用户名（通常是邮箱地址）</label>
            <input value={form.user} onChange={(e) => setForm({ ...form, user: e.target.value })} placeholder="your@qq.com" className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
          </div>

          <div>
            <label className="block text-gray-400 mb-1 text-xs">
              SMTP 密码 / 授权码
              {form.passConfigured && <span className="ml-2 text-green-400 text-[10px]">✓ 已配置</span>}
            </label>
            <input
              type="password"
              value={form.pass || ''}
              onChange={(e) => setForm({ ...form, pass: e.target.value })}
              placeholder={form.passConfigured ? '留空表示不修改' : '输入授权码'}
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#2a2a2a]">
            <div>
              <label className="block text-gray-400 mb-1 text-xs">发件人显示名</label>
              <input value={form.fromName} onChange={(e) => setForm({ ...form, fromName: e.target.value })} placeholder="LUKA 抽卡平台" className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
            </div>
            <div>
              <label className="block text-gray-400 mb-1 text-xs">发件人邮箱（可选）</label>
              <input value={form.fromEmail} onChange={(e) => setForm({ ...form, fromEmail: e.target.value })} placeholder="与用户名相同可留空" className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={save} disabled={saving} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 rounded text-sm font-bold disabled:opacity-50">
            {saving ? '保存中...' : '💾 保存配置'}
          </button>
        </div>
      </div>

      {/* 测试发信 */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-6">
        <div className="text-sm font-bold mb-4">📤 发送测试邮件</div>
        <div className="flex gap-2">
          <input
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            placeholder="输入测试接收邮箱"
            className="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-sm text-white"
          />
          <button
            onClick={testSend}
            disabled={testing}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm font-bold disabled:opacity-50"
          >
            {testing ? '发送中...' : '📨 发送测试'}
          </button>
        </div>
        <div className="text-xs text-gray-500 mt-2">
          提示：保存配置后再测试。如果收到邮件说明配置正确。
        </div>
      </div>
    </div>
  );
}
