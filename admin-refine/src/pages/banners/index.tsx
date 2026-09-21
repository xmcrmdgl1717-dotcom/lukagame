import React, { useState } from 'react';
import { useTable, useCreate, useUpdate, useDelete } from '@refinedev/core';

interface BannerItem {
  id: string;
  imageUrl: string;
  link: string;
  title: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

const readFileAsBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export default function BannerList() {
  const { tableQueryResult } = useTable<BannerItem>({
    resource: 'banners',
    pagination: { pageSize: 100 },
  });

  const { mutate: createBanner } = useCreate();
  const { mutate: updateBanner } = useUpdate();
  const { mutate: deleteBanner } = useDelete();

  const [newBanner, setNewBanner] = useState({ imageUrl: '', link: '', title: '', sortOrder: 0 });
  const [creating, setCreating] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const banners = tableQueryResult.data?.data || [];

  const handleNewImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await readFileAsBase64(file);
    setNewBanner((b) => ({ ...b, imageUrl: base64 }));
  };

  const handleEditImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await readFileAsBase64(file);
    setEditForm((f: any) => ({ ...f, imageUrl: base64 }));
  };

  const handleCreate = () => {
    if (!newBanner.imageUrl) return alert('请上传或填写图片');
    setCreating(true);
    createBanner(
      { resource: 'banners', values: newBanner },
      {
        onSuccess: () => {
          setNewBanner({ imageUrl: '', link: '', title: '', sortOrder: 0 });
          setCreating(false);
          tableQueryResult.refetch();
        },
        onError: (err: any) => {
          alert('添加失败: ' + (err?.message || '未知错误'));
          setCreating(false);
        },
      }
    );
  };

  const openEdit = (b: BannerItem) => {
    setEditForm({ ...b });
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    setSaving(true);
    updateBanner(
      {
        resource: 'banners',
        id: editForm.id,
        values: {
          imageUrl: editForm.imageUrl,
          link: editForm.link,
          title: editForm.title,
          sortOrder: editForm.sortOrder,
        },
      },
      {
        onSuccess: () => {
          setShowEditModal(false);
          setSaving(false);
          tableQueryResult.refetch();
        },
        onError: (err: any) => {
          alert('保存失败: ' + (err?.message || '未知错误'));
          setSaving(false);
        },
      }
    );
  };

  const toggleStatus = (b: BannerItem) => {
    updateBanner(
      { resource: 'banners', id: b.id, values: { isActive: !b.isActive } },
      { onSuccess: () => tableQueryResult.refetch() }
    );
  };

  const handleDelete = (b: BannerItem) => {
    if (!confirm(`确定要删除轮播图「${b.title || b.id.slice(0, 8)}」吗？`)) return;
    deleteBanner(
      { resource: 'banners', id: b.id },
      {
        onSuccess: () => tableQueryResult.refetch(),
        onError: (err: any) => alert('删除失败: ' + (err?.message || '未知错误')),
      }
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">轮播图管理</h1>
        <div className="text-sm text-gray-500">共 {banners.length} 张</div>
      </div>

      {/* 新增 */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 mb-6">
        <div className="text-sm font-bold mb-3">新增轮播图</div>
        <div className="flex flex-wrap gap-2 items-center">
          <label className="cursor-pointer bg-[#2a2a2a] hover:bg-[#3a3a3a] text-xs px-3 py-2 rounded">
            选择图片
            <input type="file" accept="image/*" onChange={handleNewImage} className="hidden" />
          </label>
          {newBanner.imageUrl && (
            <img src={newBanner.imageUrl} className="h-12 rounded border border-[#2a2a2a]" />
          )}
          <input
            value={newBanner.link}
            onChange={(e) => setNewBanner({ ...newBanner, link: e.target.value })}
            placeholder="跳转链接"
            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm w-48 focus:outline-none focus:border-red-500"
          />
          <input
            value={newBanner.title}
            onChange={(e) => setNewBanner({ ...newBanner, title: e.target.value })}
            placeholder="标题"
            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm w-32 focus:outline-none focus:border-red-500"
          />
          <input
            type="number"
            value={newBanner.sortOrder}
            onChange={(e) => setNewBanner({ ...newBanner, sortOrder: parseInt(e.target.value) || 0 })}
            placeholder="排序"
            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm w-20 focus:outline-none focus:border-red-500"
          />
          <button
            onClick={handleCreate}
            disabled={creating}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm px-4 py-1.5 rounded font-bold"
          >
            {creating ? '添加中...' : '+ 添加'}
          </button>
        </div>
      </div>

      {/* 列表 */}
      {tableQueryResult.isLoading ? (
        <div className="text-center text-gray-500 py-20">加载中...</div>
      ) : banners.length === 0 ? (
        <div className="text-center text-gray-500 py-20">暂无轮播图</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {banners.map((b) => (
            <div key={b.id} className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4">
              {b.imageUrl && (
                <img
                  src={b.imageUrl}
                  className="w-full h-32 object-cover rounded mb-3"
                  alt={b.title}
                />
              )}
              <div className="text-sm font-bold mb-1">{b.title || '（无标题）'}</div>
              <div className="text-xs text-gray-500 mb-1 truncate">链接: {b.link || '-'}</div>
              <div className="text-xs text-gray-500 mb-3">排序: {b.sortOrder}</div>
              <div className="flex gap-2 flex-wrap">
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    b.isActive
                      ? 'bg-green-900/60 text-green-200'
                      : 'bg-red-900/60 text-red-200'
                  }`}
                >
                  {b.isActive ? '上架' : '下架'}
                </span>
                <button
                  onClick={() => openEdit(b)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded"
                >
                  编辑
                </button>
                <button
                  onClick={() => toggleStatus(b)}
                  className="bg-orange-600 hover:bg-orange-700 text-white text-xs px-3 py-1 rounded"
                >
                  {b.isActive ? '下架' : '上架'}
                </button>
                <button
                  onClick={() => handleDelete(b)}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 编辑弹窗 */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">编辑轮播图</h3>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-gray-400 mb-1 text-xs">图片</label>
                <label className="cursor-pointer inline-block bg-[#2a2a2a] hover:bg-[#3a3a3a] text-xs px-3 py-1.5 rounded mb-2">
                  选择新图片
                  <input type="file" accept="image/*" onChange={handleEditImage} className="hidden" />
                </label>
                {editForm.imageUrl && (
                  <img src={editForm.imageUrl} className="mt-2 h-24 rounded border border-[#2a2a2a]" />
                )}
              </div>
              <div>
                <label className="block text-gray-400 mb-1 text-xs">标题</label>
                <input
                  value={editForm.title || ''}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1 text-xs">跳转链接</label>
                <input
                  value={editForm.link || ''}
                  onChange={(e) => setEditForm({ ...editForm, link: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1 text-xs">排序</label>
                <input
                  type="number"
                  value={editForm.sortOrder ?? 0}
                  onChange={(e) => setEditForm({ ...editForm, sortOrder: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 bg-[#2a2a2a] rounded text-sm hover:bg-[#3a3a3a]"
              >
                取消
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 rounded text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
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
