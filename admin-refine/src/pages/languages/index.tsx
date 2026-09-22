import React, { useState } from 'react';
import { useTable, useCreate, useUpdate, useDelete } from '@refinedev/core';

interface Language {
  id: string;
  code: string;
  name: string;
  flag: string;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
}

export default function LanguageList() {
  const { tableQueryResult } = useTable<Language>({ resource: 'languages', pagination: { pageSize: 100 } });
  const { mutate: create_ } = useCreate();
  const { mutate: update_ } = useUpdate();
  const { mutate: delete_ } = useDelete();

  const all = tableQueryResult.data?.data || [];
  const [showEdit, setShowEdit] = useState(false);
  const [ed, setEd] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [n, setN] = useState({ code: '', name: '', flag: '', isDefault: false, sortOrder: 0 });
  const [creating, setCreating] = useState(false);

  const handleCreate = () => {
    if (!n.code || !n.name) return alert('请填写语言代码和名称');
    setCreating(true);
    create_({ resource: 'languages', values: n }, {
      onSuccess: () => {
        setShowCreate(false);
        setN({ code: '', name: '', flag: '', isDefault: false, sortOrder: 0 });
        setCreating(false);
        tableQueryResult.refetch();
      },
      onError: (e: any) => { alert('添加失败: ' + (e?.message || '')); setCreating(false); },
    });
  };

  const handleSave = () => {
    setSaving(true);
    update_({
      resource: 'languages', id: ed.id,
      values: { name: ed.name, flag: ed.flag, isDefault: ed.isDefault, isActive: ed.isActive, sortOrder: ed.sortOrder },
    }, {
      onSuccess: () => { setShowEdit(false); setSaving(false); tableQueryResult.refetch(); },
      onError: (e: any) => { alert('保存失败: ' + (e?.message || '')); setSaving(false); },
    });
  };

  const handleDelete = (l: Language) => {
    if (!confirm(`确定删除「${l.name}」吗？`)) return;
    delete_({ resource: 'languages', id: l.id }, {
      onSuccess: () => tableQueryResult.refetch(),
      onError: (e: any) => alert('删除失败: ' + (e?.message || '')),
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">语言列表</h1>
        <button onClick={() => setShowCreate(true)} className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded font-bold">+ 新增语言</button>
      </div>

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 mb-4 text-sm text-gray-400">
        💡 默认语言是用户未选择语言时的后备。至少需要保留一个默认语言。
      </div>

      {tableQueryResult.isLoading ? (
        <div className="text-center text-gray-500 py-20">加载中...</div>
      ) : (
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#1f1f1f] text-gray-400 text-xs uppercase">
              <tr><th className="p-3">国旗</th><th className="p-3">语言代码</th><th className="p-3">语言名称</th><th className="p-3">默认</th><th className="p-3">状态</th><th className="p-3">排序</th><th className="p-3 text-center">操作</th></tr>
            </thead>
            <tbody>
              {all.map((l) => (
                <tr key={l.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                  <td className="p-3 text-2xl">{l.flag || '—'}</td>
                  <td className="p-3 font-mono text-gray-300">{l.code}</td>
                  <td className="p-3 font-bold">{l.name}</td>
                  <td className="p-3">{l.isDefault ? <span className="text-xs bg-yellow-600 text-white px-2 py-0.5 rounded">默认</span> : '-'}</td>
                  <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded ${l.isActive ? 'bg-green-900/60 text-green-200' : 'bg-red-900/60 text-red-200'}`}>{l.isActive ? '启用' : '停用'}</span></td>
                  <td className="p-3 text-gray-400">{l.sortOrder}</td>
                  <td className="p-3 text-center">
                    <button onClick={() => { setEd({ ...l }); setShowEdit(true); }} className="bg-blue-600 text-white text-xs px-3 py-1 rounded mr-1">编辑</button>
                    <button onClick={() => handleDelete(l)} className="bg-red-600 text-white text-xs px-3 py-1 rounded">删除</button>
                  </td>
                </tr>
              ))}
              {all.length === 0 && <tr><td colSpan={7} className="text-center text-gray-500 py-10">暂无语言</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">新增语言</h3>
            <div className="space-y-3 text-sm">
              <div><label className="block text-gray-400 mb-1 text-xs">语言代码（如 zh-CN, en-US）</label><input value={n.code} onChange={(e) => setN({ ...n, code: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white font-mono" /></div>
              <div><label className="block text-gray-400 mb-1 text-xs">语言名称</label><input value={n.name} onChange={(e) => setN({ ...n, name: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" /></div>
              <div><label className="block text-gray-400 mb-1 text-xs">国旗 emoji</label><input value={n.flag} onChange={(e) => setN({ ...n, flag: e.target.value })} placeholder="🇨🇳" className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white text-2xl" /></div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" checked={n.isDefault} onChange={(e) => setN({ ...n, isDefault: e.target.checked })} />设为默认语言</label>
              </div>
              <div><label className="block text-gray-400 mb-1 text-xs">排序</label><input type="number" value={n.sortOrder} onChange={(e) => setN({ ...n, sortOrder: parseInt(e.target.value) || 0 })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" /></div>
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
          <div className="bg-[#161616] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">编辑 {ed.name}</h3>
            <div className="space-y-3 text-sm">
              <div><label className="block text-gray-400 mb-1 text-xs">语言名称</label><input value={ed.name || ''} onChange={(e) => setEd({ ...ed, name: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" /></div>
              <div><label className="block text-gray-400 mb-1 text-xs">国旗 emoji</label><input value={ed.flag || ''} onChange={(e) => setEd({ ...ed, flag: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white text-2xl" /></div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" checked={ed.isDefault || false} onChange={(e) => setEd({ ...ed, isDefault: e.target.checked })} />默认语言</label>
                <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" checked={ed.isActive || false} onChange={(e) => setEd({ ...ed, isActive: e.target.checked })} />启用</label>
              </div>
              <div><label className="block text-gray-400 mb-1 text-xs">排序</label><input type="number" value={ed.sortOrder ?? 0} onChange={(e) => setEd({ ...ed, sortOrder: parseInt(e.target.value) || 0 })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" /></div>
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
