const request = require('supertest');
const path = require('path');
const fs = require('fs').promises;

process.env.NODE_ENV = 'test';

const testDataDir = path.join(__dirname, 'admin-test-data');
process.env.DATA_DIR = testDataDir;
process.env.DB_FILE = path.join(testDataDir, 'visitor.db');

const VisitorRepository = require('../src/repositories/VisitorRepository');
const { closeDatabase } = require('../src/db/sqlite');
const { normalizeDateOnly } = require('../src/utils/registerNo');
const app = require('../server');

describe('Admin authentication and dashboard', () => {
  const todayKey = normalizeDateOnly(new Date());
  const tomorrowKey = normalizeDateOnly(new Date(Date.now() + 24 * 60 * 60 * 1000));
  let visitorRepo;
  let receptionCookie;

  beforeAll(async () => {
    await fs.mkdir(testDataDir, { recursive: true });
  });

  beforeEach(async () => {
    visitorRepo = new VisitorRepository({
      dbPath: process.env.DB_FILE
    });
    await visitorRepo.deleteAll();

    const receptionResponse = await request(app)
      .get('/reception')
      .expect(200);
    receptionCookie = receptionResponse.headers['set-cookie'][0].split(';')[0];
  });

  afterAll(async () => {
    closeDatabase(process.env.DB_FILE);
    await fs.rm(testDataDir, { recursive: true, force: true });
  });

  async function createRegistration(overrides = {}) {
    const payload = {
      visitor_name: 'Admin Test Visitor',
      host_name: 'Reception',
      scheduled_date: todayKey,
      ...overrides
    };

    const response = await request(app)
      .post('/api/registrations')
      .send(payload)
      .expect(201);

    return response.body.data;
  }

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

  test('rejects protected routes until the admin logs in', async () => {
    const response = await request(app)
      .get('/api/admin/dashboard/today')
      .expect(401);

    expect(response.body.error.message).toBe('Admin session required');
  });

  test('logs in with username and password and exposes the session', async () => {
    const agent = await loginAsAdmin();

    const sessionResponse = await agent
      .get('/api/admin/session')
      .expect(200);

    expect(sessionResponse.body.data.authenticated).toBe(true);
    expect(sessionResponse.body.data.session.user.username).toBe('admin');
  });

  test('shows today dashboard, history filters, export and void actions', async () => {
    const agent = await loginAsAdmin();

    const waitingVisitor = await createRegistration({
      visitor_name: 'Waiting Visitor',
      host_name: 'Alice',
      scheduled_date: todayKey
    });

    const checkedInVisitor = await createRegistration({
      visitor_name: 'Checked In Visitor',
      host_name: 'Bob',
      scheduled_date: todayKey
    });

    const futureVisitor = await createRegistration({
      visitor_name: 'Future Visitor',
      host_name: 'Charlie',
      scheduled_date: tomorrowKey
    });

    await request(app)
      .post('/api/checkin/by-pin')
      .set('Cookie', receptionCookie)
      .send({ identifier: checkedInVisitor.pinCode })
      .expect(200);

    const dashboardResponse = await agent
      .get(`/api/admin/dashboard/today?date=${encodeURIComponent(todayKey)}`)
      .expect(200);

    expect(dashboardResponse.body.data.counts.pending).toBe(1);
    expect(dashboardResponse.body.data.counts.checkedIn).toBe(1);
    expect(dashboardResponse.body.data.counts.future).toBe(1);

    const historyResponse = await agent
      .get('/api/admin/visitors?status=checked_in')
      .expect(200);

    expect(historyResponse.body.meta.count).toBe(1);
    expect(historyResponse.body.data[0].registerNo).toBe(checkedInVisitor.registerNo);

    const exportResponse = await agent
      .get('/api/admin/export.xlsx?status=checked_in')
      .expect(200);

    expect(exportResponse.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(exportResponse.headers['content-disposition']).toContain('.xlsx');
    expect(Number(exportResponse.headers['content-length'] || 0)).toBeGreaterThan(0);

    await agent
      .patch(`/api/admin/visitors/${encodeURIComponent(futureVisitor.id)}/void`)
      .send({ reason: 'Duplicate booking' })
      .expect(200);

    const voidedHistory = await agent
      .get('/api/admin/visitors?status=void')
      .expect(200);

    expect(voidedHistory.body.meta.count).toBe(1);
    expect(voidedHistory.body.data[0].registerNo).toBe(futureVisitor.registerNo);

    const refreshedDashboard = await agent
      .get(`/api/admin/dashboard/today?date=${encodeURIComponent(todayKey)}`)
      .expect(200);

    expect(refreshedDashboard.body.data.counts.future).toBe(0);
    expect(refreshedDashboard.body.data.counts.pending).toBe(1);
    expect(refreshedDashboard.body.data.counts.checkedIn).toBe(1);

    expect(waitingVisitor.registerNo).toBeTruthy();
  });

  test('reads and updates admin settings', async () => {
    const agent = await loginAsAdmin();

    const settingsResponse = await agent
      .get('/api/admin/settings')
      .expect(200);

    expect(settingsResponse.body.data.siteTitle).toBeTruthy();

    const originalSettings = settingsResponse.body.data;
    const updatedSettings = await agent
      .put('/api/admin/settings')
      .send({
        siteTitle: 'North Wing Reception',
        welcomeMessage: 'Hello from the admin panel',
        enableQrCheckin: false
      })
      .expect(200);

    expect(updatedSettings.body.data.siteTitle).toBe('North Wing Reception');
    expect(updatedSettings.body.data.enableQrCheckin).toBe(false);

    const restoredSettings = await agent
      .put('/api/admin/settings')
      .send({
        siteTitle: originalSettings.siteTitle,
        welcomeMessage: originalSettings.welcomeMessage,
        logoPath: originalSettings.logoPath,
        defaultTimezone: originalSettings.defaultTimezone,
        pinLength: originalSettings.pinLength,
        dataRetentionDays: originalSettings.dataRetentionDays,
        enableQrCheckin: originalSettings.enableQrCheckin,
        enablePinCheckin: originalSettings.enablePinCheckin
      })
      .expect(200);

    expect(restoredSettings.body.data.siteTitle).toBe(originalSettings.siteTitle);
  });
});
