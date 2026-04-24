const XLSX = require('xlsx');

function buildWorkbookBuffer(rows, columns, sheetName = 'Visitors') {
  const header = columns.map((column) => column.label);
  const data = rows.map((row) => columns.map((column) => column.get(row)));
  const sheet = XLSX.utils.aoa_to_sheet([header, ...data]);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  return XLSX.write(workbook, {
    type: 'buffer',
    bookType: 'xlsx',
    compression: true
  });
}

module.exports = {
  buildWorkbookBuffer
};
