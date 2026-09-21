import React, { useEffect, useState } from 'react';
import { useLogout, useGetIdentity, useMenu } from '@refinedev/core';
import { Link, useLocation } from 'react-router-dom';

const MENU_ITEMS = [
  { name: 'dashboard', label: '仪表盘', icon: '📊', path: '/' },
  { name: 'users', label: '用户管理', icon: '👥', path: '/users' },
  { name: 'cards', label: '卡牌管理', icon: '🃏', path: '/cards' },
  { name: 'boxes', label: '盲盒管理', icon: '📦', path: '/boxes' },
  { name: 'recharge-options', label: '充值套餐', icon: '💰', path: '/recharge-options' },
  { name: 'orders', label: '订单管理', icon: '📄', path: '/orders' },
  { name: 'banners', label: '轮播图', icon: '🖼️', path: '/banners' },
  { name: 'tasks', label: '任务管理', icon: '🎯', path: '/tasks' },
  { name: 'redeem-codes', label: '兑换码', icon: '🎁', path: '/redeem-codes' },
  { name: 'notifications', label: '通知管理', icon: '🔔', path: '/notifications' },
  { name: 'tickets', label: '客服工单', icon: '🎧', path: '/tickets' },
  { name: 'admins', label: '管理员', icon: '🔑', path: '/admins' },
];

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: identity } = useGetIdentity<any>();
  const { mutate: logout } = useLogout();
  const location = useLocation();

  const [theme, setTheme] = useState<'dark' | 'light'>(
    (localStorage.getItem('theme') as 'dark' | 'light') || 'dark'
  );

  useEffect(() => {
    if (theme === 'light') document.body.classList.add('light-mode');
    else document.body.classList.remove('light-mode');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  const isDark = theme === 'dark';
  const bgMain = isDark ? 'bg-[#0d0d0d]' : 'bg-[#f5f6f8]';
  const bgSidebar = isDark ? 'bg-[#161616]' : 'bg-white';
  const borderColor = isDark ? 'border-[#2a2a2a]' : 'border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className={`flex h-screen ${bgMain}`}>
      {/* 侧边栏 */}
      <aside className={`w-60 ${bgSidebar} border-r ${borderColor} flex flex-col`}>
        <div className={`p-4 border-b ${borderColor}`}>
          <h1 className="text-xl font-black italic text-red-500 tracking-wider">LUKA!</h1>
          <div className={`text-xs ${textSecondary} mt-1`}>
            {identity?.name || 'admin'} ({identity?.role || '-'})
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-2">
          {MENU_ITEMS.map((item) => {
            const isActive =
              item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm mb-1 transition ${
                  isActive
                    ? 'bg-red-600 text-white font-bold'
                    : `${textSecondary} hover:bg-red-600/10`
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className={`p-2 border-t ${borderColor} flex gap-2`}>
          <button
            onClick={toggleTheme}
            className={`flex-1 py-2 rounded text-sm ${textSecondary} hover:bg-red-600/10`}
            title="切换主题"
          >
            {isDark ? '☀️' : '🌙'}
          </button>
          <button
            onClick={() => logout()}
            className={`flex-1 py-2 rounded text-sm ${textSecondary} hover:bg-red-600/10`}
            title="退出登录"
          >
            退出
          </button>
        </div>
      </aside>

      {/* 主内容 */}
      <main className={`flex-1 overflow-y-auto ${textPrimary}`}>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
};
