import { blobServiceClient, containerName } from "../config/azure";
import { BlobSASPermissions } from "@azure/storage-blob";

export class StorageService {
  private containerClient = blobServiceClient.getContainerClient(containerName);

  async uploadFile(fileName: string, fileBuffer: Buffer, contentType: string): Promise<string> {
    try {
      // Create blob client
      const blobClient = this.containerClient.getBlockBlobClient(fileName);

      // Upload file
      await blobClient.uploadData(fileBuffer, {
        blobHTTPHeaders: {
          blobContentType: contentType
        }
      });

      // Return URL
      return blobClient.url;
    } catch (error) {
      console.error("Error uploading file:", error);
      throw new Error("Failed to upload file");
    }
  }

  async deleteFile(fileName: string): Promise<void> {
    try {
      const blobClient = this.containerClient.getBlockBlobClient(fileName);
      await blobClient.delete();
    } catch (error) {
      console.error("Error deleting file:", error);
      throw new Error("Failed to delete file");
    }
  }

  async generateSasUrl(fileName: string, expiryHours: number = 24): Promise<string> {
    try {
      const blobClient = this.containerClient.getBlockBlobClient(fileName);
      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() + expiryHours);      const sasUrl = await blobClient.generateSasUrl({
        permissions: BlobSASPermissions.parse("r"),
        expiresOn: expiryDate
      });

      return sasUrl;
    } catch (error) {
      console.error("Error generating SAS URL:", error);
      throw new Error("Failed to generate file access URL");
    }
  }

  async downloadFile(containerName: string, fileName: string): Promise<Buffer> {
    try {
      const containerClient = blobServiceClient.getContainerClient(containerName);
      const blobClient = containerClient.getBlockBlobClient(fileName);
      const response = await blobClient.download();
      
      if (!response.readableStreamBody) {
        throw new Error('No readable stream body');
      }
      
      // Convert stream to buffer
      const chunks: Buffer[] = [];
      for await (const chunk of response.readableStreamBody) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      
      return Buffer.concat(chunks);
    } catch (error) {
      console.error("Error downloading file:", error);
      throw new Error("Failed to download file");
    }
  }
}
