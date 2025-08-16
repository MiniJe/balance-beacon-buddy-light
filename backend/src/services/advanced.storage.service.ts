// Azure Blob implementation removed in LIGHT version. This file is now a no-op stub.
// Any previous imports of advancedStorageService should be migrated to a future
// local filesystem storage service (e.g. localStorageService) if needed.

// Minimal placeholder interfaces kept for type compatibility (if referenced elsewhere)
interface UploadResult { url: string; blobName: string; containerName: string; etag: string; lastModified: Date; contentMD5: string; size: number; }

export class AdvancedStorageService {
    async uploadDocument(): Promise<UploadResult> { throw new Error('AdvancedStorageService (Azure) eliminat în varianta LIGHT'); }
    async downloadDocument(): Promise<Buffer> { throw new Error('AdvancedStorageService (Azure) eliminat în varianta LIGHT'); }
    async listDocumentsForSession(): Promise<any[]> { return []; }
    async generatePresignedUrl(): Promise<string> { throw new Error('Funcție indisponibilă'); }
    async deleteSessionDocuments(): Promise<number> { return 0; }
    async uploadBatch(): Promise<UploadResult[]> { return []; }
}

export const advancedStorageService = new AdvancedStorageService();
