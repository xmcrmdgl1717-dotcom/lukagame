// frontend/src/utils/price.js
// 价格换算 & 格式化工具

/**
 * 把"钻石数"转换成某法币价格（字符串，带符号）
 * @param {number} coins - 钻石数量
 * @param {object} fiat - 法币对象 { code, symbol, ratio }
 * @param {object} opts - 可选配置 { withSymbol: true }
 * @returns {string} 例如 "¥71.43" 或 "71.43"
 */
export function formatPrice(coins, fiat, opts = {}) {
  if (!fiat || !fiat.ratio || fiat.ratio <= 0) {
    return coins.toLocaleString();
  }
  const price = coins / fiat.ratio;
  // 日元等零小数币种
  const zeroDecimalCodes = ['JPY', 'KRW', 'VND'];
  const decimals = zeroDecimalCodes.includes(fiat.code) ? 0 : 2;
  const formatted = price.toFixed(decimals);
  if (opts.withSymbol === false) return formatted;
  return `${fiat.symbol}${formatted}`;
}

/**
 * 只返回数字部分
 */
export function priceNumber(coins, fiat) {
  if (!fiat || !fiat.ratio) return 0;
  return coins / fiat.ratio;
}

/**
 * 在 store.currency 里查找法币
 */
export function findFiat(currency, code) {
  if (!currency || !currency.fiats) return null;
  return currency.fiats.find(f => f.code === code) || null;
}

/**
 * 获取用户偏好的法币（根据 localStorage 或默认）
 */
export function getPreferredFiat(currency) {
  if (!currency || !currency.fiats || currency.fiats.length === 0) return null;
  const preferredCode = localStorage.getItem('luka_preferred_fiat');
  if (preferredCode) {
    const found = currency.fiats.find(f => f.code === preferredCode);
    if (found) return found;
  }
  return currency.fiats.find(f => f.isDefault) || currency.fiats[0];
}
