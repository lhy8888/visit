const request = require('supertest');
const path = require('path');
const fs = require('fs').promises;

process.env.NODE_ENV = 'test';
const testDataDir = path.join(__dirname, 'test-data-generation');
process.env.DATA_DIR = testDataDir;
process.env.VISITORS_FILE = path.join(testDataDir, 'visitors.json');
process.env.CONFIG_FILE = path.join(testDataDir, 'config.json');
process.env.DB_FILE = path.join(testDataDir, 'visitor.db');

const VisitorRepository = require('../src/repositories/VisitorRepository');
const { closeDatabase } = require('../src/db/sqlite');
const app = require('../server');

describe('Legacy visitor routes are removed', () => {
  let visitorRepo;
  let adminAgent;

  beforeAll(async () => {
    await fs.mkdir(testDataDir, { recursive: true });
  });

  beforeEach(async () => {
    visitorRepo = new VisitorRepository({
      dbPath: path.join(testDataDir, 'visitor.db'),
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
    closeDatabase(path.join(testDataDir, 'visitor.db'));
    try {
      await fs.rm(testDataDir, { recursive: true, force: true });
    } catch (error) {
      console.log('Cleanup failed:', error);
    }
  });

  test('returns 404 for the old check-in route', async () => {
    await request(app)
      .post('/api/check-in')
      .send({
        nom: 'Martin',
        prenom: 'Jean',
        societe: 'Tech Solutions SARL',
        email: 'jean.martin.test1234@techsolutions.fr',
        telephone: '06 12 34 56 78',
        personneVisitee: 'Marie Dubois'
      })
      .expect(404);
  });

  test('returns 404 for the old admin debug route', async () => {
    await adminAgent
      .post('/api/admin/generate-test-visitors')
      .send({
        count: 3,
        daysBack: 7
      })
      .expect(404);
  });

  test('returns 404 for the old admin debug route without a session', async () => {
    await request(app)
      .post('/api/admin/generate-test-visitors')
      .send({ count: 1 })
      .expect(404);
  });
});
