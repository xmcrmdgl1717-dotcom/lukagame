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

const ProtectedLayout = () => (
  <AppLayout>
    <Outlet />
  </AppLayout>
);

const Placeholder: React.FC<{ title: string }> = ({ title }) => (
  <div>
    <h1 className="text-2xl font-bold mb-6">{title}</h1>
    <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-8 text-center text-gray-500">
      模块将在后续阶段实现
    </div>
  </div>
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
            <Route path="/notifications" element={<Placeholder title="通知管理" />} />
            <Route path="/tickets" element={<Placeholder title="客服工单" />} />
            <Route path="/admins" element={<Placeholder title="管理员" />} />
          </Route>
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Refine>
    </BrowserRouter>
  );
}
