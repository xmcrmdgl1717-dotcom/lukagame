import React, { useState } from 'react';
import { useLogin } from '@refinedev/core';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const { mutate: login, isLoading } = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login({ username, password });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0d0d0d]">
      <div className="bg-[#161616] p-8 rounded-xl shadow-2xl w-full max-w-sm border border-[#2a2a2a]">
        <h1 className="text-3xl font-black italic text-red-500 text-center mb-8 tracking-wider">
          LUKA!
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-700 text-white font-bold py-2.5 rounded transition"
          >
            {isLoading ? '登录中...' : '登录系统'}
          </button>
        </form>

        <p className="text-xs text-gray-600 mt-6 text-center">默认: admin / admin123</p>
      </div>
    </div>
  );
};
