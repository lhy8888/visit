const registerNoElement = document.getElementById('register-no');
const pinCodeElement = document.getElementById('pin-code');
const visitorNameElement = document.getElementById('visitor-name');
const hostNameElement = document.getElementById('host-name');
const scheduledDateElement = document.getElementById('scheduled-date');
const statusElement = document.getElementById('status');
const qrImageElement = document.getElementById('qr-image');
const qrContentElement = document.getElementById('qr-content');
const resultMessageElement = document.getElementById('result-message');
const copyRegisterNoButton = document.getElementById('copy-register-no');
const copyPinButton = document.getElementById('copy-pin');

function setText(element, value) {
  if (element) {
    element.textContent = value;
  }
}

function getRegisterNoFromPath() {
  const parts = window.location.pathname.split('/').filter(Boolean);
  return decodeURIComponent(parts[parts.length - 1] || '');
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
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(parsed);
}

function copyText(value, label) {
  if (!value) {
    return;
  }

  navigator.clipboard.writeText(value).then(() => {
    if (resultMessageElement) {
      resultMessageElement.textContent = `${label} copied to clipboard.`;
    }
  }).catch(() => {
    if (resultMessageElement) {
      resultMessageElement.textContent = `Could not copy ${label.toLowerCase()}.`;
    }
  });
}

async function loadResult() {
  const registerNo = getRegisterNoFromPath();

  if (!registerNo) {
    setText(resultMessageElement, 'Missing register number in the URL.');
    return;
  }

  try {
    const response = await fetch(`/api/registrations/${encodeURIComponent(registerNo)}`);
    const body = await response.json();

    if (!response.ok) {
      throw new Error(body?.error?.message || 'Registration not found');
    }

    const registration = body.data;
    setText(registerNoElement, registration.registerNo);
    setText(pinCodeElement, registration.pinCode);
    setText(visitorNameElement, registration.visitorName || '-');
    setText(hostNameElement, registration.hostName || '-');
    setText(scheduledDateElement, formatDate(registration.scheduledDate));
    setText(statusElement, registration.status || '-');
    setText(qrContentElement, registration.qrContent || registration.qrToken || '-');
    setText(resultMessageElement, 'Keep this page open or print it for reception.');

    if (qrImageElement && registration.qrDataUrl) {
      qrImageElement.hidden = false;
      qrImageElement.src = registration.qrDataUrl;
    }

    if (copyRegisterNoButton) {
      copyRegisterNoButton.addEventListener('click', () => copyText(registration.registerNo, 'Register number'));
    }

    if (copyPinButton) {
      copyPinButton.addEventListener('click', () => copyText(registration.pinCode, 'PIN'));
    }
  } catch (error) {
    setText(resultMessageElement, error.message || 'Could not load registration data.');
  }
}

loadResult();
