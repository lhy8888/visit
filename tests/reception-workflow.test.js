const request = require('supertest');
const path = require('path');
const fs = require('fs').promises;

process.env.NODE_ENV = 'test';

const testDataDir = path.join(__dirname, 'reception-test-data');
process.env.DATA_DIR = testDataDir;
process.env.VISITORS_FILE = path.join(testDataDir, 'visitors.json');
process.env.CONFIG_FILE = path.join(testDataDir, 'config.json');
process.env.DB_FILE = path.join(testDataDir, 'visitor.db');

const { closeDatabase } = require('../src/db/sqlite');
const VisitorRepository = require('../src/repositories/VisitorRepository');
const { normalizeDateOnly } = require('../src/utils/registerNo');
const app = require('../server');

describe('Reception workflow', () => {
  const todayKey = normalizeDateOnly(new Date());
  const tomorrowKey = normalizeDateOnly(new Date(Date.now() + 24 * 60 * 60 * 1000));
  let visitorRepo;

  beforeAll(async () => {
    await fs.mkdir(testDataDir, { recursive: true });
  });

  beforeEach(async () => {
    visitorRepo = new VisitorRepository({
      dbPath: process.env.DB_FILE,
      legacyFilePath: null
    });
    await visitorRepo.deleteAll();
  });

  afterAll(async () => {
    closeDatabase(process.env.DB_FILE);
    await fs.rm(testDataDir, { recursive: true, force: true });
  });

  async function createRegistration(overrides = {}) {
    const payload = {
      visitor_name: 'Reception Visitor',
      host_name: 'Front Desk',
      scheduled_date: todayKey,
      ...overrides
    };

    const response = await request(app)
      .post('/api/registrations')
      .send(payload)
      .expect(201);

    return response.body.data;
  }

  test('serves the reception page', async () => {
    const response = await request(app)
      .get('/reception')
      .expect(200);

    expect(response.text).toContain('Visitor kiosk');
  });

  test('shows today waiting and future registrations', async () => {
    const todayRegistration = await createRegistration({
      visitor_name: 'Today Visitor',
      host_name: 'Alice',
      scheduled_date: todayKey
    });

    const tomorrowRegistration = await createRegistration({
      visitor_name: 'Future Visitor',
      host_name: 'Bob',
      scheduled_date: tomorrowKey
    });

    const dashboardResponse = await request(app)
      .get(`/api/reception/today?date=${encodeURIComponent(todayKey)}`)
      .expect(200);

    expect(dashboardResponse.body.success).toBe(true);
    expect(dashboardResponse.body.data.date).toBe(todayKey);
    expect(dashboardResponse.body.data.pending).toHaveLength(1);
    expect(dashboardResponse.body.data.pending[0].registerNo).toBe(todayRegistration.registerNo);
    expect(dashboardResponse.body.data.checkedIn).toHaveLength(0);
    expect(dashboardResponse.body.data.future).toHaveLength(1);
    expect(dashboardResponse.body.data.future[0].registerNo).toBe(tomorrowRegistration.registerNo);
  });

  test('checks in by PIN or register number and updates the queue', async () => {
    const registration = await createRegistration({
      visitor_name: 'PIN Visitor',
      host_name: 'Grace',
      scheduled_date: todayKey
    });

    const checkInResponse = await request(app)
      .post('/api/checkin/by-pin')
      .send({ identifier: registration.pinCode })
      .expect(200);

    expect(checkInResponse.body.success).toBe(true);
    expect(checkInResponse.body.meta.alreadyCheckedIn).toBe(false);
    expect(checkInResponse.body.data.status).toBe('checked_in');
    expect(checkInResponse.body.data.checkedInAt).toBeTruthy();

    const dashboardResponse = await request(app)
      .get(`/api/reception/today?date=${encodeURIComponent(todayKey)}`)
      .expect(200);

    expect(dashboardResponse.body.data.pending).toHaveLength(0);
    expect(dashboardResponse.body.data.checkedIn).toHaveLength(1);
    expect(dashboardResponse.body.data.checkedIn[0].registerNo).toBe(registration.registerNo);
  });

  test('checks in by register number when the front desk types it directly', async () => {
    const registration = await createRegistration({
      visitor_name: 'Register Visitor',
      host_name: 'Mila',
      scheduled_date: todayKey
    });

    const checkInResponse = await request(app)
      .post('/api/checkin/by-pin')
      .send({ identifier: registration.registerNo })
      .expect(200);

    expect(checkInResponse.body.success).toBe(true);
    expect(checkInResponse.body.meta.lookupType).toBe('registerNo');
    expect(checkInResponse.body.data.status).toBe('checked_in');
  });

  test('checks in by QR token and checks out by id', async () => {
    const registration = await createRegistration({
      visitor_name: 'QR Visitor',
      host_name: 'Noah',
      scheduled_date: todayKey
    });

    const qrCheckInResponse = await request(app)
      .post('/api/checkin/by-qr')
      .send({ qrToken: registration.qrToken })
      .expect(200);

    expect(qrCheckInResponse.body.success).toBe(true);
    expect(qrCheckInResponse.body.meta.lookupType).toBe('qr');
    expect(qrCheckInResponse.body.data.status).toBe('checked_in');

    const checkoutResponse = await request(app)
      .post(`/api/checkout/${encodeURIComponent(registration.id)}`)
      .send({})
      .expect(200);

    expect(checkoutResponse.body.success).toBe(true);
    expect(checkoutResponse.body.meta.alreadyCheckedOut).toBe(false);
    expect(checkoutResponse.body.data.status).toBe('checked_out');
    expect(checkoutResponse.body.data.checkedOutAt).toBeTruthy();

    const dashboardResponse = await request(app)
      .get(`/api/reception/today?date=${encodeURIComponent(todayKey)}`)
      .expect(200);

    expect(dashboardResponse.body.data.checkedIn).toHaveLength(0);
  });
});
