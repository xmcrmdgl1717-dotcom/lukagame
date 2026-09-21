import { useMemo, useState } from 'react';

export type FieldType = 'text' | 'select' | 'number-range' | 'date-range';

export interface FieldConfig {
  key: string;
  label: string;
  type: FieldType;
  /** 用于从数据里取值的字段名，默认等于 key */
  field?: string;
  /** select 类型的可选项 */
  options?: { value: string; label: string }[];
  /** 占位文字 */
  placeholder?: string;
}

/**
 * 通用前端筛选 Hook
 */
export function useSearch<T extends Record<string, any>>(
  items: T[],
  fields: FieldConfig[]
) {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filtered = useMemo(() => {
    return items.filter((item) => {
      return fields.every((f) => {
        const raw = filters[f.key];
        if (raw === undefined || raw === null || raw === '') return true;
        const value = item[f.field || f.key];

        if (f.type === 'text') {
          return String(value ?? '').toLowerCase().includes(String(raw).toLowerCase());
        }
        if (f.type === 'select') {
          return String(value ?? '') === String(raw);
        }
        if (f.type === 'number-range') {
          const min = raw.min;
          const max = raw.max;
          if (min !== undefined && min !== '' && Number(value) < Number(min)) return false;
          if (max !== undefined && max !== '' && Number(value) > Number(max)) return false;
          return true;
        }
        if (f.type === 'date-range') {
          if (!value) return false;
          const t = new Date(value).getTime();
          if (raw.from) {
            const from = new Date(raw.from).setHours(0, 0, 0, 0);
            if (t < from) return false;
          }
          if (raw.to) {
            const to = new Date(raw.to).setHours(23, 59, 59, 999);
            if (t > to) return false;
          }
          return true;
        }
        return true;
      });
    });
  }, [items, filters, fields]);

  const reset = () => setFilters({});

  return { filters, setFilters, filtered, reset };
}
