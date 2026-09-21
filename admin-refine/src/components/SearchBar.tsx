import React, { useState } from 'react';
import type { FieldConfig } from '../hooks/useSearch';

interface SearchBarProps {
  fields: FieldConfig[];
  filters: Record<string, any>;
  setFilters: (f: Record<string, any>) => void;
  onReset: () => void;
  total: number;
  filtered: number;
  actions?: React.ReactNode; // 右侧操作按钮（如导出）
}

export default function SearchBar({
  fields, filters, setFilters, onReset, total, filtered, actions,
}: SearchBarProps) {
  const [expanded, setExpanded] = useState(false);

  const update = (key: string, value: any) => {
    setFilters({ ...filters, [key]: value });
  };

  const updateRange = (key: string, sub: 'min' | 'max' | 'from' | 'to', value: any) => {
    const cur = filters[key] || {};
    setFilters({ ...filters, [key]: { ...cur, [sub]: value } });
  };

  const hasActive = Object.keys(filters).some((k) => {
    const v = filters[k];
    if (!v) return false;
    if (typeof v === 'object') {
      return Object.values(v).some((x) => x !== undefined && x !== '');
    }
    return v !== '';
  });

  return (
    <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 mb-4">
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white text-sm px-4 py-1.5 rounded font-bold"
          >
            🔍 {expanded ? '收起筛选' : '高级筛选'}
            {hasActive && <span className="ml-2 bg-red-500 text-white text-[10px] rounded-full px-1.5">已启用</span>}
          </button>
          {hasActive && (
            <button
              onClick={onReset}
              className="text-xs text-gray-400 hover:text-white underline"
            >
              清空筛选
            </button>
          )}
          <div className="text-xs text-gray-500">
            显示 <span className="text-white font-bold">{filtered}</span> / {total} 条
          </div>
        </div>
        <div className="flex items-center gap-2">{actions}</div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-[#2a2a2a] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {fields.map((f) => {
            if (f.type === 'text') {
              return (
                <div key={f.key}>
                  <label className="block text-xs text-gray-400 mb-1">{f.label}</label>
                  <input
                    value={filters[f.key] || ''}
                    onChange={(e) => update(f.key, e.target.value)}
                    placeholder={f.placeholder || `输入${f.label}...`}
                    className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              );
            }
            if (f.type === 'select') {
              return (
                <div key={f.key}>
                  <label className="block text-xs text-gray-400 mb-1">{f.label}</label>
                  <select
                    value={filters[f.key] || ''}
                    onChange={(e) => update(f.key, e.target.value)}
                    className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-red-500"
                  >
                    <option value="">全部</option>
                    {f.options?.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              );
            }
            if (f.type === 'number-range') {
              return (
                <div key={f.key}>
                  <label className="block text-xs text-gray-400 mb-1">{f.label}（范围）</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={filters[f.key]?.min ?? ''}
                      onChange={(e) => updateRange(f.key, 'min', e.target.value)}
                      placeholder="最小"
                      className="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-red-500"
                    />
                    <input
                      type="number"
                      value={filters[f.key]?.max ?? ''}
                      onChange={(e) => updateRange(f.key, 'max', e.target.value)}
                      placeholder="最大"
                      className="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>
              );
            }
            if (f.type === 'date-range') {
              return (
                <div key={f.key}>
                  <label className="block text-xs text-gray-400 mb-1">{f.label}（时间范围）</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="date"
                      value={filters[f.key]?.from || ''}
                      onChange={(e) => updateRange(f.key, 'from', e.target.value)}
                      className="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-red-500"
                    />
                    <span className="text-gray-500 text-xs">至</span>
                    <input
                      type="date"
                      value={filters[f.key]?.to || ''}
                      onChange={(e) => updateRange(f.key, 'to', e.target.value)}
                      className="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>
              );
            }
            return null;
          })}
        </div>
      )}
    </div>
  );
}
