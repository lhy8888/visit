const request = require('supertest');
const path = require('path');
const fs = require('fs').promises;

process.env.NODE_ENV = 'test';
const testDataDir = path.join(__dirname, 'test-data-departure');
process.env.DATA_DIR = testDataDir;
process.env.VISITORS_FILE = path.join(testDataDir, 'visitors.json');
process.env.CONFIG_FILE = path.join(testDataDir, 'config.json');
process.env.DB_FILE = path.join(testDataDir, 'visitor.db');

const VisitorRepository = require('../src/repositories/VisitorRepository');
const { closeDatabase } = require('../src/db/sqlite');
const app = require('../server');

describe('Admin departure workflow', () => {
  let visitorRepo;
  let adminAgent;
  const dbPath = path.join(testDataDir, 'visitor.db');

  beforeAll(async () => {
    await fs.mkdir(testDataDir, { recursive: true });
  });

  beforeEach(async () => {
    visitorRepo = new VisitorRepository({
      dbPath,
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

  afterEach(async () => {
    await visitorRepo.deleteAll();
  });

  afterAll(async () => {
    closeDatabase(dbPath);
    await fs.rm(testDataDir, { recursive: true, force: true });
  });

  async function createCheckedInVisitor() {
    const visitor = await visitorRepo.create({
      nom: 'TestUser',
      prenom: 'Jean',
      societe: 'Test Company',
      email: 'test@example.com',
      personneVisitee: 'Marie Dubois'
    });

    return visitor;
  }

  test('legacy current visitors route is removed', async () => {
    await adminAgent
      .get('/api/admin/visitors/current')
      .expect(404);
  });

  test('legacy checkout route is removed', async () => {
    const visitor = await createCheckedInVisitor();

    await request(app)
      .post('/api/check-out')
      .send({ email: visitor.email })
      .expect(404);

    await request(app)
      .get('/api/admin/visitors/history')
      .expect(404);
  });
});
