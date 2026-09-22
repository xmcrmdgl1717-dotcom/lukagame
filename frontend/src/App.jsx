import { useState, useEffect } from 'react';
import axios from 'axios';
import { useStore } from './store';
import { I18nProvider } from './i18n';
import BottomNav from './components/BottomNav';
import LanguageSwitcher from './components/LanguageSwitcher';
import Popup from './components/Popup';
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
import LoginModal from './components/LoginModal';
import RechargeModal from './components/RechargeModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function AppInner() {
  const [currentTab, setCurrentTab] = useState('home');
  const [currentGame, setCurrentGame] = useState(null);
  const [currentPage, setCurrentPage] = useState(null); // 用于文章/静态页
  const [showLogin, setShowLogin] = useState(false);
  const [showRecharge, setShowRecharge] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { setUser, setBoxes, user } = useStore();

  useEffect(() => {
    axios.get(`${API_URL}/api/boxes`).then(res => setBoxes(res.data)).catch(() => {});
  }, [setBoxes]);

  useEffect(() => {
    if (!user) { setUnreadCount(0); return; }
    const fetchUnread = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/notifications/${user.id}/unread-count`);
        setUnreadCount(res.data.unread);
      } catch (e) {}
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

  const renderContent = () => {
    // 1. 打开的系统页面/文章
    if (currentPage) {
      if (currentPage.type === 'article') {
        return <ArticleDetail slug={currentPage.slug} onBack={backFromPage} />;
      }
      if (currentPage.type === 'static') {
        return <StaticPage slug={currentPage.slug} onBack={backFromPage} />;
      }
      if (currentPage.type === 'articles-list') {
        return <Articles onOpenArticle={(slug) => goPage({ type: 'article', slug })} onBack={backFromPage} />;
      }
      if (currentPage.type === 'card-order-submit') {
        return <CardOrderSubmit onBack={backFromPage} />;
      }
    }

    // 2. 游戏详情
    if (currentGame) return <GameDetail gameId={currentGame.id} onBack={handleBackFromGame} />;

    // 3. Tab 页面
    if (currentTab === 'home') return <Home onShowLogin={() => setShowLogin(true)} onGoGame={handleGoGame} />;
    if (currentTab === 'activity') return <Activity />;
    if (currentTab === 'inventory') return <Inventory onGoSubmit={() => goPage({ type: 'card-order-submit' })} />;
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
        />
      );
    }
    return null;
  };

  // 用于弹窗匹配的当前路径
  const popupPath = currentPage ? `/page/${currentPage.type}` : currentGame ? `/game/${currentGame.id}` : `/${currentTab}`;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#0a0a0a] text-white pb-20 relative shadow-2xl overflow-hidden">
      {/* 顶部栏 */}
      <div className="flex justify-between items-center p-4 bg-[#140a0a] border-b border-[#332222]">
        <div className="text-2xl font-black italic text-red-500 tracking-wider">LUKA!</div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          {user && (
            <button onClick={() => setCurrentTab('notifications')} className="relative">
              <span className="text-xl">🔔</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          )}
          {!user ? (
            <button onClick={() => setShowLogin(true)} className="text-xs text-gray-400 border border-gray-600 px-3 py-1 rounded-full hover:text-white hover:border-white transition">Sign In</button>
          ) : (
            <div className="text-xs text-yellow-500 font-bold bg-[#2a1414] px-2 py-1 rounded-full border border-yellow-900/50">💰 {user.coins.toLocaleString()}</div>
          )}
        </div>
      </div>

      <div className="p-4">{renderContent()}</div>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} onLoginSuccess={handleLoginSuccess} />}
      {showRecharge && <RechargeModal onClose={() => setShowRecharge(false)} />}

      <BottomNav
        currentTab={currentTab}
        setCurrentTab={(t) => {
          setCurrentGame(null);
          setCurrentPage(null);
          setCurrentTab(t);
        }}
        onShowRecharge={() => {
          if (!user) return setShowLogin(true);
          setShowRecharge(true);
        }}
      />

      {/* 弹窗 */}
      <Popup currentPath={popupPath} />
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AppInner />
    </I18nProvider>
  );
}
