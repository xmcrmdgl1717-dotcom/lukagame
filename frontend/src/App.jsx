import { useState, useEffect } from 'react';
import axios from 'axios';
import { useStore } from './store';
import BottomNav from './components/BottomNav';
import Home from './pages/Home';
import Activity from './pages/Activity';
import Inventory from './pages/Inventory';
import Profile from './pages/Profile';

// 自动读取 Render 的环境变量，本地开发则回退到 localhost
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function App() {
  const [currentTab, setCurrentTab] = useState('home');
  const { setUser, setBoxes, user } = useStore();

  useEffect(() => {
    // 使用环境变量中的 API 地址进行请求
    axios.post(`${API_URL}/api/login`, { username: 'test' })
      .then(res => setUser(res.data))
      .catch(err => console.error("登录失败:", err));

    axios.get(`${API_URL}/api/boxes`)
      .then(res => setBoxes(res.data))
      .catch(err => console.error("获取盲盒失败:", err));
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
