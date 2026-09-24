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
import UserGroupList from './pages/user-groups';
import BankCardList from './pages/bankcards';
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
import GameList from './pages/games';
import AdList from './pages/ads';
import PaymentChannelList from './pages/payment-channels';
import TransactionList from './pages/transactions';
import DrawLogList from './pages/drawlogs';
import ReportSummary from './pages/reports/summary';
import ReportFinance from './pages/reports/finance';
import ReportDraw from './pages/reports/draw';
import ReportUserDraw from './pages/reports/user-draw';
import ReportUserFinance from './pages/reports/user-finance';
import ReportVipDistribution from './pages/reports/vip-distribution';
import ReportCardRanking from './pages/reports/card-ranking';
import ReportRetention from './pages/reports/retention';
import LanguageList from './pages/languages';
import TranslationList from './pages/translations';
import CardOrderList from './pages/card-orders';
import PopupList from './pages/popups';
import ArticleList from './pages/articles';
import AdChannelList from './pages/ad-channels';
import AdCampaignList from './pages/ad-campaigns';
import KolList from './pages/kols';
import AdReport from './pages/ad-reports';
import AdRetentionReport from './pages/ad-retention';
import TransferLogList from './pages/transfer-logs';
import EmailSettingPage from './pages/email-setting';
import EmailLogList from './pages/email-logs';
import SecurityPage from './pages/security';
import SystemMonitorPage from './pages/system/monitor';
import ClientErrorList from './pages/system/errors';

const COMPONENT_REGISTRY: Record<string, React.ComponentType<any>> = {
  DashboardPage, UserList, UserGroupList, BankCardList, CardList, BoxList,
  RechargeList, OrderList, BannerList, TaskList, RedeemCodeList, NotificationList,
  TicketList, AdminList, RoleList, PermissionList, AuditLogList, SessionList,
  VipLevels, MenuManage, GameList, AdList, PaymentChannelList,
  TransactionList, DrawLogList, ReportSummary, ReportFinance, ReportDraw,
  ReportUserDraw, ReportUserFinance, ReportVipDistribution, ReportCardRanking, ReportRetention,
  LanguageList, TranslationList, CardOrderList, PopupList, ArticleList,
  AdChannelList, AdCampaignList, KolList, AdReport, AdRetentionReport,
  TransferLogList, EmailSettingPage, EmailLogList, SecurityPage,
  SystemMonitorPage, ClientErrorList,
};

function buildRoutes(menus: AdminMenu[]): React.ReactElement[] {
  const routes: React.ReactElement[] = [];
  const walk = (list: AdminMenu[]) => {
    list.forEach((m) => {
      if (m.type === 'MENU' && m.path && m.component) {
        const Comp = COMPONENT_REGISTRY[m.component];
        if (Comp) {
          routes.push(<Route key={m.id} path={m.path} element={<Comp />} />);
        } else {
          console.warn(`[路由] 未找到组件: ${m.component} (菜单 ${m.id})`);
        }
      }
      if (m.children?.length) walk(m.children);
    });
  };
  walk(menus);
  return routes;
}

const ProtectedLayout = ({ menus }: { menus: AdminMenu[] }) => (
  <AppLayout menus={menus}><Outlet /></AppLayout>
);

function AppContent() {
  const { data: auth, isLoading: authLoading } = useIsAuthenticated();
  const { menus, loading: menuLoading } = useMenuTree();

  if (authLoading) return <div className="flex items-center justify-center h-screen bg-[#0d0d0d] text-gray-400">验证登录状态...</div>;
  if (!auth?.authenticated) return (<Routes><Route path="/login" element={<LoginPage />} /><Route path="*" element={<Navigate to="/login" replace />} /></Routes>);
  if (menuLoading || !menus) return <div className="flex items-center justify-center h-screen bg-[#0d0d0d] text-gray-400">加载菜单中...</div>;

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
        <Refine dataProvider={dataProvider} authProvider={authProvider} routerProvider={routerProvider} options={{ disableTelemetry: true }}>
          <AppContent />
        </Refine>
      </BrowserRouter>
    </SensitiveConfirmProvider>
  );
}
