import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://luka-1i4g.onrender.com';
const hdr = () => ({
  'x-admin-username': JSON.parse(localStorage.getItem('adminInfo') || 'null')?.username || '',
  'x-admin-password': localStorage.getItem('adminPassword') || '',
});

const fmtUptime = (sec: number) => {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const parts = [];
  if (d > 0) parts.push(`${d}天`);
  if (h > 0) parts.push(`${h}小时`);
  if (m > 0) parts.push(`${m}分`);
  parts.push(`${s}秒`);
  return parts.join(' ');
};

const fmtBytes = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
};

export default function SystemMonitorPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    try {
      const { data } = await axios.get(`${API_URL}/api/admin/system-stats`, { headers: hdr() });
      setData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    // 每 15 秒自动刷新
    const timer = setInterval(() => load(true), 15000);
    return () => clearInterval(timer);
  }, []);

  if (loading) return <div className="text-center text-gray-500 py-20">加载中...</div>;
  if (!data) return <div className="text-center text-gray-500 py-20">加载失败</div>;

  const mem = data.memory || {};
  const memUsedPct = mem.heapTotal ? (mem.heapUsed / mem.heapTotal) * 100 : 0;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">📡 系统监控</h1>
          <div className="text-xs text-gray-500 mt-1">每 15 秒自动刷新</div>
        </div>
        <button
          onClick={() => load()}
          disabled={refreshing}
          className="bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white text-xs px-4 py-1.5 rounded font-bold disabled:opacity-50"
        >
          {refreshing ? '刷新中...' : '🔄 刷新'}
        </button>
      </div>

      {/* 运行状态 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5">
          <div className="text-xs text-gray-500 mb-2">运行时长</div>
          <div className="text-2xl font-black text-green-400">{fmtUptime(data.uptime)}</div>
          <div className="text-[10px] text-gray-500 mt-2">启动于 {new Date(data.startedAt).toLocaleString()}</div>
        </div>
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5">
          <div className="text-xs text-gray-500 mb-2">Node 版本</div>
          <div className="text-2xl font-black text-cyan-400">{data.nodeVersion}</div>
          <div className="text-[10px] text-gray-500 mt-2">服务器当前时间 {new Date(data.now).toLocaleTimeString()}</div>
        </div>
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5">
          <div className="text-xs text-gray-500 mb-2">客户端错误（24h）</div>
          <div className={`text-2xl font-black ${data.clientErrors24h > 0 ? 'text-red-400' : 'text-gray-400'}`}>
            {data.clientErrors24h}
          </div>
          <div className="text-[10px] text-gray-500 mt-2">
            {data.clientErrors24h > 0 ? '⚠️ 有异常错误，请查看「错误日志」' : '✓ 无异常'}
          </div>
        </div>
      </div>

      {/* 内存 */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5 mb-6">
        <div className="text-sm font-bold mb-4">💾 内存使用</div>
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Heap 使用率</span>
            <span className="text-white font-bold">{memUsedPct.toFixed(1)}%</span>
          </div>
          <div className="h-3 bg-[#0d0d0d] rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${memUsedPct > 85 ? 'bg-gradient-to-r from-red-500 to-red-600' : memUsedPct > 65 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : 'bg-gradient-to-r from-green-500 to-emerald-500'}`}
              style={{ width: `${Math.min(memUsedPct, 100)}%` }}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="bg-[#0d0d0d] rounded p-2">
            <div className="text-gray-500 mb-1">RSS</div>
            <div className="text-white font-bold">{fmtBytes(mem.rss || 0)}</div>
          </div>
          <div className="bg-[#0d0d0d] rounded p-2">
            <div className="text-gray-500 mb-1">Heap Used</div>
            <div className="text-white font-bold">{fmtBytes(mem.heapUsed || 0)}</div>
          </div>
          <div className="bg-[#0d0d0d] rounded p-2">
            <div className="text-gray-500 mb-1">Heap Total</div>
            <div className="text-white font-bold">{fmtBytes(mem.heapTotal || 0)}</div>
          </div>
          <div className="bg-[#0d0d0d] rounded p-2">
            <div className="text-gray-500 mb-1">外部内存</div>
            <div className="text-white font-bold">{fmtBytes(mem.external || 0)}</div>
          </div>
        </div>
      </div>

      {/* 最近 24h 活跃 */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5 mb-6">
        <div className="text-sm font-bold mb-4">🔥 最近 24 小时活跃</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[#0d0d0d] rounded-lg p-3 text-center">
            <div className="text-[10px] text-gray-500 mb-1">新用户</div>
            <div className="text-lg font-black text-blue-400">{data.recent?.newUsers24h || 0}</div>
          </div>
          <div className="bg-[#0d0d0d] rounded-lg p-3 text-center">
            <div className="text-[10px] text-gray-500 mb-1">充值订单</div>
            <div className="text-lg font-black text-green-400">{data.recent?.orders24h || 0}</div>
          </div>
          <div className="bg-[#0d0d0d] rounded-lg p-3 text-center">
            <div className="text-[10px] text-gray-500 mb-1">抽卡次数</div>
            <div className="text-lg font-black text-orange-400">{data.recent?.draws24h || 0}</div>
          </div>
          <div className="bg-[#0d0d0d] rounded-lg p-3 text-center">
            <div className="text-[10px] text-gray-500 mb-1">新增工单</div>
            <div className="text-lg font-black text-purple-400">{data.recent?.tickets24h || 0}</div>
          </div>
        </div>
      </div>

      {/* 数据规模 */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5 mb-6">
        <div className="text-sm font-bold mb-4">📊 数据库规模</div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-[#0d0d0d] rounded-lg p-3 text-center">
            <div className="text-[10px] text-gray-500 mb-1">用户</div>
            <div className="text-lg font-black text-white">{(data.counts?.users || 0).toLocaleString()}</div>
          </div>
          <div className="bg-[#0d0d0d] rounded-lg p-3 text-center">
            <div className="text-[10px] text-gray-500 mb-1">订单</div>
            <div className="text-lg font-black text-white">{(data.counts?.orders || 0).toLocaleString()}</div>
          </div>
          <div className="bg-[#0d0d0d] rounded-lg p-3 text-center">
            <div className="text-[10px] text-gray-500 mb-1">抽卡记录</div>
            <div className="text-lg font-black text-white">{(data.counts?.draws || 0).toLocaleString()}</div>
          </div>
          <div className="bg-[#0d0d0d] rounded-lg p-3 text-center">
            <div className="text-[10px] text-gray-500 mb-1">账变记录</div>
            <div className="text-lg font-black text-white">{(data.counts?.transactions || 0).toLocaleString()}</div>
          </div>
          <div className="bg-[#0d0d0d] rounded-lg p-3 text-center">
            <div className="text-[10px] text-gray-500 mb-1">审计日志</div>
            <div className="text-lg font-black text-white">{(data.counts?.logs || 0).toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* 慢请求 */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#2a2a2a] flex justify-between items-center">
          <div className="text-sm font-bold">🐢 慢请求记录（阈值 &gt; {data.slowThresholdMs || 800}ms）</div>
          <div className="text-xs text-gray-500">最近 {data.slowRequests?.length || 0} 条</div>
        </div>
        {(data.slowRequests || []).length === 0 ? (
          <div className="text-center text-gray-500 py-10 text-sm">✓ 暂无慢请求</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#1f1f1f] text-gray-400 text-xs uppercase">
                <tr>
                  <th className="p-2">时间</th>
                  <th className="p-2">方法</th>
                  <th className="p-2">路径</th>
                  <th className="p-2 text-center">耗时</th>
                  <th className="p-2 text-center">状态</th>
                </tr>
              </thead>
              <tbody>
                {data.slowRequests.map((r: any, i: number) => (
                  <tr key={i} className="border-b border-[#1f1f1f] last:border-0">
                    <td className="p-2 text-gray-400 text-xs">{new Date(r.at).toLocaleTimeString()}</td>
                    <td className="p-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${r.method === 'GET' ? 'bg-blue-900/60 text-blue-200' : 'bg-orange-900/60 text-orange-200'}`}>
                        {r.method}
                      </span>
                    </td>
                    <td className="p-2 font-mono text-xs text-gray-300 max-w-[400px] truncate" title={r.path}>{r.path}</td>
                    <td className={`p-2 text-center font-bold ${r.duration > 2000 ? 'text-red-400' : 'text-yellow-400'}`}>
                      {r.duration} ms
                    </td>
                    <td className="p-2 text-center text-gray-400">{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 mt-4 text-xs text-gray-400">
        💡 <span className="text-white font-bold">提示：</span>
        <div className="mt-2 space-y-1">
          <div>• 健康检查端点：<a href={`${API_URL}/api/health`} target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline">{API_URL}/api/health</a>（可用于 UptimeRobot 等监控）</div>
          <div>• 慢请求阈值 800ms，超过会记录在内存（最多 100 条）</div>
          <div>• 内存使用率超过 85% 需要关注，可能需要升级服务器或优化代码</div>
        </div>
      </div>
    </div>
  );
}
