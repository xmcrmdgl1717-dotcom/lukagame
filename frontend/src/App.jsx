import { useState, useEffect } from 'react';
import axios from 'axios';
import { useStore } from './store';
import BottomNav from './components/BottomNav';
import Home from './pages/Home';
import Activity from './pages/Activity';
import Inventory from './pages/Inventory';
import Profile from './pages/Profile';
import LoginModal from './components/LoginModal';
import RechargeModal from './components/RechargeModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function App() {
  const [currentTab, setCurrentTab] = useState('home');
  const [showLogin, setShowLogin] = useState(false);
  const [showRecharge, setShowRecharge] = useState(false);
  const { setUser, setBoxes, user } = useStore();

  useEffect(() => {
    axios.get(`${API_URL}/api/boxes`).then(res => setBoxes(res.data));
  }, [setBoxes]);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setShowLogin(false);
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#0a0a0a] text-white pb-20 relative shadow-2xl overflow-hidden">
      <div className="flex justify-between items-center p-4 bg-[#140a0a] border-b border-[#332222]">
        <div className="text-2xl font-black italic text-red-500 tracking-wider">LUKA!</div>
        {!user ? (
          <button onClick={() => setShowLogin(true)} className="text-xs text-gray-400 border border-gray-600 px-4 py-1.5 rounded-full hover:text-white hover:border-white transition">
            Sign In
          </button>
        ) : (
          <div className="text-xs text-yellow-500 font-bold bg-[#2a1414] px-3 py-1.5 rounded-full border border-yellow-900/50">
            💰 {user.coins.toLocaleString()}
          </div>
        )}
      </div>

      <div className="p-4">
        {currentTab === 'home' && <Home onShowLogin={() => setShowLogin(true)} />}
        {currentTab === 'activity' && <Activity />}
        {currentTab === 'inventory' && <Inventory />}
        {currentTab === 'profile' && <Profile />}
      </div>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} onLoginSuccess={handleLoginSuccess} />}
      {showRecharge && <RechargeModal onClose={() => setShowRecharge(false)} />}

      <BottomNav 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        onShowRecharge={() => {
          if (!user) return setShowLogin(true);
          setShowRecharge(true);
        }} 
      />
    </div>
  );
}
