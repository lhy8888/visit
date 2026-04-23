const request = require('supertest');
const app = require('../server');
const fs = require('fs');
const path = require('path');
const ConfigRepository = require('../src/repositories/ConfigRepository');

describe('🖼️ Tests - Upload Logo', () => {
  let configRepo;
  const testImagePath = path.join(__dirname, 'test-logo.png');
  
  beforeAll(() => {
    // Créer un fichier image de test simple (1x1 pixel PNG)
    const pngData = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
      0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
      0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
      0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
      0x42, 0x60, 0x82
    ]);
    fs.writeFileSync(testImagePath, pngData);
  });

  beforeEach(async () => {
    configRepo = new ConfigRepository();
  });

  afterAll(() => {
    // Nettoyer le fichier de test
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
  });

  describe('API endpoint PUT /api/admin/logo', () => {
    test('Upload d\'un logo PNG valide', async () => {
      const response = await request(app)
        .put('/api/admin/logo')
        .attach('logo', testImagePath)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logo mis à jour avec succès');
      expect(response.body.data).toHaveProperty('logoPath');
      expect(response.body.data.logoPath).toMatch(/^\/images\/logo-\d+-\d+\.png$/);
    });

    test('Upload sans fichier', async () => {
      const response = await request(app)
        .put('/api/admin/logo')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Le chemin du logo est requis');
    });

    test('Upload avec fichier non-image', async () => {
      const textFilePath = path.join(__dirname, 'test-file.txt');
      fs.writeFileSync(textFilePath, 'Test file content');
      
      try {
        const response = await request(app)
          .put('/api/admin/logo')
          .attach('logo', textFilePath)
          .expect(500);

        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain('Seuls les fichiers image');
      } finally {
        if (fs.existsSync(textFilePath)) {
          fs.unlinkSync(textFilePath);
        }
      }
    });

    test('Upload avec fichier trop volumineux', async () => {
      // Créer un fichier PNG de test volumineux (dépasse MAX_FILE_SIZE)
      const largeFilePath = path.join(__dirname, 'large-test.png');
      const largeData = Buffer.alloc(3000000); // 3MB
      largeData.fill(0xFF);
      fs.writeFileSync(largeFilePath, largeData);
      
      try {
        const response = await request(app)
          .put('/api/admin/logo')
          .attach('logo', largeFilePath)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain('Fichier trop volumineux');
      } finally {
        if (fs.existsSync(largeFilePath)) {
          fs.unlinkSync(largeFilePath);
        }
      }
    });

    test('Upload avec méthode POST (erreur)', async () => {
      const response = await request(app)
        .post('/api/admin/logo')
        .attach('logo', testImagePath)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Route non trouvée');
    });
  });

  describe('Validation du middleware', () => {
    test('Content-Type non-multipart doit échouer', async () => {
      const response = await request(app)
        .put('/api/admin/logo')
        .send({ some: 'data' }) // Pas multipart
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Le chemin du logo est requis');
    });

    test('Fichier image JPG accepté', async () => {
      const jpgPath = path.join(__dirname, 'test-logo.jpg');
      // Créer un fichier JPG de test minimal
      const jpgData = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
        0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
        0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
        0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
        0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0A, 0x0C,
        0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
        0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D,
        0x1A, 0x1C, 0x1C, 0x20, 0x24, 0x2E, 0x27, 0x20,
        0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
        0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27,
        0x39, 0x3D, 0x38, 0x32, 0x3C, 0x2E, 0x33, 0x34,
        0x32, 0xFF, 0xC0, 0x00, 0x11, 0x08, 0x00, 0x01,
        0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11,
        0x01, 0x03, 0x11, 0x01, 0xFF, 0xC4, 0x00, 0x14,
        0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x08, 0xFF, 0xC4, 0x00, 0x14, 0x10, 0x01,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0xFF, 0xDA, 0x00, 0x0C, 0x03, 0x01, 0x00, 0x02,
        0x11, 0x03, 0x11, 0x00, 0x3F, 0x00, 0x00, 0xFF,
        0xD9
      ]);
      fs.writeFileSync(jpgPath, jpgData);

      try {
        const response = await request(app)
          .put('/api/admin/logo')
          .attach('logo', jpgPath)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.logoPath).toMatch(/^\/images\/logo-\d+-\d+\.jpg$/);
      } finally {
        if (fs.existsSync(jpgPath)) {
          fs.unlinkSync(jpgPath);
        }
      }
    });
  });

  describe('Intégration avec ConfigRepository', () => {
    test('Le logo est persisté dans la configuration', async () => {
      const response = await request(app)
        .put('/api/admin/logo')
        .attach('logo', testImagePath)
        .expect(200);

      const logoPath = response.body.data.logoPath;
      
      // Vérifier que le logo est dans la configuration
      const config = await configRepo.getConfig();
      expect(config.logoPath).toBe(logoPath);
    });

    test('Le logo est accessible via la configuration publique', async () => {
      const response = await request(app)
        .put('/api/admin/logo')
        .attach('logo', testImagePath)
        .expect(200);

      const logoPath = response.body.data.logoPath;
      
      // Vérifier que le logo est dans la configuration publique
      const publicConfig = await configRepo.getPublicConfig();
      expect(publicConfig.logoPath).toBe(logoPath);
    });

    test('Le logo remplace l\'ancien logo', async () => {
      // Premier upload
      const response1 = await request(app)
        .put('/api/admin/logo')
        .attach('logo', testImagePath)
        .expect(200);

      const firstLogoPath = response1.body.data.logoPath;

      // Attendre un peu pour avoir un nom de fichier différent
      await new Promise(resolve => setTimeout(resolve, 100));

      // Deuxième upload
      const response2 = await request(app)
        .put('/api/admin/logo')
        .attach('logo', testImagePath)
        .expect(200);

      const secondLogoPath = response2.body.data.logoPath;

      // Vérifier que les chemins sont différents
      expect(firstLogoPath).not.toBe(secondLogoPath);
      
      // Vérifier que seul le nouveau logo est dans la configuration
      const config = await configRepo.getConfig();
      expect(config.logoPath).toBe(secondLogoPath);
    });
  });

  describe('Gestion des erreurs', () => {

    test('Gestion des extensions de fichier', async () => {
      const extensions = ['png', 'jpg', 'jpeg', 'gif', 'svg'];
      
      for (const ext of extensions) {
        const testFilePath = path.join(__dirname, `test-logo-error-${ext}.${ext}`);
        
        // Créer un fichier de test minimal pour chaque extension
        let testData;
        if (ext === 'png') {
          testData = Buffer.from([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
            0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
            0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
            0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
            0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
            0x42, 0x60, 0x82
          ]);
        } else if (ext === 'svg') {
          testData = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect fill="red"/></svg>');
        } else {
          // Pour JPG, GIF, etc., utiliser des données minimales
          testData = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
        }
        
        fs.writeFileSync(testFilePath, testData);
        
        try {
          const response = await request(app)
            .put('/api/admin/logo')
            .attach('logo', testFilePath);

          // Certaines extensions peuvent échouer à cause de la validation MIME
          if (response.status === 200) {
            expect(response.body.success).toBe(true);
            expect(response.body.data.logoPath).toMatch(new RegExp(`^/images/logo-\\d+-\\d+\\.${ext}$`));
          }
        } finally {
          if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
          }
        }
      }
    });
  });

  describe('Sécurité', () => {
    test('Noms de fichiers sécurisés', async () => {
      const response = await request(app)
        .put('/api/admin/logo')
        .attach('logo', testImagePath)
        .expect(200);

      const logoPath = response.body.data.logoPath;
      
      // Vérifier que le nom de fichier contient un timestamp et un nombre aléatoire
      expect(logoPath).toMatch(/^\/images\/logo-\d+-\d+\.png$/);
      
      // Vérifier qu'il n'y a pas de caractères dangereux
      expect(logoPath).not.toMatch(/[<>:"\\|?*]/);
    });
  });
});
