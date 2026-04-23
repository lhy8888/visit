const VisitorRepository = require('../repositories/VisitorRepository');
const { buildCsv } = require('../utils/csvExport');

const EXPORT_COLUMNS = [
  { label: 'Register No', get: (row) => row.registerNo || row.register_no || '' },
  { label: 'Visitor Name', get: (row) => row.visitorName || row.visitor_name || '' },
  { label: 'Company', get: (row) => row.company || '' },
  { label: 'Email', get: (row) => row.email || '' },
  { label: 'Phone', get: (row) => row.phone || '' },
  { label: 'Host Name', get: (row) => row.hostName || row.host_name || '' },
  { label: 'Visit Purpose', get: (row) => row.visitPurpose || row.visit_purpose || '' },
  { label: 'Scheduled Date', get: (row) => row.scheduledDate || row.scheduled_date || '' },
  { label: 'Registered At', get: (row) => row.registeredAt || row.registered_at || '' },
  { label: 'Checked In At', get: (row) => row.checkedInAt || row.checked_in_at || '' },
  { label: 'Checked Out At', get: (row) => row.checkedOutAt || row.checked_out_at || '' },
  { label: 'Status', get: (row) => row.status || '' },
  { label: 'Source', get: (row) => row.source || '' },
  { label: 'Notes', get: (row) => row.notes || '' }
];

class ExportService {
  constructor(options = {}) {
    this.visitorRepository = options.visitorRepository || new VisitorRepository();
  }

  async exportVisitors(filters = {}) {
    const visitors = await this.visitorRepository.searchRegistrations(filters);
    const csv = buildCsv(visitors, EXPORT_COLUMNS);

    return {
      filename: 'visitor-register-export.csv',
      csv,
      count: visitors.length,
      columns: EXPORT_COLUMNS.map((column) => column.label)
    };
  }
}

module.exports = ExportService;
