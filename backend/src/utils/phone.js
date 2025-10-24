// Very basic normalization for Ethiopian numbers; adjust as needed.
function normalizePhone(raw) {
  if (!raw) return null;
  let s = String(raw).trim();
  // remove spaces and non-digit except leading +
  s = s.replace(/[\s()-]/g, '');
  // if starts with 0 and length 10 -> convert to +251...
  if (/^0[1-9]/.test(s)) s = '+251' + s.slice(1);
  if (/^[1-9]\d{8}$/.test(s)) s = '+251' + s; // local without leading zero
  if (!s.startsWith('+')) s = '+' + s;
  return s;
}

function isValidPhone(s) {
  // Very simple validation: +2519XXXXXXXX or similar (9 digits after 251)
  if (!s) return false;
  const normalized = normalizePhone(s);
  return /^\+2519\d{8}$/.test(normalized);
}

module.exports = { normalizePhone, isValidPhone };
