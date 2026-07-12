export const CURRENCY_CODE = 'INR';
export const CURRENCY_SYMBOL = '₹';

/** Legacy demo data was stored in USD; 1 USD = 83 INR */
export const USD_TO_INR = 83;

/**
 * Convert a USD amount to INR using the platform exchange rate.
 * @param {number|string|null|undefined} usdAmount
 */
export function convertUsdToInr(usdAmount) {
  const value = Number(usdAmount);
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * USD_TO_INR * 100) / 100;
}

/**
 * Format a numeric amount in Indian Rupees.
 * @param {number|string|null|undefined} amount
 * @param {{ compact?: boolean, minimumFractionDigits?: number, maximumFractionDigits?: number }} [options]
 */
export function formatINR(amount, options = {}) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return `${CURRENCY_SYMBOL}0`;

  const {
    compact = false,
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = options;

  if (compact) {
    return `${CURRENCY_SYMBOL}${value.toLocaleString('en-IN', {
      maximumFractionDigits: 0,
    })}`;
  }

  return `${CURRENCY_SYMBOL}${value.toLocaleString('en-IN', {
    minimumFractionDigits,
    maximumFractionDigits,
  })}`;
}
