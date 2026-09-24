import React, { useState } from 'react';
import { useTable, useCreate, useUpdate, useDelete } from '@refinedev/core';
import SearchBar from '../../components/SearchBar';
import { useSearch } from '../../hooks/useSearch';
import { useSensitiveConfirm } from '../../components/SensitiveConfirm';

interface B { id: string; imageUrl: string; link: string; title: string; sortOrder: number; isActive: boolean; createdAt: string; }

const readAsBase64 = (f: File): Promise<string> =>
  new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(f); });

const SEARCH_FIELDS = [
  { key: 'title', label: '标题', type: 'text' as const },
  { key: 'isActive', label: '状态', type: 'select' as const, options: [{ value: 'true', label: '上架' }, { value: 'false', label: '下架' }] },
  { key: 'createdAt', label: '创建时间', type: 'date-range' as const },
];

export default function BannerList() {
  const { tableQueryResult } = useTable<B>({ resource: 'banners', pagination: { pageSize: 100 } });
  const { mutate: create_ } = useCreate();
  const { mutate: update_ } = useUpdate();
  const { mutate: delete_ } = useDelete();
  const { confirm } = useSensitiveConfirm();

  const all = tableQueryResult.data?.data || [];
  const { filters, setFilters, filtered, reset } = useSearch(all, SEARCH_FIELDS);

  const [n, setN] = useState({ imageUrl: '', link: '', title: '', sortOrder: 0 });
  const [creating, setCreating] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [ed, setEd] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const onNewImg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const img = await readAsBase64(f);
    setN((b) => ({ ...b, imageUrl: img }));
  };

  const onEdImg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const img = await readAsBase64(f);
    setEd((b: any) => ({ ...b, imageUrl: img }));
  };

  const createFn = () => {
    if (!n.imageUrl) return alert('请上传图片');
    setCreating(true);
    create_({ resource: 'banners', values: n }, { onSuccess: () => { setN({ imageUrl: '', link: '', title: '', sortOrder: 0 }); setCreating(false); tableQueryResult.refetch(); }, onError: () => setCreating(false) });
  };

  const save = () => {
    setSaving(true);
    update_({ resource: 'banners', id: ed.id, values: { imageUrl: ed.imageUrl, link: ed.link, title: ed.title, sortOrder: ed.sortOrder } }, {
      onSuccess: () => { setShowEdit(false); setSaving(false); tableQueryResult.refetch(); }, onError: () => setSaving(false),
    });
  };

  const toggle = (b: B) => update_({ resource: 'banners', id: b.id, values: { isActive: !b.isActive } }, { onSuccess: () => tableQueryResult.refetch() });

  const del = async (b: B) => {
    const ok = await confirm(
      `即将删除轮播图「${b.title || '（无标题）'}」。\n\n排序：${b.sortOrder} · 状态：${b.isActive ? '上架' : '下架'}\n\n删除后用户端首页将不再展示。`
    );
    if (!ok) return;
    delete_({ resource: 'banners', id: b.id }, { onSuccess: () => tableQueryResult.refetch() });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6"><h1 className="text-2xl font-bold">轮播图</h1></div>

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 mb-4">
        <div className="text-sm font-bold mb-3">新增轮播图</div>
        <div className="flex flex-wrap gap-2 items-center">
          <label className="cursor-pointer bg-[#2a2a2a] text-xs px-3 py-2 rounded text-white">选择图片<input type="file" accept="image/*" onChange={onNewImg} className="hidden" /></label>
          {n.imageUrl && <img src={n.imageUrl} className="h-12 rounded" />}
          <input value={n.link} onChange={(e) => setN({ ...n, link: e.target.value })} placeholder="跳转链接" className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm w-48 text-white" />
          <input value={n.title} onChange={(e) => setN({ ...n, title: e.target.value })} placeholder="标题" className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm w-40 text-white" />
          <input type="number" value={n.sortOrder} onChange={(e) => setN({ ...n, sortOrder: parseInt(e.target.value) || 0 })} placeholder="排序" className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm w-20 text-white" />
          <button onClick={createFn} disabled={creating} className="bg-green-600 text-white text-sm px-4 py-1.5 rounded font-bold disabled:opacity-50">{creating ? '添加中...' : '+ 添加'}</button>
        </div>
      </div>

      <SearchBar fields={SEARCH_FIELDS} filters={filters} setFilters={setFilters} onReset={reset} total={all.length} filtered={filtered.length} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((b) => (
          <div key={b.id} className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4">
            <img src={b.imageUrl} className="w-full h-32 object-cover rounded mb-3" />
            <div className="text-sm font-bold mb-1">{b.title || '（无标题）'}</div>
            <div className="text-xs text-gray-500 mb-3">链接: {b.link || '-'} · 排序: {b.sortOrder}</div>
            <div className="flex gap-2">
              <span className={`text-xs px-2 py-0.5 rounded ${b.isActive ? 'bg-green-900/60 text-green-200' : 'bg-red-900/60 text-red-200'}`}>{b.isActive ? '上架' : '下架'}</span>
              <button onClick={() => { setEd({ ...b }); setShowEdit(true); }} className="bg-blue-600 text-white text-xs px-3 py-1 rounded">编辑</button>
              <button onClick={() => toggle(b)} className="bg-orange-600 text-white text-xs px-3 py-1 rounded">{b.isActive ? '下架' : '上架'}</button>
              <button onClick={() => del(b)} className="bg-red-600 text-white text-xs px-3 py-1 rounded">删除</button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="col-span-2 text-center text-gray-500 py-10">无匹配结果</div>}
      </div>

      {showEdit && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">编辑轮播图</h3>
            <div className="space-y-3 text-sm">
              <div><label className="block text-gray-400 mb-1 text-xs">图片</label>
                <label className="cursor-pointer inline-block bg-[#2a2a2a] text-xs px-3 py-1.5 rounded mb-2 text-white">选择新图片<input type="file" accept="image/*" onChange={onEdImg} className="hidden" /></label>
                {ed.imageUrl && <img src={ed.imageUrl} className="mt-2 h-24 rounded" />}
              </div>
              <div><label className="block text-gray-400 mb-1 text-xs">标题</label><input value={ed.title || ''} onChange={(e) => setEd({ ...ed, title: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" /></div>
              <div><label className="block text-gray-400 mb-1 text-xs">链接</label><input value={ed.link || ''} onChange={(e) => setEd({ ...ed, link: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" /></div>
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
