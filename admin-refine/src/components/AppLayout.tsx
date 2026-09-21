import React, { useEffect, useState } from 'react';
import { useLogout, useGetIdentity, usePermissions } from '@refinedev/core';
import { Link, useLocation } from 'react-router-dom';

interface MenuItem {
  name: string;
  label: string;
  icon: string;
  path?: string;
  children?: MenuItem[];
}

const MENU_TREE: MenuItem[] = [
  { name: 'dashboard', label: '仪表盘', icon: '📊', path: '/' },
  { name: 'users', label: '用户管理', icon: '👥', path: '/users' },
  { name: 'cards', label: '卡牌管理', icon: '🃏', path: '/cards' },
  { name: 'boxes', label: '盲盒管理', icon: '📦', path: '/boxes' },
  { name: 'recharge', label: '充值套餐', icon: '💰', path: '/recharge-options' },
  { name: 'orders', label: '订单管理', icon: '📄', path: '/orders' },
  { name: 'banners', label: '轮播图', icon: '🖼️', path: '/banners' },
  { name: 'tasks', label: '任务管理', icon: '🎯', path: '/tasks' },
  { name: 'redeem', label: '兑换码', icon: '🎁', path: '/redeem-codes' },
  { name: 'notifications', label: '通知管理', icon: '🔔', path: '/notifications' },
  { name: 'tickets', label: '客服工单', icon: '🎧', path: '/tickets' },
  {
    name: 'admin-group',
    label: '管理员',
    icon: '🔑',
    children: [
      { name: 'admins', label: '管理员列表', icon: '👤', path: '/admins' },
      { name: 'roles', label: '角色管理', icon: '🎭', path: '/admins/roles' },
      { name: 'permissions', label: '权限说明', icon: '📖', path: '/admins/permissions' },
      { name: 'audit-logs', label: '操作日志', icon: '📋', path: '/admins/audit-logs' },
    ],
  },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { data: identity } = useGetIdentity<any>();
  const { data: permissions } = usePermissions<string[]>();
  const { mutate: logout } = useLogout();
  const location = useLocation();

  const [theme, setTheme] = useState<'dark' | 'light'>(
    (localStorage.getItem('theme') as 'dark' | 'light') || 'dark'
  );
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'admin-group': true,
  });

  useEffect(() => {
    if (theme === 'light') document.body.classList.add('light-mode');
    else document.body.classList.remove('light-mode');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  const toggleGroup = (name: string) =>
    setExpandedGroups((g) => ({ ...g, [name]: !g[name] }));

  // 根据权限过滤菜单
  const hasPermission = (menuName: string) => {
    if (!permissions) return false;
    // 仪表盘总是可见
    if (menuName === 'dashboard') return true;
    // 匹配权限 key
    return permissions.some((p) => p.startsWith(menuName + '.'));
  };

  const visibleMenus = MENU_TREE.filter((item) => {
    if (item.children) {
      // 二级菜单至少有一个子菜单可见
      return item.children.some((c) => hasPermission(c.name));
    }
    return hasPermission(item.name);
  });

  const isDark = theme === 'dark';
  const bgMain = isDark ? 'bg-[#0d0d0d]' : 'bg-[#f5f6f8]';
  const bgSidebar = isDark ? 'bg-[#161616]' : 'bg-white';
  const borderColor = isDark ? 'border-[#2a2a2a]' : 'border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';

  const isMenuActive = (item: MenuItem) => {
    if (!item.path) return false;
    if (item.path === '/') return location.pathname === '/';
    return location.pathname === item.path || location.pathname.startsWith(item.path + '/');
  };

  return (
    <div className={`flex h-screen ${bgMain}`}>
      <aside className={`w-60 ${bgSidebar} border-r ${borderColor} flex flex-col`}>
        <div className={`p-4 border-b ${borderColor}`}>
          <h1 className="text-xl font-black italic text-red-500 tracking-wider">LUKA!</h1>
          <div className={`text-xs ${textSecondary} mt-1`}>
            {identity?.name || 'admin'} ({identity?.role || '-'})
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-2">
          {visibleMenus.map((item) => {
            if (item.children) {
              const expanded = expandedGroups[item.name];
              const hasActiveChild = item.children.some((c) => isMenuActive(c));
              return (
                <div key={item.name} className="mb-1">
                  <button
                    onClick={() => toggleGroup(item.name)}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm transition ${
                      hasActiveChild
                        ? 'bg-red-600/20 text-red-400 font-bold'
                        : `${textSecondary} hover:bg-red-600/10`
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base">{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                    <span className="text-xs">{expanded ? '▾' : '▸'}</span>
                  </button>
                  {expanded && (
                    <div className="mt-1 ml-4 space-y-1">
                      {item.children
                        .filter((c) => hasPermission(c.name))
                        .map((child) => {
                          const active = isMenuActive(child);
                          return (
                            <Link
                              key={child.name}
                              to={child.path!}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
                                active
                                  ? 'bg-red-600 text-white font-bold'
                                  : `${textSecondary} hover:bg-red-600/10`
                              }`}
                            >
                              <span>{child.icon}</span>
                              <span>{child.label}</span>
                            </Link>
                          );
                        })}
                    </div>
                  )}
                </div>
              );
            }

            const active = isMenuActive(item);
            return (
              <Link
                key={item.name}
                to={item.path!}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm mb-1 transition ${
                  active
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
          >
            {isDark ? '☀️' : '🌙'}
          </button>
          <button
            onClick={() => logout()}
            className={`flex-1 py-2 rounded text-sm ${textSecondary} hover:bg-red-600/10`}
          >
            退出
          </button>
        </div>
      </aside>

      <main className={`flex-1 overflow-y-auto ${textPrimary}`}>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
