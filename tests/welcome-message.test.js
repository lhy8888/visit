const request = require('supertest');
const path = require('path');
const fs = require('fs').promises;

process.env.NODE_ENV = 'test';
const testDataDir = path.join(__dirname, 'welcome-message-test-data');
process.env.DATA_DIR = testDataDir;
process.env.DB_FILE = path.join(testDataDir, 'visitor.db');

const SettingsRepository = require('../src/repositories/SettingsRepository');
const { closeDatabase } = require('../src/db/sqlite');
const app = require('../server');

describe('Welcome message and public settings', () => {
  let settingsRepo;

  beforeAll(async () => {
    await fs.mkdir(testDataDir, { recursive: true });
  });

  beforeEach(async () => {
    settingsRepo = new SettingsRepository();
    await settingsRepo.set('welcome_message', 'Pre-register before you arrive.');
    await settingsRepo.set('site_title', 'Visitor Access');
    await settingsRepo.set('logo_path', '/images/logo.png');
    await settingsRepo.set('default_timezone', 'UTC');
    await settingsRepo.set('pin_length', '6');
    await settingsRepo.set('data_retention_days', '30');
    await settingsRepo.set('enable_qr_checkin', '1');
    await settingsRepo.set('enable_pin_checkin', '1');
  });

  afterAll(async () => {
    closeDatabase(process.env.DB_FILE);
    await fs.rm(testDataDir, { recursive: true, force: true });
  });

  async function loginAsAdmin() {
    const agent = request.agent(app);
    await agent
      .post('/api/admin/login')
      .send({
        username: 'admin',
        password: '123456'
      })
      .expect(200);
    return agent;
  }

  test('returns the welcome message from SQLite settings', async () => {
    const response = await request(app)
      .get('/api/welcome-message')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.message).toBe('Pre-register before you arrive.');
  });

  test('updates the public welcome message through admin settings', async () => {
    const agent = await loginAsAdmin();
    const customMessage = 'Welcome to the office';

    await agent
      .put('/api/admin/settings')
      .send({
        welcomeMessage: customMessage
      })
      .expect(200);

    const response = await request(app)
      .get('/api/welcome-message')
      .expect(200);

    expect(response.body.data.message).toBe(customMessage);
  });

  test('exposes the same settings through the public config alias', async () => {
    const response = await request(app)
      .get('/api/public/config')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      welcomeMessage: 'Pre-register before you arrive.',
      siteTitle: 'Visitor Access',
      logoPath: '/images/logo.png',
      defaultTimezone: 'UTC',
      pinLength: 6
    });
  });

  test('returns validation errors for invalid public settings updates', async () => {
    const agent = await loginAsAdmin();

    const response = await agent
      .put('/api/admin/settings')
      .send({
        pinLength: 3
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toContain('PIN');
  });
});
