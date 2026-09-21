export default function BottomNav({ currentTab, setCurrentTab }) {
  const navs = [
    { id: 'home', label: '首页', icon: '🏠' },
    { id: 'activity', label: '活动', icon: '🎉' },
    { id: 'recharge', label: '充值', icon: '💰', isCenter: true },
    { id: 'inventory', label: '存货', icon: '📦' },
    { id: 'profile', label: '我的', icon: '👤' },
  ];

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md h-[70px] bg-[#140a0a]/95 border-t border-[#332222] flex justify-around items-center z-50 backdrop-blur-md">
      {navs.map(nav => {
        if (nav.isCenter) {
          return (
            <div 
              key={nav.id} 
              className="flex flex-col items-center text-[10px] text-red-400 cursor-pointer" 
              onClick={() => alert('充值弹窗功能待实现，请参考之前的图文教程集成支付。')}
            >
              <div className="w-12 h-12 bg-gradient-to-br from-orange-600 to-red-600 rounded-full flex items-center justify-center text-xl -mt-6 shadow-lg shadow-red-900/50 border-2 border-black">
                {nav.icon}
              </div>
              <span>{nav.label}</span>
            </div>
          );
        }
        return (
          <div
            key={nav.id}
            className={`flex flex-col items-center text-[10px] cursor-pointer ${currentTab === nav.id ? 'text-red-500' : 'text-gray-500'}`}
            onClick={() => setCurrentTab(nav.id)}
          >
            <span className="text-xl">{nav.icon}</span>
            <span>{nav.label}</span>
          </div>
        );
      })}
    </div>
  );
}
