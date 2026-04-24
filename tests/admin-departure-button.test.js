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

  test('returns current visitors only after admin login', async () => {
    const visitor = await createCheckedInVisitor();

    const response = await adminAgent
      .get('/api/admin/visitors/current')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe(visitor.id);
    expect(response.body.data[0].email).toBe('test@example.com');
  });

  test('moves a visitor out of the current list after checkout', async () => {
    const visitor = await createCheckedInVisitor();

    await request(app)
      .post('/api/check-out')
      .send({ email: visitor.email })
      .expect(200);

    const currentResponse = await adminAgent
      .get('/api/admin/visitors/current')
      .expect(200);

    expect(currentResponse.body.data).toHaveLength(0);

    const historyResponse = await adminAgent
      .get('/api/admin/visitors/history')
      .expect(200);

    expect(historyResponse.body.data).toHaveLength(1);
    expect(historyResponse.body.data[0].statut).toBe('parti');
  });

  test('rejects legacy admin reads without a session', async () => {
    await request(app)
      .get('/api/admin/visitors/current')
      .expect(401);
  });
});
