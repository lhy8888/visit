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

describe('Test visitor generation and legacy compatibility routes', () => {
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

  test('creates a visitor through the legacy check-in route', async () => {
    const testVisitor = {
      nom: 'Martin',
      prenom: 'Jean',
      societe: 'Tech Solutions SARL',
      email: 'jean.martin.test1234@techsolutions.fr',
      telephone: '06 12 34 56 78',
      personneVisitee: 'Marie Dubois'
    };

    const response = await request(app)
      .post('/api/check-in')
      .send(testVisitor)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.nom).toBe('Martin');
    expect(response.body.data.societe).toBe('Tech Solutions SARL');
    expect(response.headers.deprecation).toBe('true');
  });

  test('rejects invalid legacy check-in payloads', async () => {
    const response = await request(app)
      .post('/api/check-in')
      .send({
        nom: 'Test',
        prenom: 'Invalid',
        societe: 'Test Company',
        email: 'email-invalide',
        telephone: '06 12 34 56 78',
        personneVisitee: 'Test Manager'
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toContain('adresse email');
  });

  test('generates test visitors only with an admin session', async () => {
    const response = await adminAgent
      .post('/api/admin/generate-test-visitors')
      .send({
        count: 3,
        daysBack: 7
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.requested).toBe(3);
    expect(response.body.data.generated).toBeLessThanOrEqual(3);

    const visitors = await visitorRepo.findAll();
    expect(visitors.length).toBe(response.body.data.generated);
  });

  test('rejects legacy admin debug routes without a session', async () => {
    await request(app)
      .post('/api/admin/generate-test-visitors')
      .send({ count: 1 })
      .expect(401);
  });
});
