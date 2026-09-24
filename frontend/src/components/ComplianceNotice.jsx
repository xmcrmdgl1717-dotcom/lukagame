import { useState, useEffect } from 'react';

const STORAGE_KEY = 'luka-compliance-agreed';

export default function ComplianceNotice() {
  const [show, setShow] = useState(false);
  const [checked, setChecked] = useState(false);
  const [isAdult, setIsAdult] = useState(false);
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    try {
      const agreed = localStorage.getItem(STORAGE_KEY);
      if (!agreed) {
        // 延迟 800ms 展示，避免和首屏渲染抢资源
        const t = setTimeout(() => setShow(true), 800);
        return () => clearTimeout(t);
      }
    } catch {}
  }, []);

  const confirm = () => {
    if (!isAdult || !consent) return;
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {}
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[400] flex items-center justify-center p-4">
      <div className="bg-[#1a0f0c] border border-[#3d1a1a] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="bg-gradient-to-br from-[#b83d22] to-[#9a2c18] p-5 text-center">
          <div className="text-2xl font-black italic text-white tracking-widest mb-1">LUKA!</div>
          <div className="text-xs text-white/80">重要提示</div>
        </div>

        {/* 内容 */}
        <div className="p-5 space-y-4">
          {/* 年龄限制 */}
          <div className="bg-[#0d0d0d] border border-[#2a1414] rounded-xl p-3.5">
            <div className="text-sm font-bold text-white mb-2">🔞 年龄限制</div>
            <div className="text-xs text-gray-400 leading-relaxed">
              本平台仅面向 <span className="text-orange-400 font-bold">18 周岁及以上</span> 用户开放。
              未成年人禁止注册、充值、抽奖。
            </div>
          </div>

          {/* 消费提示 */}
          <div className="bg-[#0d0d0d] border border-[#2a1414] rounded-xl p-3.5">
            <div className="text-sm font-bold text-white mb-2">💰 理性消费</div>
            <div className="text-xs text-gray-400 leading-relaxed">
              抽卡结果具有随机性，<span className="text-orange-400 font-bold">不构成任何投资或收益承诺</span>。
              请根据自身经济状况理性消费，量力而行。
            </div>
          </div>

          {/* 概率公示 */}
          <div className="bg-[#0d0d0d] border border-[#2a1414] rounded-xl p-3.5">
            <div className="text-sm font-bold text-white mb-2">📊 概率公示</div>
            <div className="text-xs text-gray-400 leading-relaxed">
              所有盲盒的卡牌概率均在商品详情页公示，可随时查看。
              平台承诺不进行任何形式的暗箱操作或概率操纵。
            </div>
          </div>

          {/* 虚拟物品说明 */}
          <div className="bg-[#0d0d0d] border border-[#2a1414] rounded-xl p-3.5">
            <div className="text-sm font-bold text-white mb-2">⚠️ 虚拟物品说明</div>
            <div className="text-xs text-gray-400 leading-relaxed">
              平台内虚拟物品仅供娱乐。用户间赠与是无偿行为，<span className="text-orange-400 font-bold">严禁任何形式的现金交易或变现</span>。
              如发现异常交易行为，平台有权冻结账号。
            </div>
          </div>

          {/* 勾选项 */}
          <div className="space-y-2 pt-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isAdult}
                onChange={(e) => setIsAdult(e.target.checked)}
                className="mt-0.5 w-4 h-4 flex-shrink-0"
              />
              <span className="text-xs text-gray-300 leading-relaxed">
                我已年满 <span className="text-orange-400 font-bold">18 周岁</span>，且了解虚拟物品的娱乐性质
              </span>
            </label>
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 w-4 h-4 flex-shrink-0"
              />
              <span className="text-xs text-gray-300 leading-relaxed">
                我已阅读并同意
                <a href="/page/static/terms" target="_blank" rel="noopener noreferrer" className="text-orange-400 underline mx-1">《用户协议》</a>
                和
                <a href="/page/static/privacy" target="_blank" rel="noopener noreferrer" className="text-orange-400 underline ml-1">《隐私政策》</a>
              </span>
            </label>
          </div>
        </div>

        {/* 按钮 */}
        <div className="p-4 border-t border-[#2a1414]">
          <button
            onClick={confirm}
            disabled={!isAdult || !consent}
            className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold py-3 rounded-xl shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            我已阅读并同意，开始使用
          </button>
          <div className="text-[10px] text-gray-600 text-center mt-2">
            确认后不再重复展示
          </div>
        </div>
      </div>
    </div>
  );
}
