const fs = require('fs').promises;
const path = require('path');
const { closeDatabase } = require('../src/db/sqlite');
const VisitorRepository = require('../src/repositories/VisitorRepository');

describe('SQLite VisitorRepository', () => {
  const testDir = path.join(__dirname, 'sqlite-test-data');
  let dbPath;
  let legacyPath;
  let repository;

  beforeAll(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors in tests.
    }
  });

  beforeEach(async () => {
    dbPath = path.join(testDir, `visitor-${Date.now()}-${Math.random().toString(16).slice(2)}.db`);
    legacyPath = path.join(testDir, `visitors-${Date.now()}-${Math.random().toString(16).slice(2)}.json`);
    repository = new VisitorRepository({
      dbPath,
      legacyFilePath: legacyPath
    });
  });

  afterEach(async () => {
    closeDatabase(dbPath);
    await fs.rm(dbPath, { force: true }).catch(() => {});
    await fs.rm(legacyPath, { force: true }).catch(() => {});
  });

  test('creates a visitor and mirrors to legacy JSON', async () => {
    const created = await repository.create({
      nom: 'Martin',
      prenom: 'Jean',
      societe: 'Tech Solutions',
      email: 'jean.martin@example.com',
      telephone: '0123456789',
      personneVisitee: 'Marie Dubois'
    });

    expect(created.id).toBeTruthy();
    expect(created.heureSortie).toBeNull();

    const allVisitors = await repository.findAll();
    expect(allVisitors).toHaveLength(1);
    expect(allVisitors[0].email).toBe('jean.martin@example.com');

    const legacySnapshot = JSON.parse(await fs.readFile(legacyPath, 'utf8'));
    expect(legacySnapshot).toHaveLength(1);
    expect(legacySnapshot[0].nom).toBe('Martin');
  });

  test('syncs external legacy JSON changes before reading', async () => {
    const legacyVisitors = [
      {
        id: 'legacy-1',
        nom: 'Legacy',
        prenom: 'User',
        societe: 'Old Corp',
        email: 'legacy@example.com',
        telephone: '0102030405',
        personneVisitee: 'Front Desk',
        heureArrivee: '2025-04-23T09:00:00.000Z',
        heureSortie: null
      }
    ];

    await fs.writeFile(legacyPath, JSON.stringify(legacyVisitors, null, 2), 'utf8');

    const visitors = await repository.findAll();
    expect(visitors).toHaveLength(1);
    expect(visitors[0].id).toBe('legacy-1');
    expect(visitors[0].email).toBe('legacy@example.com');
  });

  test('updates and check-outs a visitor', async () => {
    const created = await repository.create({
      nom: 'Smith',
      prenom: 'Anna',
      email: 'anna.smith@example.com',
      personneVisitee: 'Reception'
    });

    const updated = await repository.update(created.id, {
      societe: 'New Company'
    });
    expect(updated.societe).toBe('New Company');

    const checkedOut = await repository.checkOut('anna.smith@example.com');
    expect(checkedOut.heureSortie).toBeTruthy();
    expect(checkedOut.statut).toBe('parti');

    const byId = await repository.findById(created.id);
    expect(byId.heureSortie).toBeTruthy();
  });

  test('deletes all visitors', async () => {
    await repository.create({
      nom: 'One',
      prenom: 'Visitor',
      email: 'one@example.com',
      personneVisitee: 'Desk'
    });

    await repository.deleteAll();

    const visitors = await repository.findAll();
    expect(visitors).toHaveLength(0);

    const legacySnapshot = JSON.parse(await fs.readFile(legacyPath, 'utf8'));
    expect(legacySnapshot).toHaveLength(0);
  });
});
