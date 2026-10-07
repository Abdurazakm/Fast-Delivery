/**
 * Mask tracking code for user privacy in notifications
 * e.g. "FD-523814" -> "FD-52***4"
 */
function maskTrackingCode(code) {
  if (!code) return "";
  const s = String(code).trim();
  const match = s.match(/^([A-Za-z]+-)(\d{2})\d{3}(\d+)$/);
  if (match) {
    return `${match[1]}${match[2]}***${match[3]}`;
  }
  if (s.length >= 8) {
    return `${s.slice(0, 5)}***${s.slice(8) || s.slice(-1)}`;
  }
  return s;
}

module.exports = { maskTrackingCode };
