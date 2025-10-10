// =====================================================
// Upload Service - File Upload Handling
// Manages file uploads with validation and storage
// =====================================================

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { logger } from '../config/logger';

// Allowed file types by category
const FILE_TYPES = {
  images: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  documents: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt'],
  all: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt']
};

// Max file sizes (in bytes)
const MAX_FILE_SIZE = {
  image: 5 * 1024 * 1024,      // 5MB for images
  document: 10 * 1024 * 1024,  // 10MB for documents
};

interface UploadConfig {
  destination: string;
  fileTypes?: string[];
  maxSize?: number;
  fieldName?: string;
}

export class UploadService {
  private uploadDir: string;

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    this.ensureUploadDirectory();
  }

  /**
   * Ensure upload directories exist
   */
  private ensureUploadDirectory(): void {
    const directories = [
      this.uploadDir,
      path.join(this.uploadDir, 'profiles'),
      path.join(this.uploadDir, 'documents'),
      path.join(this.uploadDir, 'attachments'),
      path.join(this.uploadDir, 'temp'),
    ];

    directories.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        logger.info(`Created upload directory: ${dir}`);
      }
    });
  }

  /**
   * Generate unique filename
   */
  private generateFilename(originalName: string): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const ext = path.extname(originalName);
    const nameWithoutExt = path.basename(originalName, ext);
    const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, '_');
    return `${sanitizedName}_${timestamp}_${randomString}${ext}`;
  }

  /**
   * File filter function for multer
   */
  private createFileFilter(allowedTypes: string[]) {
    return (req: Request, file: Express.Multer.File, callback: multer.FileFilterCallback) => {
      const ext = path.extname(file.originalname).toLowerCase();
      
      if (allowedTypes.includes(ext)) {
        callback(null, true);
      } else {
        callback(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`));
      }
    };
  }

  /**
   * Create multer storage configuration
   */
  private createStorage(destination: string) {
    return multer.diskStorage({
      destination: (req, file, callback) => {
        const uploadPath = path.join(this.uploadDir, destination);
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }
        callback(null, uploadPath);
      },
      filename: (req, file, callback) => {
        callback(null, this.generateFilename(file.originalname));
      }
    });
  }

  /**
   * Create multer upload middleware for profile pictures
   */
  profilePictureUpload() {
    return multer({
      storage: this.createStorage('profiles'),
      fileFilter: this.createFileFilter(FILE_TYPES.images),
      limits: {
        fileSize: MAX_FILE_SIZE.image
      }
    }).single('profile_picture');
  }

  /**
   * Create multer upload middleware for documents
   */
  documentUpload(maxFiles: number = 5) {
    return multer({
      storage: this.createStorage('documents'),
      fileFilter: this.createFileFilter(FILE_TYPES.documents),
      limits: {
        fileSize: MAX_FILE_SIZE.document,
        files: maxFiles
      }
    }).array('documents', maxFiles);
  }

  /**
   * Create multer upload middleware for single document
   */
  singleDocumentUpload(fieldName: string = 'document') {
    return multer({
      storage: this.createStorage('documents'),
      fileFilter: this.createFileFilter(FILE_TYPES.documents),
      limits: {
        fileSize: MAX_FILE_SIZE.document
      }
    }).single(fieldName);
  }

  /**
   * Create multer upload middleware for attachments
   */
  attachmentUpload(maxFiles: number = 10) {
    return multer({
      storage: this.createStorage('attachments'),
      fileFilter: this.createFileFilter(FILE_TYPES.all),
      limits: {
        fileSize: MAX_FILE_SIZE.document,
        files: maxFiles
      }
    }).array('attachments', maxFiles);
  }

  /**
   * Create custom upload middleware
   */
  customUpload(config: UploadConfig) {
    return multer({
      storage: this.createStorage(config.destination),
      fileFilter: config.fileTypes ? 
        this.createFileFilter(config.fileTypes) : 
        this.createFileFilter(FILE_TYPES.all),
      limits: {
        fileSize: config.maxSize || MAX_FILE_SIZE.document
      }
    }).single(config.fieldName || 'file');
  }

  /**
   * Delete file from storage
   */
  async deleteFile(filePath: string): Promise<boolean> {
    try {
      const fullPath = path.isAbsolute(filePath) ? 
        filePath : 
        path.join(this.uploadDir, filePath);

      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        logger.info(`File deleted: ${filePath}`);
        return true;
      } else {
        logger.warn(`File not found for deletion: ${filePath}`);
        return false;
      }
    } catch (error) {
      logger.error(`Error deleting file: ${filePath}`, error);
      return false;
    }
  }

  /**
   * Delete multiple files
   */
  async deleteFiles(filePaths: string[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const filePath of filePaths) {
      const result = await this.deleteFile(filePath);
      if (result) {
        success++;
      } else {
        failed++;
      }
    }

    return { success, failed };
  }

  /**
   * Get file info
   */
  getFileInfo(filePath: string): { exists: boolean; size?: number; extension?: string } {
    try {
      const fullPath = path.isAbsolute(filePath) ? 
        filePath : 
        path.join(this.uploadDir, filePath);

      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        return {
          exists: true,
          size: stats.size,
          extension: path.extname(fullPath)
        };
      }
      return { exists: false };
    } catch (error) {
      logger.error(`Error getting file info: ${filePath}`, error);
      return { exists: false };
    }
  }

  /**
   * Move file from temp to permanent storage
   */
  async moveFromTemp(tempFilePath: string, destination: string): Promise<string | null> {
    try {
      const sourcePath = path.join(this.uploadDir, 'temp', tempFilePath);
      const destDir = path.join(this.uploadDir, destination);
      
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      const destPath = path.join(destDir, path.basename(tempFilePath));
      
      fs.renameSync(sourcePath, destPath);
      logger.info(`File moved from temp to ${destination}`);
      
      // Return relative path from upload directory
      return path.join(destination, path.basename(tempFilePath));
    } catch (error) {
      logger.error(`Error moving file from temp: ${tempFilePath}`, error);
      return null;
    }
  }

  /**
   * Clean up old temporary files (older than 24 hours)
   */
  async cleanupTempFiles(): Promise<number> {
    try {
      const tempDir = path.join(this.uploadDir, 'temp');
      if (!fs.existsSync(tempDir)) return 0;

      const files = fs.readdirSync(tempDir);
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = fs.statSync(filePath);
        const age = now - stats.mtimeMs;

        if (age > maxAge) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        logger.info(`Cleaned up ${deletedCount} temporary files`);
      }

      return deletedCount;
    } catch (error) {
      logger.error('Error cleaning up temp files:', error);
      return 0;
    }
  }

  /**
   * Get upload directory path
   */
  getUploadDir(): string {
    return this.uploadDir;
  }

  /**
   * Get relative path from absolute path
   */
  getRelativePath(absolutePath: string): string {
    return path.relative(this.uploadDir, absolutePath);
  }

  /**
   * Validate file type
   */
  isValidFileType(filename: string, category: 'images' | 'documents' | 'all'): boolean {
    const ext = path.extname(filename).toLowerCase();
    return FILE_TYPES[category].includes(ext);
  }
}

// Export singleton instance
export const uploadService = new UploadService();

// Export file type constants for use in routes
export { FILE_TYPES, MAX_FILE_SIZE };
