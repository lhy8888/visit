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
const todayMetrics = document.getElementById('today-metrics');
const todayDatePill = document.getElementById('today-date-pill');
const todayPendingCount = document.getElementById('today-pending-count');
const todayCheckedInCount = document.getElementById('today-checkedin-count');
const todayFutureCount = document.getElementById('today-future-count');
const todayPendingList = document.getElementById('today-pending-list');
const todayCheckedInList = document.getElementById('today-checkedin-list');
const todayFutureList = document.getElementById('today-future-list');
const historyList = document.getElementById('history-list');
const historyCount = document.getElementById('history-count');
const sessionBanner = document.getElementById('session-banner');
const settingsList = document.getElementById('settings-list');

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short'
});

const state = {
  session: null,
  today: null,
  summary: null,
  settings: null,
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

  return dateFormatter.format(parsed);
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

function visitorHost(visitor) {
  return visitor.hostName || visitor.host_name || 'No host';
}

function visitorStatusLabel(status) {
  const mapping = {
    registered: ['Registered', 'blue'],
    checked_in: ['Checked in', 'accent'],
    checked_out: ['Checked out', 'blue'],
    void: ['Void', 'warn']
  };

  return mapping[status] || [status || 'Unknown', ''];
}

function renderVisitorList(container, items, emptyLabel, actionHandler = null) {
  if (!container) {
    return;
  }

  container.innerHTML = '';

  if (!items || items.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'helper compact';
    empty.textContent = emptyLabel;
    container.append(empty);
    return;
  }

  items.forEach((visitor) => {
    const row = document.createElement('article');
    row.className = 'list-item';

    const header = document.createElement('div');
    header.className = 'list-item-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'list-item-title-group';

    const title = document.createElement('strong');
    title.textContent = `${visitorDisplayName(visitor)} · ${visitorRegisterNo(visitor)}`;

    const subline = document.createElement('div');
    subline.className = 'subtle';
    subline.textContent = `${visitorHost(visitor)} · ${formatDateTime(visitor.scheduledDate || visitor.scheduled_date || visitor.registeredAt || visitor.registered_at)}`;

    titleGroup.append(title, subline);

    const [statusLabel, tone] = visitorStatusLabel(visitor.status);
    const badge = pill(statusLabel, tone);

    header.append(titleGroup, badge);

    const meta = document.createElement('div');
    meta.className = 'meta-row';

    [visitor.company, visitor.email, visitor.phone].filter(Boolean).forEach((value) => {
      meta.append(pill(value));
    });

    const footer = document.createElement('div');
    footer.className = 'admin-actions';

    if (visitor.checkedInAt || visitor.checked_in_at) {
      footer.append(pill(`In ${formatDateTime(visitor.checkedInAt || visitor.checked_in_at)}`, 'accent'));
    }

    if (visitor.checkedOutAt || visitor.checked_out_at) {
      footer.append(pill(`Out ${formatDateTime(visitor.checkedOutAt || visitor.checked_out_at)}`, 'blue'));
    }

    if (actionHandler && visitor.status !== 'void') {
      const voidButton = document.createElement('button');
      voidButton.type = 'button';
      voidButton.className = 'secondary';
      voidButton.textContent = 'Void';
      voidButton.addEventListener('click', () => {
        Promise.resolve(actionHandler(visitor)).catch((error) => {
          setStatus(error.message || 'Unable to update the visitor', true);
        });
      });
      footer.append(voidButton);
    }

    row.append(header, meta, footer);
    container.append(row);
  });
}

function renderSettings(settings = {}) {
  if (!settingsList) {
    return;
  }

  settingsList.innerHTML = '';

  const entries = [
    ['Site title', settings.siteTitle],
    ['Welcome message', settings.welcomeMessage],
    ['Logo path', settings.logoPath],
    ['Default timezone', settings.defaultTimezone],
    ['PIN length', settings.pinLength],
    ['Retention days', settings.dataRetentionDays],
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

function renderTodayDashboard(dashboard = {}) {
  if (todayDatePill) {
    todayDatePill.textContent = dashboard.date || '';
  }

  if (todayPendingCount) {
    todayPendingCount.textContent = `${dashboard.counts?.pending ?? 0} waiting`;
  }

  if (todayCheckedInCount) {
    todayCheckedInCount.textContent = `${dashboard.counts?.checkedIn ?? 0} here`;
  }

  if (todayFutureCount) {
    todayFutureCount.textContent = `${dashboard.counts?.future ?? 0} future`;
  }

  renderMetricStrip(todayMetrics, [
    { label: 'Waiting', value: dashboard.counts?.pending ?? 0, tone: 'warn' },
    { label: 'Checked in', value: dashboard.counts?.checkedIn ?? 0, tone: 'accent' },
    { label: 'Future', value: dashboard.counts?.future ?? 0, tone: 'blue' }
  ]);

  renderVisitorList(todayPendingList, dashboard.pending || [], 'No visitors are waiting right now.');
  renderVisitorList(todayCheckedInList, dashboard.checkedIn || [], 'No visitors have checked in yet.');
  renderVisitorList(todayFutureList, dashboard.future || [], 'No future registrations.');
}

function renderHistory(items = []) {
  if (historyCount) {
    historyCount.textContent = `${items.length} records`;
  }

  renderVisitorList(historyList, items, 'No visitors match the selected filters.', async (visitor) => {
    const reason = window.prompt(`Void registration ${visitorRegisterNo(visitor)}? Add an optional note:`, '');
    if (reason === null) {
      return;
    }

    await voidVisitor(visitor.id, reason);
  });
}

async function loadSession() {
  const response = await apiRequest('/api/admin/session');
  state.session = response.data?.session || null;

  if (!response.data?.authenticated) {
    showDashboard(false);
    return false;
  }

  showDashboard(true);
  if (sessionBanner) {
    sessionBanner.textContent = `Signed in as ${response.data.session?.user?.username || 'admin'}`;
  }
  return true;
}

async function loadDashboard() {
  const [todayResponse, summaryResponse, settingsResponse, historyResponse] = await Promise.all([
    apiRequest(`/api/admin/dashboard/today${toQueryString({ date: new Date().toISOString().slice(0, 10) })}`),
    apiRequest('/api/admin/stats/summary'),
    apiRequest('/api/admin/settings'),
    apiRequest(`/api/admin/visitors${toQueryString(state.filters)}`)
  ]);

  state.today = todayResponse.data;
  state.summary = summaryResponse.data;
  state.settings = settingsResponse.data;

  renderTodayDashboard(todayResponse.data || {});
  renderSummary(summaryResponse.data || {});
  renderSettings(settingsResponse.data || {});
  renderHistory(historyResponse.data || []);
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
    const pin = String(formData.get('pin') || '').trim();

    const payload = {};
    if (username) {
      payload.username = username;
    }
    if (password) {
      payload.password = password;
    }
    if (pin) {
      payload.pin = pin;
    }

    await apiRequest('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    await loadSession();
    await loadDashboard();
    setStatus('Logged in successfully.');
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
    setStatus('Dashboard refreshed.');
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
    const response = await apiRequest(`/api/admin/visitors${toQueryString(state.filters)}`);
    renderHistory(response.data || []);
    setStatus(`Loaded ${response.meta?.count ?? (response.data || []).length} filtered records.`);
  } catch (error) {
    setStatus(error.message || 'Unable to load filtered history', true);
  }
}

async function exportCsv() {
  const url = `/api/admin/export.csv${toQueryString(state.filters)}`;
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
    setStatus('Visitor marked as void.');
  } catch (error) {
    setStatus(error.message || 'Unable to void visitor', true);
  }
}

function clearLoginForm() {
  if (!loginForm) {
    return;
  }

  loginForm.reset();
}

async function bootstrap() {
  try {
    const authenticated = await loadSession();
    if (authenticated) {
      await loadDashboard();
      setStatus('Session loaded.');
    } else {
      setStatus('Please sign in to access the admin dashboard.');
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
  exportButton.addEventListener('click', exportCsv);
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
