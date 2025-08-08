import { Request, Response } from 'express';
import { blobServiceClient, containerName } from '../config/azure';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { ApiResponseHelper } from '../types/api.types';

// Configure multer for temporary file storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const tempDir = path.join(os.tmpdir(), 'company-logos');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        cb(null, tempDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        cb(null, `${uniqueSuffix}-${file.originalname}`);
    }
});

export const upload = multer({ 
    storage, 
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        // Acceptă doar imagini
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Doar fișierele de tip imagine sunt permise'));
        }
        cb(null, true);
    }
});

export class BlobStorageController {
    // Încarcă un fișier în Azure Blob Storage
    async uploadToBlob(req: Request, res: Response): Promise<void> {
        try {
            if (!req.file) {
                const errorResponse = ApiResponseHelper.validationError(
                    'Niciun fișier nu a fost încărcat',
                    'file'
                );
                res.status(400).json(errorResponse);
                return;
            }

            // Verifică dacă companyId este furnizat
            if (!req.body.companyId || req.body.companyId.trim() === '') {
                const errorResponse = ApiResponseHelper.validationError(
                    'ID-ul companiei este obligatoriu',
                    'companyId'
                );
                res.status(400).json(errorResponse);
                
                // Șterge fișierul temporar
                if (fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path);
                }
                
                return;
            }

            // Creează containerul dacă nu există
            const containerClient = blobServiceClient.getContainerClient(containerName);
            const containerExists = await containerClient.exists();
            
            
            if (!containerExists) {
                await containerClient.create();
                console.log(`Container ${containerName} a fost creat`);
            }
            
            // Generează un nume unic pentru blob
            const companyId = req.body.companyId || 'default';
            const fileExtension = path.extname(req.file.originalname);
            const fileName = path.basename(req.file.originalname, fileExtension);
            const blobName = `${companyId}/${req.file.originalname}`;
            
            console.log(`Upload blob: original filename=${req.file.originalname}, blobName=${blobName}, container=${containerName}`);
            
            // Obține referința la blob
            const blockBlobClient = containerClient.getBlockBlobClient(blobName);
            
            // Citește fișierul de pe disc
            const fileBuffer = fs.readFileSync(req.file.path);
            
            // Încarcă fișierul în Azure Blob Storage
            const uploadOptions = {
                blobHTTPHeaders: {
                    blobContentType: req.file.mimetype
                }
            };
            await blockBlobClient.upload(fileBuffer, fileBuffer.length, uploadOptions);
            
            // Șterge fișierul temporar
            fs.unlinkSync(req.file.path);
            
            // Returnează URL-ul către blob
            const blobUrl = blockBlobClient.url;
            
            const response = ApiResponseHelper.success(
                { url: blobUrl },
                'Fișierul a fost încărcat cu succes'
            );
            res.json(response);
            
        } catch (error) {
            console.error('Eroare la încărcarea fișierului:', error);
            
            // Șterge fișierul temporar în caz de eroare
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            
            const errorResponse = ApiResponseHelper.error(
                'Eroare la încărcarea fișierului',
                'BLOB_UPLOAD_ERROR',
                error instanceof Error ? error.message : 'Eroare necunoscută'
            );
            res.status(500).json(errorResponse);
        }
    }
    
    // Șterge un blob din Azure Blob Storage
    async deleteBlob(req: Request, res: Response): Promise<void> {
        try {
            const { blobUrl } = req.body;
            
            if (!blobUrl) {
                res.status(400).json({
                    success: false,
                    message: 'URL-ul blob-ului este obligatoriu'
                });
                return;
            }            // Extrage numele blob-ului din URL
            const url = new URL(blobUrl);
            const pathSegments = url.pathname.split('/');
            
            console.log("Path segments:", pathSegments);
            
            // Pentru URL-uri de forma https://confirmarisolduri.blob.core.windows.net/logo/...
            // Trebuie să excludem containerul 'logo' și să luăm restul căii
            const containerIndex = pathSegments.indexOf('logo');
            let blobPath = "";
            
            if (containerIndex !== -1 && containerIndex + 1 < pathSegments.length) {
                blobPath = pathSegments.slice(containerIndex + 1).join('/');
            } else if (pathSegments.length >= 2) {
                // Dacă nu găsim 'logo' în cale, luăm ultimele 2 segmente (CUI/filename.ext)
                blobPath = pathSegments.slice(pathSegments.length - 2).join('/');
            } else {
                blobPath = pathSegments[pathSegments.length - 1];
            }
            
            console.log(`Ștergere blob: ${blobPath} din containerul ${containerName}, URL original: ${blobUrl}`);
            
            // Obține referința la blob
            const containerClient = blobServiceClient.getContainerClient(containerName);
            const blockBlobClient = containerClient.getBlockBlobClient(blobPath);              // Verifică dacă blob-ul există
            const exists = await blockBlobClient.exists();
            console.log(`Blob exists: ${exists}, path: ${blobPath}`);
            
            if (!exists) {
                // Încearcă să vezi toate blob-urile din container pentru debugging
                console.log("Blob nu există, listez toate blob-urile din container pentru debugging:");
                try {
                    let i = 1;
                    for await (const blob of containerClient.listBlobsFlat()) {
                        console.log(`${i++}: ${blob.name}`);
                    }
                } catch (listError) {
                    console.error("Eroare la listarea blob-urilor:", listError);
                }
                
                res.status(404).json({
                    success: false,
                    message: 'Blob-ul nu a fost găsit'
                });
                return;
            }
            
            // Șterge blob-ul
            await blockBlobClient.delete();
            
            res.json({
                success: true,
                message: 'Blob-ul a fost șters cu succes'
            });
            
        } catch (error) {
            console.error('Eroare la ștergerea blob-ului:', error);
            res.status(500).json({
                success: false,
                message: 'Eroare la ștergerea blob-ului',
                error: error instanceof Error ? error.message : 'Eroare necunoscută'
            });
        }
    }    // Returnează conținutul unui blob
    async getBlobContent(req: Request, res: Response): Promise<void> {
        try {
            const blobPath = (req as any).blobPath;
            
            if (!blobPath) {
                res.status(400).json({
                    success: false,
                    message: 'Calea blob-ului este obligatorie'
                });
                return;
            }
            
            console.log(`Serving blob: ${blobPath}, full URL: ${req.url}, query: ${JSON.stringify(req.query)}`);
              // Decodează calea blob-ului
            const decodedPath = decodeURIComponent(blobPath);
            
            console.log(`Blob path după decodare: ${decodedPath}`);
            
            // Obține referința la blob
            const containerClient = blobServiceClient.getContainerClient(containerName);
            const blockBlobClient = containerClient.getBlockBlobClient(decodedPath);
            
            console.log(`URL-ul blob-ului pentru decodedPath=${decodedPath}: ${blockBlobClient.url}`);
            
            // Verifică dacă blob-ul există
            const exists = await blockBlobClient.exists();
            if (!exists) {
                console.error(`Blob-ul nu a fost găsit: ${decodedPath}`);
                console.error(`Container: ${containerName}`);
                console.error(`URL complet: ${blockBlobClient.url}`);
                
                res.status(404).json({
                    success: false,
                    message: 'Blob-ul nu a fost găsit',
                    path: decodedPath,
                    container: containerName
                });
                return;
            }
            
            try {
                // Descarcă blob-ul
                const downloadResponse = await blockBlobClient.download(0);
                
                if (!downloadResponse.readableStreamBody) {
                    throw new Error('Eroare la citirea stream-ului de date');
                }
                  // Setează headerele pentru conținut
                res.setHeader('Content-Type', downloadResponse.contentType || 'application/octet-stream');
                if (downloadResponse.contentLength !== undefined) {
                    res.setHeader('Content-Length', downloadResponse.contentLength);
                }
                res.setHeader('Cache-Control', 'max-age=31536000'); // Cache for 1 year
                res.setHeader('Access-Control-Allow-Origin', '*');
                
                // Pipe stream către răspuns
                downloadResponse.readableStreamBody.pipe(res);
            } catch (downloadError) {
                console.error('Eroare la descărcarea blob-ului:', downloadError);
                
                // Încearcă o abordare alternativă pentru a descărca blob-ul
                try {
                    const properties = await blockBlobClient.getProperties();
                    const buffer = await blockBlobClient.downloadToBuffer();
                    
                    // Setează headerele pentru conținut
                    res.setHeader('Content-Type', properties.contentType || 'application/octet-stream');
                    res.setHeader('Content-Length', buffer.length);
                    res.setHeader('Cache-Control', 'max-age=31536000'); // Cache for 1 year
                    res.setHeader('Access-Control-Allow-Origin', '*');
                    
                    // Trimite buffer-ul ca răspuns
                    res.send(buffer);
                } catch (bufferError) {
                    console.error('Eroare la descărcarea blob-ului ca buffer:', bufferError);
                    throw bufferError;
                }
            }
        } catch (error) {
            console.error('Eroare la obținerea blob-ului:', error);
            res.status(500).json({
                success: false,
                message: 'Eroare la obținerea blob-ului',
                error: error instanceof Error ? error.message : 'Eroare necunoscută'
            });
        }
    }
      // Generează un URL proxy pentru un blob
    async generateProxyUrl(req: Request, res: Response): Promise<void> {
        try {
            const { blobUrl } = req.body;
            
            if (!blobUrl) {
                res.status(400).json({
                    success: false,
                    message: 'URL-ul blob-ului este obligatoriu'
                });
                return;
            }
            
            // Validează că blobUrl este un URL valid
            if (typeof blobUrl !== 'string' || (!blobUrl.startsWith('http://') && !blobUrl.startsWith('https://'))) {
                console.log(`URL invalid primit: ${blobUrl}`);
                res.status(400).json({
                    success: false,
                    message: 'URL-ul blob-ului nu este valid'
                });
                return;
            }// Extrage calea blob-ului din URL
            const url = new URL(blobUrl);
            const pathSegments = url.pathname.split('/');
            
            console.log(`Path segments: ${JSON.stringify(pathSegments)}`);
            
            // Pentru URL-uri de forma https://confirmarisolduri.blob.core.windows.net/logo/...
            // Trebuie să excludem containerul 'logo' și să luăm restul căii
            const containerIndex = pathSegments.indexOf('logo');
            
            let blobPath = "";
            
            if (containerIndex !== -1 && containerIndex + 1 < pathSegments.length) {
                blobPath = pathSegments.slice(containerIndex + 1).join('/');
            } else if (pathSegments.length >= 2) {
                // Dacă nu găsim 'logo' în cale, luăm ultimele 2 segmente (CUI/filename.ext)
                blobPath = pathSegments.slice(pathSegments.length - 2).join('/');
            } else {
                blobPath = pathSegments[pathSegments.length - 1];
            }
            
            console.log(`Generare URL proxy pentru blob: ${blobPath} din URL original ${blobUrl}`);
            console.log(`Path segments: ${JSON.stringify(pathSegments)}`);
            
            // Verifică dacă blob-ul există
            const containerClient = blobServiceClient.getContainerClient(containerName);
            const blockBlobClient = containerClient.getBlockBlobClient(blobPath);
            
            const exists = await blockBlobClient.exists();
            console.log(`Blob exists check: ${exists}, path: ${blobPath}, URL: ${blockBlobClient.url}`);
            
            if (!exists) {
                console.log("Blob nu există, listez toate blob-urile din container pentru debugging:");
                let i = 1;
                for await (const blob of containerClient.listBlobsFlat()) {
                    console.log(`${i++}: ${blob.name}`);
                }
            }
            
            // Generează URL-ul proxy
            const proxyUrl = `/api/storage/blob?path=${encodeURIComponent(blobPath)}`;
            
            res.json({
                success: true,
                url: proxyUrl
            });
            
        } catch (error) {
            console.error('Eroare la generarea URL-ului proxy:', error);
            res.status(500).json({
                success: false,
                message: 'Eroare la generarea URL-ului proxy',
                error: error instanceof Error ? error.message : 'Eroare necunoscută'
            });
        }
    }
}
