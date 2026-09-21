import React, { lazy, Suspense } from 'react';
import { Refine } from '@refinedev/core';
import routerProvider from '@refinedev/react-router-v6';
import { BrowserRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { dataProvider } from './providers/dataProvider';
import { authProvider } from './providers/authProvider';
import { SensitiveConfirmProvider } from './components/SensitiveConfirm';
import AppLayout from './components/AppLayout';
import { LoginPage } from './pages/login';
import { DashboardPage } from './pages/dashboard';

// ✅ 懒加载：每个页面单独打包，按需加载
const UserList = lazy(() => import('./pages/users'));
const CardList = lazy(() => import('./pages/cards'));
const BoxList = lazy(() => import('./pages/boxes'));
const RechargeList = lazy(() => import('./pages/recharge'));
const OrderList = lazy(() => import('./pages/orders'));
const BannerList = lazy(() => import('./pages/banners'));
const TaskList = lazy(() => import('./pages/tasks'));
const RedeemCodeList = lazy(() => import('./pages/redeem-codes'));
const NotificationList = lazy(() => import('./pages/notifications'));
const TicketList = lazy(() => import('./pages/tickets'));
const AdminList = lazy(() => import('./pages/admins'));
const RoleList = lazy(() => import('./pages/roles'));
const PermissionList = lazy(() => import('./pages/permissions'));
const AuditLogList = lazy(() => import('./pages/audit-logs'));
const SessionList = lazy(() => import('./pages/sessions'));

const ProtectedLayout = () => (
  <AppLayout>
    <Suspense fallback={<div className="text-center text-gray-500 py-20">页面加载中...</div>}>
      <Outlet />
    </Suspense>
  </AppLayout>
);

export default function App() {
  return (
    <SensitiveConfirmProvider>
      <BrowserRouter>
        <Refine
          dataProvider={dataProvider}
          authProvider={authProvider}
          routerProvider={routerProvider}
          resources={[
            { name: 'users', list: '/users' },
            { name: 'cards', list: '/cards' },
            { name: 'boxes', list: '/boxes' },
            { name: 'recharge-options', list: '/recharge-options' },
            { name: 'orders', list: '/orders' },
            { name: 'banners', list: '/banners' },
            { name: 'tasks', list: '/tasks' },
            { name: 'redeem-codes', list: '/redeem-codes' },
            { name: 'notifications', list: '/notifications' },
            { name: 'tickets', list: '/tickets' },
            { name: 'admins', list: '/admins' },
          ]}
          options={{ disableTelemetry: true }}
        >
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="/users" element={<UserList />} />
              <Route path="/cards" element={<CardList />} />
              <Route path="/boxes" element={<BoxList />} />
              <Route path="/recharge-options" element={<RechargeList />} />
              <Route path="/orders" element={<OrderList />} />
              <Route path="/banners" element={<BannerList />} />
              <Route path="/tasks" element={<TaskList />} />
              <Route path="/redeem-codes" element={<RedeemCodeList />} />
              <Route path="/notifications" element={<NotificationList />} />
              <Route path="/tickets" element={<TicketList />} />
              <Route path="/admins" element={<AdminList />} />
              <Route path="/admins/roles" element={<RoleList />} />
              <Route path="/admins/permissions" element={<PermissionList />} />
              <Route path="/admins/audit-logs" element={<AuditLogList />} />
              <Route path="/admins/sessions" element={<SessionList />} />
            </Route>
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Refine>
      </BrowserRouter>
    </SensitiveConfirmProvider>
  );
}
