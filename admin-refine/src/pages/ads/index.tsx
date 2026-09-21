import React, { useState } from 'react';
import { useTable, useCreate, useUpdate, useDelete } from '@refinedev/core';
import SearchBar from '../../components/SearchBar';
import { useSearch } from '../../hooks/useSearch';

interface AdItem {
  id: string;
  title: string;
  imageUrl: string;
  linkType: string;
  linkValue: string;
  position: string;
  sortOrder: number;
  isActive: boolean;
  startAt: string | null;
  endAt: string | null;
  clickCount: number;
  viewCount: number;
  createdAt: string;
}

const SEARCH_FIELDS = [
  { key: 'title', label: '标题', type: 'text' as const },
  { key: 'position', label: '位置', type: 'select' as const, options: [
    { value: 'HOME_BANNER', label: '首页轮播' },
    { value: 'HOME_FEATURE', label: '首页功能位' },
    { value: 'POPUP', label: '弹窗广告' },
  ]},
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

const POSITION_LABELS: Record<string, string> = {
  HOME_BANNER: '首页轮播',
  HOME_FEATURE: '首页功能位',
  POPUP: '弹窗广告',
};

export default function AdList() {
  const { tableQueryResult } = useTable<AdItem>({ resource: 'ads', pagination: { pageSize: 100 } });
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
    title: '', imageUrl: '', linkType: 'URL', linkValue: '',
    position: 'HOME_BANNER', sortOrder: 0, startAt: '', endAt: '',
  });
  const [creating, setCreating] = useState(false);

  const onImgCreate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const img = await readAsBase64(f);
    setN((x) => ({ ...x, imageUrl: img }));
  };
  const onImgEdit = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const img = await readAsBase64(f);
    setEd((x: any) => ({ ...x, imageUrl: img }));
  };

  const handleCreate = () => {
    if (!n.title || !n.imageUrl) return alert('请填写标题和上传图片');
    setCreating(true);
    const payload: any = { ...n };
    if (!payload.startAt) payload.startAt = null;
    if (!payload.endAt) payload.endAt = null;
    create_({ resource: 'ads', values: payload }, {
      onSuccess: () => {
        setShowCreate(false);
        setN({ title: '', imageUrl: '', linkType: 'URL', linkValue: '', position: 'HOME_BANNER', sortOrder: 0, startAt: '', endAt: '' });
        setCreating(false);
        tableQueryResult.refetch();
      },
      onError: (e: any) => { alert('添加失败: ' + (e?.message || '')); setCreating(false); },
    });
  };

  const handleSave = () => {
    setSaving(true);
    const payload: any = {
      title: ed.title, imageUrl: ed.imageUrl, linkType: ed.linkType, linkValue: ed.linkValue,
      position: ed.position, sortOrder: ed.sortOrder, isActive: ed.isActive,
      startAt: ed.startAt || null, endAt: ed.endAt || null,
    };
    update_({ resource: 'ads', id: ed.id, values: payload }, {
      onSuccess: () => { setShowEdit(false); setSaving(false); tableQueryResult.refetch(); },
      onError: (e: any) => { alert('保存失败: ' + (e?.message || '')); setSaving(false); },
    });
  };

  const handleDelete = (a: AdItem) => {
    if (!confirm(`确定要删除广告「${a.title}」吗？`)) return;
    delete_({ resource: 'ads', id: a.id }, {
      onSuccess: () => tableQueryResult.refetch(),
      onError: (e: any) => alert('删除失败: ' + (e?.message || '')),
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">广告管理</h1>
        <button onClick={() => setShowCreate(true)} className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded font-bold">+ 新建广告</button>
      </div>

      <SearchBar fields={SEARCH_FIELDS} filters={filters} setFilters={setFilters} onReset={reset} total={all.length} filtered={filtered.length} />

      {tableQueryResult.isLoading ? (
        <div className="text-center text-gray-500 py-20">加载中...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((a) => (
            <div key={a.id} className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
              {a.imageUrl && <img src={a.imageUrl} className="w-full h-32 object-cover" />}
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm truncate">{a.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${a.isActive ? 'bg-green-900/60 text-green-200' : 'bg-red-900/60 text-red-200'}`}>
                    {a.isActive ? '启用' : '停用'}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mb-2">
                  {POSITION_LABELS[a.position] || a.position} · {a.linkType}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div className="bg-[#0d0d0d] rounded p-2 text-center">
                    <div className="text-gray-500">曝光</div>
                    <div className="text-blue-400 font-bold">{a.viewCount || 0}</div>
                  </div>
                  <div className="bg-[#0d0d0d] rounded p-2 text-center">
                    <div className="text-gray-500">点击</div>
                    <div className="text-green-400 font-bold">{a.clickCount || 0}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEd({ ...a }); setShowEdit(true); }} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs py-1.5 rounded">编辑</button>
                  <button onClick={() => handleDelete(a)} className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs py-1.5 rounded">删除</button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="col-span-3 text-center text-gray-500 py-10">无匹配结果</div>}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">新建广告</h3>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-gray-400 mb-1 text-xs">标题</label>
                <input value={n.title} onChange={(e) => setN({ ...n, title: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
              </div>
              <div>
                <label className="block text-gray-400 mb-1 text-xs">图片</label>
                <label className="cursor-pointer inline-block bg-[#2a2a2a] text-xs px-3 py-1.5 rounded text-white mb-2">选择图片<input type="file" accept="image/*" onChange={onImgCreate} className="hidden" /></label>
                {n.imageUrl && <img src={n.imageUrl} className="mt-2 h-24 rounded" />}
              </div>
              <div>
                <label className="block text-gray-400 mb-1 text-xs">展示位置</label>
                <select value={n.position} onChange={(e) => setN({ ...n, position: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white">
                  <option value="HOME_BANNER">首页轮播</option>
                  <option value="HOME_FEATURE">首页功能位</option>
                  <option value="POPUP">弹窗广告</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1 text-xs">链接类型</label>
                  <select value={n.linkType} onChange={(e) => setN({ ...n, linkType: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white">
                    <option value="URL">外部链接</option>
                    <option value="GAME">游戏</option>
                    <option value="NONE">无跳转</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 mb-1 text-xs">跳转值</label>
                  <input value={n.linkValue} onChange={(e) => setN({ ...n, linkValue: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1 text-xs">开始时间</label>
                  <input type="datetime-local" value={n.startAt} onChange={(e) => setN({ ...n, startAt: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1 text-xs">结束时间</label>
                  <input type="datetime-local" value={n.endAt} onChange={(e) => setN({ ...n, endAt: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
                </div>
              </div>
              <div>
                <label className="block text-gray-400 mb-1 text-xs">排序</label>
                <input type="number" value={n.sortOrder} onChange={(e) => setN({ ...n, sortOrder: parseInt(e.target.value) || 0 })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
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
            <h3 className="text-lg font-bold mb-4">编辑 {ed.title}</h3>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-gray-400 mb-1 text-xs">标题</label>
                <input value={ed.title || ''} onChange={(e) => setEd({ ...ed, title: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
              </div>
              <div>
                <label className="block text-gray-400 mb-1 text-xs">图片</label>
                <label className="cursor-pointer inline-block bg-[#2a2a2a] text-xs px-3 py-1.5 rounded text-white mb-2">选择新图片<input type="file" accept="image/*" onChange={onImgEdit} className="hidden" /></label>
                {ed.imageUrl && <img src={ed.imageUrl} className="mt-2 h-24 rounded" />}
              </div>
              <div>
                <label className="block text-gray-400 mb-1 text-xs">展示位置</label>
                <select value={ed.position || 'HOME_BANNER'} onChange={(e) => setEd({ ...ed, position: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white">
                  <option value="HOME_BANNER">首页轮播</option>
                  <option value="HOME_FEATURE">首页功能位</option>
                  <option value="POPUP">弹窗广告</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1 text-xs">链接类型</label>
                  <select value={ed.linkType || 'URL'} onChange={(e) => setEd({ ...ed, linkType: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white">
                    <option value="URL">外部链接</option>
                    <option value="GAME">游戏</option>
                    <option value="NONE">无跳转</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 mb-1 text-xs">跳转值</label>
                  <input value={ed.linkValue || ''} onChange={(e) => setEd({ ...ed, linkValue: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1 text-xs">开始时间</label>
                  <input type="datetime-local" value={ed.startAt ? ed.startAt.slice(0, 16) : ''} onChange={(e) => setEd({ ...ed, startAt: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1 text-xs">结束时间</label>
                  <input type="datetime-local" value={ed.endAt ? ed.endAt.slice(0, 16) : ''} onChange={(e) => setEd({ ...ed, endAt: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1 text-xs">排序</label>
                  <input type="number" value={ed.sortOrder ?? 0} onChange={(e) => setEd({ ...ed, sortOrder: parseInt(e.target.value) || 0 })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input type="checkbox" checked={ed.isActive || false} onChange={(e) => setEd({ ...ed, isActive: e.target.checked })} />
                    启用
                  </label>
                </div>
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
