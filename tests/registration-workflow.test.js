const request = require('supertest');
const path = require('path');
const fs = require('fs').promises;

process.env.NODE_ENV = 'test';

const testDataDir = path.join(__dirname, 'registration-test-data');
process.env.DATA_DIR = testDataDir;
process.env.DB_FILE = path.join(testDataDir, 'visitor.db');

const { closeDatabase } = require('../src/db/sqlite');
const VisitorRepository = require('../src/repositories/VisitorRepository');
const app = require('../server');

describe('Registration workflow', () => {
  let visitorRepo;

  beforeAll(async () => {
    await fs.mkdir(testDataDir, { recursive: true });
  });

  beforeEach(async () => {
    visitorRepo = new VisitorRepository({
      dbPath: process.env.DB_FILE
    });
    await visitorRepo.deleteAll();
  });

  afterAll(async () => {
    closeDatabase(process.env.DB_FILE);
    await fs.rm(testDataDir, { recursive: true, force: true });
  });

  test('creates a pre-registration and returns result data', async () => {
    const payload = {
      visitor_name: 'Jane Doe',
      company: 'Acme Ltd',
      email: 'jane.doe@example.com',
      phone: '+44 7000 000000',
      host_name: 'John Smith',
      visit_purpose: 'Project meeting',
      scheduled_date: '2026-04-23'
    };

    const createResponse = await request(app)
      .post('/api/registrations')
      .send(payload)
      .expect(201);

    expect(createResponse.body.success).toBe(true);
    expect(createResponse.body.data.registerNo).toMatch(/^V\d{8}-\d{4}$/);
    expect(createResponse.body.data.pinCode).toMatch(/^\d{4,6}$/);
    expect(createResponse.body.data.qrDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(createResponse.body.data.status).toBe('registered');
    expect(createResponse.body.data.resultUrl).toBe(
      `/result/${encodeURIComponent(createResponse.body.data.registerNo)}`
    );

    const lookupResponse = await request(app)
      .get(`/api/registrations/${encodeURIComponent(createResponse.body.data.registerNo)}`)
      .expect(200);

    expect(lookupResponse.body.success).toBe(true);
    expect(lookupResponse.body.data.registerNo).toBe(createResponse.body.data.registerNo);
    expect(lookupResponse.body.data.pinCode).toBe(createResponse.body.data.pinCode);
    expect(lookupResponse.body.data.qrDataUrl).toMatch(/^data:image\/png;base64,/);

    const resultPage = await request(app)
      .get(`/result/${encodeURIComponent(createResponse.body.data.registerNo)}`)
      .expect(200);

    expect(resultPage.text).toContain('Your PIN is ready');
    expect(resultPage.text).not.toContain('Host name');
    expect(resultPage.text).not.toContain('Register number');
  });

  test('keeps registered visitors out of the current list', async () => {
    const todayKey = new Date().toISOString().slice(0, 10);
    const payload = {
      visitor_name: 'Pending Visitor',
      host_name: 'Reception',
      scheduled_date: todayKey
    };

    const createResponse = await request(app)
      .post('/api/registrations')
      .send(payload)
      .expect(201);

    const currentResponse = await request(app)
      .get(`/api/reception/today?date=${encodeURIComponent(todayKey)}`)
      .expect(200);

    expect(currentResponse.body.data.date).toBe(todayKey);
    expect(currentResponse.body.data).toHaveProperty('pending');
    expect(currentResponse.body.data.pending).toHaveLength(1);
    expect(currentResponse.body.data.checkedIn).toHaveLength(0);

    expect(createResponse.body.data.registerNo).toBeTruthy();
  });

  test('exposes public config through the new alias', async () => {
    const response = await request(app)
      .get('/api/public/config')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('welcomeMessage');
  });
});
