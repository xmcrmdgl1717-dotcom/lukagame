import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useGetIdentity } from '@refinedev/core';

const API_URL = import.meta.env.VITE_API_URL || 'https://luka-1i4g.onrender.com';

const hdr = () => ({
  'x-admin-username': JSON.parse(localStorage.getItem('adminInfo') || 'null')?.username || '',
  'x-admin-password': localStorage.getItem('adminPassword') || '',
  'Content-Type': 'application/json',
});

type Step = 'idle' | 'scanning' | 'backupCodes';

export default function SecurityPage() {
  const { data: identity } = useGetIdentity<any>();
  const [status, setStatus] = useState<{ enabled: boolean; verifiedAt: string | null; backupCodesLeft: number } | null>(null);
  const [loading, setLoading] = useState(true);

  // 启用流程
  const [step, setStep] = useState<Step>('idle');
  const [setupData, setSetupData] = useState<{ secret: string; otpauth: string; qrDataUrl: string; plainBackupCodes: string[] } | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [enabling, setEnabling] = useState(false);
  const [enableError, setEnableError] = useState('');

  // 停用 / 重新生成备份码流程
  const [showDisable, setShowDisable] = useState(false);
  const [showRegen, setShowRegen] = useState(false);
  const [disableForm, setDisableForm] = useState({ password: '', code: '' });
  const [regenForm, setRegenForm] = useState({ password: '', code: '' });
  const [newBackupCodes, setNewBackupCodes] = useState<string[] | null>(null);
  const [working, setWorking] = useState(false);
  const [opError, setOpError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_URL}/api/admin/2fa/status`, { headers: hdr() });
      setStatus(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const startSetup = async () => {
    setEnableError('');
    try {
      const { data } = await axios.post(`${API_URL}/api/admin/2fa/setup`, {}, { headers: hdr() });
      setSetupData(data);
      setVerifyCode('');
      setStep('scanning');
    } catch (e: any) {
      alert('生成失败: ' + (e.response?.data?.error || e.message));
    }
  };

  const confirmEnable = async () => {
    if (!/^\d{6}$/.test(verifyCode.trim())) return setEnableError('请输入 6 位数字验证码');
    setEnabling(true);
    setEnableError('');
    try {
      await axios.post(`${API_URL}/api/admin/2fa/enable`, {
        secret: setupData?.secret,
        code: verifyCode.trim(),
        plainBackupCodes: setupData?.plainBackupCodes,
      }, { headers: hdr() });
      setStep('backupCodes');
    } catch (e: any) {
      setEnableError(e.response?.data?.error || '启用失败');
    } finally {
      setEnabling(false);
    }
  };

  const finishSetup = () => {
    setStep('idle');
    setSetupData(null);
    setVerifyCode('');
    load();
  };

  const confirmDisable = async () => {
    if (!disableForm.password || !disableForm.code) return setOpError('请填写密码和验证码');
    setWorking(true);
    setOpError('');
    try {
      await axios.post(`${API_URL}/api/admin/2fa/disable`, {
        password: disableForm.password,
        code: disableForm.code.trim(),
      }, { headers: hdr() });
      setShowDisable(false);
      setDisableForm({ password: '', code: '' });
      load();
    } catch (e: any) {
      setOpError(e.response?.data?.error || '操作失败');
    } finally {
      setWorking(false);
    }
  };

  const confirmRegen = async () => {
    if (!regenForm.password || !regenForm.code) return setOpError('请填写密码和验证码');
    setWorking(true);
    setOpError('');
    try {
      const { data } = await axios.post(`${API_URL}/api/admin/2fa/regenerate-backup`, {
        password: regenForm.password,
        code: regenForm.code.trim(),
      }, { headers: hdr() });
      setNewBackupCodes(data.plainBackupCodes);
      setShowRegen(false);
      setRegenForm({ password: '', code: '' });
      load();
    } catch (e: any) {
      setOpError(e.response?.data?.error || '操作失败');
    } finally {
      setWorking(false);
    }
  };

  const copyCodes = (codes: string[]) => {
    navigator.clipboard.writeText(codes.join('\n'));
    alert('✅ 已复制到剪贴板');
  };

  const downloadCodes = (codes: string[]) => {
    const text = `LUKA 后台备份码\n生成时间：${new Date().toLocaleString()}\n管理员：${identity?.name || '-'}\n\n${codes.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n\n请妥善保管，每个备份码只能使用一次。`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `luka-backup-codes-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="text-center text-gray-500 py-20">加载中...</div>;

  // ============ 阶段 3：展示备份码 ============
  if (step === 'backupCodes' && setupData) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">🔐 账号安全</h1>
        <div className="bg-[#161616] border border-yellow-700/50 rounded-xl p-6 max-w-2xl">
          <div className="text-xl font-bold text-yellow-400 mb-2">⚠️ 请立即保存您的备份码</div>
          <div className="text-sm text-gray-400 mb-5 leading-relaxed">
            当您无法访问 Authenticator 应用时，可使用备份码登录。<br />
            每个备份码<strong className="text-white">只能使用一次</strong>，此页面关闭后无法再次查看。
          </div>

          <div className="bg-[#0d0d0d] rounded-lg p-4 mb-4 font-mono text-sm">
            <div className="grid grid-cols-2 gap-2">
              {setupData.plainBackupCodes.map((c, i) => (
                <div key={i} className="text-green-400 tracking-widest">
                  {String(i + 1).padStart(2, '0')}. {c}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 mb-6">
            <button onClick={() => copyCodes(setupData.plainBackupCodes)} className="flex-1 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white py-2 rounded text-sm">
              📋 复制全部
            </button>
            <button onClick={() => downloadCodes(setupData.plainBackupCodes)} className="flex-1 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white py-2 rounded text-sm">
              ⬇️ 下载为 TXT
            </button>
          </div>

          <button onClick={finishSetup} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded font-bold">
            ✅ 我已保存好备份码
          </button>
        </div>
      </div>
    );
  }

  // ============ 阶段 2：扫码 + 验证 ============
  if (step === 'scanning' && setupData) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">🔐 启用两步验证</h1>
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-6 max-w-2xl">
          <div className="text-sm text-gray-400 mb-4">
            请使用 Authenticator 应用（Google / Microsoft / Authy / 1Password）扫描下方二维码。
          </div>

          <div className="flex flex-col md:flex-row gap-6 mb-6">
            <div className="flex-shrink-0">
              <img src={setupData.qrDataUrl} alt="2FA QR" className="w-48 h-48 rounded-lg border border-[#2a2a2a]" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-gray-500 mb-2">扫码不成功？手动输入密钥：</div>
              <div className="bg-[#0d0d0d] rounded-lg p-3 font-mono text-xs text-cyan-300 break-all mb-4">
                {setupData.secret}
              </div>

              <div className="text-xs text-gray-500 mb-2">验证：输入 Authenticator 显示的 6 位数字</div>
              <input
                type="text"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                autoFocus
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-4 py-3 text-white text-center text-2xl tracking-widest font-mono focus:outline-none focus:border-orange-500"
              />
              {enableError && (
                <div className="mt-2 bg-red-900/20 border border-red-700/50 rounded px-3 py-2 text-red-300 text-xs">
                  {enableError}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => { setStep('idle'); setSetupData(null); setVerifyCode(''); }}
              className="px-4 py-2.5 bg-[#2a2a2a] rounded text-sm"
            >
              取消
            </button>
            <button
              onClick={confirmEnable}
              disabled={enabling || verifyCode.length !== 6}
              className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white py-2.5 rounded font-bold"
            >
              {enabling ? '验证中...' : '验证并启用'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============ 阶段 1：状态页 ============
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">🔐 账号安全</h1>

      {/* 当前登录信息 */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-xs text-gray-500 mb-1">当前登录管理员</div>
            <div className="text-lg font-bold text-white">{identity?.name || 'admin'}</div>
          </div>
          <div className="text-4xl">👤</div>
        </div>
      </div>

      {/* 2FA 状态卡片 */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-lg font-bold text-white">🔐 两步验证 (2FA)</div>
            <div className="text-xs text-gray-500 mt-1">
              使用 TOTP 应用生成动态验证码，登录时需二次验证，防止密码泄露
            </div>
          </div>
          <span className={`px-3 py-1 rounded text-xs font-bold ${
            status?.enabled ? 'bg-green-900/60 text-green-300' : 'bg-gray-700 text-gray-300'
          }`}>
            {status?.enabled ? '✓ 已启用' : '○ 未启用'}
          </span>
        </div>

        {status?.enabled ? (
          <>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-[#0d0d0d] rounded-lg p-3">
                <div className="text-[10px] text-gray-500 mb-1">最后验证时间</div>
                <div className="text-sm text-gray-300">
                  {status.verifiedAt ? new Date(status.verifiedAt).toLocaleString() : '-'}
                </div>
              </div>
              <div className="bg-[#0d0d0d] rounded-lg p-3">
                <div className="text-[10px] text-gray-500 mb-1">剩余备份码</div>
                <div className={`text-sm font-bold ${status.backupCodesLeft <= 2 ? 'text-red-400' : 'text-green-400'}`}>
                  {status.backupCodesLeft} / 8
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setShowRegen(true); setOpError(''); }}
                className="flex-1 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white py-2.5 rounded text-sm"
              >
                🔄 重新生成备份码
              </button>
              <button
                onClick={() => { setShowDisable(true); setOpError(''); }}
                className="flex-1 bg-red-900/40 hover:bg-red-900/60 text-red-300 py-2.5 rounded text-sm border border-red-700/50"
              >
                🚫 停用 2FA
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-3 text-xs text-yellow-200 mb-5">
              💡 强烈建议启用两步验证。启用后，即使密码泄露，攻击者也无法登录后台。
            </div>
            <button
              onClick={startSetup}
              className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white py-3 rounded font-bold"
            >
              🔐 立即启用两步验证
            </button>
          </>
        )}
      </div>

      {/* 说明 */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 text-xs text-gray-400 leading-relaxed">
        💡 <span className="text-white font-bold">关于两步验证：</span>
        <div className="mt-2 space-y-1">
          <div>• 兼容 Google Authenticator / Microsoft Authenticator / Authy / 1Password</div>
          <div>• 登录时需要输入密码 + 手机应用生成的 6 位动态码</div>
          <div>• 备份码丢失且手机损坏时可一次性登录，用完请重新生成</div>
          <div>• 建议立即启用，特别是拥有「超级管理员」权限的账号</div>
        </div>
      </div>

      {/* 停用弹窗 */}
      {showDisable && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-1 text-red-400">停用两步验证</h3>
            <div className="text-xs text-gray-500 mb-4">
              ⚠️ 停用后，登录将只需密码，安全性会显著降低。
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-gray-400 mb-1 text-xs">登录密码</label>
                <input type="password" value={disableForm.password} onChange={(e) => setDisableForm({ ...disableForm, password: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
              </div>
              <div>
                <label className="block text-gray-400 mb-1 text-xs">当前验证码</label>
                <input type="text" value={disableForm.code} onChange={(e) => setDisableForm({ ...disableForm, code: e.target.value.replace(/\D/g, '').slice(0, 6) })} placeholder="000000" maxLength={6} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white text-center font-mono tracking-widest" />
              </div>
              {opError && <div className="bg-red-900/20 border border-red-700/50 rounded px-3 py-2 text-red-300 text-xs">{opError}</div>}
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => { setShowDisable(false); setOpError(''); }} className="px-4 py-2 bg-[#2a2a2a] rounded text-sm">取消</button>
              <button onClick={confirmDisable} disabled={working} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm font-bold disabled:opacity-50">{working ? '停用中...' : '确认停用'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 重新生成备份码弹窗 */}
      {showRegen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-1">重新生成备份码</h3>
            <div className="text-xs text-gray-500 mb-4">
              生成后，旧的备份码全部作废，请重新保存新的备份码。
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-gray-400 mb-1 text-xs">登录密码</label>
                <input type="password" value={regenForm.password} onChange={(e) => setRegenForm({ ...regenForm, password: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
              </div>
              <div>
                <label className="block text-gray-400 mb-1 text-xs">当前验证码</label>
                <input type="text" value={regenForm.code} onChange={(e) => setRegenForm({ ...regenForm, code: e.target.value.replace(/\D/g, '').slice(0, 6) })} placeholder="000000" maxLength={6} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white text-center font-mono tracking-widest" />
              </div>
              {opError && <div className="bg-red-900/20 border border-red-700/50 rounded px-3 py-2 text-red-300 text-xs">{opError}</div>}
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => { setShowRegen(false); setOpError(''); }} className="px-4 py-2 bg-[#2a2a2a] rounded text-sm">取消</button>
              <button onClick={confirmRegen} disabled={working} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-bold disabled:opacity-50">{working ? '生成中...' : '确认生成'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 新备份码展示弹窗 */}
      {newBackupCodes && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] rounded-xl border border-yellow-700/50 p-6 w-full max-w-lg">
            <h3 className="text-lg font-bold text-yellow-400 mb-2">⚠️ 请保存新的备份码</h3>
            <div className="text-xs text-gray-400 mb-4">此窗口关闭后无法再次查看。</div>
            <div className="bg-[#0d0d0d] rounded-lg p-4 mb-4 font-mono text-sm">
              <div className="grid grid-cols-2 gap-2">
                {newBackupCodes.map((c, i) => (
                  <div key={i} className="text-green-400 tracking-widest">{String(i + 1).padStart(2, '0')}. {c}</div>
                ))}
              </div>
            </div>
            <div className="flex gap-2 mb-4">
              <button onClick={() => copyCodes(newBackupCodes)} className="flex-1 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white py-2 rounded text-sm">📋 复制全部</button>
              <button onClick={() => downloadCodes(newBackupCodes)} className="flex-1 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white py-2 rounded text-sm">⬇️ 下载 TXT</button>
            </div>
            <button onClick={() => setNewBackupCodes(null)} className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded font-bold text-sm">
              我已保存
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
