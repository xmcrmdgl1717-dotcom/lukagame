import { useState, useEffect } from 'react';
import { useStore } from '../store';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const fmt = (d) => {
  if (!d) return '-';
  const t = new Date(d);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')} ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
};

export default function Transfers({ onBack }) {
  const { user } = useStore();
  const [tab, setTab] = useState('received');
  const [data, setData] = useState({ sent: [], received: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    axios.get(`${API_URL}/api/user/transfers/${user.id}`)
      .then(res => setData(res.data || { sent: [], received: [] }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return <div className="text-center text-gray-500 py-20 text-sm">请先登录</div>;

  const list = tab === 'received' ? data.received : data.sent;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <button onClick={onBack} className="text-gray-400 text-sm hover:text-white">← 返回</button>
        <div className="text-lg font-bold text-purple-400">🎁 我的赠与</div>
      </div>

      {/* Tab */}
      <div className="flex justify-around bg-[#1c0e0e] rounded-lg p-1">
        <button
          onClick={() => setTab('received')}
          className={`flex-1 py-2 text-xs font-bold rounded transition ${
            tab === 'received' ? 'bg-purple-600 text-white' : 'text-gray-400'
          }`}
        >
          收到的 ({data.received.length})
        </button>
        <button
          onClick={() => setTab('sent')}
          className={`flex-1 py-2 text-xs font-bold rounded transition ${
            tab === 'sent' ? 'bg-pink-600 text-white' : 'text-gray-400'
          }`}
        >
          送出的 ({data.sent.length})
        </button>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-20 text-sm">加载中...</div>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <div className="text-5xl mb-4 opacity-30">🎁</div>
          <div className="text-sm">
            {tab === 'received' ? '还没有收到过赠礼' : '还没有赠送过卡牌'}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((log) => {
            const isReceived = tab === 'received';
            const otherUser = isReceived ? log.fromUser?.username : log.toUser?.username;
            return (
              <div key={log.id} className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-3">
                <div className="flex gap-3">
                  <div className="w-14 h-18 bg-[#0d0d0d] rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                    {log.card?.imageUrl ? (
                      <img src={log.card.imageUrl} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl">🃏</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-white truncate">
                        {log.card?.name || '未知卡牌'}
                      </span>
                      <span className={`text-[10px] font-bold ${
                        log.card?.rarity === 'SSR' ? 'text-yellow-400'
                        : log.card?.rarity === 'SR' ? 'text-purple-400'
                        : 'text-blue-400'
                      }`}>
                        {log.card?.rarity}
                      </span>
                      <span className="text-[10px] text-gray-500">x{log.quantity}</span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {isReceived ? (
                        <>
                          <span className="text-green-400">← 来自</span>{' '}
                          <span className="text-white font-bold">{otherUser}</span>
                        </>
                      ) : (
                        <>
                          <span className="text-pink-400">→ 送给</span>{' '}
                          <span className="text-white font-bold">{otherUser}</span>
                        </>
                      )}
                    </div>
                    {log.remark && (
                      <div className="text-[10px] text-gray-500 mt-1 italic">
                        “{log.remark}”
                      </div>
                    )}
                    <div className="text-[10px] text-gray-600 mt-1">{fmt(log.createdAt)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-[#1c0e0e] border border-[#3d1a1a] rounded-xl p-3 text-[10px] text-gray-500 leading-relaxed">
        💡 平台内用户间的赠与是**无偿的**。平台不参与、不收费、不提供变现渠道。若发现有用户通过赠与进行私下交易，平台有权冻结相关账号。
      </div>
    </div>
  );
}
