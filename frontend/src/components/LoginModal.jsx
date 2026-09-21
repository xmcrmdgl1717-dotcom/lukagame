import { useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function LoginModal({ onClose, onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const endpoint = isLogin ? '/api/login' : '/api/register';
    
    try {
      const res = await axios.post(`${API_URL}${endpoint}`, { username: email, password });
      if (isLogin) {
        onLoginSuccess(res.data); // 传递用户数据到全局状态
      } else {
        // 注册成功后自动登录
        const loginRes = await axios.post(`${API_URL}/api/login`, { username: email, password });
        onLoginSuccess(loginRes.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || '操作失败，请重试');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[200] p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl p-8 relative overflow-hidden shadow-2xl" style={{ background: 'linear-gradient(135deg, #b83d22 0%, #9a2c18 100%)' }}>
        
        <button onClick={onClose} className="absolute top-4 right-5 text-white/50 hover:text-white text-3xl font-light transition">&times;</button>
        
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black italic text-white tracking-widest mb-2 drop-shadow-md">LUKA!</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input 
              type="text" 
              placeholder="Email / Username" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/15 border border-white/20 text-white placeholder-white/60 rounded-full px-5 py-3 outline-none focus:border-white/50 transition"
              required
            />
          </div>
          <div className="relative">
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/15 border border-white/20 text-white placeholder-white/60 rounded-full px-5 py-3 outline-none focus:border-white/50 transition"
              required
            />
          </div>

          {error && <div className="text-red-200 text-xs text-center bg-red-900/30 py-2 rounded">{error}</div>}

          <button type="submit" className="w-full bg-white text-[#9a2c18] font-bold rounded-full py-3 mt-2 hover:bg-gray-100 transition shadow-lg text-sm">
            {isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div className="text-center mt-5">
          <span className="text-white/70 text-xs">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
          </span>
          <button 
            onClick={() => { setIsLogin(!isLogin); setError(''); }} 
            className="text-white text-xs font-bold underline ml-1 hover:text-orange-200 transition"
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
