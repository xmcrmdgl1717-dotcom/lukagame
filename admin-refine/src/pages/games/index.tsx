import React, { useState } from 'react';
import { useTable, useCreate, useUpdate, useDelete } from '@refinedev/core';
import SearchBar from '../../components/SearchBar';
import { useSearch } from '../../hooks/useSearch';

interface GameItem {
  id: string;
  name: string;
  displayName: string;
  description: string;
  icon: string;
  coverUrl: string;
  minVipLevel: number;
  minCoins: number;
  sortOrder: number;
  isActive: boolean;
  enableLeaderboard: boolean;
  leaderboardMetric: string;
  leaderboardType: string;
  boxCount?: number;
}

const SEARCH_FIELDS = [
  { key: 'displayName', label: '游戏名', type: 'text' as const },
  { key: 'isActive', label: '状态', type: 'select' as const, options: [
    { value: 'true', label: '启用' }, { value: 'false', label: '停用' },
  ]},
];

const readAsBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

export default function GameList() {
  const { tableQueryResult } = useTable<GameItem>({ resource: 'games', pagination: { pageSize: 100 } });
  const { mutate: create_ } = useCreate();
  const { mutate: update_ } = useUpdate();
  const { mutate: delete_ } = useDelete();

  const all = tableQueryResult.data?.data || [];
  const { filters, setFilters, filtered, reset } = useSearch(all, SEARCH_FIELDS);

  const [showEdit, setShowEdit] = useState(false);
  const [ed, setEd] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [n, setN] = useState({
    name: '', displayName: '', description: '', icon: '🎮', coverUrl: '',
    minVipLevel: 0, minCoins: 0, sortOrder: 0, enableLeaderboard: false,
    leaderboardMetric: 'CONSUME', leaderboardType: 'WEEKLY',
  });
  const [creating, setCreating] = useState(false);

  const onCoverCreate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const img = await readAsBase64(f);
    setN((x) => ({ ...x, coverUrl: img }));
  };
  const onCoverEdit = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const img = await readAsBase64(f);
    setEd((x: any) => ({ ...x, coverUrl: img }));
  };

  const handleCreate = () => {
    if (!n.name || !n.displayName) return alert('请填写标识和显示名');
    setCreating(true);
    create_({ resource: 'games', values: n }, {
      onSuccess: () => {
        setShowCreate(false);
        setN({ name: '', displayName: '', description: '', icon: '🎮', coverUrl: '', minVipLevel: 0, minCoins: 0, sortOrder: 0, enableLeaderboard: false, leaderboardMetric: 'CONSUME', leaderboardType: 'WEEKLY' });
        setCreating(false);
        tableQueryResult.refetch();
      },
      onError: (e: any) => { alert('添加失败: ' + (e?.message || '')); setCreating(false); },
    });
  };

  const handleSave = () => {
    setSaving(true);
    update_({
      resource: 'games', id: ed.id,
      values: {
        displayName: ed.displayName, description: ed.description, icon: ed.icon, coverUrl: ed.coverUrl,
        minVipLevel: ed.minVipLevel, minCoins: ed.minCoins, sortOrder: ed.sortOrder,
        enableLeaderboard: ed.enableLeaderboard, leaderboardMetric: ed.leaderboardMetric,
        leaderboardType: ed.leaderboardType, isActive: ed.isActive,
      },
    }, {
      onSuccess: () => { setShowEdit(false); setSaving(false); tableQueryResult.refetch(); },
      onError: (e: any) => { alert('保存失败: ' + (e?.message || '')); setSaving(false); },
    });
  };

  const handleDelete = (g: GameItem) => {
    if (!confirm(`确定要删除游戏「${g.displayName}」吗？`)) return;
    delete_({ resource: 'games', id: g.id }, {
      onSuccess: () => tableQueryResult.refetch(),
      onError: (e: any) => alert('删除失败: ' + (e?.message || '')),
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">游戏管理</h1>
        <button onClick={() => setShowCreate(true)} className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded font-bold">+ 新建游戏</button>
      </div>

      <SearchBar fields={SEARCH_FIELDS} filters={filters} setFilters={setFilters} onReset={reset} total={all.length} filtered={filtered.length} />

      {tableQueryResult.isLoading ? (
        <div className="text-center text-gray-500 py-20">加载中...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((g) => (
            <div key={g.id} className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="text-4xl">{g.icon || '🎮'}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg">{g.displayName}</span>
                    {!g.isActive && <span className="text-xs bg-red-900/60 text-red-200 px-2 py-0.5 rounded">已停用</span>}
                  </div>
                  <div className="text-xs text-gray-500 font-mono">{g.name}</div>
                  <div className="text-sm text-gray-400 mt-1">{g.description || '暂无描述'}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div className="bg-[#0d0d0d] rounded p-2">
                  <div className="text-gray-500">入场 VIP 门槛</div>
                  <div className="text-orange-400 font-bold">VIP{g.minVipLevel}</div>
                </div>
                <div className="bg-[#0d0d0d] rounded p-2">
                  <div className="text-gray-500">入场余额门槛</div>
                  <div className="text-yellow-400 font-bold">{g.minCoins.toLocaleString()} 🪙</div>
                </div>
                <div className="bg-[#0d0d0d] rounded p-2">
                  <div className="text-gray-500">盲盒数</div>
                  <div className="text-blue-400 font-bold">{g.boxCount ?? 0}</div>
                </div>
                <div className="bg-[#0d0d0d] rounded p-2">
                  <div className="text-gray-500">排行榜</div>
                  <div className={`font-bold ${g.enableLeaderboard ? 'text-green-400' : 'text-gray-500'}`}>
                    {g.enableLeaderboard ? '已开启' : '未开启'}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setEd({ ...g }); setShowEdit(true); }} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs py-1.5 rounded">编辑</button>
                <button onClick={() => handleDelete(g)} className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs py-1.5 rounded">删除</button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="col-span-2 text-center text-gray-500 py-10">无匹配结果</div>}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">新建游戏</h3>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1 text-xs">标识（英文）</label>
                  <input value={n.name} onChange={(e) => setN({ ...n, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })} placeholder="lucky_house" className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white font-mono" />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1 text-xs">图标 emoji</label>
                  <input value={n.icon} onChange={(e) => setN({ ...n, icon: e.target.value })} placeholder="🎮" className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white text-center text-xl" />
                </div>
              </div>
              <div>
                <label className="block text-gray-400 mb-1 text-xs">显示名</label>
                <input value={n.displayName} onChange={(e) => setN({ ...n, displayName: e.target.value })} placeholder="幸运之家" className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
              </div>
              <div>
                <label className="block text-gray-400 mb-1 text-xs">描述</label>
                <input value={n.description} onChange={(e) => setN({ ...n, description: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1 text-xs">最低 VIP 等级</label>
                  <input type="number" value={n.minVipLevel} onChange={(e) => setN({ ...n, minVipLevel: parseInt(e.target.value) || 0 })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1 text-xs">最低余额</label>
                  <input type="number" value={n.minCoins} onChange={(e) => setN({ ...n, minCoins: parseInt(e.target.value) || 0 })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1 text-xs">排序</label>
                  <input type="number" value={n.sortOrder} onChange={(e) => setN({ ...n, sortOrder: parseInt(e.target.value) || 0 })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input type="checkbox" checked={n.enableLeaderboard} onChange={(e) => setN({ ...n, enableLeaderboard: e.target.checked })} />
                    开启排行榜
                  </label>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-[#2a2a2a] rounded text-sm">取消</button>
              <button onClick={handleCreate} disabled={creating} className="px-4 py-2 bg-green-600 rounded text-sm font-bold disabled:opacity-50">{creating ? '添加中...' : '创建'}</button>
            </div>
          </div>
        </div>
      )}

      {showEdit && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">编辑 {ed.displayName}</h3>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1 text-xs">图标 emoji</label>
                  <input value={ed.icon || ''} onChange={(e) => setEd({ ...ed, icon: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white text-center text-xl" />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1 text-xs">排序</label>
                  <input type="number" value={ed.sortOrder ?? 0} onChange={(e) => setEd({ ...ed, sortOrder: parseInt(e.target.value) || 0 })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
                </div>
              </div>
              <div>
                <label className="block text-gray-400 mb-1 text-xs">显示名</label>
                <input value={ed.displayName || ''} onChange={(e) => setEd({ ...ed, displayName: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
              </div>
              <div>
                <label className="block text-gray-400 mb-1 text-xs">描述</label>
                <input value={ed.description || ''} onChange={(e) => setEd({ ...ed, description: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1 text-xs">最低 VIP 等级</label>
                  <input type="number" value={ed.minVipLevel ?? 0} onChange={(e) => setEd({ ...ed, minVipLevel: parseInt(e.target.value) || 0 })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1 text-xs">最低余额</label>
                  <input type="number" value={ed.minCoins ?? 0} onChange={(e) => setEd({ ...ed, minCoins: parseInt(e.target.value) || 0 })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={ed.enableLeaderboard || false} onChange={(e) => setEd({ ...ed, enableLeaderboard: e.target.checked })} />
                  开启排行榜
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={ed.isActive || false} onChange={(e) => setEd({ ...ed, isActive: e.target.checked })} />
                  启用
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setShowEdit(false)} className="px-4 py-2 bg-[#2a2a2a] rounded text-sm">取消</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 rounded text-sm font-bold disabled:opacity-50">{saving ? '保存中...' : '保存'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
