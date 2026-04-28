const fs = require('fs').promises;
const path = require('path');
const { JSDOM } = require('jsdom');

describe('Reception public config rendering', () => {
  test('applies the configured site title to the reception page', async () => {
    const htmlPath = path.join(__dirname, '..', 'public', 'reception.html');
    const scriptPath = path.join(__dirname, '..', 'public', 'reception.js');

    const [html, script] = await Promise.all([
      fs.readFile(htmlPath, 'utf8'),
      fs.readFile(scriptPath, 'utf8')
    ]);

    const dom = new JSDOM(html, {
      url: 'http://localhost:3001/reception',
      runScripts: 'outside-only',
      pretendToBeVisual: true
    });

    dom.window.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          siteTitle: 'North Wing Reception',
          logoPath: '/images/logo.svg'
        }
      })
    });
    dom.window.BarcodeDetector = undefined;
    dom.window.navigator.mediaDevices = undefined;
    dom.window.requestAnimationFrame = (callback) => setTimeout(() => callback(Date.now()), 0);
    dom.window.cancelAnimationFrame = (handle) => clearTimeout(handle);

    dom.window.eval(script);

    await new Promise((resolve) => setTimeout(resolve, 25));

    expect(dom.window.document.getElementById('page-title').textContent).toBe('North Wing Reception');
    expect(dom.window.document.title).toBe('Reception - North Wing Reception');
  });
});
