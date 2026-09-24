import { useState } from 'react';
import { useStore } from '../store';
import { useI18n } from '../i18n/index.jsx';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function Inventory({ onGoSubmit, onGoTransfers }) {
  const { user, setUser } = useStore();
  const { t } = useI18n();
  const inventory = user?.inventory || [];

  const [showTransfer, setShowTransfer] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [toUsername, setToUsername] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const openTransfer = (item) => {
    setSelectedItem(item);
    setToUsername('');
    setQuantity(1);
    setRemark('');
    setShowTransfer(true);
  };

  const closeTransfer = () => {
    setShowTransfer(false);
    setSelectedItem(null);
  };

  const handleSubmitTransfer = async () => {
    if (!user) return alert('请先登录');
    if (!toUsername.trim()) return alert('请输入接收人用户名');
    if (!selectedItem) return;
    const qty = parseInt(quantity) || 1;
    if (qty < 1) return alert('数量至少为 1');
    if (qty > selectedItem.quantity) return alert('数量不能超过持有数量');
    if (!confirm(`确认将 ${qty} 张「${selectedItem.card.name}」赠送给「${toUsername}」？`)) return;

    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/api/inventory/transfer`, {
        fromUserId: user.id,
        toUsername: toUsername.trim(),
        cardId: selectedItem.card.id,
        quantity: qty,
        remark: remark.trim(),
      });
      alert('🎁 赠送成功！');
      // 刷新用户信息（库存会同步更新）
      const updated = await axios.post(`${API_URL}/api/login`, { username: user.username, password: user.password || '123' });
      setUser(updated.data);
      closeTransfer();
    } catch (e) {
      alert('赠送失败: ' + (e.response?.data?.error || e.message));
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return <div className="text-center text-gray-500 py-20 text-sm">请先登录</div>;
  }

  const transferableCount = inventory.filter(i => i.card.allowTransfer).length;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-orange-400">{t('nav.inventory', '我的库存')}</h2>
        <div className="flex gap-2">
          <button
            onClick={onGoTransfers}
            className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-4 py-1.5 rounded-full font-bold"
          >
            🎁 我的赠与
          </button>
          {inventory.length > 0 && (
            <button
              onClick={onGoSubmit}
              className="bg-orange-600 hover:bg-orange-700 text-white text-xs px-4 py-1.5 rounded-full font-bold"
            >
              📦 {t('cardorder.submit', '申请发货')}
            </button>
          )}
        </div>
      </div>

      {transferableCount > 0 && (
        <div className="bg-[#1c0e0e] border border-[#3d1a1a] rounded-xl p-3 mb-3 text-xs text-gray-400">
          💡 有 <span className="text-orange-400 font-bold">{transferableCount}</span> 种卡牌支持赠送给其他用户，点击卡片上的「🎁 赠送」按钮操作。
        </div>
      )}

      {inventory.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-20 text-gray-500">
          <div className="text-5xl mb-4 opacity-30">📦</div>
          <div className="text-sm">{t('inventory.empty', '您的库存为空，快去抽卡吧！')}</div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {inventory.map((item) => (
            <div key={item.id} className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-2 relative">
              {item.card.allowTransfer && (
                <div className="absolute top-1 right-1 bg-purple-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow z-10">
                  可赠
                </div>
              )}
              <div className="w-full h-24 bg-[#0d0d0d] rounded mb-2 flex items-center justify-center text-3xl overflow-hidden">
                {item.card.imageUrl ? (
                  <img src={item.card.imageUrl} className="w-full h-full object-cover" />
                ) : (
                  '🃏'
                )}
              </div>
              <div className="text-xs text-center font-bold text-gray-200 truncate mb-0.5">
                {item.card.name}
              </div>
              <div className="text-[10px] text-center text-yellow-500 font-bold mb-1">
                x{item.quantity}
              </div>
              <div className={`text-[10px] text-center font-bold mb-2 ${
                item.card.rarity === 'SSR' ? 'text-yellow-400'
                : item.card.rarity === 'SR' ? 'text-purple-400'
                : 'text-blue-400'
              }`}>
                {item.card.rarity}
              </div>
              {item.card.allowTransfer && (
                <button
                  onClick={() => openTransfer(item)}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[10px] py-1 rounded font-bold hover:opacity-90 transition"
                >
                  🎁 赠送
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 赠送弹窗 */}
      {showTransfer && selectedItem && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200] p-4 backdrop-blur-sm">
          <div className="bg-[#1a0f0c] border border-[#3d1a1a] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-4 border-b border-[#2a1414]">
              <div className="text-sm font-bold text-purple-400">🎁 赠送卡牌</div>
              <button onClick={closeTransfer} className="text-gray-400 text-2xl leading-none">&times;</button>
            </div>

            <div className="p-4 space-y-4">
              {/* 卡牌预览 */}
              <div className="flex items-center gap-3 bg-[#0d0d0d] rounded-xl p-3">
                <div className="w-14 h-18 bg-[#1a0f0c] rounded flex items-center justify-center overflow-hidden">
                  {selectedItem.card.imageUrl ? (
                    <img src={selectedItem.card.imageUrl} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">🃏</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-white">{selectedItem.card.name}</div>
                  <div className={`text-xs font-bold ${
                    selectedItem.card.rarity === 'SSR' ? 'text-yellow-400'
                    : selectedItem.card.rarity === 'SR' ? 'text-purple-400'
                    : 'text-blue-400'
                  }`}>
                    {selectedItem.card.rarity}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1">
                    持有 {selectedItem.quantity} 张
                  </div>
                </div>
              </div>

              {/* 接收人 */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">接收人用户名</label>
                <input
                  value={toUsername}
                  onChange={(e) => setToUsername(e.target.value)}
                  placeholder="输入对方的用户名"
                  className="w-full bg-[#0d0d0d] border border-[#2a1414] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
                />
              </div>

              {/* 数量 */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">赠送数量</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-9 h-9 bg-[#2a1414] rounded-lg text-white text-lg leading-none"
                  >-</button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="flex-1 bg-[#0d0d0d] border border-[#2a1414] rounded-lg px-3 py-2 text-sm text-white text-center outline-none focus:border-purple-500"
                  />
                  <button
                    onClick={() => setQuantity(Math.min(selectedItem.quantity, quantity + 1))}
                    className="w-9 h-9 bg-[#2a1414] rounded-lg text-white text-lg leading-none"
                  >+</button>
                </div>
              </div>

              {/* 留言 */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">留言（选填）</label>
                <input
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="比如：生日快乐！"
                  maxLength={50}
                  className="w-full bg-[#0d0d0d] border border-[#2a1414] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
                />
              </div>

              <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-2.5 text-[10px] text-yellow-200 leading-relaxed">
                ⚠️ 赠送后无法撤销，请仔细核对接收人用户名。赠送属于用户间的无偿赠与，平台不参与且不收取任何费用。
              </div>
            </div>

            <div className="flex gap-2 p-4 border-t border-[#2a1414]">
              <button
                onClick={closeTransfer}
                className="flex-1 bg-[#2a1414] text-white py-2.5 rounded-lg text-sm font-bold"
              >
                取消
              </button>
              <button
                onClick={handleSubmitTransfer}
                disabled={submitting}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2.5 rounded-lg text-sm font-bold disabled:opacity-50"
              >
                {submitting ? '赠送中...' : '确认赠送'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
