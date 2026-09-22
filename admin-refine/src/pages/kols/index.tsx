import React, { useState } from 'react';
import { useTable, useCreate, useUpdate, useDelete } from '@refinedev/core';
import SearchBar from '../../components/SearchBar';
import { useSearch } from '../../hooks/useSearch';

interface Kol {
  id: string;
  channelId: string | null;
  name: string;
  platform: string;
  contact: string;
  followers: number;
  cost: number;
  promoCode: string;
  promoLink: string;
  isActive: boolean;
  remark: string;
  createdAt: string;
  channel?: { displayName: string; icon: string };
}

const SEARCH_FIELDS = [
  { key: 'name', label: '博主名', type: 'text' as const },
  { key: 'platform', label: '平台', type: 'select' as const, options: [
    { value: 'YouTube', label: 'YouTube' }, { value: 'Instagram', label: 'Instagram' }, { value: 'TikTok', label: 'TikTok' },
  ]},
  { key: 'promoCode', label: '推广码', type: 'text' as const },
];

export default function KolList() {
  const { tableQueryResult } = useTable<Kol>({ resource: 'kols', pagination: { pageSize: 100 } });
  const { tableQueryResult: channelsQ } = useTable<{ id: string; displayName: string; icon: string }>({ resource: 'ad-channels', pagination: { pageSize: 100 } });
  const { mutate: create_ } = useCreate();
  const { mutate: update_ } = useUpdate();
  const { mutate: delete_ } = useDelete();

  const all = tableQueryResult.data?.data || [];
  const channels = channelsQ.data?.data || [];
  const { filters, setFilters, filtered, reset } = useSearch(all, SEARCH_FIELDS);

  const empty = { channelId: '', name: '', platform: 'YouTube', contact: '', followers: 0, cost: 0, promoCode: '', promoLink: '', remark: '' };
  const [showCreate, setShowCreate] = useState(false);
  const [n, setN] = useState<any>(empty);
  const [creating, setCreating] = useState(false);

  const [showEdit, setShowEdit] = useState(false);
  const [ed, setEd] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const handleCreate = () => {
    if (!n.name) return alert('请填写博主名');
    setCreating(true);
    const payload = { ...n };
    if (!payload.channelId) payload.channelId = null;
    create_({ resource: 'kols', values: payload }, {
      onSuccess: () => { setShowCreate(false); setN(empty); setCreating(false); tableQueryResult.refetch(); },
      onError: (e: any) => { alert('添加失败: ' + (e?.message || '')); setCreating(false); },
    });
  };

  const handleSave = () => {
    setSaving(true);
    const payload: any = {
      channelId: ed.channelId || null, name: ed.name, platform: ed.platform, contact: ed.contact,
      followers: ed.followers, cost: ed.cost, promoCode: ed.promoCode, promoLink: ed.promoLink, isActive: ed.isActive, remark: ed.remark,
    };
    update_({ resource: 'kols', id: ed.id, values: payload }, {
      onSuccess: () => { setShowEdit(false); setSaving(false); tableQueryResult.refetch(); },
      onError: (e: any) => { alert('保存失败: ' + (e?.message || '')); setSaving(false); },
    });
  };

  const handleDelete = (k: Kol) => {
    if (!confirm(`确定删除博主「${k.name}」吗？`)) return;
    delete_({ resource: 'kols', id: k.id }, {
      onSuccess: () => tableQueryResult.refetch(),
      onError: (e: any) => alert('删除失败: ' + (e?.message || '')),
    });
  };

  const copyText = (text: string) => { navigator.clipboard.writeText(text); alert('已复制'); };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">KOL / 博主管理</h1>
        <button onClick={() => setShowCreate(true)} className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded font-bold">+ 新增博主</button>
      </div>

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 mb-4 text-sm text-gray-400">
        💡 每个博主可以生成专属推广码/链接。用户在注册时填推广码或点推广链接，系统会自动关联。
      </div>

      <SearchBar fields={SEARCH_FIELDS} filters={filters} setFilters={setFilters} onReset={reset} total={all.length} filtered={filtered.length} />

      {tableQueryResult.isLoading ? <div className="text-center text-gray-500 py-20">加载中...</div> : (
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#1f1f1f] text-gray-400 text-xs uppercase">
              <tr>
                <th className="p-3">博主名</th>
                <th className="p-3">平台</th>
                <th className="p-3">粉丝数</th>
                <th className="p-3">合作价</th>
                <th className="p-3">推广码</th>
                <th className="p-3">状态</th>
                <th className="p-3 text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((k) => (
                <tr key={k.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                  <td className="p-3 font-bold">{k.name}</td>
                  <td className="p-3 text-gray-300 text-xs">{k.platform}</td>
                  <td className="p-3 text-blue-400">{k.followers.toLocaleString()}</td>
                  <td className="p-3 text-red-400">¥{(k.cost / 100).toFixed(2)}</td>
                  <td className="p-3">
                    {k.promoCode ? (
                      <button onClick={() => copyText(k.promoCode)} className="font-mono text-orange-400 text-xs bg-[#2a1414] px-2 py-0.5 rounded">{k.promoCode}</button>
                    ) : <span className="text-gray-600">-</span>}
                  </td>
                  <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded ${k.isActive ? 'bg-green-900/60 text-green-200' : 'bg-red-900/60 text-red-200'}`}>{k.isActive ? '启用' : '停用'}</span></td>
                  <td className="p-3 text-center">
                    <button onClick={() => { setEd({ ...k }); setShowEdit(true); }} className="bg-blue-600 text-white text-xs px-3 py-1 rounded mr-1">编辑</button>
                    <button onClick={() => handleDelete(k)} className="bg-red-600 text-white text-xs px-3 py-1 rounded">删除</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="text-center text-gray-500 py-10">暂无博主</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && <KolModal title="新增博主" form={n} setForm={setN} channels={channels} onSave={handleCreate} onCancel={() => setShowCreate(false)} saving={creating} />}
      {showEdit && <KolModal title={`编辑 ${ed.name}`} form={ed} setForm={setEd} channels={channels} onSave={handleSave} onCancel={() => setShowEdit(false)} saving={saving} />}
    </div>
  );
}

function KolModal({ title, form, setForm, channels, onSave, onCancel, saving }: any) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#161616] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold mb-4">{title}</h3>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-400 mb-1 text-xs">博主名</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
            </div>
            <div>
              <label className="block text-gray-400 mb-1 text-xs">平台</label>
              <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white">
                <option value="YouTube">YouTube</option><option value="Instagram">Instagram</option><option value="TikTok">TikTok</option><option value="其他">其他</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-gray-400 mb-1 text-xs">归属渠道（可选）</label>
            <select value={form.channelId || ''} onChange={(e) => setForm({ ...form, channelId: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white">
              <option value="">-- 无 --</option>
              {channels.map((c: any) => <option key={c.id} value={c.id}>{c.icon} {c.displayName}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-400 mb-1 text-xs">粉丝数</label>
              <input type="number" value={form.followers} onChange={(e) => setForm({ ...form, followers: parseInt(e.target.value) || 0 })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
            </div>
            <div>
              <label className="block text-gray-400 mb-1 text-xs">合作价（分）</label>
              <input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: parseInt(e.target.value) || 0 })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-400 mb-1 text-xs">推广码</label>
              <input value={form.promoCode} onChange={(e) => setForm({ ...form, promoCode: e.target.value.toUpperCase() })} placeholder="KOL001" className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white font-mono" />
            </div>
            <div>
              <label className="block text-gray-400 mb-1 text-xs">联系方式</label>
              <input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder="微信/邮箱" className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
            </div>
          </div>
          <div>
            <label className="block text-gray-400 mb-1 text-xs">推广链接</label>
            <input value={form.promoLink} onChange={(e) => setForm({ ...form, promoLink: e.target.value })} placeholder="https://luka.game/?ref=KOL001" className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white font-mono text-xs" />
          </div>
          <div>
            <label className="block text-gray-400 mb-1 text-xs">备注</label>
            <input value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
          </div>
          <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />启用</label>
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <button onClick={onCancel} className="px-4 py-2 bg-[#2a2a2a] rounded text-sm">取消</button>
          <button onClick={onSave} disabled={saving} className="px-4 py-2 bg-blue-600 rounded text-sm font-bold disabled:opacity-50">{saving ? '保存中...' : '保存'}</button>
        </div>
      </div>
    </div>
  );
}
