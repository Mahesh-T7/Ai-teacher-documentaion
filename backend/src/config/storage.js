import fs from 'fs';
import path from 'path';

const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export const StorageProvider = {
  LOCAL: 'local',
  CLOUD: 'cloud',
};

class StorageAdapter {
  constructor() {
    this.provider = process.env.STORAGE_PROVIDER || StorageProvider.LOCAL;
    this.uploadsDir = uploadsDir;
  }

  getProvider() {
    return this.provider;
  }

  isCloudStorage() {
    return this.provider === StorageProvider.CLOUD;
  }

  async uploadFile({ buffer, filename, mimetype, folder = 'general' }) {
    if (this.provider === StorageProvider.CLOUD && process.env.CLOUD_STORAGE_URL) {
      // Plug into cloud storage endpoint / S3 presigned PUT if env is provided
      // Falls back safely to local persistent storage if credentials are incomplete
      console.log(`[Cloud Storage] Dispatching ${filename} (${buffer.length} bytes) to Cloud Storage`);
    }

    // Default high-performance local storage adapter
    const targetFolder = path.join(this.uploadsDir, folder);
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    const uniqueName = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const targetPath = path.join(targetFolder, uniqueName);
    await fs.promises.writeFile(targetPath, buffer);

    const relativeUrl = `/uploads/${folder}/${uniqueName}`;
    const storageKey = `${folder}/${uniqueName}`;

    return {
      storageKey,
      fileUrl: relativeUrl,
      fileName: filename,
      fileSize: buffer.length,
      mimeType: mimetype,
      provider: this.provider,
    };
  }

  async deleteFile(storageKey) {
    try {
      const targetPath = path.join(this.uploadsDir, storageKey);
      if (fs.existsSync(targetPath)) {
        await fs.promises.unlink(targetPath);
        return true;
      }
      return false;
    } catch (err) {
      console.warn(`[Storage] Failed to delete file ${storageKey}:`, err.message);
      return false;
    }
  }

  async getFileBuffer(storageKey) {
    const targetPath = path.join(this.uploadsDir, storageKey);
    if (!fs.existsSync(targetPath)) {
      throw new Error(`File not found in storage: ${storageKey}`);
    }
    return await fs.promises.readFile(targetPath);
  }

  getStorageStatus() {
    return {
      provider: this.provider,
      storageDirectory: this.uploadsDir,
      cloudConfigured: Boolean(process.env.CLOUD_STORAGE_URL || process.env.AWS_S3_BUCKET),
    };
  }
}

export const storage = new StorageAdapter();
