const lookupForm = document.getElementById('lookup-form');
const identifierInput = document.getElementById('identifier-input');
const lookupButton = document.getElementById('lookup-button');
const startScanButton = document.getElementById('start-scan-button');
const stopScanButton = document.getElementById('stop-scan-button');
const registrationForm = document.getElementById('registration-form');
const registrationStatus = document.getElementById('registration-status');
const registrationSubmitButton = document.getElementById('registration-submit-button');
const scheduledDateInput = document.getElementById('scheduled_date');
const statusMessage = document.getElementById('status-message');
const scannerVideo = document.getElementById('scanner-video');
const checkinPanel = document.getElementById('checkin-panel');
const pinPanel = document.getElementById('pin-panel');
const cameraPanel = document.getElementById('camera-panel');
const registerPanel = document.getElementById('register-panel');
const kioskModeButtons = Array.from(document.querySelectorAll('[data-kiosk-mode]'));
const checkinModeButtons = Array.from(document.querySelectorAll('[data-checkin-mode]'));

const state = {
  scannerStream: null,
  scannerDetector: null,
  scanning: false,
  scanFrameHandle: null,
  kioskMode: 'checkin',
  checkinMode: 'pin'
};

function setStatus(message, isError = false) {
  if (!statusMessage) {
    return;
  }

  statusMessage.textContent = message;
  statusMessage.classList.toggle('error', Boolean(isError));
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

function setRegistrationStatus(message, isError = false) {
  if (!registrationStatus) {
    return;
  }

  registrationStatus.textContent = message;
  registrationStatus.classList.toggle('error', Boolean(isError));
}

function getTodayDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function setDefaultRegistrationDate() {
  if (!scheduledDateInput) {
    return;
  }

  const today = getTodayDateKey();
  scheduledDateInput.min = today;
  if (!scheduledDateInput.value) {
    scheduledDateInput.value = today;
  }
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

function setCheckinMode(mode) {
  state.checkinMode = mode;

  checkinModeButtons.forEach((button) => {
    const active = button.dataset.checkinMode === mode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  });

  if (pinPanel) {
    pinPanel.classList.toggle('hidden', mode !== 'pin');
  }

  if (cameraPanel) {
    cameraPanel.classList.toggle('hidden', mode !== 'camera');
  }

  if (mode !== 'camera') {
    stopScanner(false);
  }

  if (mode === 'pin' && identifierInput) {
    identifierInput.focus();
  }

  if (mode !== 'pin' && identifierInput) {
    identifierInput.blur();
  }

  setStatus('');
}

function setKioskMode(mode) {
  state.kioskMode = mode;

  kioskModeButtons.forEach((button) => {
    const active = button.dataset.kioskMode === mode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  });

  if (checkinPanel) {
    checkinPanel.classList.toggle('hidden', mode !== 'checkin');
  }

  if (registerPanel) {
    registerPanel.classList.toggle('hidden', mode !== 'register');
  }

  if (mode === 'checkin') {
    setRegistrationStatus('');
    setCheckinMode(state.checkinMode || 'pin');
  } else {
    stopScanner(false);
    setStatus('');
    if (identifierInput) {
      identifierInput.blur();
    }
    if (scheduledDateInput) {
      scheduledDateInput.blur();
    }
    if (registrationForm) {
      const firstField = registrationForm.querySelector('#visitor_name');
      if (firstField && typeof firstField.focus === 'function') {
        firstField.focus();
      }
    }
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
  } catch (error) {
    setStatus(error.message || 'QR check-in failed.', true);
  }
}

function stopScanner(showMessage = false) {
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

  if (showMessage) {
    setStatus('Camera scan stopped.');
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
          await submitQrCheckIn(token);
          return;
        }
      }
    }
  } catch (error) {
    setStatus(error.message || 'Unable to scan QR code right now.', true);
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

    if (startScanButton) {
      startScanButton.hidden = true;
    }

    if (stopScanButton) {
      stopScanButton.hidden = false;
    }

    scanLoop();
  } catch (error) {
    stopScanner(false);
    setStatus(error.message || 'Could not start the camera scanner.', true);
  }
}

async function handleLookupSubmit(event) {
  event.preventDefault();
  const identifier = identifierInput ? identifierInput.value.trim() : '';
  await submitCheckIn(identifier);
}

async function handleRegistrationSubmit(event) {
  event.preventDefault();

  if (!registrationForm) {
    return;
  }

  setRegistrationStatus('');
  setButtonLoading(registrationSubmitButton, true, 'Submit');

  try {
    const formData = new FormData(registrationForm);
    const payload = {
      visitor_name: formData.get('visitor_name'),
      company: formData.get('company'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      host_name: formData.get('host_name'),
      visit_purpose: formData.get('visit_purpose'),
      scheduled_date: formData.get('scheduled_date')
    };

    const response = await apiJson('/api/registrations', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const resultUrl = response?.data?.resultUrl || `/result/${encodeURIComponent(response?.data?.registerNo || '')}`;
    if (!resultUrl || resultUrl.endsWith('/result/')) {
      throw new Error('Registration created but result page could not be resolved.');
    }

    window.location.assign(resultUrl);
  } catch (error) {
    setRegistrationStatus(error.message || 'Registration failed', true);
  } finally {
    setButtonLoading(registrationSubmitButton, false, 'Submit');
  }
}

if (lookupForm) {
  lookupForm.addEventListener('submit', handleLookupSubmit);
}

if (startScanButton) {
  startScanButton.addEventListener('click', startScanner);
}

if (stopScanButton) {
  stopScanButton.addEventListener('click', () => stopScanner(false));
}

kioskModeButtons.forEach((button) => {
  button.addEventListener('click', () => setKioskMode(button.dataset.kioskMode || 'checkin'));
});

checkinModeButtons.forEach((button) => {
  button.addEventListener('click', () => setCheckinMode(button.dataset.checkinMode || 'pin'));
});

if (registrationForm) {
  registrationForm.addEventListener('submit', handleRegistrationSubmit);
}

setDefaultRegistrationDate();
setKioskMode('checkin');
setCheckinMode('pin');
