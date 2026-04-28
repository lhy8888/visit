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
const settingsForm = document.getElementById('settings-form');
const settingsSaveButton = document.getElementById('settings-save');
const logoUploadInput = document.getElementById('logoUpload');
const logoPreview = document.getElementById('logoPreview');
const logoPathNote = document.getElementById('logoPathNote');
const DASHBOARD_STATE_STORAGE_KEY = 'visitor-dashboard-state';
const QUICK_RANGE_KEYS = new Set(['today', 'week', 'month', 'year', 'custom']);

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
  filters: {},
  view: 'today'
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

function formatDateKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    const fallback = new Date();
    const year = fallback.getFullYear();
    const month = String(fallback.getMonth() + 1).padStart(2, '0');
    const day = String(fallback.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function cloneDate(date) {
  return new Date(date.getTime());
}

function startOfDay(date) {
  const copy = cloneDate(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date) {
  const copy = cloneDate(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function startOfWeek(date) {
  const copy = startOfDay(date);
  const day = copy.getDay();
  const offset = (day + 6) % 7;
  copy.setDate(copy.getDate() - offset);
  return copy;
}

function endOfWeek(date) {
  const copy = startOfWeek(date);
  copy.setDate(copy.getDate() + 6);
  return endOfDay(copy);
}

function startOfMonth(date) {
  const copy = startOfDay(date);
  copy.setDate(1);
  return copy;
}

function endOfMonth(date) {
  const copy = startOfMonth(date);
  copy.setMonth(copy.getMonth() + 1, 0);
  return endOfDay(copy);
}

function startOfYear(date) {
  const copy = startOfDay(date);
  copy.setMonth(0, 1);
  return copy;
}

function endOfYear(date) {
  const copy = startOfYear(date);
  copy.setFullYear(copy.getFullYear(), 11, 31);
  return endOfDay(copy);
}

function formatDateRange(start, end) {
  return {
    from: formatDateKey(start),
    to: formatDateKey(end)
  };
}

function getCurrentDate() {
  return new Date();
}

function getTodayRange() {
  const today = getCurrentDate();
  return formatDateRange(startOfDay(today), endOfDay(today));
}

function getCurrentWeekRange() {
  const today = getCurrentDate();
  return formatDateRange(startOfWeek(today), endOfWeek(today));
}

function getCurrentMonthRange() {
  const today = getCurrentDate();
  return formatDateRange(startOfMonth(today), endOfMonth(today));
}

function getCurrentYearRange() {
  const today = getCurrentDate();
  return formatDateRange(startOfYear(today), endOfYear(today));
}

function getCurrentQuickRange(view) {
  switch (view) {
    case 'week':
      return getCurrentWeekRange();
    case 'month':
      return getCurrentMonthRange();
    case 'year':
      return getCurrentYearRange();
    case 'today':
    default:
      return getTodayRange();
  }
}

function normalizeFiltersForView(view, filters = null) {
  if (filters && typeof filters === 'object' && Object.keys(filters).length > 0) {
    return filters;
  }

  return getCurrentQuickRange(view);
}

function getQuickRangeConfig(view = 'today') {
  const configs = {
    today: {
      label: 'Today',
      filters: normalizeFiltersForView('today')
    },
    week: {
      label: 'Week',
      filters: normalizeFiltersForView('week')
    },
    month: {
      label: 'Month',
      filters: normalizeFiltersForView('month')
    },
    year: {
      label: 'Year',
      filters: normalizeFiltersForView('year')
    }
  };

  return configs[view] || configs.today;
}

function getViewLabel(view = 'today') {
  if (view === 'custom') {
    return 'Filtered';
  }

  return getQuickRangeConfig(view).label;
}

function getViewEmptyMessage(view = 'today') {
  switch (view) {
    case 'week':
      return 'No visitors for this week.';
    case 'month':
      return 'No visitors for this month.';
    case 'year':
      return 'No visitors for this year.';
    case 'custom':
      return 'No records match the selected filters.';
    case 'today':
    default:
      return 'No visitors for today.';
  }
}

function persistDashboardState() {
  try {
    window.localStorage.setItem(DASHBOARD_STATE_STORAGE_KEY, JSON.stringify({
      view: QUICK_RANGE_KEYS.has(state.view) ? state.view : 'today',
      filters: state.filters || {}
    }));
  } catch (error) {
    // Ignore storage issues.
  }
}

function restoreDashboardState() {
  try {
    const raw = window.localStorage.getItem(DASHBOARD_STATE_STORAGE_KEY);
    if (!raw) {
      state.view = 'today';
      state.filters = getCurrentQuickRange('today');
      return;
    }

    const parsed = JSON.parse(raw);
    const view = QUICK_RANGE_KEYS.has(parsed?.view) ? parsed.view : 'today';
    const filters = view === 'custom'
      ? (parsed && typeof parsed.filters === 'object' && parsed.filters !== null ? parsed.filters : {})
      : getCurrentQuickRange(view);

    state.view = view;
    state.filters = filters;
  } catch (error) {
    state.view = 'today';
    state.filters = getCurrentQuickRange('today');
  }
}

function syncHistoryForm(filters = {}) {
  if (!historyForm) {
    return;
  }

  const elements = historyForm.elements;
  const fromInput = elements.namedItem('from');
  const toInput = elements.namedItem('to');
  const statusInput = elements.namedItem('status');
  const keywordInput = elements.namedItem('keyword');

  if (fromInput) {
    fromInput.value = filters.from || '';
  }

  if (toInput) {
    toInput.value = filters.to || '';
  }

  if (statusInput) {
    statusInput.value = filters.status || '';
  }

  if (keywordInput) {
    keywordInput.value = filters.keyword || '';
  }
}

function setDashboardView(view, filters = null) {
  const normalizedView = QUICK_RANGE_KEYS.has(view) ? view : 'today';
  state.view = normalizedView;
  state.filters = filters || getQuickRangeConfig(normalizedView).filters;
  syncHistoryForm(state.filters);
  persistDashboardState();
}

async function activateDashboardView(view) {
  setDashboardView(view);

  try {
    await loadDashboard();
    setStatus('');
  } catch (error) {
    setStatus(error.message || 'Unable to load visitors', true);
  }
}

function matchesQuickRange(filters = {}, view = 'today') {
  if (!['today', 'week', 'month', 'year'].includes(view)) {
    return false;
  }

  const config = getQuickRangeConfig(view);
  return String(filters.from || '') === String(config.filters.from || '')
    && String(filters.to || '') === String(config.filters.to || '')
    && !String(filters.status || '').trim()
    && !String(filters.keyword || '').trim();
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
    cache: 'no-store',
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

function metricCard(label, value, tone = '', options = {}) {
  const card = document.createElement(options.clickable ? 'button' : 'div');
  card.className = `metric${options.clickable ? ' metric-button' : ''}`;
  if (tone) {
    card.classList.add(tone);
  }

  if (options.clickable) {
    card.type = 'button';
    card.title = options.title || label;
    card.setAttribute('aria-pressed', options.active ? 'true' : 'false');
    if (options.active) {
      card.classList.add('active');
    }
    if (typeof options.onClick === 'function') {
      card.addEventListener('click', options.onClick);
    }
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
    container.append(metricCard(item.label, item.value, item.tone || '', item));
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

function populateSettingsForm(settings = {}) {
  if (!settingsForm) {
    return;
  }

  const elements = settingsForm.elements;
  if (elements.siteTitle) {
    elements.siteTitle.value = settings.siteTitle || '';
  }
  if (elements.welcomeMessage) {
    elements.welcomeMessage.value = settings.welcomeMessage || '';
  }
  if (elements.logoPath) {
    elements.logoPath.value = settings.logoPath || '';
  }
  if (elements.defaultTimezone) {
    elements.defaultTimezone.value = settings.defaultTimezone || '';
  }
  if (elements.pinLength) {
    elements.pinLength.value = String(settings.pinLength ?? '');
  }
  if (elements.dataRetentionDays) {
    elements.dataRetentionDays.value = String(settings.dataRetentionDays ?? '');
  }
  if (elements.enableQrCheckin) {
    elements.enableQrCheckin.checked = Boolean(settings.enableQrCheckin);
  }
  if (elements.enablePinCheckin) {
    elements.enablePinCheckin.checked = Boolean(settings.enablePinCheckin);
  }

  updateLogoPreview(settings.logoPath || '');
}

function updateLogoPreview(logoPath = '') {
  if (logoPreview) {
    if (logoPath) {
      const cacheBuster = Date.now();
      logoPreview.src = `${logoPath}${logoPath.includes('?') ? '&' : '?'}v=${cacheBuster}`;
      logoPreview.hidden = false;
    } else {
      logoPreview.removeAttribute('src');
      logoPreview.hidden = true;
    }
  }

  if (logoPathNote) {
    logoPathNote.textContent = logoPath
      ? `Current logo: ${logoPath}`
      : 'No logo uploaded yet.';
  }
}

function readSettingsForm() {
  if (!settingsForm) {
    return {};
  }

  const elements = settingsForm.elements;
  return {
    siteTitle: String(elements.siteTitle?.value || '').trim(),
    welcomeMessage: String(elements.welcomeMessage?.value || '').trim(),
    logoPath: String(elements.logoPath?.value || '').trim(),
    defaultTimezone: String(elements.defaultTimezone?.value || '').trim(),
    pinLength: String(elements.pinLength?.value || '').trim(),
    dataRetentionDays: String(elements.dataRetentionDays?.value || '').trim(),
    enableQrCheckin: Boolean(elements.enableQrCheckin?.checked),
    enablePinCheckin: Boolean(elements.enablePinCheckin?.checked)
  };
}

function renderSummary(stats = {}) {
  renderMetricStrip(summaryMetrics, [
    {
      label: 'Today',
      value: stats.today ?? stats.confirmedArrivals?.today ?? 0,
      tone: 'accent',
      clickable: true,
      active: state.view === 'today',
      title: 'Show today visitors',
      onClick: () => activateDashboardView('today')
    },
    {
      label: 'Week',
      value: stats.week ?? stats.confirmedArrivals?.week ?? 0,
      tone: 'blue',
      clickable: true,
      active: state.view === 'week',
      title: 'Show this week visitors',
      onClick: () => activateDashboardView('week')
    },
    {
      label: 'Month',
      value: stats.month ?? stats.confirmedArrivals?.month ?? 0,
      clickable: true,
      active: state.view === 'month',
      title: 'Show this month visitors',
      onClick: () => activateDashboardView('month')
    },
    {
      label: 'Year',
      value: stats.year ?? stats.confirmedArrivals?.year ?? 0,
      clickable: true,
      active: state.view === 'year',
      title: 'Show this year visitors',
      onClick: () => activateDashboardView('year')
    }
  ]);
}

function renderVisitorTable(items = [], options = {}) {
  const mode = typeof options === 'string' ? options : (options.mode || 'today');
  const title = typeof options === 'object' && options.title ? options.title : getViewLabel(mode);
  const emptyMessage = typeof options === 'object' && options.emptyMessage
    ? options.emptyMessage
    : getViewEmptyMessage(mode);

  if (visitorTableTitle) {
    visitorTableTitle.textContent = title;
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
    emptyCell.textContent = emptyMessage;
    emptyRow.append(emptyCell);
    visitorTableBody.append(emptyRow);
    return;
  }

  items.forEach((visitor) => {
    const row = document.createElement('tr');

    const visitorCell = document.createElement('td');
    visitorCell.className = 'table-visitor';
    const visitorContent = document.createElement('div');
    visitorContent.className = 'table-visitor-content';
    const visitorName = document.createElement('strong');
    visitorName.textContent = visitorDisplayName(visitor);
    visitorContent.append(visitorName);
    visitorCell.append(visitorContent);
    visitorCell.title = visitorName.textContent;

    const registerNoCell = document.createElement('td');
    registerNoCell.className = 'table-code';
    registerNoCell.textContent = visitorRegisterNo(visitor);
    registerNoCell.title = registerNoCell.textContent;

    const personToVisitCell = document.createElement('td');
    personToVisitCell.className = 'table-person';
    personToVisitCell.textContent = visitor.visitedPerson
      || visitor.visited_person
      || visitor.personToVisit
      || visitor.hostName
      || visitor.host_name
      || visitor.personneVisitee
      || '-';
    personToVisitCell.title = personToVisitCell.textContent;

    const dateCell = document.createElement('td');
    dateCell.textContent = formatDateOnly(
      visitor.scheduledDate || visitor.scheduled_date || visitor.registeredAt || visitor.registered_at
    );
    dateCell.title = dateCell.textContent;

    const statusCell = document.createElement('td');
    const [statusLabel, tone] = visitorStatusLabel(visitor.status);
    statusCell.append(pill(statusLabel, tone));
    statusCell.title = statusLabel;

    const timeline = visitorTimeline(visitor);
    const inCell = document.createElement('td');
    inCell.textContent = timeline.in;
    inCell.title = timeline.in;
    const outCell = document.createElement('td');
    outCell.textContent = timeline.out;
    outCell.title = timeline.out;

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
      actionCell.title = 'Void visitor';
    } else {
      actionCell.textContent = '-';
      actionCell.title = 'No action available';
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
  const listRequest = state.view === 'today'
    ? Promise.resolve(null)
    : apiRequest(`/api/admin/visitors${toQueryString(state.filters)}`);

  const [todayResponse, summaryResponse, settingsResponse, historyResponse] = await Promise.all([
    apiRequest(`/api/admin/dashboard/today${toQueryString({ date: todayDate })}`),
    apiRequest('/api/admin/stats/summary'),
    apiRequest('/api/admin/settings'),
    listRequest
  ]);

  const rows = state.view === 'today'
    ? buildTodayVisitors(todayResponse.data || {})
    : (historyResponse?.data || []);

  renderVisitorTable(rows, {
    mode: state.view,
    title: getViewLabel(state.view),
    emptyMessage: getViewEmptyMessage(state.view)
  });
  renderSummary(summaryResponse.data || {});
  populateSettingsForm(settingsResponse.data || {});
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
  const filters = readHistoryFilters();

  const quickView = ['today', 'week', 'month', 'year'].find((view) => matchesQuickRange(filters, view));

  if (quickView) {
    setDashboardView(quickView);
    try {
      await loadDashboard();
      setStatus('');
    } catch (error) {
      setStatus(error.message || 'Unable to load filtered history', true);
    }
    return;
  }

  if (!hasActiveFilters(filters)) {
    setDashboardView('today');
    try {
      await loadDashboard();
      setStatus('Today loaded.');
    } catch (error) {
      setStatus(error.message || 'Unable to load today visitors', true);
    }
    return;
  }

  state.view = 'custom';
  state.filters = filters;
  syncHistoryForm(state.filters);
  persistDashboardState();

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

async function uploadLogo(file) {
  if (!file) {
    return;
  }

  const formData = new FormData();
  formData.append('logo', file);

  try {
    setStatus('Uploading logo...');

    const response = await fetch('/api/admin/logo', {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      body: formData
    });

    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json')
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      const message = payload?.error?.message || payload?.message || 'Unable to upload logo';
      throw new Error(message);
    }

    const settings = payload?.data || {};
    populateSettingsForm(settings);
    if (logoUploadInput) {
      logoUploadInput.value = '';
    }
    setStatus('Logo uploaded.');
  } catch (error) {
    setStatus(error.message || 'Unable to upload logo', true);
    if (logoUploadInput) {
      logoUploadInput.value = '';
    }
  }
}

async function saveSettings(event) {
  event.preventDefault();

  if (!settingsForm) {
    return;
  }

  const payload = readSettingsForm();

  try {
    if (settingsSaveButton) {
      settingsSaveButton.disabled = true;
      settingsSaveButton.textContent = 'Saving...';
    }

    await apiRequest('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });

    await loadDashboard();
    setStatus('Settings saved.');
  } catch (error) {
    setStatus(error.message || 'Unable to save settings', true);
  } finally {
    if (settingsSaveButton) {
      settingsSaveButton.disabled = false;
      settingsSaveButton.textContent = 'Save settings';
    }
  }
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

if (settingsForm) {
  settingsForm.addEventListener('submit', saveSettings);
}

if (logoUploadInput) {
  logoUploadInput.addEventListener('change', async () => {
    const file = logoUploadInput.files && logoUploadInput.files[0];
    await uploadLogo(file);
  });
}

if (historyResetButton) {
  historyResetButton.addEventListener('click', async () => {
    setDashboardView('today');
    await refreshDashboard();
  });
}

if (clearLoginButton) {
  clearLoginButton.addEventListener('click', clearLoginForm);
}

restoreDashboardState();
syncHistoryForm(state.filters);
bootstrap();
