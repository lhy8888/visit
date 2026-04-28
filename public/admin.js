const loginCard = document.getElementById('login-card');
const dashboardCard = document.getElementById('dashboard');
const statusMessage = document.getElementById('status-message');
const loginForm = document.getElementById('login-form');
const loginButton = document.getElementById('login-button');
const clearLoginButton = document.getElementById('clear-login');
const logoutButton = document.getElementById('logout-button');
const refreshButton = document.getElementById('refresh-dashboard');
const exportButton = document.getElementById('export-button');
const historyForm = document.getElementById('history-form');
const historyResetButton = document.getElementById('history-reset');
const summaryMetrics = document.getElementById('summary-metrics');
const visitorTableTitle = document.getElementById('visitor-table-title');
const visitorTableCount = document.getElementById('visitor-table-count');
const visitorTableBody = document.getElementById('visitor-table-body');
const sessionBanner = document.getElementById('session-banner');
const settingsList = document.getElementById('settings-list');

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short'
});

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium'
});

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeStyle: 'short'
});

const state = {
  session: null,
  filters: {}
};

function setStatus(message, isError = false) {
  if (!statusMessage) {
    return;
  }

  statusMessage.textContent = message || '';
  statusMessage.classList.toggle('error', Boolean(isError));
}

function showDashboard(isVisible) {
  if (loginCard) {
    loginCard.classList.toggle('admin-hidden', Boolean(isVisible));
  }

  if (dashboardCard) {
    dashboardCard.classList.toggle('admin-hidden', !isVisible);
  }
}

function escapeText(value) {
  return value === undefined || value === null ? '' : String(value);
}

function formatDateTime(value) {
  if (!value) {
    return 'Not set';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return escapeText(value);
  }

  return dateTimeFormatter.format(parsed);
}

function formatDateOnly(value) {
  if (!value) {
    return 'Not set';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return escapeText(value);
  }

  return dateFormatter.format(parsed);
}

function formatTimeOnly(value) {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return escapeText(value);
  }

  return timeFormatter.format(parsed);
}

function toQueryString(params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      searchParams.set(key, String(value).trim());
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    },
    ...options
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message = payload?.error?.message || payload?.message || 'Request failed';
    throw new Error(message);
  }

  return payload;
}

function metricCard(label, value, tone = '') {
  const card = document.createElement('div');
  card.className = 'metric';
  if (tone) {
    card.classList.add(tone);
  }

  const span = document.createElement('span');
  span.textContent = label;

  const strong = document.createElement('strong');
  strong.textContent = value;

  card.append(span, strong);
  return card;
}

function pill(label, tone = '') {
  const el = document.createElement('span');
  el.className = `pill${tone ? ` ${tone}` : ''}`;
  el.textContent = label;
  return el;
}

function renderMetricStrip(container, metrics = []) {
  if (!container) {
    return;
  }

  container.innerHTML = '';
  metrics.forEach((item) => {
    container.append(metricCard(item.label, item.value, item.tone || ''));
  });
}

function visitorDisplayName(visitor) {
  return visitor.visitorName || visitor.visitor_name || 'Visitor';
}

function visitorRegisterNo(visitor) {
  return visitor.registerNo || visitor.register_no || 'N/A';
}

function visitorStatusLabel(status) {
  const mapping = {
    registered: ['Booked', 'blue'],
    checked_in: ['Here', 'accent'],
    checked_out: ['Left', 'blue'],
    void: ['Void', 'warn']
  };

  return mapping[status] || [status || 'Unknown', ''];
}

function visitorTimeline(visitor) {
  const checkedIn = visitor.checkedInAt || visitor.checked_in_at || visitor.heureArrivee || '';
  const checkedOut = visitor.checkedOutAt || visitor.checked_out_at || visitor.heureSortie || '';
  const status = visitor.status || visitor.statut || '';

  if (status === 'checked_in' || status === 'checked_out' || checkedIn) {
    return {
      in: formatTimeOnly(checkedIn),
      out: formatTimeOnly(checkedOut)
    };
  }

  return {
    in: '-',
    out: '-'
  };
}

function buildTodayVisitors(dashboard = {}) {
  const checkedIn = Array.isArray(dashboard.checkedIn) ? dashboard.checkedIn : [];
  const pending = Array.isArray(dashboard.pending) ? dashboard.pending : [];

  return [...checkedIn, ...pending];
}

function hasActiveFilters(filters = {}) {
  return Object.values(filters).some((value) => value !== undefined && value !== null && String(value).trim() !== '');
}

function renderSettings(settings = {}) {
  if (!settingsList) {
    return;
  }

  settingsList.innerHTML = '';

  const entries = [
    ['Site title', settings.siteTitle],
    ['Welcome', settings.welcomeMessage],
    ['Logo', settings.logoPath],
    ['Timezone', settings.defaultTimezone],
    ['PIN length', settings.pinLength],
    ['Data retention', settings.dataRetentionDays
      ? (Number(settings.dataRetentionDays) >= 365 ? '1 year' : `${settings.dataRetentionDays} days`)
      : 'Not set'],
    ['QR check-in', settings.enableQrCheckin ? 'Enabled' : 'Disabled'],
    ['PIN check-in', settings.enablePinCheckin ? 'Enabled' : 'Disabled']
  ];

  entries.forEach(([label, value]) => {
    const row = document.createElement('div');
    row.className = 'settings-row';

    const left = document.createElement('span');
    left.textContent = label;

    const right = document.createElement('strong');
    right.textContent = value === undefined || value === null || value === '' ? 'Not set' : String(value);

    row.append(left, right);
    settingsList.append(row);
  });
}

function renderSummary(stats = {}) {
  renderMetricStrip(summaryMetrics, [
    { label: 'Today', value: stats.today ?? stats.confirmedArrivals?.today ?? 0, tone: 'accent' },
    { label: 'Week', value: stats.week ?? stats.confirmedArrivals?.week ?? 0, tone: 'blue' },
    { label: 'Month', value: stats.month ?? stats.confirmedArrivals?.month ?? 0 },
    { label: 'Year', value: stats.year ?? stats.confirmedArrivals?.year ?? 0 }
  ]);
}

function renderVisitorTable(items = [], mode = 'today') {
  if (visitorTableTitle) {
    visitorTableTitle.textContent = mode === 'filtered' ? 'Filtered' : 'Today';
  }

  if (visitorTableCount) {
    visitorTableCount.textContent = String(items.length);
  }

  if (!visitorTableBody) {
    return;
  }

  visitorTableBody.innerHTML = '';

  if (!items.length) {
    const emptyRow = document.createElement('tr');
    const emptyCell = document.createElement('td');
    emptyCell.colSpan = 8;
    emptyCell.className = 'table-empty';
    emptyCell.textContent = mode === 'filtered'
      ? 'No records match the selected filters.'
      : 'No visitors for today.';
    emptyRow.append(emptyCell);
    visitorTableBody.append(emptyRow);
    return;
  }

  items.forEach((visitor) => {
    const row = document.createElement('tr');

    const visitorCell = document.createElement('td');
    visitorCell.className = 'table-visitor';
    const visitorName = document.createElement('strong');
    visitorName.textContent = visitorDisplayName(visitor);
    visitorCell.append(visitorName);

    const registerNoCell = document.createElement('td');
    registerNoCell.className = 'table-code';
    registerNoCell.textContent = visitorRegisterNo(visitor);

    const personToVisitCell = document.createElement('td');
    personToVisitCell.className = 'table-person';
    personToVisitCell.textContent = visitor.visitedPerson
      || visitor.visited_person
      || visitor.personToVisit
      || visitor.hostName
      || visitor.host_name
      || visitor.personneVisitee
      || '-';

    const dateCell = document.createElement('td');
    dateCell.textContent = formatDateOnly(
      visitor.scheduledDate || visitor.scheduled_date || visitor.registeredAt || visitor.registered_at
    );

    const statusCell = document.createElement('td');
    const [statusLabel, tone] = visitorStatusLabel(visitor.status);
    statusCell.append(pill(statusLabel, tone));

    const timeline = visitorTimeline(visitor);
    const inCell = document.createElement('td');
    inCell.textContent = timeline.in;
    const outCell = document.createElement('td');
    outCell.textContent = timeline.out;

    const actionCell = document.createElement('td');
    actionCell.className = 'table-action';
    if ((visitor.status || '') !== 'void' && visitor.id) {
      const voidButton = document.createElement('button');
      voidButton.type = 'button';
      voidButton.className = 'secondary';
      voidButton.textContent = 'Void';
      voidButton.addEventListener('click', () => {
        const reason = window.prompt('Reason for voiding this visitor (optional):', '');
        voidVisitor(visitor.id, reason).catch((error) => {
          setStatus(error.message || 'Unable to update the visitor', true);
        });
      });
      actionCell.append(voidButton);
    } else {
      actionCell.textContent = '-';
    }

    row.append(visitorCell, registerNoCell, personToVisitCell, dateCell, statusCell, inCell, outCell, actionCell);
    visitorTableBody.append(row);
  });
}

async function loadSession() {
  const response = await apiRequest('/api/admin/session');
  state.session = response.data?.session || null;

  if (!response.data?.authenticated) {
    showDashboard(false);
    if (sessionBanner) {
      sessionBanner.textContent = '';
    }
    return false;
  }

  showDashboard(true);
  if (sessionBanner) {
    sessionBanner.textContent = response.data.session?.user?.username || 'admin';
  }

  return true;
}

async function loadDashboard() {
  const todayDate = new Date().toISOString().slice(0, 10);
  const [todayResponse, summaryResponse, settingsResponse, historyResponse] = await Promise.all([
    apiRequest(`/api/admin/dashboard/today${toQueryString({ date: todayDate })}`),
    apiRequest('/api/admin/stats/summary'),
    apiRequest('/api/admin/settings'),
    apiRequest(`/api/admin/visitors${toQueryString(state.filters)}`)
  ]);

  const useFilteredRows = hasActiveFilters(state.filters);
  const rows = useFilteredRows ? (historyResponse.data || []) : buildTodayVisitors(todayResponse.data || {});

  renderVisitorTable(rows, useFilteredRows ? 'filtered' : 'today');
  renderSummary(summaryResponse.data || {});
  renderSettings(settingsResponse.data || {});
}

async function login(event) {
  event.preventDefault();
  setStatus('');

  if (loginButton) {
    loginButton.disabled = true;
    loginButton.textContent = 'Signing in...';
  }

  try {
    const formData = new FormData(loginForm);
    const username = String(formData.get('username') || '').trim();
    const password = String(formData.get('password') || '').trim();

    const payload = {};
    if (username) {
      payload.username = username;
    }
    if (password) {
      payload.password = password;
    }

    await apiRequest('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    await loadSession();
    await loadDashboard();
    setStatus('');
  } catch (error) {
    setStatus(error.message || 'Login failed', true);
  } finally {
    if (loginButton) {
      loginButton.disabled = false;
      loginButton.textContent = 'Sign in';
    }
  }
}

async function logout() {
  try {
    await apiRequest('/api/admin/logout', { method: 'POST' });
  } catch (error) {
    // Ignore logout failures and still reset the UI locally.
  }

  state.session = null;
  showDashboard(false);
  setStatus('Signed out.');
}

async function refreshDashboard() {
  try {
    await loadSession();
    if (!state.session) {
      return;
    }

    await loadDashboard();
    setStatus('');
  } catch (error) {
    setStatus(error.message || 'Unable to refresh dashboard', true);
  }
}

function readHistoryFilters() {
  if (!historyForm) {
    return {};
  }

  const formData = new FormData(historyForm);
  return {
    from: formData.get('from'),
    to: formData.get('to'),
    status: formData.get('status'),
    keyword: formData.get('keyword')
  };
}

async function applyFilters(event) {
  event.preventDefault();
  state.filters = readHistoryFilters();

  try {
    await loadDashboard();
    setStatus('Filters applied.');
  } catch (error) {
    setStatus(error.message || 'Unable to load filtered history', true);
  }
}

async function exportExcel() {
  const url = `/api/admin/export.xlsx${toQueryString(state.filters)}`;
  window.location.assign(url);
}

async function voidVisitor(id, reason) {
  try {
    await apiRequest(`/api/admin/visitors/${encodeURIComponent(id)}/void`, {
      method: 'PATCH',
      body: JSON.stringify({
        reason: reason || ''
      })
    });
    await loadDashboard();
    setStatus('Visitor marked void.');
  } catch (error) {
    setStatus(error.message || 'Unable to void visitor', true);
  }
}

function clearLoginForm() {
  if (loginForm) {
    loginForm.reset();
  }
}

async function bootstrap() {
  try {
    const authenticated = await loadSession();
    if (authenticated) {
      await loadDashboard();
    } else {
      setStatus('Please sign in.');
    }
  } catch (error) {
    showDashboard(false);
    setStatus(error.message || 'Unable to load the admin session', true);
  }
}

if (loginForm) {
  loginForm.addEventListener('submit', login);
}

if (logoutButton) {
  logoutButton.addEventListener('click', logout);
}

if (refreshButton) {
  refreshButton.addEventListener('click', refreshDashboard);
}

if (exportButton) {
  exportButton.addEventListener('click', exportExcel);
}

if (historyForm) {
  historyForm.addEventListener('submit', applyFilters);
}

if (historyResetButton) {
  historyResetButton.addEventListener('click', async () => {
    if (historyForm) {
      historyForm.reset();
    }
    state.filters = {};
    await refreshDashboard();
  });
}

if (clearLoginButton) {
  clearLoginButton.addEventListener('click', clearLoginForm);
}

bootstrap();
