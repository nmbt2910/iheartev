/**
 * Format number as Vietnamese Dong currency
 * @param {number} amount - The amount to format
 * @param {boolean} includeSymbol - Whether to include the ₫ symbol (default: true)
 * @returns {string} Formatted currency string (e.g., "1.000.000 ₫")
 */
export function formatVND(amount, includeSymbol = true) {
  if (amount == null || amount === '' || isNaN(amount)) {
    return includeSymbol ? '0 ₫' : '0';
  }
  
  const numAmount = typeof amount === 'string' ? parseFloat(amount.replace(/[.,]/g, '')) : amount;
  
  if (isNaN(numAmount)) {
    return includeSymbol ? '0 ₫' : '0';
  }
  
  // Format with dots as thousand separators (Vietnamese format)
  const formatted = numAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  return includeSymbol ? `${formatted} ₫` : formatted;
}

/**
 * Parse Vietnamese formatted currency string back to number
 * @param {string} formattedAmount - Formatted string (e.g., "1.000.000 ₫")
 * @returns {number} The numeric value
 */
export function parseVND(formattedAmount) {
  if (!formattedAmount) return 0;
  
  // Remove all non-digit characters except dots (for decimal separator if needed)
  const cleaned = formattedAmount.toString().replace(/[^\d.]/g, '');
  
  // Remove dots (thousand separators) and parse
  const withoutDots = cleaned.replace(/\./g, '');
  
  return parseFloat(withoutDots) || 0;
}

