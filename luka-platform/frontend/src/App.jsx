import { useState, useEffect } from 'react';
import axios from 'axios';
import { useStore } from './store';
import BottomNav from './components/BottomNav';
import Home from './pages/Home';
import Activity from './pages/Activity';
import Inventory from './pages/Inventory';
import Profile from './pages/Profile';

export default function App() {
  const [currentTab, setCurrentTab] = useState('home');
  const { setUser, setBoxes, user } = useStore();

  useEffect(() => {
    axios.post('http://localhost:3001/api/login', { username: 'test' })
      .then(res => setUser(res.data));
    axios.get('http://localhost:3001/api/boxes')
      .then(res => setBoxes(res.data));
  }, [setUser, setBoxes]);

  if (!user) {
    return <div className="flex items-center justify-center h-screen text-red-500 font-bold">加载中...</div>;
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#0a0a0a] text-white pb-20 relative shadow-2xl">
      <div className="p-4">
        {currentTab === 'home' && <Home />}
        {currentTab === 'activity' && <Activity />}
        {currentTab === 'inventory' && <Inventory />}
        {currentTab === 'profile' && <Profile />}
      </div>
      <BottomNav currentTab={currentTab} setCurrentTab={setCurrentTab} />
    </div>
  );
}
