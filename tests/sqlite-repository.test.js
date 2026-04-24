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

  afterEach(async () => {
    if (dbPath) {
      closeDatabase(dbPath);
    }

    if (dbPath) {
      await fs.rm(dbPath, { force: true }).catch(() => {});
    }

    if (legacyPath) {
      await fs.rm(legacyPath, { force: true }).catch(() => {});
    }
  });

  test('uses SQLite only by default', async () => {
    dbPath = path.join(testDir, `visitor-${Date.now()}-${Math.random().toString(16).slice(2)}.db`);
    legacyPath = path.join(testDir, `visitors-${Date.now()}-${Math.random().toString(16).slice(2)}.json`);

    repository = new VisitorRepository({
      dbPath,
      legacyFilePath: legacyPath
    });

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

    const visitors = await repository.findAll();
    expect(visitors).toHaveLength(1);
    expect(visitors[0].email).toBe('jean.martin@example.com');

    await expect(fs.access(legacyPath)).rejects.toHaveProperty('code', 'ENOENT');
  });

  test('can mirror and resync legacy JSON only in explicit compat mode', async () => {
    dbPath = path.join(testDir, `visitor-${Date.now()}-${Math.random().toString(16).slice(2)}.db`);
    legacyPath = path.join(testDir, `visitors-${Date.now()}-${Math.random().toString(16).slice(2)}.json`);

    repository = new VisitorRepository({
      dbPath,
      legacyFilePath: legacyPath,
      legacyCompatMode: true
    });

    const created = await repository.create({
      nom: 'Legacy',
      prenom: 'User',
      societe: 'Old Corp',
      email: 'legacy@example.com',
      telephone: '0102030405',
      personneVisitee: 'Front Desk'
    });

    expect(created.id).toBeTruthy();

    const firstSnapshot = JSON.parse(await fs.readFile(legacyPath, 'utf8'));
    expect(firstSnapshot).toHaveLength(1);
    expect(firstSnapshot[0].nom).toBe('Legacy');

    await fs.writeFile(legacyPath, JSON.stringify([
      ...firstSnapshot,
      {
        id: 'legacy-2',
        nom: 'Imported',
        prenom: 'Guest',
        societe: 'Compat Corp',
        email: 'imported@example.com',
        telephone: '0203040506',
        personneVisitee: 'Lobby',
        heureArrivee: '2025-04-23T09:00:00.000Z',
        heureSortie: null
      }
    ], null, 2), 'utf8');

    closeDatabase(dbPath);
    repository = new VisitorRepository({
      dbPath,
      legacyFilePath: legacyPath,
      legacyCompatMode: true
    });

    const visitors = await repository.findAll();
    expect(visitors).toHaveLength(2);
    expect(visitors.find((visitor) => visitor.email === 'imported@example.com')).toBeTruthy();
  });

  test('updates and checks out a visitor in SQLite', async () => {
    dbPath = path.join(testDir, `visitor-${Date.now()}-${Math.random().toString(16).slice(2)}.db`);
    legacyPath = path.join(testDir, `visitors-${Date.now()}-${Math.random().toString(16).slice(2)}.json`);

    repository = new VisitorRepository({
      dbPath,
      legacyFilePath: legacyPath
    });

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

  test('deletes all visitors from SQLite', async () => {
    dbPath = path.join(testDir, `visitor-${Date.now()}-${Math.random().toString(16).slice(2)}.db`);
    legacyPath = path.join(testDir, `visitors-${Date.now()}-${Math.random().toString(16).slice(2)}.json`);

    repository = new VisitorRepository({
      dbPath,
      legacyFilePath: legacyPath
    });

    await repository.create({
      nom: 'One',
      prenom: 'Visitor',
      email: 'one@example.com',
      personneVisitee: 'Desk'
    });

    await repository.deleteAll();

    const visitors = await repository.findAll();
    expect(visitors).toHaveLength(0);
  });
});
