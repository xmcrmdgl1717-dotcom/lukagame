import React from 'react';

interface BarChartProps {
  data: { label: string; value: number }[];
  color?: string;
  height?: number; // 图表区域高度，默认 200px
  formatValue?: (v: number) => string;
}

export default function SimpleBarChart({
  data, color = '#dc2626', height = 200, formatValue,
}: BarChartProps) {
  if (!data || data.length === 0) {
    return <div className="text-center text-gray-500 py-10 text-sm">暂无数据</div>;
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div>
      <div className="flex items-end gap-2" style={{ height }}>
        {data.map((d, i) => {
          const percent = (d.value / maxValue) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full relative group">
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-black border border-[#2a2a2a] px-2 py-1 rounded text-xs whitespace-nowrap z-10">
                {formatValue ? formatValue(d.value) : d.value.toLocaleString()}
              </div>
              {/* Bar */}
              <div
                className="w-full rounded-t transition-all hover:opacity-80"
                style={{
                  height: `${Math.max(percent, 2)}%`,
                  backgroundColor: color,
                  minHeight: '4px',
                }}
              ></div>
            </div>
          );
        })}
      </div>
      {/* X labels */}
      <div className="flex gap-2 mt-2">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center text-[10px] text-gray-500 truncate">
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}
