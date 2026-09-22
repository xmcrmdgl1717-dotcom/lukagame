import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Lang { id: string; code: string; name: string; flag: string; }
interface T { id: string; key: string; namespace: string; translations: string; }

const API_URL = import.meta.env.VITE_API_URL || 'https://luka-1i4g.onrender.com';
const hdr = () => ({
  'x-admin-username': JSON.parse(localStorage.getItem('adminInfo') || 'null')?.username || '',
  'x-admin-password': localStorage.getItem('adminPassword') || '',
  'Content-Type': 'application/json',
});

export default function TranslationList() {
  const [langs, setLangs] = useState<Lang[]>([]);
  const [list, setList] = useState<T[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [ed, setEd] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [l, t] = await Promise.all([
        axios.get(`${API_URL}/api/admin/languages`, { headers: hdr() }),
        axios.get(`${API_URL}/api/admin/translations`, { headers: hdr() }),
      ]);
      setLangs(l.data.filter((x: any) => x.isActive));
      setList(t.data);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const parseT = (s: string) => { try { return JSON.parse(s); } catch { return {}; } };

  const filtered = list.filter(t => !search || t.key.toLowerCase().includes(search.toLowerCase()));

  const openEdit = (t: T) => {
    const obj = parseT(t.translations);
    const init: any = {};
    langs.forEach(l => { init[l.code] = obj[l.code] || ''; });
    setEd({ id: t.id, key: t.key, namespace: t.namespace, values: init });
    setShowEdit(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API_URL}/api/admin/translations/${ed.id}`, {
        namespace: ed.namespace,
        translations: JSON.stringify(ed.values),
      }, { headers: hdr() });
      setShowEdit(false);
      load();
    } catch (e: any) { alert('保存失败: ' + (e.response?.data?.error || e.message)); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除该词条吗？')) return;
    try { await axios.delete(`${API_URL}/api/admin/translations/${id}`, { headers: hdr() }); load(); }
    catch (e: any) { alert('删除失败'); }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">翻译词条</h1>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索 key..." className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm w-64 text-white" />
      </div>

      {loading ? <div className="text-center text-gray-500 py-20">加载中...</div> : (
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#1f1f1f] text-gray-400 text-xs uppercase">
                <tr>
                  <th className="p-3">Key</th>
                  <th className="p-3">命名空间</th>
                  {langs.map(l => <th key={l.code} className="p-3">{l.flag} {l.name}</th>)}
                  <th className="p-3 text-center">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => {
                  const obj = parseT(t.translations);
                  return (
                    <tr key={t.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                      <td className="p-3 font-mono text-blue-400 text-xs">{t.key}</td>
                      <td className="p-3 text-gray-500 text-xs">{t.namespace}</td>
                      {langs.map(l => (
                        <td key={l.code} className="p-3 text-gray-200 max-w-[200px] truncate" title={obj[l.code]}>
                          {obj[l.code] || <span className="text-gray-600">—</span>}
                        </td>
                      ))}
                      <td className="p-3 text-center whitespace-nowrap">
                        <button onClick={() => openEdit(t)} className="bg-blue-600 text-white text-xs px-3 py-1 rounded mr-1">编辑</button>
                        <button onClick={() => handleDelete(t.id)} className="bg-red-600 text-white text-xs px-3 py-1 rounded">删除</button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && <tr><td colSpan={3 + langs.length} className="text-center text-gray-500 py-10">暂无词条</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showEdit && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-1">编辑词条</h3>
            <div className="text-xs text-gray-500 font-mono mb-4">{ed.key}</div>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-gray-400 mb-1 text-xs">命名空间</label>
                <input value={ed.namespace || ''} onChange={(e) => setEd({ ...ed, namespace: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white font-mono" />
              </div>
              {langs.map(l => (
                <div key={l.code}>
                  <label className="block text-gray-400 mb-1 text-xs">{l.flag} {l.name} ({l.code})</label>
                  <input value={ed.values[l.code] || ''} onChange={(e) => setEd({ ...ed, values: { ...ed.values, [l.code]: e.target.value } })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
                </div>
              ))}
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
