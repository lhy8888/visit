const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

/**
 * Repository abstrait pour la gestion des fichiers JSON
 */
class FileRepository {
  constructor(filePath, defaultData = []) {
    this.filePath = filePath;
    this.defaultData = defaultData;
    this.ensureDirectoryExists();
  }

  /**
   * S'assurer que le répertoire existe
   */
  async ensureDirectoryExists() {
    try {
      const dir = path.dirname(this.filePath);
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      logger.error('Erreur lors de la création du répertoire', { 
        error: error.message, 
        filePath: this.filePath 
      });
    }
  }

  /**
   * Lire le fichier JSON
   */
  async read() {
    try {
      await fs.access(this.filePath);
      const data = await fs.readFile(this.filePath, 'utf8');
      
      if (data.trim() === '') {
        logger.warn('Fichier vide détecté', { filePath: this.filePath });
        return this.defaultData;
      }
      
      const parsedData = JSON.parse(data);
      logger.debug('Données lues avec succès', { 
        filePath: this.filePath, 
        dataLength: Array.isArray(parsedData) ? parsedData.length : 'object'
      });
      
      return parsedData;
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.info('Fichier non trouvé, utilisation des données par défaut', { 
          filePath: this.filePath 
        });
        return this.defaultData;
      }
      
      logger.error('Erreur lors de la lecture du fichier', { 
        error: error.message, 
        filePath: this.filePath 
      });
      return this.defaultData;
    }
  }

  /**
   * Écrire dans le fichier JSON
   */
  async write(data) {
    try {
      await this.ensureDirectoryExists();
      const tempPath = `${this.filePath}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const payload = JSON.stringify(data, null, 2);

      await fs.writeFile(tempPath, payload, 'utf8');

      try {
        await fs.rename(tempPath, this.filePath);
      } catch (renameError) {
        if (renameError.code === 'EEXIST' || renameError.code === 'EPERM') {
          await fs.unlink(this.filePath).catch(() => {});
          await fs.rename(tempPath, this.filePath);
        } else {
          throw renameError;
        }
      }
      
      logger.debug('Données écrites avec succès', { 
        filePath: this.filePath, 
        dataLength: Array.isArray(data) ? data.length : 'object'
      });
      
      return true;
    } catch (error) {
      logger.error('Erreur lors de l\'écriture du fichier', { 
        error: error.message, 
        filePath: this.filePath 
      });
      throw error;
    }
  }

  /**
   * Vérifier si le fichier existe
   */
  async exists() {
    try {
      await fs.access(this.filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Obtenir les informations du fichier
   */
  async getFileInfo() {
    try {
      const stats = await fs.stat(this.filePath);
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        path: this.filePath
      };
    } catch (error) {
      logger.error('Erreur lors de l\'obtention des informations du fichier', { 
        error: error.message, 
        filePath: this.filePath 
      });
      return null;
    }
  }

  /**
   * Créer une sauvegarde du fichier
   */
  async backup() {
    try {
      const backupPath = `${this.filePath}.backup.${Date.now()}`;
      await fs.copyFile(this.filePath, backupPath);
      
      logger.info('Sauvegarde créée', { 
        originalPath: this.filePath, 
        backupPath 
      });
      
      return backupPath;
    } catch (error) {
      logger.error('Erreur lors de la création de la sauvegarde', { 
        error: error.message, 
        filePath: this.filePath 
      });
      throw error;
    }
  }
}

module.exports = FileRepository;
