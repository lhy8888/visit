const lookupForm = document.getElementById('lookup-form');
const identifierInput = document.getElementById('identifier-input');
const lookupButton = document.getElementById('lookup-button');
const registrationForm = document.getElementById('registration-form');
const registrationStatus = document.getElementById('registration-status');
const registrationSubmitButton = document.getElementById('registration-submit-button');
const statusMessage = document.getElementById('status-message');
const scannerVideo = document.getElementById('scanner-video');
const siteLogo = document.getElementById('site-logo');
const pageTitle = document.getElementById('page-title');

const SCAN_COOLDOWN_MS = 3500;

const state = {
  scannerStream: null,
  scannerDetector: null,
  scanning: false,
  scanFrameHandle: null,
  lastScanToken: '',
  scanPausedUntil: 0
};

function setStatus(message, isError = false) {
  if (!statusMessage) {
    return;
  }

  statusMessage.textContent = message || '';
  statusMessage.classList.toggle('error', Boolean(isError));
}

function setRegistrationStatus(message, isError = false) {
  if (!registrationStatus) {
    return;
  }

  registrationStatus.textContent = message || '';
  registrationStatus.classList.toggle('error', Boolean(isError));
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

function getTodayDateKey() {
  return new Date().toISOString().slice(0, 10);
}

async function apiJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'include',
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

async function loadPublicConfig() {
  try {
    const response = await fetch('/api/public/config');
    if (!response.ok) {
      if (pageTitle) {
        pageTitle.textContent = 'Visitor Access';
      }
      if (document && typeof document.title === 'string') {
        document.title = 'Reception - Visitor Access';
      }
      return;
    }

    const payload = await response.json();
    const config = payload && payload.data ? payload.data : {};

    const configuredTitle = config.siteTitle || 'Visitor Access';
    if (pageTitle) {
      pageTitle.textContent = configuredTitle;
    }
    if (document && typeof document.title === 'string') {
      document.title = `Reception - ${configuredTitle}`;
    }

    if (config.logoPath && siteLogo) {
      siteLogo.hidden = false;
      siteLogo.src = config.logoPath;
      siteLogo.onerror = () => {
        siteLogo.hidden = true;
      };
    }
  } catch (error) {
    setStatus('Could not load the public configuration.', true);
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
        const now = Date.now();
        if (token && (token !== state.lastScanToken || now >= state.scanPausedUntil)) {
          state.lastScanToken = token;
          state.scanPausedUntil = now + SCAN_COOLDOWN_MS;
          setStatus('QR detected. Checking in...');
          await submitQrCheckIn(token);
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
    if (state.scanning && state.scannerStream) {
      return;
    }

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

    setStatus('Camera is active.');
    scanLoop();
  } catch (error) {
    stopScanner(false);
    const message = error?.message || '';
    const neutralFallback = message.includes('does not support built-in QR scanning')
      || message.includes('Camera access is not available');
    setStatus(
      neutralFallback
        ? 'Camera scanning is available on supported devices. PIN entry still works.'
        : message || 'Could not start the camera scanner.',
      !neutralFallback
    );
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
      scheduled_date: getTodayDateKey(),
      source: 'reception'
    };

    const response = await apiJson('/api/registrations', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (!response?.success) {
      throw new Error('Registration created but the server did not confirm check-in.');
    }

    registrationForm.reset();
    setRegistrationStatus(response?.message || 'Visitor checked in successfully.');
    if (identifierInput) {
      identifierInput.value = '';
      identifierInput.focus();
    }
  } catch (error) {
    setRegistrationStatus(error.message || 'Registration failed', true);
  } finally {
    setButtonLoading(registrationSubmitButton, false, 'Submit');
  }
}

if (lookupForm) {
  lookupForm.addEventListener('submit', handleLookupSubmit);
}

if (registrationForm) {
  registrationForm.addEventListener('submit', handleRegistrationSubmit);
}

window.addEventListener('beforeunload', () => stopScanner(false));

loadPublicConfig();
startScanner();
