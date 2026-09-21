import { useState, useEffect } from 'react';
import axios from 'axios';
import { useStore } from './store';
import BottomNav from './components/BottomNav';
import Home from './pages/Home';
import GameDetail from './pages/GameDetail';
import Activity from './pages/Activity';
import Inventory from './pages/Inventory';
import Profile from './pages/Profile';
import Orders from './pages/Orders';
import Notifications from './pages/Notifications';
import LoginModal from './components/LoginModal';
import RechargeModal from './components/RechargeModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function App() {
  const [currentTab, setCurrentTab] = useState('home');
  const [currentGame, setCurrentGame] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showRecharge, setShowRecharge] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { setUser, setBoxes, user } = useStore();

  useEffect(() => {
    axios.get(`${API_URL}/api/boxes`).then(res => setBoxes(res.data));
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

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setShowLogin(false);
  };

  const handleGoGame = (game) => {
    setCurrentGame(game);
  };

  const handleBackFromGame = () => {
    setCurrentGame(null);
  };

  const renderContent = () => {
    // 如果打开了某个游戏，显示游戏详情
    if (currentGame) {
      return <GameDetail gameId={currentGame.id} onBack={handleBackFromGame} />;
    }

    if (currentTab === 'home') return <Home onShowLogin={() => setShowLogin(true)} onGoGame={handleGoGame} />;
    if (currentTab === 'activity') return <Activity />;
    if (currentTab === 'inventory') return <Inventory />;
    if (currentTab === 'orders') return <Orders />;
    if (currentTab === 'notifications') return <Notifications onRead={() => setUnreadCount(0)} />;
    if (currentTab === 'profile') {
      return (
        <Profile
          onGoOrders={() => setCurrentTab('orders')}
          onGoNotifications={() => setCurrentTab('notifications')}
        />
      );
    }
    return null;
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#0a0a0a] text-white pb-20 relative shadow-2xl overflow-hidden">
      <div className="flex justify-between items-center p-4 bg-[#140a0a] border-b border-[#332222]">
        <div className="text-2xl font-black italic text-red-500 tracking-wider">LUKA!</div>
        <div className="flex items-center gap-3">
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
            <button onClick={() => setShowLogin(true)} className="text-xs text-gray-400 border border-gray-600 px-4 py-1.5 rounded-full hover:text-white hover:border-white transition">Sign In</button>
          ) : (
            <div className="text-xs text-yellow-500 font-bold bg-[#2a1414] px-3 py-1.5 rounded-full border border-yellow-900/50">💰 {user.coins.toLocaleString()}</div>
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
          setCurrentTab(t);
        }}
        onShowRecharge={() => {
          if (!user) return setShowLogin(true);
          setShowRecharge(true);
        }}
      />
    </div>
  );
}
