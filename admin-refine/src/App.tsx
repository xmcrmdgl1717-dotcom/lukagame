import React from 'react';
import { Refine, useIsAuthenticated } from '@refinedev/core';
import routerProvider from '@refinedev/react-router-v6';
import { BrowserRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { dataProvider } from './providers/dataProvider';
import { authProvider } from './providers/authProvider';
import { SensitiveConfirmProvider } from './components/SensitiveConfirm';
import AppLayout from './components/AppLayout';
import { useMenuTree, AdminMenu } from './hooks/useMenuTree';

import { LoginPage } from './pages/login';
import { DashboardPage } from './pages/dashboard';
import UserList from './pages/users';
import CardList from './pages/cards';
import BoxList from './pages/boxes';
import RechargeList from './pages/recharge';
import OrderList from './pages/orders';
import BannerList from './pages/banners';
import TaskList from './pages/tasks';
import RedeemCodeList from './pages/redeem-codes';
import NotificationList from './pages/notifications';
import TicketList from './pages/tickets';
import AdminList from './pages/admins';
import RoleList from './pages/roles';
import PermissionList from './pages/permissions';
import AuditLogList from './pages/audit-logs';
import SessionList from './pages/sessions';
import VipLevels from './pages/vip-levels';
import MenuManage from './pages/menus';

const COMPONENT_REGISTRY: Record<string, React.ComponentType<any>> = {
  DashboardPage,
  UserList,
  CardList,
  BoxList,
  RechargeList,
  OrderList,
  BannerList,
  TaskList,
  RedeemCodeList,
  NotificationList,
  TicketList,
  AdminList,
  RoleList,
  PermissionList,
  AuditLogList,
  SessionList,
  VipLevels,
  MenuManage,
};

function buildRoutes(menus: AdminMenu[]): React.ReactElement[] {
  const routes: React.ReactElement[] = [];
  const walk = (list: AdminMenu[]) => {
    list.forEach((m) => {
      if (m.type === 'MENU' && m.path && m.component) {
        const Comp = COMPONENT_REGISTRY[m.component];
        if (Comp) {
          routes.push(<Route key={m.id} path={m.path} element={<Comp />} />);
        }
      }
      if (m.children?.length) walk(m.children);
    });
  };
  walk(menus);
  return routes;
}

const ProtectedLayout = ({ menus }: { menus: AdminMenu[] }) => (
  <AppLayout menus={menus}>
    <Outlet />
  </AppLayout>
);

// 所有页面都必须在 Refine 内部
function AppContent() {
  const { data: auth, isLoading: authLoading } = useIsAuthenticated();
  const { menus, loading: menuLoading } = useMenuTree();

  // 认证状态还没加载完
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0d0d0d] text-gray-400">
        验证登录状态...
      </div>
    );
  }

  // 未登录 → 只渲染登录页
  if (!auth?.authenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // 已登录但菜单加载中
  if (menuLoading || !menus) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0d0d0d] text-gray-400">
        加载菜单中...
      </div>
    );
  }

  const dynamicRoutes = buildRoutes(menus);

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route element={<ProtectedLayout menus={menus} />}>
        {dynamicRoutes}
        <Route index element={<DashboardPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <SensitiveConfirmProvider>
      <BrowserRouter>
        <Refine
          dataProvider={dataProvider}
          authProvider={authProvider}
          routerProvider={routerProvider}
          options={{ disableTelemetry: true }}
        >
          <AppContent />
        </Refine>
      </BrowserRouter>
    </SensitiveConfirmProvider>
  );
}
