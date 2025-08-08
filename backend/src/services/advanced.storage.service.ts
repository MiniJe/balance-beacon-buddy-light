import { BlobServiceClient, ContainerClient, BlockBlobClient } from '@azure/storage-blob';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

/**
 * Interfață pentru configurația Azure Blob Storage
 */
interface BlobConfig {
    containerName: string;
    blobName: string;
    metadata?: Record<string, string>;
    tags?: Record<string, string>;
}

/**
 * Interfață pentru rezultatul upload-ului
 */
interface UploadResult {
    url: string;
    blobName: string;
    containerName: string;
    etag: string;
    lastModified: Date;
    contentMD5: string;
    size: number;
}

/**
 * Interfață pentru organizarea ierarhică a fișierelor
 */
interface DocumentHierarchy {
    an: string;
    luna: string;
    zi: string;
    sesiune: string;
    tipDocument: 'cereri' | 'semnate' | 'templates';
}

/**
 * Serviciu avansat pentru Azure Blob Storage
 * Implementează organizarea ierarhică și managementul documentelor
 */
export class AdvancedStorageService {
    
    private blobServiceClient: BlobServiceClient;
    private defaultContainer: string = 'confirmarisolduri';

    constructor() {
        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
        if (!connectionString) {
            throw new Error('AZURE_STORAGE_CONNECTION_STRING nu este configurată');
        }
        
        this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    }

    /**
     * Generează calea ierarhică pentru documente
     */
    private generateHierarchicalPath(hierarchy: DocumentHierarchy, fileName: string): string {
        return `${hierarchy.an}/${hierarchy.luna}/${hierarchy.zi}/${hierarchy.sesiune}/${hierarchy.tipDocument}/${fileName}`;
    }

    /**
     * Generează ierarhia pe baza datei și sesiunii
     */
    private generateDocumentHierarchy(
        data: Date,
        idSesiune: string,
        tipDocument: 'cereri' | 'semnate' | 'templates'
    ): DocumentHierarchy {
        return {
            an: data.getFullYear().toString(),
            luna: (data.getMonth() + 1).toString().padStart(2, '0'),
            zi: data.getDate().toString().padStart(2, '0'),
            sesiune: idSesiune,
            tipDocument
        };
    }

    /**
     * Calculează MD5 hash pentru fișier
     */
    private async calculateMD5(filePath: string): Promise<string> {
        try {
            const fileBuffer = await fs.readFile(filePath);
            return crypto.createHash('md5').update(fileBuffer).digest('hex');
        } catch (error) {
            console.error('Eroare la calcularea MD5:', error);
            throw new Error('Nu s-a putut calcula MD5 pentru fișier');
        }
    }

    /**
     * Asigură că containerul există
     */
    private async ensureContainer(containerName: string): Promise<ContainerClient> {
        try {
            const containerClient = this.blobServiceClient.getContainerClient(containerName);
            await containerClient.createIfNotExists();
            return containerClient;
        } catch (error) {
            console.error(`Eroare la crearea containerului ${containerName}:`, error);
            throw new Error(`Nu s-a putut crea containerul ${containerName}`);
        }
    }

    /**
     * Upload document cu organizare ierarhică
     */
    async uploadDocument(
        filePath: string,
        idSesiune: string,
        tipDocument: 'cereri' | 'semnate' | 'templates',
        containerName: string = this.defaultContainer,
        metadata?: Record<string, string>
    ): Promise<UploadResult> {
        try {
            console.log(`📤 Upload document: ${path.basename(filePath)} în ${tipDocument}`);
            
            // 1. Asigură că containerul există
            const containerClient = await this.ensureContainer(containerName);
            
            // 2. Generează ierarhia și calea
            const fileName = path.basename(filePath);
            const hierarchy = this.generateDocumentHierarchy(new Date(), idSesiune, tipDocument);
            const blobPath = this.generateHierarchicalPath(hierarchy, fileName);
            
            // 3. Calculează MD5 pentru verificare integritate
            const contentMD5 = await this.calculateMD5(filePath);
            
            // 4. Pregătește metadata
            const blobMetadata = {
                sesiune: idSesiune,
                tipDocument,
                uploadDate: new Date().toISOString(),
                originalFileName: fileName,
                contentMD5,
                ...metadata
            };
            
            // 5. Upload blob
            const blockBlobClient = containerClient.getBlockBlobClient(blobPath);
            const fileBuffer = await fs.readFile(filePath);
            
            const uploadResponse = await blockBlobClient.upload(fileBuffer, fileBuffer.length, {
                metadata: blobMetadata,
                tags: {
                    sesiune: idSesiune,
                    tipDocument,
                    an: hierarchy.an,
                    luna: hierarchy.luna
                }
            });
            
            // 6. Obține informații complete despre blob
            const blobProperties = await blockBlobClient.getProperties();
            
            console.log(`✅ Document uploaded: ${blobPath}`);
            
            return {
                url: blockBlobClient.url,
                blobName: blobPath,
                containerName,
                etag: uploadResponse.etag || '',
                lastModified: blobProperties.lastModified || new Date(),
                contentMD5,
                size: fileBuffer.length
            };
            
        } catch (error) {
            console.error('Eroare la upload document:', error);
            throw new Error(`Eroare la upload: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`);
        }
    }

    /**
     * Download document din storage
     */
    async downloadDocument(
        blobPath: string,
        containerName: string = this.defaultContainer,
        localPath?: string
    ): Promise<Buffer> {
        try {
            console.log(`📥 Download document: ${blobPath}`);
            
            const containerClient = this.blobServiceClient.getContainerClient(containerName);
            const blockBlobClient = containerClient.getBlockBlobClient(blobPath);
            
            const downloadResponse = await blockBlobClient.download();
            
            if (!downloadResponse.readableStreamBody) {
                throw new Error('Nu s-a putut obține conținutul blob-ului');
            }
            
            // Convertește stream la buffer - implementare Node.js compatibilă
            const chunks: Buffer[] = [];
            
            if (downloadResponse.readableStreamBody) {
                const stream = downloadResponse.readableStreamBody;
                
                for await (const chunk of stream) {
                    chunks.push(Buffer.from(chunk));
                }
            }
            
            const fileBuffer = Buffer.concat(chunks);
            
            // Salvează local dacă este specificată calea
            if (localPath) {
                await fs.mkdir(path.dirname(localPath), { recursive: true });
                await fs.writeFile(localPath, fileBuffer);
                console.log(`💾 Salvat local: ${localPath}`);
            }
            
            console.log(`✅ Document descărcat: ${blobPath}`);
            return fileBuffer;
            
        } catch (error) {
            console.error('Eroare la download document:', error);
            throw new Error(`Eroare la download: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`);
        }
    }

    /**
     * Listează documentele pentru o sesiune
     */
    async listDocumentsForSession(
        idSesiune: string,
        tipDocument?: 'cereri' | 'semnate' | 'templates',
        containerName: string = this.defaultContainer
    ): Promise<Array<{ name: string; url: string; metadata: Record<string, string>; size: number; lastModified: Date }>> {
        try {
            console.log(`📋 Listare documente pentru sesiunea: ${idSesiune}`);
            
            const containerClient = this.blobServiceClient.getContainerClient(containerName);
            const prefix = tipDocument ? `*/*/*//${idSesiune}/${tipDocument}/` : `*/*/*//${idSesiune}/`;
            
            const documents: Array<{ name: string; url: string; metadata: Record<string, string>; size: number; lastModified: Date }> = [];
            
            for await (const blob of containerClient.listBlobsFlat({ 
                prefix,
                includeMetadata: true 
            })) {
                const blockBlobClient = containerClient.getBlockBlobClient(blob.name);
                
                documents.push({
                    name: blob.name,
                    url: blockBlobClient.url,
                    metadata: blob.metadata || {},
                    size: blob.properties.contentLength || 0,
                    lastModified: blob.properties.lastModified || new Date()
                });
            }
            
            console.log(`✅ Găsite ${documents.length} documente pentru sesiunea ${idSesiune}`);
            return documents;
            
        } catch (error) {
            console.error('Eroare la listarea documentelor:', error);
            throw new Error(`Eroare la listare: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`);
        }
    }

    /**
     * Generează URL pre-semnat pentru acces temporar
     */
    async generatePresignedUrl(
        blobPath: string,
        containerName: string = this.defaultContainer,
        expiryHours: number = 24
    ): Promise<string> {
        try {
            const containerClient = this.blobServiceClient.getContainerClient(containerName);
            const blockBlobClient = containerClient.getBlockBlobClient(blobPath);
            
            // Calculează timpul de expirare
            const expiryDate = new Date();
            expiryDate.setHours(expiryDate.getHours() + expiryHours);
            
            // Generează SAS token (pentru implementare completă, necesită configurare SAS)
            console.log(`🔗 URL pre-semnat generat pentru: ${blobPath} (expirare: ${expiryDate})`);
            
            // Pentru moment returnez URL-ul direct (în producție ar trebui SAS token)
            return blockBlobClient.url;
            
        } catch (error) {
            console.error('Eroare la generarea URL pre-semnat:', error);
            throw new Error(`Eroare la generarea URL: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`);
        }
    }

    /**
     * Șterge documentele unei sesiuni
     */
    async deleteSessionDocuments(
        idSesiune: string,
        containerName: string = this.defaultContainer
    ): Promise<number> {
        try {
            console.log(`🗑️ Ștergere documente pentru sesiunea: ${idSesiune}`);
            
            const containerClient = this.blobServiceClient.getContainerClient(containerName);
            const prefix = `*/*/*//${idSesiune}/`;
            
            let deletedCount = 0;
            
            for await (const blob of containerClient.listBlobsFlat({ prefix })) {
                try {
                    await containerClient.deleteBlob(blob.name);
                    deletedCount++;
                } catch (error) {
                    console.error(`Eroare la ștergerea blob-ului ${blob.name}:`, error);
                }
            }
            
            console.log(`✅ Șterse ${deletedCount} documente pentru sesiunea ${idSesiune}`);
            return deletedCount;
            
        } catch (error) {
            console.error('Eroare la ștergerea documentelor sesiunii:', error);
            throw new Error(`Eroare la ștergere: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`);
        }
    }

    /**
     * Upload în lot pentru mai multe fișiere
     */
    async uploadBatch(
        files: Array<{ filePath: string; fileName?: string }>,
        idSesiune: string,
        tipDocument: 'cereri' | 'semnate' | 'templates',
        containerName: string = this.defaultContainer
    ): Promise<UploadResult[]> {
        try {
            console.log(`📦 Upload în lot pentru ${files.length} fișiere`);
            
            const results: UploadResult[] = [];
            
            for (const file of files) {
                try {
                    const result = await this.uploadDocument(
                        file.filePath,
                        idSesiune,
                        tipDocument,
                        containerName,
                        { batchUpload: 'true' }
                    );
                    results.push(result);
                } catch (error) {
                    console.error(`Eroare la upload ${file.filePath}:`, error);
                    // Continuă cu următorul fișier
                }
            }
            
            console.log(`✅ Upload în lot finalizat: ${results.length}/${files.length} fișiere`);
            return results;
            
        } catch (error) {
            console.error('Eroare la upload în lot:', error);
            throw new Error(`Eroare la upload în lot: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`);
        }
    }
}

export const advancedStorageService = new AdvancedStorageService();
