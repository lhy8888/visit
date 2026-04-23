const crypto = require('crypto');

function normalizePinLength(length, fallback = 6) {
  const parsed = Number.parseInt(length, 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return Math.min(6, Math.max(4, parsed));
}

function generatePin(length = 6) {
  const safeLength = normalizePinLength(length, 6);
  const max = 10 ** safeLength;
  const value = crypto.randomInt(0, max);
  return String(value).padStart(safeLength, '0');
}

module.exports = {
  generatePin,
  normalizePinLength
};
