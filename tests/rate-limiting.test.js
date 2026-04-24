const request = require('supertest');
const path = require('path');
const fs = require('fs').promises;

process.env.NODE_ENV = 'test';
const testDataDir = path.join(__dirname, 'rate-limiting-test-data');
process.env.DATA_DIR = testDataDir;
process.env.VISITORS_FILE = path.join(testDataDir, 'visitors.json');
process.env.CONFIG_FILE = path.join(testDataDir, 'config.json');
process.env.DB_FILE = path.join(testDataDir, 'visitor.db');

const { closeDatabase } = require('../src/db/sqlite');
const app = require('../server');

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

describe('Rate limiting', () => {
  beforeAll(async () => {
    await fs.mkdir(testDataDir, { recursive: true });
  });

  afterAll(async () => {
    closeDatabase(process.env.DB_FILE);
    await fs.rm(testDataDir, { recursive: true, force: true });
  });

  test('allows bursts of public welcome message requests', async () => {
    const promises = [];

    for (let i = 0; i < 5; i += 1) {
      promises.push(
        request(app)
          .get('/api/welcome-message')
          .expect(200)
      );
    }

    const responses = await Promise.all(promises);
    responses.forEach((response) => {
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('message');
    });
  });

  test('health endpoint is not rate limited', async () => {
    const promises = [];

    for (let i = 0; i < 20; i += 1) {
      promises.push(
        request(app)
          .get('/health')
          .expect(200)
      );
    }

    const responses = await Promise.all(promises);
    responses.forEach((response) => {
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Service en ligne');
    });
  });

  test('visitor registration bursts do not hit 429', async () => {
    const requests = [];
    const scheduledDate = new Date().toISOString().slice(0, 10);

    for (let i = 0; i < 4; i += 1) {
      requests.push(
        request(app)
          .post('/api/registrations')
          .send({
            visitor_name: `TestUser${i}`,
            host_name: 'Test Manager',
            scheduled_date: scheduledDate
          })
      );
    }

    const responses = await Promise.all(requests);
    responses.forEach((response) => {
      expect(response.status).not.toBe(429);
      expect(response.body).toHaveProperty('success');
    });
  }, 15000);

  test('admin settings endpoint is available with a session cookie', async () => {
    const agent = await loginAsAdmin();
    const response = await agent
      .get('/api/admin/settings')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('siteTitle');
    expect(response.headers).toHaveProperty('ratelimit-limit');
    expect(response.headers).toHaveProperty('ratelimit-remaining');
  });

  test('rate limit configuration matches the test environment', () => {
    const config = require('../src/config/config');

    expect(['development', 'test']).toContain(config.NODE_ENV);
    expect(config.RATE_LIMIT.max).toBe(1000);
    expect(config.RATE_LIMIT.windowMs).toBe(1 * 60 * 1000);
  });
});
