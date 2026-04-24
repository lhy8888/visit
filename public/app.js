const form = document.getElementById('registration-form');
const statusMessage = document.getElementById('status-message');
const submitButton = document.getElementById('submit-button');
const welcomeMessage = document.getElementById('welcome-message');
const pageTitle = document.getElementById('page-title');
const siteLogo = document.getElementById('site-logo');
const scheduledDateInput = document.getElementById('scheduled_date');

function setStatus(message, isError = false) {
  if (!statusMessage) {
    return;
  }

  statusMessage.textContent = message;
  statusMessage.classList.toggle('error', Boolean(isError));
}

function getTodayDateKey() {
  return new Date().toISOString().slice(0, 10);
}

async function loadPublicConfig() {
  try {
    const response = await fetch('/api/public/config');
    if (!response.ok) {
      if (welcomeMessage) {
        welcomeMessage.textContent = 'Pre-register before you arrive.';
      }
      if (pageTitle) {
        pageTitle.textContent = 'Visitor Access';
      }
      return;
    }

    const payload = await response.json();
    const config = payload && payload.data ? payload.data : {};

    if (config.welcomeMessage && welcomeMessage) {
      welcomeMessage.textContent = config.welcomeMessage;
    } else if (welcomeMessage) {
      welcomeMessage.textContent = 'Pre-register before you arrive.';
    }

    if (config.siteTitle && pageTitle) {
      pageTitle.textContent = config.siteTitle;
    } else if (pageTitle) {
      pageTitle.textContent = 'Visitor Access';
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

function setDefaultDates() {
  if (scheduledDateInput) {
    scheduledDateInput.min = getTodayDateKey();
    scheduledDateInput.value = getTodayDateKey();
  }
}

async function handleSubmit(event) {
  event.preventDefault();

  if (!form) {
    return;
  }

  setStatus('');
  submitButton.disabled = true;
  submitButton.textContent = 'Submitting...';

  try {
    const formData = new FormData(form);
    const payload = {
      visitor_name: formData.get('visitor_name'),
      company: formData.get('company'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      host_name: formData.get('host_name'),
      visit_purpose: formData.get('visit_purpose'),
      scheduled_date: formData.get('scheduled_date')
    };

    const response = await fetch('/api/registrations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const body = await response.json();

    if (!response.ok) {
      throw new Error(body?.error?.message || 'Registration failed');
    }

    const resultUrl = body?.data?.resultUrl || `/result/${encodeURIComponent(body.data.registerNo)}`;
    window.location.assign(resultUrl);
  } catch (error) {
    setStatus(error.message || 'Registration failed', true);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Submit';
  }
}

setDefaultDates();
loadPublicConfig();

if (form) {
  form.addEventListener('submit', handleSubmit);
}
