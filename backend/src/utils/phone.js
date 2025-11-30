// Normalize Ethiopian phone numbers
function normalizePhone(raw) {
  if (!raw) return null;
  let s = String(raw).trim();

  // Remove spaces, dashes, parentheses
  s = s.replace(/[\s()-]/g, '');

  // Local 10-digit numbers starting with 0
  if (/^0[17]\d{8}$/.test(s)) {
    s = '+251' + s.slice(1); // convert 09XXXXXXXX or 07XXXXXXXX to +2519XXXXXXX / +2517XXXXXXX
  }

  // Local 9-digit numbers without leading zero
  if (/^[17]\d{8}$/.test(s)) {
    s = '+251' + s;
  }

  // Ensure leading +
  if (!s.startsWith('+')) s = '+' + s;

  return s;
}

// Validate Ethiopian EthioTel and Safaricom numbers
function isValidPhone(s) {
  if (!s) return false;
  const normalized = normalizePhone(s);

  // Only allow +2519XXXXXXXX (EthioTel) or +2517XXXXXXXX (Safaricom)
  return /^\+251[79]\d{8}$/.test(normalized);
}

module.exports = { normalizePhone, isValidPhone };
