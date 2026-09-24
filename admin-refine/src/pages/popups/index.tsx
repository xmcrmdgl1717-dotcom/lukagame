import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useSensitiveConfirm } from '../../components/SensitiveConfirm';

interface Popup {
  id: string;
  title: string;
  imageUrl: string;
  content: string;
  buttonText: string;
  buttonLink: string;
  position: string;
  delay: number;
  frequency: string;
  dailyLimit: number;
  targetVipMin: number;
  targetVipMax: number;
  targetTags: string;
  targetGroups: string;
  registerDaysMin: number;
  registerDaysMax: number;
  minRecharge: number;
  startAt: string | null;
  endAt: string | null;
  isActive: boolean;
  viewCount: number;
  clickCount: number;
  closeCount: number;
  sortOrder: number;
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

const POS_LABELS: Record<string, string> = { HOME: '首页', ALL: '全站', PATH: '指定路径' };
const FREQ_LABELS: Record<string, string> = { ONCE: '仅一次', DAILY: '每天一次', SESSION: '每次会话', ALWAYS: '每次都弹' };

const emptyForm = {
  title: '', imageUrl: '', content: '', buttonText: '', buttonLink: '',
  position: 'HOME', positionPath: '', delay: 0, frequency: 'ONCE', dailyLimit: 1,
  targetVipMin: 0, targetVipMax: 99, targetTags: '', targetGroups: '',
  registerDaysMin: 0, registerDaysMax: 9999, minRecharge: 0,
  startAt: '', endAt: '', isActive: true, sortOrder: 0,
};

export default function PopupList() {
  const [list, setList] = useState<Popup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [ed, setEd] = useState<any>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const { confirm } = useSensitiveConfirm();

  const load = async () => {
    setLoading(true);
    try { const { data } = await axios.get(`${API_URL}/api/admin/popups`, { headers: hdr() }); setList(data); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEd({ ...emptyForm }); setIsNew(true); setShowEdit(true); };
  const openEdit = (p: Popup) => { setEd({ ...p }); setIsNew(false); setShowEdit(true); };

  const onImg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 2 * 1024 * 1024) return alert('图片不能超过 2MB');
    const img = await readAsBase64(f);
    setEd((x: any) => ({ ...x, imageUrl: img }));
  };

  const save = async () => {
    if (!ed.title) return alert('请填写标题');
    setSaving(true);
    try {
      const payload = { ...ed };
      if (isNew) {
        await axios.post(`${API_URL}/api/admin/popups`, payload, { headers: hdr() });
      } else {
        await axios.put(`${API_URL}/api/admin/popups/${ed.id}`, payload, { headers: hdr() });
      }
      setShowEdit(false);
      load();
    } catch (e: any) { alert('保存失败: ' + (e.response?.data?.error || e.message)); }
    finally { setSaving(false); }
  };

  const del = async (p: Popup) => {
    const ok = await confirm(
      `即将删除弹窗「${p.title}」。\n\n位置：${POS_LABELS[p.position] || p.position} · 频率：${FREQ_LABELS[p.frequency] || p.frequency}\n曝光 ${p.viewCount} 次 · 点击 ${p.clickCount} 次\n\n删除后用户端将不再展示此弹窗。`
    );
    if (!ok) return;
    try { await axios.delete(`${API_URL}/api/admin/popups/${p.id}`, { headers: hdr() }); load(); }
    catch (e: any) { alert('删除失败'); }
  };

  const toggleActive = async (p: Popup) => {
    try { await axios.put(`${API_URL}/api/admin/popups/${p.id}`, { isActive: !p.isActive }, { headers: hdr() }); load(); }
    catch (e: any) { alert('操作失败'); }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">弹窗管理</h1>
        <button onClick={openCreate} className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded font-bold">+ 新建弹窗</button>
      </div>

      {loading ? <div className="text-center text-gray-500 py-20">加载中...</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map(p => (
            <div key={p.id} className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
              <div className="h-32 bg-[#0d0d0d] flex items-center justify-center relative">
                {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" /> : <span className="text-4xl">💬</span>}
                {!p.isActive && <span className="absolute top-2 right-2 text-xs bg-red-600 text-white px-2 py-0.5 rounded">已停用</span>}
              </div>
              <div className="p-4">
                <div className="font-bold text-sm truncate mb-1">{p.title}</div>
                <div className="text-xs text-gray-500 mb-3">
                  {POS_LABELS[p.position] || p.position} · {FREQ_LABELS[p.frequency] || p.frequency}
                  {p.delay > 0 && ` · 延迟 ${p.delay}s`}
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                  <div className="bg-[#0d0d0d] rounded p-2 text-center"><div className="text-gray-500">曝光</div><div className="text-blue-400 font-bold">{p.viewCount}</div></div>
                  <div className="bg-[#0d0d0d] rounded p-2 text-center"><div className="text-gray-500">点击</div><div className="text-green-400 font-bold">{p.clickCount}</div></div>
                  <div className="bg-[#0d0d0d] rounded p-2 text-center"><div className="text-gray-500">关闭</div><div className="text-gray-400 font-bold">{p.closeCount}</div></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(p)} className="flex-1 bg-blue-600 text-white text-xs py-1.5 rounded">编辑</button>
                  <button onClick={() => toggleActive(p)} className="flex-1 bg-orange-600 text-white text-xs py-1.5 rounded">{p.isActive ? '停用' : '启用'}</button>
                  <button onClick={() => del(p)} className="flex-1 bg-red-600 text-white text-xs py-1.5 rounded">删除</button>
                </div>
              </div>
            </div>
          ))}
          {list.length === 0 && <div className="col-span-3 text-center text-gray-500 py-20">暂无弹窗</div>}
        </div>
      )}

      {showEdit && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">{isNew ? '新建弹窗' : '编辑弹窗'}</h3>

            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-gray-400 mb-1 text-xs">标题</label>
                <input value={ed.title || ''} onChange={(e) => setEd({ ...ed, title: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
              </div>

              <div>
                <label className="block text-gray-400 mb-1 text-xs">主图</label>
                <label className="cursor-pointer inline-block bg-[#2a2a2a] text-xs px-3 py-1.5 rounded text-white">选择图片<input type="file" accept="image/*" onChange={onImg} className="hidden" /></label>
                {ed.imageUrl && <div className="mt-2"><img src={ed.imageUrl} className="h-32 rounded" /></div>}
              </div>

              <div>
                <label className="block text-gray-400 mb-1 text-xs">内容（支持 HTML）</label>
                <textarea rows={4} value={ed.content || ''} onChange={(e) => setEd({ ...ed, content: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white font-mono text-xs" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1 text-xs">按钮文字（可选）</label>
                  <input value={ed.buttonText || ''} onChange={(e) => setEd({ ...ed, buttonText: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1 text-xs">按钮链接（可选）</label>
                  <input value={ed.buttonLink || ''} onChange={(e) => setEd({ ...ed, buttonLink: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
                </div>
              </div>

              <div className="border-t border-[#2a2a2a] pt-3">
                <div className="text-sm font-bold mb-2">展示配置</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-400 mb-1 text-xs">展示位置</label>
                    <select value={ed.position} onChange={(e) => setEd({ ...ed, position: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white">
                      <option value="HOME">首页</option><option value="ALL">全站</option><option value="PATH">指定路径</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1 text-xs">延迟弹出（秒）</label>
                    <input type="number" value={ed.delay || 0} onChange={(e) => setEd({ ...ed, delay: parseInt(e.target.value) || 0 })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
                  </div>
                </div>
                {ed.position === 'PATH' && (
                  <div className="mt-3">
                    <label className="block text-gray-400 mb-1 text-xs">路径（如 /game）</label>
                    <input value={ed.positionPath || ''} onChange={(e) => setEd({ ...ed, positionPath: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white font-mono" />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-gray-400 mb-1 text-xs">频率</label>
                    <select value={ed.frequency} onChange={(e) => setEd({ ...ed, frequency: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white">
                      <option value="ONCE">仅一次</option><option value="DAILY">每天一次</option><option value="SESSION">每次会话</option><option value="ALWAYS">每次都弹</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1 text-xs">每日最多弹出次数</label>
                    <input type="number" value={ed.dailyLimit || 1} onChange={(e) => setEd({ ...ed, dailyLimit: parseInt(e.target.value) || 1 })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
                  </div>
                </div>
              </div>

              <div className="border-t border-[#2a2a2a] pt-3">
                <div className="text-sm font-bold mb-2">用户筛选（留空/0 表示不限制）</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-400 mb-1 text-xs">VIP 最低</label>
                    <input type="number" value={ed.targetVipMin || 0} onChange={(e) => setEd({ ...ed, targetVipMin: parseInt(e.target.value) || 0 })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1 text-xs">VIP 最高</label>
                    <input type="number" value={ed.targetVipMax || 99} onChange={(e) => setEd({ ...ed, targetVipMax: parseInt(e.target.value) || 99 })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1 text-xs">注册天数最少</label>
                    <input type="number" value={ed.registerDaysMin || 0} onChange={(e) => setEd({ ...ed, registerDaysMin: parseInt(e.target.value) || 0 })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1 text-xs">注册天数最多</label>
                    <input type="number" value={ed.registerDaysMax || 9999} onChange={(e) => setEd({ ...ed, registerDaysMax: parseInt(e.target.value) || 9999 })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1 text-xs">最低充值（分）</label>
                    <input type="number" value={ed.minRecharge || 0} onChange={(e) => setEd({ ...ed, minRecharge: parseInt(e.target.value) || 0 })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1 text-xs">用户标签（逗号分隔）</label>
                    <input value={ed.targetTags || ''} onChange={(e) => setEd({ ...ed, targetTags: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
                  </div>
                </div>
              </div>

              <div className="border-t border-[#2a2a2a] pt-3">
                <div className="text-sm font-bold mb-2">时间范围（留空=不限制）</div>
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
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" checked={ed.isActive} onChange={(e) => setEd({ ...ed, isActive: e.target.checked })} />启用</label>
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
