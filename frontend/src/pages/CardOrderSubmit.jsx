import { useState } from 'react';
import { useStore } from '../store';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function CardOrderSubmit({ onBack }) {
  const { user, setUser } = useStore();
  const [selected, setSelected] = useState([]); // [{cardId, cardName, quantity, maxQty}]
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [receiverAddress, setReceiverAddress] = useState('');
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const inventory = user?.inventory || [];

  const toggleCard = (item) => {
    const idx = selected.findIndex(s => s.cardId === item.card.id);
    if (idx >= 0) {
      const next = [...selected];
      next.splice(idx, 1);
      setSelected(next);
    } else {
      setSelected([...selected, {
        cardId: item.card.id,
        cardName: item.card.name,
        quantity: 1,
        maxQty: item.quantity,
      }]);
    }
  };

  const setQty = (cardId, qty) => {
    setSelected(prev => prev.map(s =>
      s.cardId === cardId ? { ...s, quantity: Math.min(Math.max(1, qty), s.maxQty) } : s
    ));
  };

  const handleSubmit = async () => {
    if (selected.length === 0) return alert('请选择要发货的卡牌');
    if (!receiverName.trim()) return alert('请填写收货人姓名');
    if (!receiverPhone.trim()) return alert('请填写联系电话');
    if (!receiverAddress.trim()) return alert('请填写收货地址');

    if (!confirm(`确认提交 ${selected.length} 种卡牌的发货申请？`)) return;

    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/api/card-orders`, {
        userId: user.id,
        items: selected.map(s => ({ cardId: s.cardId, cardName: s.cardName, quantity: s.quantity })),
        receiverName: receiverName.trim(),
        receiverPhone: receiverPhone.trim(),
        receiverAddress: receiverAddress.trim(),
        remark: remark.trim(),
      });

      // 刷新用户数据（库存可能有变化）
      const updated = await axios.post(`${API_URL}/api/login`, { username: user.username, password: user.password || '123' });
      setUser(updated.data);

      alert('提交成功！管理员会尽快处理您的申请');
      setSelected([]);
      setReceiverName(''); setReceiverPhone(''); setReceiverAddress(''); setRemark('');
      onBack();
    } catch (e) {
      alert('提交失败: ' + (e.response?.data?.error || e.message));
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return <div className="text-center text-gray-500 py-20 text-sm">请先登录</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="text-gray-400 text-sm hover:text-white">← 返回</button>
        <div className="text-lg font-bold text-orange-400">申请卡片发货</div>
      </div>

      {/* 选卡 */}
      <div>
        <div className="text-sm font-bold mb-2">选择要发货的卡牌</div>
        {inventory.length === 0 ? (
          <div className="text-center text-gray-500 py-8 text-sm">您的库存为空</div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {inventory.map((item) => {
              const isSelected = selected.some(s => s.cardId === item.card.id);
              return (
                <div
                  key={item.id}
                  onClick={() => toggleCard(item)}
                  className={`relative bg-[#161616] border rounded-xl p-2 cursor-pointer transition ${isSelected ? 'border-orange-500 ring-2 ring-orange-500/30' : 'border-[#2a2a2a]'}`}
                >
                  <div className="w-full h-20 bg-[#0d0d0d] rounded mb-1 flex items-center justify-center text-2xl">
                    {item.card.imageUrl ? <img src={item.card.imageUrl} className="w-full h-full object-cover rounded" /> : '🃏'}
                  </div>
                  <div className="text-xs text-center truncate">{item.card.name}</div>
                  <div className="text-[10px] text-center text-yellow-500">x{item.quantity}</div>
                  {isSelected && (
                    <div className="absolute top-1 right-1 w-5 h-5 bg-orange-600 rounded-full flex items-center justify-center text-white text-xs font-bold">✓</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 已选列表 + 数量调整 */}
      {selected.length > 0 && (
        <div>
          <div className="text-sm font-bold mb-2">已选卡牌</div>
          <div className="space-y-2">
            {selected.map(s => (
              <div key={s.cardId} className="flex items-center gap-3 bg-[#161616] border border-[#2a2a2a] rounded-lg p-2">
                <div className="flex-1 text-sm">{s.cardName}</div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setQty(s.cardId, s.quantity - 1)} className="w-6 h-6 bg-[#2a2a2a] rounded text-xs">-</button>
                  <span className="w-8 text-center text-sm">{s.quantity}</span>
                  <button onClick={() => setQty(s.cardId, s.quantity + 1)} className="w-6 h-6 bg-[#2a2a2a] rounded text-xs">+</button>
                  <span className="text-[10px] text-gray-500 ml-1">/ {s.maxQty}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 收货信息 */}
      <div>
        <div className="text-sm font-bold mb-2">收货信息</div>
        <div className="space-y-2">
          <input
            value={receiverName}
            onChange={(e) => setReceiverName(e.target.value)}
            placeholder="收货人姓名"
            className="w-full bg-[#161616] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-orange-500"
          />
          <input
            value={receiverPhone}
            onChange={(e) => setReceiverPhone(e.target.value)}
            placeholder="联系电话"
            className="w-full bg-[#161616] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-orange-500"
          />
          <textarea
            value={receiverAddress}
            onChange={(e) => setReceiverAddress(e.target.value)}
            rows={3}
            placeholder="详细收货地址（省/市/区/详细地址）"
            className="w-full bg-[#161616] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-orange-500"
          />
          <input
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="备注（可选）"
            className="w-full bg-[#161616] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-orange-500"
          />
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting || selected.length === 0}
        className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold py-3 rounded-xl shadow-lg disabled:opacity-50"
      >
        {submitting ? '提交中...' : `提交发货申请（${selected.length} 种卡牌）`}
      </button>

      <div className="text-[10px] text-gray-500 text-center leading-relaxed">
        提交后管理员会审核您的申请。审核通过后安排发货，发货后可在「我的卡片订单」查看物流单号。
      </div>
    </div>
  );
}
