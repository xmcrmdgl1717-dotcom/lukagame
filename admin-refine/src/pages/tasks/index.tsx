import React, { useState } from 'react';
import { useTable, useCreate, useUpdate, useDelete } from '@refinedev/core';
import SearchBar from '../../components/SearchBar';
import { useSearch } from '../../hooks/useSearch';
import { useSensitiveConfirm } from '../../components/SensitiveConfirm';

interface T { id: string; title: string; description: string; action: string; targetCount: number; rewardCoins: number; sortOrder: number; isActive: boolean; createdAt: string; }

const lbl = (a: string) => a === 'DRAW' ? '抽卡' : a === 'SPEND' ? '消费' : a === 'RECHARGE' ? '充值' : a;

const SEARCH_FIELDS = [
  { key: 'title', label: '标题', type: 'text' as const },
  { key: 'action', label: '类型', type: 'select' as const, options: [{ value: 'DRAW', label: '抽卡' }, { value: 'SPEND', label: '消费' }, { value: 'RECHARGE', label: '充值' }] },
  { key: 'isActive', label: '状态', type: 'select' as const, options: [{ value: 'true', label: '启用' }, { value: 'false', label: '停用' }] },
  { key: 'createdAt', label: '创建时间', type: 'date-range' as const },
];

export default function TaskList() {
  const { tableQueryResult } = useTable<T>({ resource: 'tasks', pagination: { pageSize: 100 } });
  const { mutate: create_ } = useCreate();
  const { mutate: update_ } = useUpdate();
  const { mutate: delete_ } = useDelete();
  const { confirm } = useSensitiveConfirm();

  const all = tableQueryResult.data?.data || [];
  const { filters, setFilters, filtered, reset } = useSearch(all, SEARCH_FIELDS);

  const [n, setN] = useState({ title: '', description: '', action: 'DRAW', targetCount: 1, rewardCoins: 100, sortOrder: 0 });
  const [creating, setCreating] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [ed, setEd] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const createFn = () => {
    if (!n.title) return alert('请输入标题');
    setCreating(true);
    create_({ resource: 'tasks', values: n }, { onSuccess: () => { setN({ title: '', description: '', action: 'DRAW', targetCount: 1, rewardCoins: 100, sortOrder: 0 }); setCreating(false); tableQueryResult.refetch(); }, onError: () => setCreating(false) });
  };

  const save = () => {
    setSaving(true);
    update_({ resource: 'tasks', id: ed.id, values: { title: ed.title, description: ed.description, action: ed.action, targetCount: ed.targetCount, rewardCoins: ed.rewardCoins, sortOrder: ed.sortOrder } }, {
      onSuccess: () => { setShowEdit(false); setSaving(false); tableQueryResult.refetch(); }, onError: () => setSaving(false),
    });
  };

  const toggle = (t: T) => update_({ resource: 'tasks', id: t.id, values: { isActive: !t.isActive } }, { onSuccess: () => tableQueryResult.refetch() });

  const del = async (t: T) => {
    const ok = await confirm(
      `即将删除任务「${t.title}」。\n\n任务类型：${lbl(t.action)} · 目标：${t.targetCount} · 奖励：${t.rewardCoins} 金币\n\n删除后所有用户在该任务的进度记录将一并消失。`
    );
    if (!ok) return;
    delete_({ resource: 'tasks', id: t.id }, { onSuccess: () => tableQueryResult.refetch() });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6"><h1 className="text-2xl font-bold">任务管理</h1></div>

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 mb-4">
        <div className="text-sm font-bold mb-3">新增任务</div>
        <div className="flex flex-wrap gap-2 items-center">
          <input value={n.title} onChange={(e) => setN({ ...n, title: e.target.value })} placeholder="标题" className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm w-40 text-white" />
          <input value={n.description} onChange={(e) => setN({ ...n, description: e.target.value })} placeholder="描述" className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm flex-1 min-w-[180px] text-white" />
          <select value={n.action} onChange={(e) => setN({ ...n, action: e.target.value })} className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm text-white">
            <option value="DRAW">抽卡</option><option value="SPEND">消费</option><option value="RECHARGE">充值</option>
          </select>
          <input type="number" value={n.targetCount} onChange={(e) => setN({ ...n, targetCount: parseInt(e.target.value) || 1 })} placeholder="目标" className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm w-20 text-white" />
          <input type="number" value={n.rewardCoins} onChange={(e) => setN({ ...n, rewardCoins: parseInt(e.target.value) || 0 })} placeholder="奖励" className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm w-24 text-white" />
          <button onClick={createFn} disabled={creating} className="bg-green-600 text-white text-sm px-4 py-1.5 rounded font-bold disabled:opacity-50">{creating ? '添加中...' : '+ 添加'}</button>
        </div>
      </div>

      <SearchBar fields={SEARCH_FIELDS} filters={filters} setFilters={setFilters} onReset={reset} total={all.length} filtered={filtered.length} />

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#1f1f1f] text-gray-400 text-xs uppercase">
            <tr><th className="p-3">标题</th><th className="p-3">类型</th><th className="p-3">目标</th><th className="p-3">奖励</th><th className="p-3">状态</th><th className="p-3 text-center">操作</th></tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                <td className="p-3 font-bold">{t.title}</td>
                <td className="p-3 text-gray-400">{lbl(t.action)}</td>
                <td className="p-3 text-gray-400">{t.targetCount}</td>
                <td className="p-3 text-yellow-500 font-bold">+{t.rewardCoins}</td>
                <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded ${t.isActive ? 'bg-green-900/60 text-green-200' : 'bg-red-900/60 text-red-200'}`}>{t.isActive ? '启用' : '停用'}</span></td>
                <td className="p-3 text-center">
                  <button onClick={() => { setEd({ ...t }); setShowEdit(true); }} className="bg-blue-600 text-white text-xs px-3 py-1 rounded mr-1">编辑</button>
                  <button onClick={() => toggle(t)} className="bg-orange-600 text-white text-xs px-3 py-1 rounded mr-1">{t.isActive ? '停用' : '启用'}</button>
                  <button onClick={() => del(t)} className="bg-red-600 text-white text-xs px-3 py-1 rounded">删除</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="text-center text-gray-500 py-10">无匹配结果</td></tr>}
          </tbody>
        </table>
      </div>

      {showEdit && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">编辑任务</h3>
            <div className="space-y-3 text-sm">
              <div><label className="block text-gray-400 mb-1 text-xs">标题</label><input value={ed.title || ''} onChange={(e) => setEd({ ...ed, title: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" /></div>
              <div><label className="block text-gray-400 mb-1 text-xs">描述</label><input value={ed.description || ''} onChange={(e) => setEd({ ...ed, description: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" /></div>
              <div><label className="block text-gray-400 mb-1 text-xs">类型</label>
                <select value={ed.action} onChange={(e) => setEd({ ...ed, action: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white">
                  <option value="DRAW">抽卡</option><option value="SPEND">消费</option><option value="RECHARGE">充值</option>
                </select></div>
              <div><label className="block text-gray-400 mb-1 text-xs">目标</label><input type="number" value={ed.targetCount ?? 1} onChange={(e) => setEd({ ...ed, targetCount: parseInt(e.target.value) || 1 })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" /></div>
              <div><label className="block text-gray-400 mb-1 text-xs">奖励</label><input type="number" value={ed.rewardCoins ?? 0} onChange={(e) => setEd({ ...ed, rewardCoins: parseInt(e.target.value) || 0 })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" /></div>
              <div><label className="block text-gray-400 mb-1 text-xs">排序</label><input type="number" value={ed.sortOrder ?? 0} onChange={(e) => setEd({ ...ed, sortOrder: parseInt(e.target.value) || 0 })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" /></div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setShowEdit(false)} className="px-4 py-2 bg-[#2a2a2a] rounded text-sm">取消</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 bg-blue-600 rounded text-sm font-bold disabled:opacity-50">{saving ? '保存中...' : '保存'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
