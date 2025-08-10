import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

/**
 * ⚠️ VERSIUNEA LIGHT - Stocare locală în loc de Azure Blob Storage
 * 
 * Acest serviciu folosește sistemul de fișiere local pentru stocarea fișierelor
 * în loc de Azure Blob Storage.
 */

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const readFile = promisify(fs.readFile);
const mkdir = promisify(fs.mkdir);

export class StorageService {
  private storagePath: string;

  constructor() {
    // Folosim folderul uploads pentru stocare locală
    this.storagePath = path.join(process.cwd(), 'uploads');
    this.ensureStorageDirectory();
  }

  private async ensureStorageDirectory(): Promise<void> {
    try {
      if (!fs.existsSync(this.storagePath)) {
        await mkdir(this.storagePath, { recursive: true });
      }
    } catch (error) {
      console.error("Error creating storage directory:", error);
    }
  }

  async uploadFile(fileName: string, fileBuffer: Buffer, contentType: string): Promise<string> {
    try {
      const filePath = path.join(this.storagePath, fileName);
      await writeFile(filePath, fileBuffer);
      
      // Returnează URL-ul local pentru accesarea fișierului
      return `/api/storage/local/files/${fileName}`;
    } catch (error) {
      console.error("Error uploading file:", error);
      throw new Error("Failed to upload file");
    }
  }

  async deleteFile(fileName: string): Promise<void> {
    try {
      const filePath = path.join(this.storagePath, fileName);
      if (fs.existsSync(filePath)) {
        await unlink(filePath);
      }
    } catch (error) {
      console.error("Error deleting file:", error);
      throw new Error("Failed to delete file");
    }
  }

  async generateSasUrl(fileName: string, expiryHours: number = 24): Promise<string> {
    try {
      // În versiunea LIGHT, returnăm direct URL-ul local
      console.warn('⚠️ generateSasUrl în versiunea LIGHT returnează URL local fără expirare');
      return `/api/storage/local/files/${fileName}`;
    } catch (error) {
      console.error("Error generating SAS URL:", error);
      throw new Error("Failed to generate file access URL");
    }
  }

  async downloadFile(containerName: string, fileName: string): Promise<Buffer> {
    try {
      const filePath = path.join(this.storagePath, fileName);
      if (!fs.existsSync(filePath)) {
        throw new Error('File not found');
      }
      return await readFile(filePath);
    } catch (error) {
      console.error("Error downloading file:", error);
      throw new Error("Failed to download file");
    }
  }
}
