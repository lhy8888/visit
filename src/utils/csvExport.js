function escapeCsvValue(value) {
  if (value === undefined || value === null) {
    return '';
  }

  const normalized = String(value).replace(/\r?\n/g, ' ').trim();
  if (normalized === '') {
    return '';
  }

  if (/[",;]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }

  return normalized;
}

function buildCsv(rows, columns) {
  const header = columns.map((column) => escapeCsvValue(column.label)).join(',');
  const body = rows
    .map((row) => columns.map((column) => escapeCsvValue(column.get(row))).join(','))
    .join('\r\n');

  return `\ufeff${header}${body ? `\r\n${body}` : ''}`;
}

module.exports = {
  buildCsv,
  escapeCsvValue
};
