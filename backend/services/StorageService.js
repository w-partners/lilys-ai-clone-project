const { Storage } = require('@google-cloud/storage');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../utils/logger');

class StorageService {
  constructor() {
    // Initialize Google Cloud Storage client
    if (process.env.GCS_PROJECT_ID && process.env.GCS_KEY_FILE_PATH) {
      this.storage = new Storage({
        projectId: process.env.GCS_PROJECT_ID,
        keyFilename: process.env.GCS_KEY_FILE_PATH
      });
      this.bucket = this.storage.bucket(process.env.GCS_BUCKET_NAME);
      this.enabled = true;
      logger.info('Google Cloud Storage initialized');
    } else {
      this.enabled = false;
      logger.warn('Google Cloud Storage not configured, using local storage');
    }
  }

  /**
   * Upload file to cloud storage
   * @param {string} filePath - Local file path
   * @param {string} destination - Destination path in bucket
   * @returns {Promise<string>} Public URL of uploaded file
   */
  async uploadFile(filePath, destination) {
    if (!this.enabled) {
      // Return local file path if GCS is not enabled
      return filePath;
    }

    try {
      // Upload file to GCS
      const [file] = await this.bucket.upload(filePath, {
        destination,
        metadata: {
          cacheControl: 'public, max-age=31536000',
        }
      });

      // Make file publicly accessible
      await file.makePublic();

      // Get public URL
      const publicUrl = `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${destination}`;
      
      logger.info(`File uploaded to GCS: ${destination}`);
      
      // Delete local file after successful upload
      try {
        await fs.unlink(filePath);
        logger.info(`Local file deleted: ${filePath}`);
      } catch (error) {
        logger.warn(`Failed to delete local file: ${filePath}`, error);
      }

      return publicUrl;
    } catch (error) {
      logger.error('Failed to upload file to GCS:', error);
      throw error;
    }
  }

  /**
   * Download file from cloud storage
   * @param {string} fileName - File name in bucket
   * @param {string} destination - Local destination path
   * @returns {Promise<string>} Local file path
   */
  async downloadFile(fileName, destination) {
    if (!this.enabled) {
      throw new Error('Google Cloud Storage is not configured');
    }

    try {
      await this.bucket.file(fileName).download({
        destination
      });

      logger.info(`File downloaded from GCS: ${fileName}`);
      return destination;
    } catch (error) {
      logger.error('Failed to download file from GCS:', error);
      throw error;
    }
  }

  /**
   * Delete file from cloud storage
   * @param {string} fileName - File name in bucket
   * @returns {Promise<void>}
   */
  async deleteFile(fileName) {
    if (!this.enabled) {
      return;
    }

    try {
      await this.bucket.file(fileName).delete();
      logger.info(`File deleted from GCS: ${fileName}`);
    } catch (error) {
      logger.error('Failed to delete file from GCS:', error);
      throw error;
    }
  }

  /**
   * Generate signed URL for temporary access
   * @param {string} fileName - File name in bucket
   * @param {number} expiresIn - Expiration time in minutes
   * @returns {Promise<string>} Signed URL
   */
  async getSignedUrl(fileName, expiresIn = 60) {
    if (!this.enabled) {
      throw new Error('Google Cloud Storage is not configured');
    }

    try {
      const [url] = await this.bucket.file(fileName).getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + expiresIn * 60 * 1000,
      });

      return url;
    } catch (error) {
      logger.error('Failed to generate signed URL:', error);
      throw error;
    }
  }

  /**
   * Check if file exists in cloud storage
   * @param {string} fileName - File name in bucket
   * @returns {Promise<boolean>}
   */
  async fileExists(fileName) {
    if (!this.enabled) {
      return false;
    }

    try {
      const [exists] = await this.bucket.file(fileName).exists();
      return exists;
    } catch (error) {
      logger.error('Failed to check file existence:', error);
      return false;
    }
  }

  /**
   * Get file metadata
   * @param {string} fileName - File name in bucket
   * @returns {Promise<Object>} File metadata
   */
  async getFileMetadata(fileName) {
    if (!this.enabled) {
      throw new Error('Google Cloud Storage is not configured');
    }

    try {
      const [metadata] = await this.bucket.file(fileName).getMetadata();
      return metadata;
    } catch (error) {
      logger.error('Failed to get file metadata:', error);
      throw error;
    }
  }

  /**
   * List files with prefix
   * @param {string} prefix - File prefix
   * @param {number} maxResults - Maximum number of results
   * @returns {Promise<Array>} List of files
   */
  async listFiles(prefix, maxResults = 100) {
    if (!this.enabled) {
      return [];
    }

    try {
      const [files] = await this.bucket.getFiles({
        prefix,
        maxResults
      });

      return files.map(file => ({
        name: file.name,
        size: file.metadata.size,
        created: file.metadata.timeCreated,
        updated: file.metadata.updated,
        contentType: file.metadata.contentType
      }));
    } catch (error) {
      logger.error('Failed to list files:', error);
      throw error;
    }
  }

  /**
   * Copy file within storage
   * @param {string} source - Source file name
   * @param {string} destination - Destination file name
   * @returns {Promise<void>}
   */
  async copyFile(source, destination) {
    if (!this.enabled) {
      throw new Error('Google Cloud Storage is not configured');
    }

    try {
      await this.bucket.file(source).copy(destination);
      logger.info(`File copied from ${source} to ${destination}`);
    } catch (error) {
      logger.error('Failed to copy file:', error);
      throw error;
    }
  }

  /**
   * Move file within storage
   * @param {string} source - Source file name
   * @param {string} destination - Destination file name
   * @returns {Promise<void>}
   */
  async moveFile(source, destination) {
    if (!this.enabled) {
      throw new Error('Google Cloud Storage is not configured');
    }

    try {
      await this.copyFile(source, destination);
      await this.deleteFile(source);
      logger.info(`File moved from ${source} to ${destination}`);
    } catch (error) {
      logger.error('Failed to move file:', error);
      throw error;
    }
  }
}

module.exports = new StorageService();