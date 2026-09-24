import React, { useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://luka-1i4g.onrender.com';

export const LoginPage: React.FC = () => {
  const [step, setStep] = useState<'password' | 'totp'>('password');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const finishLogin = (admin: any) => {
    localStorage.setItem('adminInfo', JSON.stringify(admin));
    // 密码存在 localStorage 供后续接口用（现有架构）
    localStorage.setItem('adminPassword', password);
    // 触发 Refine 重新检测登录状态
    window.location.href = '/';
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await axios.post(`${API_URL}/api/admin/login`, { username, password });
      if (data.success) {
        finishLogin(data.admin);
      } else if (data.need2FA) {
        setStep('totp');
      } else {
        setError(data.error || '登录失败');
      }
    } catch (e: any) {
      setError(e.response?.data?.error || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const submitTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(totpCode.trim()) && !/^[A-F0-9]{4}-[A-F0-9]{4}$/i.test(totpCode.trim())) {
      return setError('请输入 6 位数字验证码，或备份码（格式 XXXX-XXXX）');
    }
    setLoading(true);
    try {
      const { data } = await axios.post(`${API_URL}/api/admin/login`, { username, password, totpCode: totpCode.trim() });
      if (data.success) {
        finishLogin(data.admin);
      } else {
        setError(data.error || '验证失败');
      }
    } catch (e: any) {
      setError(e.response?.data?.error || '验证失败');
    } finally {
      setLoading(false);
    }
  };

  const backToPassword = () => {
    setStep('password');
    setTotpCode('');
    setError('');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0d0d0d]">
      <div className="bg-[#161616] p-8 rounded-xl shadow-2xl w-full max-w-sm border border-[#2a2a2a]">
        <h1 className="text-3xl font-black italic text-red-500 text-center mb-2 tracking-wider">
          LUKA!
        </h1>
        {step === 'totp' && (
          <div className="text-center text-xs text-gray-500 mb-6">🔐 两步验证</div>
        )}
        {step === 'password' && <div className="h-6 mb-6"></div>}

        {step === 'password' && (
          <form onSubmit={submitPassword} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-2">管理员用户名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-4 py-2.5 text-white focus:outline-none focus:border-red-500"
                placeholder="admin"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-2">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-4 py-2.5 text-white focus:outline-none focus:border-red-500"
                placeholder="请输入密码"
                required
              />
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-700/50 rounded px-3 py-2 text-red-300 text-xs">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-700 text-white font-bold py-2.5 rounded transition"
            >
              {loading ? '登录中...' : '登录系统'}
            </button>
          </form>
        )}

        {step === 'totp' && (
          <form onSubmit={submitTotp} className="space-y-4">
            <div className="text-center text-sm text-gray-300">
              请输入 Authenticator 应用显示的 6 位验证码
            </div>

            <div>
              <input
                type="text"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.toUpperCase())}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-4 py-3 text-white text-center text-2xl tracking-widest font-mono focus:outline-none focus:border-red-500"
                placeholder="000000"
                maxLength={9}
                autoFocus
                required
              />
              <div className="text-[10px] text-gray-500 text-center mt-2">
                也可输入备份码（格式：XXXX-XXXX）
              </div>
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-700/50 rounded px-3 py-2 text-red-300 text-xs">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-700 text-white font-bold py-2.5 rounded transition"
            >
              {loading ? '验证中...' : '验证并登录'}
            </button>

            <button
              type="button"
              onClick={backToPassword}
              className="w-full text-gray-500 text-xs hover:text-white transition"
            >
              ← 返回重新输入密码
            </button>
          </form>
        )}

        {step === 'password' && (
          <p className="text-xs text-gray-600 mt-6 text-center">默认: admin / admin123</p>
        )}
      </div>
    </div>
  );
};
