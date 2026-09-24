import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useSensitiveConfirm } from '../../components/SensitiveConfirm';

interface Article {
  id: string;
  slug: string;
  category: string;
  title: string;
  coverUrl: string;
  summary: string;
  content: string;
  isPublished: boolean;
  sortOrder: number;
  viewCount: number;
  createdAt: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'https://luka-1i4g.onrender.com';
const hdr = () => ({
  'x-admin-username': JSON.parse(localStorage.getItem('adminInfo') || 'null')?.username || '',
  'x-admin-password': localStorage.getItem('adminPassword') || '',
  'Content-Type': 'application/json',
});

const readAsBase64 = (f: File): Promise<string> =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(f);
  });

const CAT_LABELS: Record<string, { text: string; cls: string }> = {
  SYSTEM: { text: '系统页面', cls: 'bg-purple-900/60 text-purple-200' },
  NEWS: { text: '新闻公告', cls: 'bg-blue-900/60 text-blue-200' },
  HELP: { text: '帮助中心', cls: 'bg-green-900/60 text-green-200' },
  ACTIVITY: { text: '活动', cls: 'bg-orange-900/60 text-orange-200' },
};

const emptyForm = {
  slug: '', category: 'NEWS', title: '', coverUrl: '', summary: '',
  content: '', isPublished: false, sortOrder: 0,
};

export default function ArticleList() {
  const [list, setList] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [ed, setEd] = useState<any>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [filterCat, setFilterCat] = useState('');
  const { confirm } = useSensitiveConfirm();

  const load = async () => {
    setLoading(true);
    try { const { data } = await axios.get(`${API_URL}/api/admin/articles`, { headers: hdr() }); setList(data); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = filterCat ? list.filter(a => a.category === filterCat) : list;

  const openCreate = () => { setEd({ ...emptyForm }); setIsNew(true); setShowEdit(true); };
  const openEdit = (a: Article) => { setEd({ ...a }); setIsNew(false); setShowEdit(true); };

  const onCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 2 * 1024 * 1024) return alert('图片不能超过 2MB');
    const img = await readAsBase64(f);
    setEd((x: any) => ({ ...x, coverUrl: img }));
  };

  const save = async () => {
    if (!ed.slug || !ed.title) return alert('请填写 slug 和标题');
    setSaving(true);
    try {
      if (isNew) await axios.post(`${API_URL}/api/admin/articles`, ed, { headers: hdr() });
      else await axios.put(`${API_URL}/api/admin/articles/${ed.id}`, ed, { headers: hdr() });
      setShowEdit(false);
      load();
    } catch (e: any) { alert('保存失败: ' + (e.response?.data?.error || e.message)); }
    finally { setSaving(false); }
  };

  const del = async (a: Article) => {
    const ok = await confirm(
      `即将删除文章「${a.title}」。\n\nSlug：${a.slug} · 分类：${CAT_LABELS[a.category]?.text || a.category} · 阅读量：${a.viewCount}\n\n此操作不可恢复。`
    );
    if (!ok) return;
    try { await axios.delete(`${API_URL}/api/admin/articles/${a.id}`, { headers: hdr() }); load(); }
    catch (e: any) { alert('删除失败'); }
  };

  const togglePublished = async (a: Article) => {
    try { await axios.put(`${API_URL}/api/admin/articles/${a.id}`, { isPublished: !a.isPublished }, { headers: hdr() }); load(); }
    catch (e: any) { alert('操作失败'); }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">文章管理</h1>
        <button onClick={openCreate} className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded font-bold">+ 新建文章</button>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setFilterCat('')} className={`text-xs px-3 py-1.5 rounded font-bold ${filterCat === '' ? 'bg-red-600 text-white' : 'bg-[#2a2a2a] text-gray-400'}`}>全部</button>
        {Object.entries(CAT_LABELS).map(([k, v]) => (
          <button key={k} onClick={() => setFilterCat(k)} className={`text-xs px-3 py-1.5 rounded font-bold ${filterCat === k ? 'bg-red-600 text-white' : 'bg-[#2a2a2a] text-gray-400'}`}>{v.text}</button>
        ))}
      </div>

      {loading ? <div className="text-center text-gray-500 py-20">加载中...</div> : (
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#1f1f1f] text-gray-400 text-xs uppercase">
              <tr><th className="p-3">封面</th><th className="p-3">标题</th><th className="p-3">Slug</th><th className="p-3">分类</th><th className="p-3">阅读</th><th className="p-3">状态</th><th className="p-3 text-center">操作</th></tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                  <td className="p-3">
                    {a.coverUrl ? <img src={a.coverUrl} className="w-12 h-12 object-cover rounded" /> : <div className="w-12 h-12 bg-[#0d0d0d] rounded flex items-center justify-center">📄</div>}
                  </td>
                  <td className="p-3 font-bold max-w-[200px] truncate">{a.title}</td>
                  <td className="p-3 font-mono text-xs text-gray-500">{a.slug}</td>
                  <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded ${CAT_LABELS[a.category]?.cls || 'bg-gray-700'}`}>{CAT_LABELS[a.category]?.text || a.category}</span></td>
                  <td className="p-3 text-gray-400">{a.viewCount}</td>
                  <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded ${a.isPublished ? 'bg-green-900/60 text-green-200' : 'bg-gray-700 text-gray-300'}`}>{a.isPublished ? '已发布' : '草稿'}</span></td>
                  <td className="p-3 text-center whitespace-nowrap">
                    <button onClick={() => openEdit(a)} className="bg-blue-600 text-white text-xs px-3 py-1 rounded mr-1">编辑</button>
                    <button onClick={() => togglePublished(a)} className="bg-orange-600 text-white text-xs px-3 py-1 rounded mr-1">{a.isPublished ? '下架' : '发布'}</button>
                    <button onClick={() => del(a)} className="bg-red-600 text-white text-xs px-3 py-1 rounded">删除</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="text-center text-gray-500 py-10">暂无文章</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showEdit && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">{isNew ? '新建文章' : '编辑文章'}</h3>

            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1 text-xs">Slug（英文，唯一，如 about）</label>
                  <input value={ed.slug || ''} onChange={(e) => setEd({ ...ed, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-') })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white font-mono" />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1 text-xs">分类</label>
                  <select value={ed.category} onChange={(e) => setEd({ ...ed, category: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white">
                    <option value="SYSTEM">系统页面</option>
                    <option value="NEWS">新闻公告</option>
                    <option value="HELP">帮助中心</option>
                    <option value="ACTIVITY">活动</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 mb-1 text-xs">标题</label>
                <input value={ed.title || ''} onChange={(e) => setEd({ ...ed, title: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
              </div>

              <div>
                <label className="block text-gray-400 mb-1 text-xs">封面图（可选）</label>
                <label className="cursor-pointer inline-block bg-[#2a2a2a] text-xs px-3 py-1.5 rounded text-white">选择图片<input type="file" accept="image/*" onChange={onCover} className="hidden" /></label>
                {ed.coverUrl && <div className="mt-2"><img src={ed.coverUrl} className="h-24 rounded" /></div>}
              </div>

              <div>
                <label className="block text-gray-400 mb-1 text-xs">摘要（可选）</label>
                <input value={ed.summary || ''} onChange={(e) => setEd({ ...ed, summary: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
              </div>

              <div>
                <label className="block text-gray-400 mb-1 text-xs">正文（支持 HTML 标签：&lt;p&gt; &lt;h2&gt; &lt;img&gt; &lt;strong&gt; 等）</label>
                <textarea
                  rows={12}
                  value={ed.content || ''}
                  onChange={(e) => setEd({ ...ed, content: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white font-mono text-xs"
                  placeholder={'<h2>标题</h2>\n<p>正文内容...</p>\n<img src="图片URL" />'}
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" checked={ed.isPublished} onChange={(e) => setEd({ ...ed, isPublished: e.target.checked })} />立即发布</label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-xs">排序：</span>
                  <input type="number" value={ed.sortOrder || 0} onChange={(e) => setEd({ ...ed, sortOrder: parseInt(e.target.value) || 0 })} className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-2 py-1 text-white w-20" />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowEdit(false)} className="px-4 py-2 bg-[#2a2a2a] rounded text-sm">取消</button>
              <button onClick={save} disabled={saving} className="px-6 py-2 bg-blue-600 rounded text-sm font-bold disabled:opacity-50">{saving ? '保存中...' : '保存'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
