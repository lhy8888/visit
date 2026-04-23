const lookupForm = document.getElementById('lookup-form');
const identifierInput = document.getElementById('identifier-input');
const lookupButton = document.getElementById('lookup-button');
const startScanButton = document.getElementById('start-scan-button');
const stopScanButton = document.getElementById('stop-scan-button');
const refreshButton = document.getElementById('refresh-button');
const statusMessage = document.getElementById('status-message');
const scannerMessage = document.getElementById('scanner-message');
const scannerState = document.getElementById('scanner-state');
const scannerVideo = document.getElementById('scanner-video');
const pendingList = document.getElementById('pending-list');
const checkedInList = document.getElementById('checkedin-list');
const futureList = document.getElementById('future-list');
const pendingCount = document.getElementById('pending-count');
const checkedInCount = document.getElementById('checkedin-count');
const futureCount = document.getElementById('future-count');
const pendingBadge = document.getElementById('pending-badge');
const checkedInBadge = document.getElementById('checkedin-badge');
const futureBadge = document.getElementById('future-badge');
const dashboardDate = document.getElementById('dashboard-date');

const state = {
  dashboard: null,
  scannerStream: null,
  scannerDetector: null,
  scanning: false,
  scanFrameHandle: null
};

function setStatus(message, isError = false) {
  if (!statusMessage) {
    return;
  }

  statusMessage.textContent = message;
  statusMessage.classList.toggle('error', Boolean(isError));
}

function setScannerMessage(message, isError = false) {
  if (!scannerMessage) {
    return;
  }

  scannerMessage.textContent = message;
  scannerMessage.classList.toggle('error', Boolean(isError));
}

function setScannerState(label) {
  if (scannerState) {
    scannerState.textContent = label;
  }
}

function formatDate(value) {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium'
  }).format(parsed);
}

function formatDateTime(value) {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(parsed);
}

function setButtonLoading(button, isLoading, label) {
  if (!button) {
    return;
  }

  button.disabled = isLoading;
  if (label) {
    button.textContent = isLoading ? 'Working...' : label;
  }
}

function clearList(container) {
  if (container) {
    container.innerHTML = '';
  }
}

function createPill(text, variant = '') {
  const pill = document.createElement('span');
  pill.className = variant ? `pill ${variant}` : 'pill';
  pill.textContent = text;
  return pill;
}

function createMetaRow(values) {
  const row = document.createElement('div');
  row.className = 'meta-row';
  values.filter(Boolean).forEach((value) => {
    row.appendChild(value);
  });
  return row;
}

function createActionButton(label, handler, variant = 'secondary') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = variant;
  button.textContent = label;
  button.addEventListener('click', handler);
  return button;
}

function createVisitorCard(visitor, options = {}) {
  const article = document.createElement('article');
  article.className = 'list-item';

  const header = document.createElement('div');
  header.className = 'list-item-header';

  const titleGroup = document.createElement('div');
  titleGroup.className = 'list-item-title-group';

  const title = document.createElement('strong');
  title.textContent = visitor.visitorName || visitor.nom || 'Visitor';
  titleGroup.appendChild(title);

  const subTitle = document.createElement('span');
  subTitle.className = 'subtle';
  subTitle.textContent = [visitor.company, visitor.hostName]
    .filter(Boolean)
    .join(' - ') || 'No company or host provided';
  titleGroup.appendChild(subTitle);

  header.appendChild(titleGroup);
  header.appendChild(createPill(options.statusLabel || visitor.status || 'registered', options.statusVariant || ''));
  article.appendChild(header);

  const metaValues = [
    createPill(visitor.registerNo ? `#${visitor.registerNo}` : `ID ${visitor.id}`, 'accent'),
    visitor.pinCode ? createPill(`PIN ${visitor.pinCode}`, 'blue') : null,
    visitor.scheduledDate ? createPill(formatDate(visitor.scheduledDate)) : null,
    visitor.checkedInAt ? createPill(`In ${formatDateTime(visitor.checkedInAt)}`) : null,
    visitor.checkedOutAt ? createPill(`Out ${formatDateTime(visitor.checkedOutAt)}`) : null
  ];

  article.appendChild(createMetaRow(metaValues));

  if (visitor.visitPurpose) {
    const purpose = document.createElement('p');
    purpose.className = 'helper compact';
    purpose.textContent = visitor.visitPurpose;
    article.appendChild(purpose);
  }

  if (options.actions && options.actions.length > 0) {
    const actions = document.createElement('div');
    actions.className = 'toolbar compact';
    options.actions.forEach((action) => {
      actions.appendChild(createActionButton(action.label, action.handler, action.variant));
    });
    article.appendChild(actions);
  }

  return article;
}

function renderList(container, items, emptyMessage, options = {}) {
  clearList(container);

  if (!container) {
    return;
  }

  if (!items || items.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'helper compact empty-state';
    empty.textContent = emptyMessage;
    container.appendChild(empty);
    return;
  }

  items.forEach((visitor) => {
    container.appendChild(createVisitorCard(visitor, {
      statusLabel: options.statusLabel,
      statusVariant: options.statusVariant,
      actions: options.actionsFactory ? options.actionsFactory(visitor) : []
    }));
  });
}

function updateSummary(dashboard) {
  const counts = dashboard?.counts || { pending: 0, checkedIn: 0, future: 0 };

  if (pendingCount) pendingCount.textContent = String(counts.pending || 0);
  if (checkedInCount) checkedInCount.textContent = String(counts.checkedIn || 0);
  if (futureCount) futureCount.textContent = String(counts.future || 0);
  if (pendingBadge) pendingBadge.textContent = String(counts.pending || 0);
  if (checkedInBadge) checkedInBadge.textContent = String(counts.checkedIn || 0);
  if (futureBadge) futureBadge.textContent = String(counts.future || 0);

  if (dashboardDate) {
    dashboardDate.textContent = dashboard?.date ? `Queue for ${formatDate(dashboard.date)}` : 'Today';
  }
}

function renderDashboard(dashboard) {
  state.dashboard = dashboard;
  updateSummary(dashboard);

  renderList(
    pendingList,
    dashboard?.pending || [],
    'No visitors are waiting right now.',
    {
      statusLabel: 'Waiting',
      statusVariant: 'warn',
      actionsFactory: (visitor) => [
        {
          label: 'Check in',
          handler: () => submitCheckIn(visitor.registerNo || visitor.pinCode || visitor.id),
          variant: 'secondary'
        },
        visitor.pinCode
          ? {
              label: 'Copy PIN',
              handler: () => copyText(visitor.pinCode, 'PIN'),
              variant: 'secondary'
            }
          : null
      ].filter(Boolean)
    }
  );

  renderList(
    checkedInList,
    dashboard?.checkedIn || [],
    'No visitors are currently checked in.',
    {
      statusLabel: 'Checked in',
      statusVariant: 'accent',
      actionsFactory: (visitor) => [
        {
          label: 'Check out',
          handler: () => submitCheckout(visitor.id),
          variant: 'secondary'
        }
      ]
    }
  );

  renderList(
    futureList,
    dashboard?.future || [],
    'No future registrations yet.',
    {
      statusLabel: 'Future',
      statusVariant: 'blue'
    }
  );
}

function copyText(value, label) {
  if (!value) {
    return;
  }

  navigator.clipboard.writeText(String(value)).then(() => {
    setStatus(`${label} copied to clipboard.`);
  }).catch(() => {
    setStatus(`Could not copy ${label.toLowerCase()}.`, true);
  });
}

async function apiJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error?.message || 'Request failed');
  }

  return payload;
}

async function loadDashboard(options = {}) {
  const silent = Boolean(options.silent);

  try {
    if (!silent) {
      setStatus('Loading queue...');
    }

    const payload = await apiJson('/api/reception/today');
    renderDashboard(payload.data || {});

    if (!silent) {
      setStatus('Queue updated.');
    }
  } catch (error) {
    setStatus(error.message || 'Could not load reception data.', true);
  }
}

async function submitCheckIn(identifier) {
  const normalized = String(identifier || '').trim();
  if (!normalized) {
    setStatus('Enter a PIN or register number first.', true);
    return;
  }

  try {
    setButtonLoading(lookupButton, true, 'Check in');
    const payload = await apiJson('/api/checkin/by-pin', {
      method: 'POST',
      body: JSON.stringify({ identifier: normalized })
    });

    setStatus(payload.message || 'Visitor checked in.');
    if (identifierInput) {
      identifierInput.value = '';
      identifierInput.focus();
    }

    await loadDashboard({ silent: true });
  } catch (error) {
    setStatus(error.message || 'Check-in failed.', true);
  } finally {
    setButtonLoading(lookupButton, false, 'Check in');
  }
}

async function submitQrCheckIn(token) {
  const normalized = String(token || '').trim();
  if (!normalized) {
    setStatus('QR token is empty.', true);
    return;
  }

  try {
    const payload = await apiJson('/api/checkin/by-qr', {
      method: 'POST',
      body: JSON.stringify({ qrToken: normalized })
    });

    setStatus(payload.message || 'Visitor checked in from QR.');
    await loadDashboard({ silent: true });
  } catch (error) {
    setStatus(error.message || 'QR check-in failed.', true);
  }
}

async function submitCheckout(id) {
  try {
    const payload = await apiJson(`/api/checkout/${encodeURIComponent(id)}`, {
      method: 'POST',
      body: JSON.stringify({})
    });

    setStatus(payload.message || 'Visitor checked out.');
    await loadDashboard({ silent: true });
  } catch (error) {
    setStatus(error.message || 'Check-out failed.', true);
  }
}

function stopScanner(updateMessage = true) {
  state.scanning = false;

  if (state.scanFrameHandle) {
    cancelAnimationFrame(state.scanFrameHandle);
    state.scanFrameHandle = null;
  }

  if (state.scannerStream) {
    state.scannerStream.getTracks().forEach((track) => track.stop());
    state.scannerStream = null;
  }

  if (scannerVideo) {
    scannerVideo.srcObject = null;
    scannerVideo.hidden = true;
  }

  if (startScanButton) {
    startScanButton.hidden = false;
  }

  if (stopScanButton) {
    stopScanButton.hidden = true;
  }

  setScannerState('Idle');
  if (updateMessage) {
    setScannerMessage('Camera scan stopped.');
  }
}

async function scanLoop() {
  if (!state.scanning || !state.scannerDetector || !scannerVideo) {
    return;
  }

  try {
    if (scannerVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      const codes = await state.scannerDetector.detect(scannerVideo);
      if (codes && codes.length > 0 && codes[0].rawValue) {
        const token = String(codes[0].rawValue).trim();
        if (token) {
          stopScanner(false);
          setScannerMessage(`QR detected: ${token.slice(0, 12)}${token.length > 12 ? '...' : ''}`);
          await submitQrCheckIn(token);
          return;
        }
      }
    }
  } catch (error) {
    setScannerMessage(error.message || 'Unable to scan QR code right now.', true);
  }

  state.scanFrameHandle = requestAnimationFrame(scanLoop);
}

async function startScanner() {
  try {
    if (!('BarcodeDetector' in window)) {
      throw new Error('This browser does not support built-in QR scanning.');
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Camera access is not available in this browser.');
    }

    setScannerMessage('Requesting camera access...');
    state.scannerDetector = new BarcodeDetector({ formats: ['qr_code'] });
    state.scannerStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' }
      },
      audio: false
    });

    if (scannerVideo) {
      scannerVideo.srcObject = state.scannerStream;
      scannerVideo.hidden = false;
      await scannerVideo.play();
    }

    state.scanning = true;
    setScannerState('Scanning');
    setScannerMessage('Point the camera at a QR code.');

    if (startScanButton) {
      startScanButton.hidden = true;
    }

    if (stopScanButton) {
      stopScanButton.hidden = false;
    }

    scanLoop();
  } catch (error) {
    stopScanner(false);
    setScannerMessage(error.message || 'Could not start the camera scanner.', true);
  }
}

async function handleLookupSubmit(event) {
  event.preventDefault();
  const identifier = identifierInput ? identifierInput.value.trim() : '';
  await submitCheckIn(identifier);
}

if (lookupForm) {
  lookupForm.addEventListener('submit', handleLookupSubmit);
}

if (startScanButton) {
  startScanButton.addEventListener('click', startScanner);
}

if (stopScanButton) {
  stopScanButton.addEventListener('click', () => stopScanner(true));
}

if (refreshButton) {
  refreshButton.addEventListener('click', () => loadDashboard());
}

loadDashboard();
