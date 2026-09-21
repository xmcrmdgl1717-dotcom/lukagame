import React, { useEffect, useState } from 'react';
import { useLogout, useGetIdentity, usePermissions } from '@refinedev/core';
import { Link, useLocation } from 'react-router-dom';
import type { AdminMenu } from '../hooks/useMenuTree';

interface AppLayoutProps {
  menus: AdminMenu[];
  children: React.ReactNode;
}

export default function AppLayout({ menus, children }: AppLayoutProps) {
  const { data: identity } = useGetIdentity<any>();
  const { data: permissions } = usePermissions<string[]>();
  const { mutate: logout } = useLogout();
  const location = useLocation();

  const [theme, setTheme] = useState<'dark' | 'light'>(
    (localStorage.getItem('theme') as 'dark' | 'light') || 'dark'
  );
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (theme === 'light') document.body.classList.add('light-mode');
    else document.body.classList.remove('light-mode');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  const toggleGroup = (id: string) => setExpandedGroups((g) => ({ ...g, [id]: !g[id] }));

  // 权限过滤
  const hasPermission = (perm: string) => {
    if (!perm) return true;
    if (!permissions) return false;
    // super 拥有全部
    return permissions.includes(perm) || permissions.length > 40;
  };

  // 递归过滤菜单
  const filterMenus = (list: AdminMenu[]): AdminMenu[] => {
    return list
      .filter((m) => m.isActive && m.isVisible)
      .map((m) => ({
        ...m,
        children: m.children ? filterMenus(m.children) : [],
      }))
      .filter((m) => {
        if (m.type === 'DIRECTORY') return (m.children?.length || 0) > 0;
        return hasPermission(m.permission);
      });
  };

  const visibleMenus = filterMenus(menus || []);

  const isDark = theme === 'dark';
  const bgMain = isDark ? 'bg-[#0d0d0d]' : 'bg-[#f5f6f8]';
  const bgSidebar = isDark ? 'bg-[#161616]' : 'bg-white';
  const borderColor = isDark ? 'border-[#2a2a2a]' : 'border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';

  const isMenuActive = (path: string) => {
    if (!path) return false;
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const renderMenuItem = (item: AdminMenu) => {
    if (item.type === 'DIRECTORY' && item.children?.length) {
      const expanded = expandedGroups[item.id] ?? true;
      const hasActiveChild = item.children.some((c) => isMenuActive(c.path));
      return (
        <div key={item.id} className="mb-1">
          <button
            onClick={() => toggleGroup(item.id)}
            className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm transition ${
              hasActiveChild
                ? 'bg-red-600/20 text-red-400 font-bold'
                : `${textSecondary} hover:bg-red-600/10`
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-base">{item.icon}</span>
              <span>{item.title}</span>
            </div>
            <span className="text-xs">{expanded ? '▾' : '▸'}</span>
          </button>
          {expanded && (
            <div className="mt-1 ml-4 space-y-1">
              {item.children.map((child) => renderMenuItem(child))}
            </div>
          )}
        </div>
      );
    }

    // MENU
    const active = isMenuActive(item.path);
    return (
      <Link
        key={item.id}
        to={item.path}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm mb-1 transition ${
          active ? 'bg-red-600 text-white font-bold' : `${textSecondary} hover:bg-red-600/10`
        }`}
      >
        <span className="text-base">{item.icon || '•'}</span>
        <span>{item.title}</span>
      </Link>
    );
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
          {visibleMenus.length === 0 ? (
            <div className={`text-center ${textSecondary} text-xs py-10`}>没有可访问的菜单</div>
          ) : (
            visibleMenus.map((item) => renderMenuItem(item))
          )}
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
