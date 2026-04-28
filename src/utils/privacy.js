const DEFAULT_SENSITIVE_KEYS = new Set([
  'password',
  'pin',
  'pincode',
  'pin_code',
  'qrtoken',
  'qr_token',
  'token',
  'tokenhash',
  'token_hash',
  'email',
  'phone',
  'telephone',
  'notes'
]);

function normalizeKey(key) {
  return String(key || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function isSensitiveKey(key, sensitiveKeys = DEFAULT_SENSITIVE_KEYS) {
  return sensitiveKeys.has(normalizeKey(key));
}

function redactSensitiveData(value, options = {}) {
  const sensitiveKeys = options.sensitiveKeys || DEFAULT_SENSITIVE_KEYS;
  const seen = options.seen || new WeakMap();

  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value !== 'object') {
    return value;
  }

  if (seen.has(value)) {
    return seen.get(value);
  }

  if (Array.isArray(value)) {
    const redactedArray = [];
    seen.set(value, redactedArray);
    for (const item of value) {
      redactedArray.push(redactSensitiveData(item, { sensitiveKeys, seen }));
    }
    return redactedArray;
  }

  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack
    };
  }

  const redactedObject = {};
  seen.set(value, redactedObject);

  for (const [key, entry] of Object.entries(value)) {
    if (isSensitiveKey(key, sensitiveKeys)) {
      redactedObject[key] = '[REDACTED]';
      continue;
    }

    redactedObject[key] = redactSensitiveData(entry, { sensitiveKeys, seen });
  }

  return redactedObject;
}

module.exports = {
  DEFAULT_SENSITIVE_KEYS,
  redactSensitiveData
};
