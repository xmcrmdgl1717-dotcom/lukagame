import React from 'react';
import { Refine } from '@refinedev/core';
import routerProvider from '@refinedev/react-router-v6';
import { BrowserRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { dataProvider } from './providers/dataProvider';
import { authProvider } from './providers/authProvider';
import AppLayout from './components/AppLayout';
import { LoginPage } from './pages/login';
import { DashboardPage } from './pages/dashboard';

const ProtectedLayout = () => (
  <AppLayout>
    <Outlet />
  </AppLayout>
);

const Placeholder: React.FC<{ title: string }> = ({ title }) => (
  <div>
    <h1 className="text-2xl font-bold mb-6">{title}</h1>
    <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-8 text-center text-gray-500">
      模块将在下一阶段实现
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
            <Route path="/users" element={<Placeholder title="用户管理" />} />
            <Route path="/cards" element={<Placeholder title="卡牌管理" />} />
            <Route path="/boxes" element={<Placeholder title="盲盒管理" />} />
            <Route path="/recharge-options" element={<Placeholder title="充值套餐" />} />
            <Route path="/orders" element={<Placeholder title="订单管理" />} />
            <Route path="/banners" element={<Placeholder title="轮播图" />} />
            <Route path="/tasks" element={<Placeholder title="任务管理" />} />
            <Route path="/redeem-codes" element={<Placeholder title="兑换码" />} />
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
