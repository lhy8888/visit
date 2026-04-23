const QRCode = require('qrcode');

function buildQrContent(qrToken) {
  return String(qrToken || '').trim();
}

async function generateQrDataUrl(content) {
  return QRCode.toDataURL(String(content), {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 256
  });
}

module.exports = {
  buildQrContent,
  generateQrDataUrl
};
