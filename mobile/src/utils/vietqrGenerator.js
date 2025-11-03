/**
 * VietQR EMV QR Code Generator
 * Based on EMV QR Code Payment System specification for Vietnam (NAPAS)
 * Reference: https://www.emvco.com/emv-technologies/qrcodes/
 */

/**
 * Pad a number with leading zeros to specified length
 */
function padLeft(value, length) {
  const str = String(value);
  return str.padStart(length, '0');
}

/**
 * Format amount to VND string (remove decimals, format as integer)
 */
function formatAmount(amount) {
  // Remove decimals, convert to integer
  const intAmount = Math.floor(amount || 0);
  return String(intAmount);
}

/**
 * Generate EMV QR Code data string for VietQR
 * Follows EMV QR Code Payment System specification
 * @param {string} bankCode - Bank code (e.g., '970415' for Vietcombank)
 * @param {string} accountNumber - Account number
 * @param {number} amount - Amount in VND (optional)
 * @param {string} transactionContent - Transaction content/description (optional)
 * @returns {string} EMV QR Code data string
 */
export function generateVietQR(bankCode, accountNumber, amount = null, transactionContent = '') {
  if (!bankCode || !accountNumber) {
    throw new Error('Bank code and account number are required');
  }

  let qrString = '';

  // 00: Payload Format Indicator (fixed value: 01)
  qrString += '000201';

  // 01: Point of Initiation Method 
  // 11 = static (fixed amount), 12 = dynamic (variable amount)
  // We use 12 for dynamic since amount might vary
  qrString += '010212';

  // 38: Merchant Account Information Template (ID: 38)
  // This contains VietQR-specific payment information
  let merchantInfo = '';

  // 00: Globally Unique Identifier (GUID)
  // 'A000000727' is the NAPAS/VietQR identifier (10 bytes = 16 chars in hex, but we use ASCII)
  merchantInfo += '0010A000000727';

  // Sub-fields within Merchant Account Information:
  // 01: Bank identifier (bank code)
  const bankCodeStr = String(bankCode);
  merchantInfo += '01' + padLeft(bankCodeStr.length, 2) + bankCodeStr;
  
  // 02: Account number
  const accountStr = String(accountNumber);
  merchantInfo += '02' + padLeft(accountStr.length, 2) + accountStr;

  // 03: Amount (optional, only if amount is specified)
  if (amount && amount > 0) {
    const amountStr = formatAmount(amount);
    merchantInfo += '03' + padLeft(amountStr.length, 2) + amountStr;
  }

  // 08: Transaction content/description (optional)
  if (transactionContent && transactionContent.trim()) {
    // Limit content length and handle special characters
    let content = transactionContent.trim();
    // VietQR typically supports up to 25 characters, but may vary
    if (content.length > 25) {
      content = content.substring(0, 25);
    }
    merchantInfo += '08' + padLeft(content.length, 2) + content;
  }

  // Add merchant account information to main QR string
  qrString += '38' + padLeft(merchantInfo.length, 2) + merchantInfo;

  // 53: Transaction Currency (704 = Vietnamese Dong - VND)
  qrString += '5303704';

  // 54: Transaction Amount (if specified)
  // Note: If amount is in merchant info (field 03), it's also here for compatibility
  if (amount && amount > 0) {
    const amountStr = formatAmount(amount);
    qrString += '54' + padLeft(amountStr.length, 2) + amountStr;
  }

  // 58: Country Code (VN = Vietnam, ISO 3166-1 alpha-2)
  qrString += '5802VN';

  // 62: Additional Data Field Template (optional)
  // Used for reference number, purpose, etc.
  // We can use this for transaction content if needed, but it's already in merchant info

  // Calculate and append CRC (Cyclic Redundancy Check)
  // CRC is calculated over the entire string before adding the CRC field
  const crc = calculateCRC16(qrString);
  qrString += '63' + padLeft(crc.toString(16).toUpperCase(), 4);

  return qrString;
}

/**
 * Calculate CRC16/CCITT-FALSE checksum
 * This is required for EMV QR codes
 * Algorithm: CRC-16/CCITT-FALSE (polynomial 0x1021)
 */
function calculateCRC16(data) {
  let crc = 0xFFFF; // Initial value
  
  for (let i = 0; i < data.length; i++) {
    crc ^= (data.charCodeAt(i) & 0xFF) << 8;
    
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  
  return crc & 0xFFFF;
}

