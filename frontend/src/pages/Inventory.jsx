import { useStore } from '../store';

export default function Inventory({ onGoSubmit }) {
  const { user } = useStore();
  const inventory = user?.inventory || [];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-orange-400">我的库存</h2>
        {inventory.length > 0 && (
          <button
            onClick={onGoSubmit}
            className="bg-orange-600 hover:bg-orange-700 text-white text-xs px-4 py-1.5 rounded-full font-bold"
          >
            📦 申请发货
          </button>
        )}
      </div>

      {inventory.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-20 text-gray-500">
          <div className="text-5xl mb-4 opacity-30">📦</div>
          <div className="text-sm">您的库存为空，快去抽卡吧！</div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {inventory.map((item) => (
            <div key={item.id} className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-2">
              <div className="w-full h-24 bg-[#0d0d0d] rounded mb-2 flex items-center justify-center text-3xl overflow-hidden">
                {item.card.imageUrl ? (
                  <img src={item.card.imageUrl} className="w-full h-full object-cover" />
                ) : '🃏'}
              </div>
              <div className="text-xs text-center font-bold text-gray-200 truncate mb-0.5">{item.card.name}</div>
              <div className="text-[10px] text-center text-yellow-500 font-bold mb-1">x{item.quantity}</div>
              <div className={`text-[10px] text-center font-bold ${item.card.rarity === 'SSR' ? 'text-yellow-400' : item.card.rarity === 'SR' ? 'text-purple-400' : 'text-blue-400'}`}>
                {item.card.rarity}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
