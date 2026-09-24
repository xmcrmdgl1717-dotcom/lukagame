import { useState, useEffect } from 'react';
import axios from 'axios';
import { useStore } from './store';
import { I18nProvider } from './i18n/index.jsx';
import BottomNav from './components/BottomNav';
import LanguageSwitcher from './components/LanguageSwitcher';
import CurrencySwitcher from './components/CurrencySwitcher';
import Popup from './components/Popup';
import ComplianceNotice from './components/ComplianceNotice';
import Home from './pages/Home';
import GameDetail from './pages/GameDetail';
import Activity from './pages/Activity';
import Inventory from './pages/Inventory';
import Profile from './pages/Profile';
import Orders from './pages/Orders';
import Notifications from './pages/Notifications';
import CardOrders from './pages/CardOrders';
import CardOrderSubmit from './pages/CardOrderSubmit';
import Articles from './pages/Articles';
import ArticleDetail from './pages/ArticleDetail';
import StaticPage from './pages/StaticPage';
import TransactionLog from './pages/TransactionLog';
import VipCenter from './pages/VipCenter';
import Leaderboard from './pages/Leaderboard';
import Transfers from './pages/Transfers';
import DrawDetail from './pages/DrawDetail';
import EmailSettings from './pages/EmailSettings';
import LoginModal from './components/LoginModal';
import RechargeModal from './components/RechargeModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function AppInner() {
  const [currentTab, setCurrentTab] = useState('home');
  const [currentGame, setCurrentGame] = useState(null);
  const [currentPage, setCurrentPage] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showRecharge, setShowRecharge] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const { setUser, setBoxes, user, currency, setCurrency } = useStore();

  // 加载 boxes + currency
  useEffect(() => {
    axios.get(`${API_URL}/api/boxes`).then(res => setBoxes(res.data)).catch(() => {});
    axios.get(`${API_URL}/api/currency`).then(res => setCurrency(res.data)).catch(() => {});
  }, [setBoxes, setCurrency]);

  useEffect(() => {
    if (!user) return;
    axios.post(`${API_URL}/api/login`, { username: user.username, password: user.password || '123' })
      .then((res) => { if (res.data && res.data.id) setUser(res.data); }).catch(() => {});
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (!user) { setUnreadCount(0); return; }
    const fetchUnread = async () => {
      try { const res = await axios.get(`${API_URL}/api/notifications/${user.id}/unread-count`); setUnreadCount(res.data.unread); } catch (e) {}
    };
    fetchUnread();
    const timer = setInterval(fetchUnread, 30000);
    return () => clearInterval(timer);
  }, [user]);

  const handleLoginSuccess = (userData) => { setUser(userData); setShowLogin(false); };
  const handleGoGame = (game) => setCurrentGame(game);
  const handleBackFromGame = () => setCurrentGame(null);
  const goPage = (page) => { setCurrentPage(page); setCurrentGame(null); };
  const backFromPage = () => setCurrentPage(null);

  const handleRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      const res = await axios.post(`${API_URL}/api/login`, { username: user.username, password: user.password || '123' });
      if (res.data && res.data.id) setUser(res.data);
    } catch (e) {}
    finally { setTimeout(() => setRefreshing(false), 300); }
  };

  const renderContent = () => {
    if (currentPage) {
      if (currentPage.type === 'article') return <ArticleDetail slug={currentPage.slug} onBack={backFromPage} />;
      if (currentPage.type === 'static') return <StaticPage slug={currentPage.slug} onBack={backFromPage} />;
      if (currentPage.type === 'articles-list') return <Articles onOpenArticle={(slug) => goPage({ type: 'article', slug })} onBack={backFromPage} />;
      if (currentPage.type === 'card-order-submit') return <CardOrderSubmit onBack={backFromPage} />;
      if (currentPage.type === 'transactions') return <TransactionLog onBack={backFromPage} />;
      if (currentPage.type === 'vip') return <VipCenter onBack={backFromPage} />;
      if (currentPage.type === 'leaderboard') return <Leaderboard onBack={backFromPage} />;
      if (currentPage.type === 'transfers') return <Transfers onBack={backFromPage} />;
      if (currentPage.type === 'email-settings') return <EmailSettings onBack={backFromPage} />;
      if (currentPage.type === 'draw-detail') return (
        <DrawDetail
          boxId={currentPage.boxId}
          onBack={backFromPage}
          onGoInventory={() => { setCurrentPage(null); setCurrentGame(null); setCurrentTab('inventory'); }}
        />
      );
    }
    if (currentGame) return (
      <GameDetail
        gameId={currentGame.id}
        onBack={handleBackFromGame}
        onGoBoxDetail={(boxId) => goPage({ type: 'draw-detail', boxId })}
      />
    );
    if (currentTab === 'home') return (
      <Home
        onShowLogin={() => setShowLogin(true)}
        onGoGame={handleGoGame}
        onGoLeaderboard={() => goPage({ type: 'leaderboard' })}
        onGoBoxDetail={(boxId) => goPage({ type: 'draw-detail', boxId })}
      />
    );
    if (currentTab === 'activity') return <Activity />;
    if (currentTab === 'inventory') return <Inventory onGoSubmit={() => goPage({ type: 'card-order-submit' })} onGoTransfers={() => goPage({ type: 'transfers' })} />;
    if (currentTab === 'orders') return <Orders />;
    if (currentTab === 'card-orders') return <CardOrders onGoSubmit={() => goPage({ type: 'card-order-submit' })} />;
    if (currentTab === 'notifications') return <Notifications onRead={() => setUnreadCount(0)} />;
    if (currentTab === 'profile') {
      return (
        <Profile
          onGoOrders={() => setCurrentTab('orders')}
          onGoCardOrders={() => setCurrentTab('card-orders')}
          onGoNotifications={() => setCurrentTab('notifications')}
          onGoArticles={() => goPage({ type: 'articles-list' })}
          onGoStatic={(slug) => goPage({ type: 'static', slug })}
          onGoVip={() => goPage({ type: 'vip' })}
          onGoTransfers={() => goPage({ type: 'transfers' })}
          onGoEmailSettings={() => goPage({ type: 'email-settings' })}
        />
      );
    }
    return null;
  };

  const popupPath = currentPage ? `/page/${currentPage.type}` : currentGame ? `/game/${currentGame.id}` : `/${currentTab}`;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#0a0a0a] text-white pb-20 relative shadow-2xl overflow-hidden">
      <div className="flex justify-between items-center px-3 py-3 bg-[#140a0a] border-b border-[#332222] gap-2">
        <div className="text-xl font-black italic text-red-500 tracking-wider flex-shrink-0">LUKA!</div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <CurrencySwitcher />
          <LanguageSwitcher />
          {user && (
            <button onClick={() => setCurrentTab('notifications')} className="relative flex-shrink-0">
              <span className="text-lg">🔔</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[14px] h-3.5 flex items-center justify-center px-1">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          )}
          {!user ? (
            <button onClick={() => setShowLogin(true)} className="text-[11px] text-gray-400 border border-gray-600 px-2.5 py-1 rounded-full hover:text-white hover:border-white transition whitespace-nowrap">Sign In</button>
          ) : (
            <div className="flex items-center gap-1">
              <button onClick={() => goPage({ type: 'transactions' })} className="text-[11px] text-yellow-500 font-bold bg-[#2a1414] px-2 py-1 rounded-full border border-yellow-900/50 whitespace-nowrap hover:border-yellow-500 transition">
                {currency.symbol} {user.coins.toLocaleString()}
              </button>
              <button onClick={handleRefresh} disabled={refreshing} className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-[11px] w-7 h-7 rounded-full flex items-center justify-center shadow-md transition" title="刷新余额">
                <span className={refreshing ? 'animate-spin' : ''}>🔄</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-4">{renderContent()}</div>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} onLoginSuccess={handleLoginSuccess} />}
      {showRecharge && <RechargeModal onClose={() => setShowRecharge(false)} />}

      <BottomNav currentTab={currentTab} setCurrentTab={(t) => { setCurrentGame(null); setCurrentPage(null); setCurrentTab(t); }} onShowRecharge={() => { if (!user) return setShowLogin(true); setShowRecharge(true); }} />

      <Popup currentPath={popupPath} />
      <ComplianceNotice />
    </div>
  );
}

export default function App() {
  return (<I18nProvider><AppInner /></I18nProvider>);
}
