import React, { useState } from 'react';
import { useTable, useCreate, useUpdate, useDelete } from '@refinedev/core';
import SearchBar from '../../components/SearchBar';
import { useSearch } from '../../hooks/useSearch';

interface CardItem {
  id: string;
  name: string;
  rarity: string;
  imageUrl: string;
  description: string;
  value: number;
  allowTransfer: boolean;
  createdAt: string;
}

const RARITIES = [
  { value: 'SSR', label: 'SSR（传说）' },
  { value: 'SR', label: 'SR（稀有）' },
  { value: 'R', label: 'R（普通）' },
];

const readAsBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

const SEARCH_FIELDS = [
  { key: 'name', label: '卡牌名称', type: 'text' as const },
  { key: 'rarity', label: '稀有度', type: 'select' as const, options: RARITIES },
  { key: 'allowTransfer', label: '可转让', type: 'select' as const, options: [
    { value: 'true', label: '允许' },
    { value: 'false', label: '禁止' },
  ]},
  { key: 'createdAt', label: '创建时间', type: 'date-range' as const },
];

const rarityColor = (r: string) =>
  r === 'SSR' ? 'text-yellow-400' : r === 'SR' ? 'text-purple-400' : 'text-blue-400';

const emptyForm = {
  name: '',
  rarity: 'R',
  imageUrl: '',
  description: '',
  value: 0,
  allowTransfer: false,
};

export default function CardList() {
  const { tableQueryResult } = useTable<CardItem>({ resource: 'cards', pagination: { pageSize: 500 } });
  const { mutate: createCard } = useCreate();
  const { mutate: updateCard } = useUpdate();
  const { mutate: deleteCard } = useDelete();

  const all = tableQueryResult.data?.data || [];
  const { filters, setFilters, filtered, reset } = useSearch(all, SEARCH_FIELDS);

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [form, setForm] = useState<any>({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setModalMode('create');
    setForm({ ...emptyForm });
    setShowModal(true);
  };

  const openEdit = (c: CardItem) => {
    setModalMode('edit');
    setForm({ ...c });
    setShowModal(true);
  };

  const handleImg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) return alert('图片不能超过 2MB');
    const img = await readAsBase64(f);
    setForm((x: any) => ({ ...x, imageUrl: img }));
  };

  const handleSubmit = () => {
    if (!form.name || !form.name.trim()) return alert('请填写卡牌名称');
    if (!form.rarity) return alert('请选择稀有度');

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      rarity: form.rarity,
      imageUrl: form.imageUrl || '',
      description: form.description || '',
      value: parseInt(form.value) || 0,
      allowTransfer: !!form.allowTransfer,
    };

    const onSuccess = () => {
      setShowModal(false);
      setSaving(false);
      tableQueryResult.refetch();
    };
    const onError = (e: any) => {
      alert('保存失败: ' + (e?.message || '未知错误'));
      setSaving(false);
    };

    if (modalMode === 'create') {
      createCard({ resource: 'cards', values: payload }, { onSuccess, onError });
    } else {
      updateCard({ resource: 'cards', id: form.id, values: payload }, { onSuccess, onError });
    }
  };

  const handleDelete = (c: CardItem) => {
    if (!confirm(`确定删除卡牌「${c.name}」吗？\n\n⚠️ 该卡牌如果已在某些盲盒里配置，会一并移除概率配置。`)) return;
    deleteCard({ resource: 'cards', id: c.id }, {
      onSuccess: () => tableQueryResult.refetch(),
      onError: (e: any) => alert('删除失败: ' + (e?.message || '')),
    });
  };

  const transferableCount = all.filter(c => c.allowTransfer).length;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">卡牌管理</h1>
          <div className="text-xs text-gray-500 mt-1">
            共 {all.length} 张卡牌 · 其中 {transferableCount} 张允许用户间转让
          </div>
        </div>
        <button
          onClick={openCreate}
          className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded font-bold"
        >
          + 新建卡牌
        </button>
      </div>

      <SearchBar
        fields={SEARCH_FIELDS}
        filters={filters}
        setFilters={setFilters}
        onReset={reset}
        total={all.length}
        filtered={filtered.length}
      />

      {tableQueryResult.isLoading ? (
        <div className="text-center text-gray-500 py-20">加载中...</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filtered.map((c) => (
            <div key={c.id} className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-3 flex flex-col relative">
              {c.allowTransfer && (
                <div className="absolute top-2 right-2 bg-purple-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded z-10">
                  可赠
                </div>
              )}
              {c.imageUrl ? (
                <img src={c.imageUrl} className="w-full h-32 object-cover rounded mb-2" />
              ) : (
                <div className="w-full h-32 bg-[#0d0d0d] rounded mb-2 flex items-center justify-center text-3xl">🃏</div>
              )}
              <div className="text-sm font-bold truncate w-full text-center mb-1">{c.name}</div>
              <div className={`text-xs font-bold mb-1 text-center ${rarityColor(c.rarity)}`}>{c.rarity}</div>
              {c.description && (
                <div className="text-[10px] text-gray-500 text-center line-clamp-2 mb-2 min-h-[24px]" title={c.description}>
                  {c.description}
                </div>
              )}
              <div className="flex gap-1 w-full mt-auto">
                <button
                  onClick={() => openEdit(c)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs py-1 rounded"
                >
                  编辑
                </button>
                <button
                  onClick={() => handleDelete(c)}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs py-1 rounded"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-6 text-center text-gray-500 py-10">无匹配结果</div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">
              {modalMode === 'create' ? '🎴 新建卡牌' : `🎴 编辑卡牌: ${form.name}`}
            </h3>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-gray-400 mb-1 text-xs">
                  卡牌名称 <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.name || ''}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="如：皮卡丘"
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1 text-xs">
                    稀有度 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.rarity}
                    onChange={(e) => setForm({ ...form, rarity: e.target.value })}
                    className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white"
                  >
                    {RARITIES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 mb-1 text-xs">
                    参考价值（金币）
                  </label>
                  <input
                    type="number"
                    value={form.value ?? 0}
                    onChange={(e) => setForm({ ...form, value: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white"
                  />
                  <div className="text-[10px] text-gray-600 mt-1">用于产出价值统计，非实际交易价</div>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 mb-1 text-xs">卡面图片</label>
                <label className="cursor-pointer inline-block bg-[#2a2a2a] hover:bg-[#3a3a3a] text-xs px-3 py-1.5 rounded text-white">
                  选择图片
                  <input type="file" accept="image/*" onChange={handleImg} className="hidden" />
                </label>
                {form.imageUrl && (
                  <div className="mt-2 relative inline-block">
                    <img src={form.imageUrl} className="h-32 rounded border border-[#2a2a2a]" />
                    <button
                      onClick={() => setForm({ ...form, imageUrl: '' })}
                      className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 text-xs"
                    >×</button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-gray-400 mb-1 text-xs">卡牌说明</label>
                <textarea
                  rows={3}
                  value={form.description || ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="比如：稀有宝可梦，电属性……（用户在卡牌详情页可看到）"
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white text-xs"
                  maxLength={500}
                />
                <div className="text-[10px] text-gray-600 mt-1 text-right">
                  {(form.description || '').length} / 500
                </div>
              </div>

              <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg p-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!form.allowTransfer}
                    onChange={(e) => setForm({ ...form, allowTransfer: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-bold text-white">允许用户间转让/赠与</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      开启后，用户可以在「我的库存」将此卡牌无偿赠送给其他用户；关闭则不可转让。
                    </div>
                  </div>
                </label>
              </div>

              <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-2.5 text-[10px] text-yellow-200 leading-relaxed">
                ⚠️ 平台仅提供娱乐性的无偿赠与通道，不参与、不收费。开启转让功能请确保运营合规，避免私下交易变现。
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-[#2a2a2a] rounded text-sm"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-bold disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
