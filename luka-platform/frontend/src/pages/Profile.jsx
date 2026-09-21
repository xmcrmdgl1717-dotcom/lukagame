import { useStore } from '../store';

export default function Profile() {
  const { user } = useStore();

  const menuItems = [
    { label: '我的订单', icon: '📄' },
    { label: '等级特权', icon: '⭐' },
    { label: '代金券', icon: '🎫' },
    { label: '转诊推荐', icon: '🔗' },
    { label: '交易记录', icon: '🔄' },
    { label: '兑换码', icon: '🎁' },
    { label: '联系客服', icon: '🎧' },
    { label: '常见问题', icon: '❓' },
  ];

  return (
    <div className="p-4">
      <div className="bg-gradient-to-br from-[#1c0e0e] to-[#2a1414] border border-[#3d1a1a] rounded-xl p-5 flex gap-4 items-center mb-8 shadow-lg">
        <div className="w-16 h-16 bg-gradient-to-br from-orange-600 to-red-600 rounded-xl flex items-center justify-center text-3xl shadow-inner">
          👤
        </div>
        <div>
          <div className="text-xs text-orange-400 font-bold mb-1">LUKA LICENSE</div>
          <div className="text-xl font-black text-white mb-1">LV.1</div>
          <div className="text-xs text-gray-500">ID: {user?.id.slice(0, 8)}</div>
        </div>
      </div>

      <div className="bg-[#1c0e0e] border border-[#3d1a1a] rounded-xl overflow-hidden shadow-lg">
        {menuItems.map((item, index) => (
          <div 
            key={index} 
            className="flex justify-between items-center p-4 border-b border-[#2a1414] last:border-0 hover:bg-[#2a1414] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3 text-sm text-gray-300">
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </div>
            <span className="text-gray-600">›</span>
          </div>
        ))}
      </div>

      <button className="w-full mt-8 bg-[#2a1414] border border-[#4d2a2a] text-red-400 py-3 rounded-xl text-sm font-bold shadow-lg hover:bg-[#3d1a1a] transition-colors">
        退出登录
      </button>
      
      <div className="text-center text-[10px] text-gray-600 mt-8 leading-relaxed">
        <p>隐私政策 | 条款及细则 | 退款政策</p>
        <p>© 2026 LUKA. All rights reserved.</p>
      </div>
    </div>
  );
}
