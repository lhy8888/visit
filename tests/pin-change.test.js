const request = require('supertest');
const path = require('path');
const fs = require('fs').promises;

process.env.NODE_ENV = 'test';
const testDataDir = path.join(__dirname, 'pin-change-test-data');
process.env.DATA_DIR = testDataDir;
process.env.DB_FILE = path.join(testDataDir, 'visitor.db');

const { closeDatabase } = require('../src/db/sqlite');
const app = require('../server');

describe('Legacy PIN change deprecation', () => {
  let adminAgent;

  beforeAll(async () => {
    await fs.mkdir(testDataDir, { recursive: true });
  });

  beforeEach(async () => {
    adminAgent = request.agent(app);
    await adminAgent
      .post('/api/admin/login')
      .send({
        username: 'admin',
        password: '123456'
      })
      .expect(200);
  });

  afterAll(async () => {
    closeDatabase(process.env.DB_FILE);
    await fs.rm(testDataDir, { recursive: true, force: true });
  });

  test('returns 404 for the removed PIN change route', async () => {
    const response = await adminAgent
      .post('/api/admin/change-pin')
      .send({ newPin: '1234' })
      .expect(404);

    expect(response.body.success).toBe(false);
  });
});
