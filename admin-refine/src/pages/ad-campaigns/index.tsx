import React, { useState } from 'react';
import { useTable, useCreate, useUpdate, useDelete } from '@refinedev/core';
import SearchBar from '../../components/SearchBar';
import { useSearch } from '../../hooks/useSearch';

interface Campaign {
  id: string;
  channelId: string;
  name: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  budget: number;
  actualCost: number;
  startAt: string | null;
  endAt: string | null;
  status: string;
  remark: string;
  createdAt: string;
  channel?: { id: string; displayName: string; icon: string };
}

const STATUS_MAP: Record<string, { text: string; cls: string }> = {
  ACTIVE: { text: '进行中', cls: 'bg-green-900/60 text-green-200' },
  PAUSED: { text: '已暂停', cls: 'bg-yellow-900/60 text-yellow-200' },
  ENDED: { text: '已结束', cls: 'bg-gray-700 text-gray-300' },
};

const SEARCH_FIELDS = [
  { key: 'name', label: '活动名', type: 'text' as const },
  { key: 'utmCampaign', label: 'UTM Campaign', type: 'text' as const },
  { key: 'status', label: '状态', type: 'select' as const, options: [
    { value: 'ACTIVE', label: '进行中' }, { value: 'PAUSED', label: '已暂停' }, { value: 'ENDED', label: '已结束' },
  ]},
];

export default function AdCampaignList() {
  const { tableQueryResult } = useTable<Campaign>({ resource: 'ad-campaigns', pagination: { pageSize: 100 } });
  const { tableQueryResult: channelsQ } = useTable<{ id: string; displayName: string; icon: string }>({ resource: 'ad-channels', pagination: { pageSize: 100 } });

  const { mutate: create_ } = useCreate();
  const { mutate: update_ } = useUpdate();
  const { mutate: delete_ } = useDelete();

  const all = tableQueryResult.data?.data || [];
  const channels = channelsQ.data?.data || [];
  const { filters, setFilters, filtered, reset } = useSearch(all, SEARCH_FIELDS);

  const empty = { channelId: '', name: '', utmSource: '', utmMedium: '', utmCampaign: '', budget: 0, actualCost: 0, startAt: '', endAt: '', status: 'ACTIVE', remark: '' };
  const [showCreate, setShowCreate] = useState(false);
  const [n, setN] = useState<any>(empty);
  const [creating, setCreating] = useState(false);

  const [showEdit, setShowEdit] = useState(false);
  const [ed, setEd] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const handleCreate = () => {
    if (!n.channelId || !n.name) return alert('请选择渠道并填写活动名');
    setCreating(true);
    const payload = { ...n };
    if (!payload.startAt) payload.startAt = null;
    if (!payload.endAt) payload.endAt = null;
    create_({ resource: 'ad-campaigns', values: payload }, {
      onSuccess: () => { setShowCreate(false); setN(empty); setCreating(false); tableQueryResult.refetch(); },
      onError: (e: any) => { alert('添加失败: ' + (e?.message || '')); setCreating(false); },
    });
  };

  const handleSave = () => {
    setSaving(true);
    const payload: any = {
      channelId: ed.channelId, name: ed.name, utmSource: ed.utmSource, utmMedium: ed.utmMedium, utmCampaign: ed.utmCampaign,
      budget: ed.budget, actualCost: ed.actualCost, status: ed.status, remark: ed.remark,
      startAt: ed.startAt || null, endAt: ed.endAt || null,
    };
    update_({ resource: 'ad-campaigns', id: ed.id, values: payload }, {
      onSuccess: () => { setShowEdit(false); setSaving(false); tableQueryResult.refetch(); },
      onError: (e: any) => { alert('保存失败: ' + (e?.message || '')); setSaving(false); },
    });
  };

  const handleDelete = (c: Campaign) => {
    if (!confirm(`确定删除活动「${c.name}」吗？`)) return;
    delete_({ resource: 'ad-campaigns', id: c.id }, {
      onSuccess: () => tableQueryResult.refetch(),
      onError: (e: any) => alert('删除失败: ' + (e?.message || '')),
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">投放活动</h1>
        <button onClick={() => setShowCreate(true)} className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded font-bold">+ 新增活动</button>
      </div>

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 mb-4 text-sm text-gray-400">
        💡 投放活动是具体的一次投放，例如"618大促-FB"。用户在链接上带 UTM 参数注册时，会自动关联到此活动。
      </div>

      <SearchBar fields={SEARCH_FIELDS} filters={filters} setFilters={setFilters} onReset={reset} total={all.length} filtered={filtered.length} />

      {tableQueryResult.isLoading ? <div className="text-center text-gray-500 py-20">加载中...</div> : (
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#1f1f1f] text-gray-400 text-xs uppercase">
              <tr>
                <th className="p-3">渠道</th>
                <th className="p-3">活动名</th>
                <th className="p-3">UTM Campaign</th>
                <th className="p-3">预算</th>
                <th className="p-3">实际花费</th>
                <th className="p-3">状态</th>
                <th className="p-3 text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const st = STATUS_MAP[c.status] || { text: c.status, cls: 'bg-gray-700' };
                return (
                  <tr key={c.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                    <td className="p-3"><span className="text-xl mr-1">{c.channel?.icon || '📡'}</span><span className="text-gray-300">{c.channel?.displayName || '-'}</span></td>
                    <td className="p-3 font-bold">{c.name}</td>
                    <td className="p-3 font-mono text-xs text-gray-500">{c.utmCampaign || '-'}</td>
                    <td className="p-3 text-yellow-500">¥{(c.budget / 100).toFixed(2)}</td>
                    <td className="p-3 text-red-400 font-bold">¥{(c.actualCost / 100).toFixed(2)}</td>
                    <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded ${st.cls}`}>{st.text}</span></td>
                    <td className="p-3 text-center">
                      <button onClick={() => { setEd({ ...c, startAt: c.startAt ? c.startAt.slice(0, 16) : '', endAt: c.endAt ? c.endAt.slice(0, 16) : '' }); setShowEdit(true); }} className="bg-blue-600 text-white text-xs px-3 py-1 rounded mr-1">编辑</button>
                      <button onClick={() => handleDelete(c)} className="bg-red-600 text-white text-xs px-3 py-1 rounded">删除</button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={7} className="text-center text-gray-500 py-10">暂无活动</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && <CampaignModal title="新增投放活动" form={n} setForm={setN} channels={channels} onSave={handleCreate} onCancel={() => setShowCreate(false)} saving={creating} />}
      {showEdit && <CampaignModal title={`编辑 ${ed.name}`} form={ed} setForm={setEd} channels={channels} onSave={handleSave} onCancel={() => setShowEdit(false)} saving={saving} />}
    </div>
  );
}

function CampaignModal({ title, form, setForm, channels, onSave, onCancel, saving }: any) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#161616] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold mb-4">{title}</h3>
        <div className="space-y-3 text-sm">
          <div>
            <label className="block text-gray-400 mb-1 text-xs">渠道</label>
            <select value={form.channelId} onChange={(e) => setForm({ ...form, channelId: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white">
              <option value="">-- 选择渠道 --</option>
              {channels.map((c: any) => <option key={c.id} value={c.id}>{c.icon} {c.displayName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-gray-400 mb-1 text-xs">活动名</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="618大促-FB" className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-gray-400 mb-1 text-xs">UTM Source</label>
              <input value={form.utmSource} onChange={(e) => setForm({ ...form, utmSource: e.target.value })} placeholder="facebook" className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white font-mono text-xs" />
            </div>
            <div>
              <label className="block text-gray-400 mb-1 text-xs">UTM Medium</label>
              <input value={form.utmMedium} onChange={(e) => setForm({ ...form, utmMedium: e.target.value })} placeholder="cpc" className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white font-mono text-xs" />
            </div>
            <div>
              <label className="block text-gray-400 mb-1 text-xs">UTM Campaign</label>
              <input value={form.utmCampaign} onChange={(e) => setForm({ ...form, utmCampaign: e.target.value })} placeholder="618sale" className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white font-mono text-xs" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-400 mb-1 text-xs">预算（分）</label>
              <input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: parseInt(e.target.value) || 0 })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
            </div>
            <div>
              <label className="block text-gray-400 mb-1 text-xs">实际花费（分）</label>
              <input type="number" value={form.actualCost} onChange={(e) => setForm({ ...form, actualCost: parseInt(e.target.value) || 0 })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-400 mb-1 text-xs">开始时间</label>
              <input type="datetime-local" value={form.startAt || ''} onChange={(e) => setForm({ ...form, startAt: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
            </div>
            <div>
              <label className="block text-gray-400 mb-1 text-xs">结束时间</label>
              <input type="datetime-local" value={form.endAt || ''} onChange={(e) => setForm({ ...form, endAt: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
            </div>
          </div>
          <div>
            <label className="block text-gray-400 mb-1 text-xs">状态</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white">
              <option value="ACTIVE">进行中</option><option value="PAUSED">已暂停</option><option value="ENDED">已结束</option>
            </select>
          </div>
          <div>
            <label className="block text-gray-400 mb-1 text-xs">备注</label>
            <input value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <button onClick={onCancel} className="px-4 py-2 bg-[#2a2a2a] rounded text-sm">取消</button>
          <button onClick={onSave} disabled={saving} className="px-4 py-2 bg-blue-600 rounded text-sm font-bold disabled:opacity-50">{saving ? '保存中...' : '保存'}</button>
        </div>
      </div>
    </div>
  );
}
