import React, { useState } from 'react';
import { useTable, useUpdate, useDelete } from '@refinedev/core';
import axios from 'axios';
import { useSensitiveConfirm } from '../../components/SensitiveConfirm';
import SearchBar from '../../components/SearchBar';
import { useSearch } from '../../hooks/useSearch';

interface UserItem {
  id: string;
  username: string;
  coins: number;
  vipLevel: number;
  createdAt: string;
  lastLoginAt: string;
  tags: string;
  remark: string;
  rechargeCount: number;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balance: number;
  refType: string;
  remark: string;
  createdAt: string;
}

interface InventoryItem {
  id: string;
  quantity: number;
  card: {
    id: string;
    name: string;
    rarity: string;
    imageUrl: string;
    description: string;
    allowTransfer: boolean;
  };
}

const API_URL = import.meta.env.VITE_API_URL || 'https://luka-1i4g.onrender.com';

const hdr = () => ({
  'x-admin-username': JSON.parse(localStorage.getItem('adminInfo') || 'null')?.username || '',
  'x-admin-password': localStorage.getItem('adminPassword') || '',
});

const fmt = (d: string) => {
  if (!d) return '-';
  const t = new Date(d);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')} ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
};

const fmtFull = (d: string) => {
  if (!d) return '-';
  const t = new Date(d);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')} ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}:${String(t.getSeconds()).padStart(2, '0')}`;
};

const TX_TYPE_MAP: Record<string, { text: string; color: string }> = {
  RECHARGE:   { text: '充值',     color: 'text-green-400' },
  CONSUME:    { text: '抽卡消耗', color: 'text-red-400' },
  REWARD:     { text: '任务奖励', color: 'text-yellow-400' },
  WITHDRAWAL: { text: '提现',     color: 'text-purple-400' },
  VIP_BONUS:  { text: 'VIP奖励',  color: 'text-orange-400' },
};

const rarityColor = (r: string) =>
  r === 'SSR' ? 'text-yellow-400' : r === 'SR' ? 'text-purple-400' : 'text-blue-400';

const SEARCH_FIELDS = [
  { key: 'username', label: '用户名', type: 'text' as const },
  { key: 'coins', label: '金币', type: 'number-range' as const },
  { key: 'vipLevel', label: 'VIP 等级', type: 'number-range' as const },
  { key: 'createdAt', label: '注册时间', type: 'date-range' as const },
];

export default function UserList() {
  const { tableQueryResult } = useTable<UserItem>({ resource: 'users', pagination: { pageSize: 20 } });
  const { mutate: updateUser } = useUpdate();
  const { mutate: deleteUser } = useDelete();
  const { confirm } = useSensitiveConfirm();

  const all = tableQueryResult.data?.data || [];
  const { filters, setFilters, filtered, reset } = useSearch(all, SEARCH_FIELDS);

  const [showEdit, setShowEdit] = useState(false);
  const [ed, setEd] = useState<any>({});
  const [saving, setSaving] = useState(false);

  // 账变明细
  const [showTx, setShowTx] = useState(false);
  const [txUser, setTxUser] = useState<UserItem | null>(null);
  const [txList, setTxList] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txFilter, setTxFilter] = useState('');

  // 库存查看
  const [showInv, setShowInv] = useState(false);
  const [invUser, setInvUser] = useState<UserItem | null>(null);
  const [invList, setInvList] = useState<InventoryItem[]>([]);
  const [invLoading, setInvLoading] = useState(false);
  const [invFilter, setInvFilter] = useState('');

  const openEdit = (u: UserItem) => { setEd({ ...u, password: '' }); setShowEdit(true); };

  const handleSave = () => {
    setSaving(true);
    const payload: any = {
      username: ed.username, coins: ed.coins, tags: ed.tags || '', remark: ed.remark || '', vipLevel: ed.vipLevel,
    };
    if (ed.password) payload.password = ed.password;
    updateUser({ resource: 'users', id: ed.id, values: payload }, {
      onSuccess: () => { setShowEdit(false); setSaving(false); tableQueryResult.refetch(); },
      onError: (e: any) => { alert('保存失败: ' + (e?.message || '')); setSaving(false); },
    });
  };

  const handleDelete = async (u: UserItem) => {
    const ok = await confirm(`确定删除用户「${u.username}」？`);
    if (!ok) return;
    deleteUser({ resource: 'users', id: u.id }, { onSuccess: () => tableQueryResult.refetch() });
  };

  // 打开账变明细
  const openTransactions = async (u: UserItem) => {
    setTxUser(u);
    setShowTx(true);
    setTxFilter('');
    setTxLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/admin/transactions?userId=${u.id}`, { headers: hdr() });
      setTxList(res.data);
    } catch (e) { setTxList([]); }
    finally { setTxLoading(false); }
  };

  // 打开库存
  const openInventory = async (u: UserItem) => {
    setInvUser(u);
    setShowInv(true);
    setInvFilter('');
    setInvLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/admin/users/${u.id}/inventory`, { headers: hdr() });
      setInvList(res.data);
    } catch (e) { setInvList([]); }
    finally { setInvLoading(false); }
  };

  const filteredTx = txFilter ? txList.filter(t => t.type === txFilter) : txList;
  const filteredInv = invFilter
    ? invList.filter(i => i.card.rarity === invFilter)
    : invList;

  const totalInvQty = invList.reduce((s, i) => s + i.quantity, 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">用户列表</h1>
      </div>

      <SearchBar fields={SEARCH_FIELDS} filters={filters} setFilters={setFilters} onReset={reset} total={all.length} filtered={filtered.length} />

      {tableQueryResult.isLoading ? (
        <div className="text-center text-gray-500 py-20">加载中...</div>
      ) : (
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[#1f1f1f] text-gray-400 text-xs uppercase">
                <tr>
                  <th className="p-3">用户名</th>
                  <th className="p-3">VIP</th>
                  <th className="p-3">注册时间</th>
                  <th className="p-3">最近登录</th>
                  <th className="p-3">余额</th>
                  <th className="p-3">充值次数</th>
                  <th className="p-3">标签</th>
                  <th className="p-3 text-center">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                    <td className="p-3 font-bold">{u.username}</td>
                    <td className="p-3"><span className="text-xs bg-orange-900/60 text-orange-200 px-2 py-0.5 rounded">VIP{u.vipLevel}</span></td>
                    <td className="p-3 text-gray-400 text-xs">{fmt(u.createdAt)}</td>
                    <td className="p-3 text-gray-400 text-xs">{fmt(u.lastLoginAt)}</td>
                    <td className="p-3 text-yellow-500 font-bold">{u.coins.toLocaleString()}</td>
                    <td className="p-3 text-blue-400 text-center">{u.rechargeCount}</td>
                    <td className="p-3">
                      {u.tags ? <span className="bg-blue-900/60 text-blue-200 text-xs px-2 py-0.5 rounded">{u.tags}</span> : <span className="text-gray-600 text-xs">-</span>}
                    </td>
                    <td className="p-3 text-center">
                      <button onClick={() => openInventory(u)} className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs px-3 py-1 rounded mr-1">库存</button>
                      <button onClick={() => openTransactions(u)} className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-1 rounded mr-1">账变</button>
                      <button onClick={() => openEdit(u)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded mr-1">编辑</button>
                      <button onClick={() => handleDelete(u)} className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded">删除</button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={8} className="text-center text-gray-500 py-10">无匹配结果</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 编辑用户弹窗 */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">编辑用户: {ed.username}</h3>
            <div className="space-y-3 text-sm">
              <div><label className="block text-gray-400 mb-1 text-xs">用户名</label><input value={ed.username || ''} onChange={(e) => setEd({ ...ed, username: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" /></div>
              <div><label className="block text-gray-400 mb-1 text-xs">重置密码（留空不改）</label><input type="password" value={ed.password || ''} onChange={(e) => setEd({ ...ed, password: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" /></div>
              <div><label className="block text-gray-400 mb-1 text-xs">VIP 等级</label><input type="number" value={ed.vipLevel ?? 0} onChange={(e) => setEd({ ...ed, vipLevel: parseInt(e.target.value) || 0 })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" /></div>
              <div><label className="block text-gray-400 mb-1 text-xs">金币余额</label><input type="number" value={ed.coins ?? 0} onChange={(e) => setEd({ ...ed, coins: parseInt(e.target.value) || 0 })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" /></div>
              <div><label className="block text-gray-400 mb-1 text-xs">标签</label><input value={ed.tags || ''} onChange={(e) => setEd({ ...ed, tags: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" /></div>
              <div><label className="block text-gray-400 mb-1 text-xs">备注</label><textarea rows={2} value={ed.remark || ''} onChange={(e) => setEd({ ...ed, remark: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white"></textarea></div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setShowEdit(false)} className="px-4 py-2 bg-[#2a2a2a] rounded text-sm">取消</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 rounded text-sm font-bold disabled:opacity-50">{saving ? '保存中...' : '保存'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 账变明细弹窗 */}
      {showTx && txUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-bold">账变明细 - {txUser.username}</h3>
                <div className="text-xs text-gray-500 mt-1">当前余额：<span className="text-yellow-400 font-bold">{txUser.coins.toLocaleString()} 🪙</span></div>
              </div>
              <button onClick={() => setShowTx(false)} className="text-gray-400 hover:text-white text-2xl">×</button>
            </div>

            <div className="flex gap-2 mb-3">
              <button onClick={() => setTxFilter('')} className={`text-xs px-3 py-1 rounded-full ${txFilter === '' ? 'bg-red-600 text-white' : 'bg-[#2a2a2a] text-gray-400'}`}>全部</button>
              {['RECHARGE', 'CONSUME', 'REWARD', 'WITHDRAWAL'].map((t) => (
                <button key={t} onClick={() => setTxFilter(t)} className={`text-xs px-3 py-1 rounded-full ${txFilter === t ? 'bg-red-600 text-white' : 'bg-[#2a2a2a] text-gray-400'}`}>{TX_TYPE_MAP[t]?.text || t}</button>
              ))}
            </div>

            {txLoading ? (
              <div className="text-center text-gray-500 py-10">加载中...</div>
            ) : filteredTx.length === 0 ? (
              <div className="text-center text-gray-500 py-10">暂无账变记录</div>
            ) : (
              <div className="bg-[#0d0d0d] rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#1a1a1a] text-gray-400 uppercase">
                    <tr><th className="p-2">时间</th><th className="p-2">类型</th><th className="p-2">金额</th><th className="p-2">余额</th><th className="p-2">备注</th></tr>
                  </thead>
                  <tbody>
                    {filteredTx.map((t) => {
                      const info = TX_TYPE_MAP[t.type] || { text: t.type, color: 'text-gray-300' };
                      return (
                        <tr key={t.id} className="border-b border-[#1f1f1f] last:border-0">
                          <td className="p-2 text-gray-400 whitespace-nowrap">{fmtFull(t.createdAt)}</td>
                          <td className={`p-2 font-bold ${info.color}`}>{info.text}</td>
                          <td className={`p-2 font-bold ${t.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>{t.amount >= 0 ? '+' : ''}{t.amount.toLocaleString()}</td>
                          <td className="p-2 text-yellow-400">{t.balance.toLocaleString()}</td>
                          <td className="p-2 text-gray-400">{t.remark || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end mt-4">
              <button onClick={() => setShowTx(false)} className="px-4 py-2 bg-[#2a2a2a] rounded text-sm">关闭</button>
            </div>
          </div>
        </div>
      )}

      {/* 库存弹窗 */}
      {showInv && invUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-bold">🎴 库存 - {invUser.username}</h3>
                <div className="text-xs text-gray-500 mt-1">
                  共 <span className="text-cyan-400 font-bold">{invList.length}</span> 种卡牌 ·
                  合计 <span className="text-cyan-400 font-bold">{totalInvQty}</span> 张 ·
                  可转让 <span className="text-purple-400 font-bold">{invList.filter(i => i.card.allowTransfer).length}</span> 种
                </div>
              </div>
              <button onClick={() => setShowInv(false)} className="text-gray-400 hover:text-white text-2xl">×</button>
            </div>

            <div className="flex gap-2 mb-3">
              <button onClick={() => setInvFilter('')} className={`text-xs px-3 py-1 rounded-full ${invFilter === '' ? 'bg-red-600 text-white' : 'bg-[#2a2a2a] text-gray-400'}`}>全部</button>
              {['SSR', 'SR', 'R'].map((r) => (
                <button key={r} onClick={() => setInvFilter(r)} className={`text-xs px-3 py-1 rounded-full ${invFilter === r ? 'bg-red-600 text-white' : 'bg-[#2a2a2a] text-gray-400'}`}>{r}</button>
              ))}
            </div>

            {invLoading ? (
              <div className="text-center text-gray-500 py-10">加载中...</div>
            ) : filteredInv.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-500">
                <div className="text-4xl mb-3 opacity-30">📦</div>
                <div className="text-sm">该用户暂无库存</div>
              </div>
            ) : (
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {filteredInv.map((item) => (
                  <div key={item.id} className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg p-2 relative">
                    {item.card.allowTransfer && (
                      <div className="absolute top-1 right-1 bg-purple-600 text-white text-[8px] font-bold px-1 py-0.5 rounded z-10">
                        可赠
                      </div>
                    )}
                    <div className="w-full h-24 bg-[#0a0a0a] rounded mb-2 flex items-center justify-center text-2xl overflow-hidden">
                      {item.card.imageUrl ? (
                        <img src={item.card.imageUrl} className="w-full h-full object-cover" />
                      ) : '🃏'}
                    </div>
                    <div className="text-[11px] text-center font-bold text-gray-200 truncate">
                      {item.card.name}
                    </div>
                    <div className={`text-[10px] text-center font-bold ${rarityColor(item.card.rarity)}`}>
                      {item.card.rarity}
                    </div>
                    <div className="text-[10px] text-center text-yellow-500 font-bold mt-0.5">
                      x{item.quantity}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end mt-4">
              <button onClick={() => setShowInv(false)} className="px-4 py-2 bg-[#2a2a2a] rounded text-sm">关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
