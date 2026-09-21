import React, { useMemo } from 'react';
import { Refine } from '@refinedev/core';
import routerProvider from '@refinedev/react-router-v6';
import { BrowserRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { dataProvider } from './providers/dataProvider';
import { authProvider } from './providers/authProvider';
import { SensitiveConfirmProvider } from './components/SensitiveConfirm';
import AppLayout from './components/AppLayout';
import { useMenuTree, AdminMenu } from './hooks/useMenuTree';

// ========== 组件注册表（硬编码） ==========
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

// 递归展平菜单树 → 生成路由
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

export default function App() {
  const { menus, loading } = useMenuTree();
  const isLoggedIn = !!localStorage.getItem('adminInfo');

  const dynamicRoutes = useMemo(() => (menus ? buildRoutes(menus) : []), [menus]);

  // 未登录：只渲染登录页
  if (!isLoggedIn) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<LoginPage />} />
        </Routes>
      </BrowserRouter>
    );
  }

  // 已登录但菜单未加载完
  if (loading || !menus) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0d0d0d] text-gray-400">
        加载菜单中...
      </div>
    );
  }

  return (
    <SensitiveConfirmProvider>
      <BrowserRouter>
        <Refine
          dataProvider={dataProvider}
          authProvider={authProvider}
          routerProvider={routerProvider}
          options={{ disableTelemetry: true }}
        >
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedLayout menus={menus} />}>
              {dynamicRoutes}
              {/* 默认跳转 */}
              <Route index element={<DashboardPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Refine>
      </BrowserRouter>
    </SensitiveConfirmProvider>
  );
}
