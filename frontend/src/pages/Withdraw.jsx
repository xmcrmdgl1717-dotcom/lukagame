import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { useI18n } from '../i18n/index.jsx';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const MIN_WITHDRAW = 10000;

const STATUS_MAP = {
  PENDING: { text: '待审核', cls: 'bg-yellow-900/60 text-yellow-200' },
  APPROVED: { text: '已通过', cls: 'bg-blue-900/60 text-blue-200' },
  REJECTED: { text: '已拒绝', cls: 'bg-red-900/60 text-red-200' },
  PAID: { text: '已打款', cls: 'bg-green-900/60 text-green-200' },
};

export default function Withdraw({ onBack }) {
  const { user, setUser } = useStore();
  const { t } = useI18n();
  const [tab, setTab] = useState('apply');
  const [amount, setAmount] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [holderName, setHolderName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [list, setList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);

  const loadHistory = async () => {
    if (!user) return;
    setLoadingList(true);
    try {
      const res = await axios.get(`${API_URL}/api/user/withdrawals/${user.id}`);
      setList(res.data);
    } catch (e) {}
    finally { setLoadingList(false); }
  };

  useEffect(() => { loadHistory(); }, [user]);

  const handleSubmit = async () => {
    if (!user) return alert('请先登录');
    const amt = parseInt(amount);
    if (!amt || amt <= 0) return alert('请输入有效的提现金额');
    if (amt < MIN_WITHDRAW) return alert(`最低提现金额为 ¥${(MIN_WITHDRAW/100).toFixed(2)}`);
    if (user.coins < amt) return alert('余额不足');
    if (!cardNumber.trim()) return alert('请填写银行卡号');
    if (!holderName.trim()) return alert('请填写持卡人姓名');
    if (!confirm(`确认申请提现 ¥${(amt/100).toFixed(2)}？`)) return;

    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/api/withdrawals`, {
        userId: user.id,
        amount: amt,
        cardNumber: cardNumber.trim(),
        bankName: bankName.trim(),
        holderName: holderName.trim(),
      });
      const updated = await axios.post(`${API_URL}/api/login`, { username: user.username, password: user.password || '123' });
      setUser(updated.data);
      alert('提现申请已提交，请等待审核');
      setAmount('');
      loadHistory();
      setTab('history');
    } catch (e) {
      alert('提交失败: ' + (e.response?.data?.error || e.message));
    } finally { setSubmitting(false); }
  };

  const fmt = (d) => {
    if (!d) return '-';
    const t = new Date(d);
    return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')} ${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`;
  };

  if (!user) return <div className="text-center text-gray-500 py-20 text-sm">请先登录</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <button onClick={onBack} className="text-gray-400 text-sm hover:text-white">← 返回</button>
        <div className="text-lg font-bold text-orange-400">提现中心</div>
      </div>

      {/* 余额卡片 */}
      <div className="bg-gradient-to-br from-[#2d1410] to-[#4a1c12] border border-[#6b2a1e] rounded-2xl p-5 text-center">
        <div className="text-xs text-gray-400 mb-1">当前余额</div>
        <div className="text-3xl font-black text-yellow-400">{user.coins.toLocaleString()} 🪙</div>
        <div className="text-[10px] text-gray-500 mt-1">1 金币 = 0.01 元</div>
      </div>

      {/* Tab 切换 */}
      <div className="flex justify-around bg-[#1c0e0e] rounded-lg p-1">
        <button onClick={() => setTab('apply')} className={`flex-1 py-2 text-xs font-bold rounded ${tab === 'apply' ? 'bg-orange-600 text-white' : 'text-gray-400'}`}>申请提现</button>
        <button onClick={() => setTab('history')} className={`flex-1 py-2 text-xs font-bold rounded ${tab === 'history' ? 'bg-orange-600 text-white' : 'text-gray-400'}`}>提现记录</button>
      </div>

      {tab === 'apply' && (
        <div className="space-y-3">
          <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 space-y-3">
            <div className="text-sm font-bold text-gray-300 mb-2">💰 提现金额</div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`最低 ¥${(MIN_WITHDRAW/100).toFixed(2)}`}
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-sm text-white"
            />
            <div className="text-[10px] text-gray-500">
              1 金币 = 0.01 元 · 最低提现 ¥{(MIN_WITHDRAW/100).toFixed(2)}
            </div>
          </div>

          <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 space-y-3">
            <div className="text-sm font-bold text-gray-300 mb-2">🏦 银行卡信息</div>
            <input
              value={holderName}
              onChange={(e) => setHolderName(e.target.value)}
              placeholder="持卡人姓名"
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-sm text-white"
            />
            <input
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              placeholder="银行卡号"
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-sm text-white font-mono"
            />
            <input
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="开户银行（选填）"
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-sm text-white"
            />
          </div>

          <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-xl p-3 text-xs text-yellow-200 leading-relaxed">
            ⚠️ 提现申请提交后，金额将从余额中冻结，管理员审核通过后打款。若被拒绝将自动退回余额。审核一般在 1-3 个工作日内完成。
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold py-3 rounded-xl shadow-lg disabled:opacity-50"
          >
            {submitting ? '提交中...' : '提交提现申请'}
          </button>
        </div>
      )}

      {tab === 'history' && (
        <>
          {loadingList ? (
            <div className="text-center text-gray-500 py-20 text-sm">加载中...</div>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <div className="text-5xl mb-4 opacity-30">💸</div>
              <div className="text-sm">暂无提现记录</div>
            </div>
          ) : (
            <div className="space-y-3">
              {list.map(w => {
                const st = STATUS_MAP[w.status] || { text: w.status, cls: 'bg-gray-700 text-gray-300' };
                const cardNum = w.bankCard?.cardNumber || '';
                const maskedCard = cardNum.length > 4 ? '****' + cardNum.slice(-4) : cardNum;
                return (
                  <div key={w.id} className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4">
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-lg font-bold text-red-400">-¥{(w.amount/100).toFixed(2)}</div>
                      <span className={`text-xs px-2 py-0.5 rounded ${st.cls}`}>{st.text}</span>
                    </div>
                    {w.bankCard && (
                      <div className="text-xs text-gray-400 mb-1">
                        {w.bankCard.holderName} · {maskedCard}
                      </div>
                    )}
                    <div className="text-[10px] text-gray-600">{fmt(w.createdAt)}</div>
                    {w.remark && <div className="text-[10px] text-gray-500 mt-1">备注: {w.remark}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
