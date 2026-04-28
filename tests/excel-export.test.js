const XLSX = require('xlsx');
const { buildWorkbookBuffer } = require('../src/utils/excelExport');

describe('Excel export sanitization', () => {
  test('prefixes formula-like values so Excel treats them as text', () => {
    const workbookBuffer = buildWorkbookBuffer(
      [
        {
          visitorName: '=HYPERLINK("https://example.com")'
        }
      ],
      [
        {
          label: 'Visitor Name',
          get: (row) => row.visitorName
        }
      ],
      'Export'
    );

    const workbook = XLSX.read(workbookBuffer, { type: 'buffer' });
    const sheet = workbook.Sheets.Export;

    expect(sheet.A1.v).toBe('Visitor Name');
    expect(sheet.A2.t).toBe('s');
    expect(sheet.A2.v).toBe('\'=HYPERLINK("https://example.com")');
  });
});
