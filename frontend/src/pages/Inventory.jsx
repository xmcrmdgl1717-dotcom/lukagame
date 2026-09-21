import { useStore } from '../store';

export default function Inventory() {
  const { user } = useStore();
  const inventory = user?.inventory || [];

  return (
    <div className="p-4">
      <div className="text-center text-lg font-bold mb-6 text-orange-400">我的库存</div>
      {inventory.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-20 text-gray-500">
          <div className="text-5xl mb-4 opacity-30">📦</div>
          <div className="text-sm">您的库存为空，快去抽卡吧！</div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {inventory.map(item => (
            <div key={item.id} className="bg-[#1c0e0e] border border-[#3d1a1a] rounded-lg p-2 flex flex-col items-center shadow-md">
              <div className="w-full h-20 bg-gray-800 rounded mb-2 flex items-center justify-center text-2xl">🃏</div>
              <div className="text-xs text-center font-bold text-gray-200 truncate w-full mb-1">{item.card.name}</div>
              <div className="text-[10px] text-yellow-500 font-bold">x{item.quantity}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
