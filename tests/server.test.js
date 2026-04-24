const request = require('supertest');
const path = require('path');
const fs = require('fs').promises;

process.env.NODE_ENV = 'test';
const testDataDir = path.join(__dirname, 'test-data');
process.env.DATA_DIR = testDataDir;
process.env.VISITORS_FILE = path.join(testDataDir, 'visitors.json');
process.env.CONFIG_FILE = path.join(testDataDir, 'config.json');
process.env.DB_FILE = path.join(testDataDir, 'visitor.db');

const VisitorRepository = require('../src/repositories/VisitorRepository');
const { closeDatabase } = require('../src/db/sqlite');
const app = require('../server');

describe('Compatibility smoke tests', () => {
  let visitorRepo;
  let adminAgent;

  beforeAll(async () => {
    await fs.mkdir(testDataDir, { recursive: true });
  });

  beforeEach(async () => {
    visitorRepo = new VisitorRepository({
      dbPath: process.env.DB_FILE,
      legacyFilePath: null
    });
    await visitorRepo.deleteAll();

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

  test('legacy check-in and check-out routes are removed', async () => {
    const response = await request(app)
      .post('/api/check-in')
      .send({
        nom: 'Martin',
        prenom: 'Jean',
        societe: 'Test Corp',
        email: 'jean.martin@test.com',
        telephone: '0123456789',
        personneVisitee: 'Marie Dubois'
      })
      .expect(404);

    await request(app)
      .post('/api/check-out')
      .send({ email: 'jean.checkout@test.com' })
      .expect(404);
  });

  test('legacy admin config routes are removed', async () => {
    await request(app)
      .get('/api/admin/config')
      .expect(404);

    await adminAgent
      .get('/api/admin/config')
      .expect(404);

    await request(app)
      .post('/api/admin/change-pin')
      .send({ newPin: '1234' })
      .expect(404);
  });

  test('admin login no longer accepts pin-only credentials', async () => {
    const response = await request(app)
      .post('/api/admin/login')
      .send({ pin: '123456' })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toContain('Identifiants administrateur requis');
  });
});
