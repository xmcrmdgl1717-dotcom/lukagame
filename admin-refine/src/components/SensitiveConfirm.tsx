import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://luka-1i4g.onrender.com';

interface ContextType {
  confirm: (message: string) => Promise<boolean>;
}

const SensitiveConfirmContext = createContext<ContextType | null>(null);

export function SensitiveConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ message: string; resolve: (v: boolean) => void } | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const confirm = useCallback((message: string) => {
    return new Promise<boolean>((resolve) => {
      setState({ message, resolve });
      setPassword('');
      setError('');
    });
  }, []);

  const close = (result: boolean) => {
    state?.resolve(result);
    setState(null);
    setPassword('');
    setError('');
  };

  const handleConfirm = async () => {
    if (!password) return setError('请输入密码');
    setLoading(true);
    setError('');
    try {
      const adminInfo = JSON.parse(localStorage.getItem('adminInfo') || 'null');
      await axios.post(
        `${API_URL}/api/admin/verify-password`,
        { password },
        {
          headers: {
            'x-admin-username': adminInfo?.username || '',
            'x-admin-password': password,
          },
        }
      );
      close(true);
    } catch (e: any) {
      setError(e.response?.data?.error || '密码错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SensitiveConfirmContext.Provider value={{ confirm }}>
      {children}
      {state && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[200] p-4">
          <div className="bg-[#161616] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-2 text-red-500">🔒 敏感操作确认</h3>
            <p className="text-sm text-gray-300 mb-4">{state.message}</p>
            <p className="text-xs text-gray-500 mb-3">请输入您的登录密码以继续：</p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
              placeholder="管理员密码"
              autoFocus
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white focus:outline-none focus:border-red-500 mb-2"
            />
            {error && <div className="text-red-400 text-xs mb-2">{error}</div>}
            <div className="flex justify-end gap-3 mt-3">
              <button
                onClick={() => close(false)}
                className="px-4 py-2 bg-[#2a2a2a] rounded text-sm hover:bg-[#3a3a3a]"
              >
                取消
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="px-4 py-2 bg-red-600 rounded text-sm font-bold hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? '验证中...' : '确认执行'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SensitiveConfirmContext.Provider>
  );
}

export function useSensitiveConfirm() {
  const ctx = useContext(SensitiveConfirmContext);
  if (!ctx) throw new Error('useSensitiveConfirm 必须在 SensitiveConfirmProvider 内使用');
  return ctx;
}
