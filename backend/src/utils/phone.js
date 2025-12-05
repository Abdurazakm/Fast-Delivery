// Normalize Ethiopian phone numbers 
function normalizePhone(raw) {
  if (!raw) return null;
  let s = String(raw).trim();

  // Remove spaces, dashes, parentheses
  s = s.replace(/[\s()-]/g, '');

  // Local 10-digit numbers starting with 09 or 07
  if (/^0[79]\d{8}$/.test(s)) {
    s = '+251' + s.slice(1);
  }

  // Local 9-digit numbers starting with 9 or 7
  if (/^[79]\d{8}$/.test(s)) {
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

  // Allow only +2519XXXXXXXX or +2517XXXXXXXX
  return /^\+251[79]\d{8}$/.test(normalized);
}

module.exports = { normalizePhone, isValidPhone };
