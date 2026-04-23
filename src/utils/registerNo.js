const DEFAULT_TIME_ZONE = 'Europe/London';

function getDateKey(date = new Date(), timeZone = DEFAULT_TIME_ZONE) {
  const resolvedDate = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(resolvedDate.getTime())) {
    return null;
  }

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(resolvedDate);

  const lookup = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  );

  return `${lookup.year}-${lookup.month}-${lookup.day}`;
}

function normalizeDateOnly(value, timeZone = DEFAULT_TIME_ZONE) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }

    return getDateKey(value, timeZone);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return getDateKey(parsed, timeZone);
    }
  }

  return null;
}

function formatRegisterNo(date = new Date(), sequence = 1, prefix = 'V', timeZone = DEFAULT_TIME_ZONE) {
  const dateKey = getDateKey(date, timeZone);
  if (!dateKey) {
    throw new Error('Invalid date provided for register number generation');
  }

  const compactDateKey = dateKey.replace(/-/g, '');
  const safeSequence = Math.max(1, Number.parseInt(sequence, 10) || 1);
  return `${prefix}${compactDateKey}-${String(safeSequence).padStart(4, '0')}`;
}

module.exports = {
  DEFAULT_TIME_ZONE,
  formatRegisterNo,
  getDateKey,
  normalizeDateOnly
};
