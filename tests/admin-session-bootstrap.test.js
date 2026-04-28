process.env.NODE_ENV = 'test';

const path = require('path');
const testDataDir = path.join(__dirname, 'admin-session-bootstrap-data');
process.env.DATA_DIR = testDataDir;
process.env.DB_FILE = path.join(testDataDir, 'visitor.db');

const request = require('supertest');
const fs = require('fs').promises;
const { closeDatabase, openDatabase } = require('../src/db/sqlite');

let app;
let db;

describe('Admin session bootstrap', () => {
  beforeAll(async () => {
    await fs.mkdir(testDataDir, { recursive: true });
    app = require('../server');
    db = openDatabase(process.env.DB_FILE);
  });

  afterAll(async () => {
    try {
      closeDatabase(process.env.DB_FILE);
    } catch (error) {
      // Ignore cleanup errors in tests.
    }

    await fs.rm(testDataDir, { recursive: true, force: true }).catch(() => {});
  });

  test('fresh DB startup creates the admin_sessions table', async () => {
    const table = db.prepare(`
      SELECT name
      FROM sqlite_master
      WHERE type = 'table' AND name = 'admin_sessions'
      LIMIT 1
    `).get();

    expect(table).toBeTruthy();
    expect(table.name).toBe('admin_sessions');
  });

  test('/api/admin/login writes a session row into admin_sessions', async () => {
    const before = db.prepare('SELECT COUNT(*) AS count FROM admin_sessions').get();
    expect(before.count).toBe(0);

    const agent = request.agent(app);

    const loginResponse = await agent
      .post('/api/admin/login')
      .send({
        username: 'admin',
        password: '123456'
      })
      .expect(200);

    expect(loginResponse.body.success).toBe(true);
    expect(loginResponse.body.data.session).toBeTruthy();

    const after = db.prepare('SELECT COUNT(*) AS count FROM admin_sessions').get();
    expect(after.count).toBe(1);

    const sessionResponse = await agent
      .get('/api/admin/session')
      .expect(200);

    expect(sessionResponse.body.data.authenticated).toBe(true);
    expect(sessionResponse.body.data.session.user.username).toBe('admin');
  });
});
