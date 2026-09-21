import React from 'react';
import { Refine } from '@refinedev/core';
import routerProvider from '@refinedev/react-router-v6';
import { BrowserRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { dataProvider } from './providers/dataProvider';
import { authProvider } from './providers/authProvider';
import AppLayout from './components/AppLayout';
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

const ProtectedLayout = () => (
  <AppLayout>
    <Outlet />
  </AppLayout>
);

export default function App() {
  return (
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
          </Route>
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Refine>
    </BrowserRouter>
  );
}
