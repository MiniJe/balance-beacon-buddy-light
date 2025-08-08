import { Request, Response } from 'express';
import { localStorageService } from '../services/local.storage.service';
import { promises as fs } from 'fs';
import multer from 'multer';
import path from 'path';
import os from 'os';
import { ApiResponseHelper } from '../types/api.types';

// Configure multer for temporary file storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const tempDir = path.join(os.tmpdir(), 'company-logos-temp');
        fs.mkdir(tempDir, { recursive: true }).then(() => {
            cb(null, tempDir);
        }).catch(err => {
            cb(err, tempDir);
        });
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

export class LocalStorageController {
    
    /**
     * Încarcă logo-ul unei companii în storage local
     * POST /api/storage/local/upload-company-logo
     */
    async uploadCompanyLogo(req: Request, res: Response): Promise<void> {
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
                await fs.unlink(req.file.path).catch(() => {});
                
                return;
            }

            const companyId = req.body.companyId.trim();

            // Citește fișierul temporar
            const fileBuffer = await fs.readFile(req.file.path);

            // Salvează fișierul în storage local
            const relativePath = await localStorageService.saveCompanyLogo(
                companyId,
                fileBuffer,
                req.file.originalname,
                req.file.mimetype
            );

            // Șterge fișierul temporar
            await fs.unlink(req.file.path).catch(() => {});

            // Generează URL-ul public
            const publicUrl = localStorageService.getLogoPublicUrl(relativePath);

            const response = ApiResponseHelper.success(
                { 
                    url: publicUrl,
                    relativePath: relativePath,
                    companyId: companyId
                },
                'Logo-ul a fost încărcat cu succes'
            );
            
            console.log(`📁 Logo încărcat pentru compania ${companyId}: ${publicUrl}`);
            res.json(response);

        } catch (error) {
            console.error('❌ Eroare la încărcarea logo-ului:', error);
            
            // Șterge fișierul temporar în caz de eroare
            if (req.file) {
                await fs.unlink(req.file.path).catch(() => {});
            }
            
            const errorResponse = ApiResponseHelper.error(
                'Eroare la încărcarea logo-ului',
                'LOCAL_UPLOAD_ERROR',
                error instanceof Error ? error.message : 'Eroare necunoscută'
            );
            res.status(500).json(errorResponse);
        }
    }

    /**
     * Șterge logo-ul unei companii
     * POST /api/storage/local/delete-company-logo
     */
    async deleteCompanyLogo(req: Request, res: Response): Promise<void> {
        try {
            const { companyId } = req.body;
            
            if (!companyId || companyId.trim() === '') {
                res.status(400).json({
                    success: false,
                    message: 'ID-ul companiei este obligatoriu'
                });
                return;
            }

            const success = await localStorageService.deleteCompanyLogo(companyId.trim());

            if (success) {
                res.json({
                    success: true,
                    message: 'Logo-ul a fost șters cu succes'
                });
                console.log(`📁 Logo șters pentru compania ${companyId}`);
            } else {
                res.status(500).json({
                    success: false,
                    message: 'Eroare la ștergerea logo-ului'
                });
            }

        } catch (error) {
            console.error('❌ Eroare la ștergerea logo-ului:', error);
            res.status(500).json({
                success: false,
                message: 'Eroare la ștergerea logo-ului',
                error: error instanceof Error ? error.message : 'Eroare necunoscută'
            });
        }
    }

    /**
     * Servește un fișier logo local
     * GET /api/storage/local/logos/:companyId/:filename
     */
    async serveLogoFile(req: Request, res: Response): Promise<void> {
        try {
            const { companyId, filename } = req.params;
            
            if (!companyId || !filename) {
                res.status(400).json({
                    success: false,
                    message: 'ID-ul companiei și numele fișierului sunt obligatorii'
                });
                return;
            }

            const relativePath = path.join('logos', companyId, filename).replace(/\\/g, '/');
            const fullPath = localStorageService.getLogoFullPath(relativePath);

            console.log(`📁 Servire logo - Cale relativă: ${relativePath}`);
            console.log(`📁 Servire logo - Cale completă: ${fullPath}`);

            // Verifică dacă fișierul există
            try {
                await fs.access(fullPath);
            } catch {
                res.status(404).json({
                    success: false,
                    message: 'Logo-ul nu a fost găsit'
                });
                return;
            }

            // Determină tipul MIME bazat pe extensia fișierului
            const ext = path.extname(filename).toLowerCase();
            let mimeType = 'image/jpeg'; // default
            
            switch (ext) {
                case '.png':
                    mimeType = 'image/png';
                    break;
                case '.gif':
                    mimeType = 'image/gif';
                    break;
                case '.webp':
                    mimeType = 'image/webp';
                    break;
                case '.svg':
                    mimeType = 'image/svg+xml';
                    break;
            }

            // Setează headerele pentru cache și CORS
            res.setHeader('Content-Type', mimeType);
            res.setHeader('Cache-Control', 'max-age=31536000'); // Cache for 1 year
            res.setHeader('Access-Control-Allow-Origin', '*');

            // Citește și servește fișierul
            const fileBuffer = await fs.readFile(fullPath);
            res.send(fileBuffer);

            console.log(`📁 Logo servit pentru compania ${companyId}: ${filename}`);

        } catch (error) {
            console.error('❌ Eroare la servirea logo-ului:', error);
            res.status(500).json({
                success: false,
                message: 'Eroare la încărcarea logo-ului',
                error: error instanceof Error ? error.message : 'Eroare necunoscută'
            });
        }
    }

    /**
     * Listează toate logo-urile disponibile
     * GET /api/storage/local/list-logos
     */
    async listLogos(req: Request, res: Response): Promise<void> {
        try {
            const logos = await localStorageService.listCompanyLogos();
            
            // Transformă în format cu URL-uri publice
            const logosWithUrls = logos.map(logo => ({
                companyId: logo.companyId,
                logoPath: logo.logoPath,
                publicUrl: localStorageService.getLogoPublicUrl(logo.logoPath)
            }));

            res.json({
                success: true,
                logos: logosWithUrls,
                count: logosWithUrls.length,
                message: `${logosWithUrls.length} logo-uri găsite`
            });

        } catch (error) {
            console.error('❌ Eroare la listarea logo-urilor:', error);
            res.status(500).json({
                success: false,
                message: 'Eroare la listarea logo-urilor',
                error: error instanceof Error ? error.message : 'Eroare necunoscută'
            });
        }
    }

    /**
     * Generează un URL proxy pentru un logo (pentru compatibilitate cu codul existent)
     * POST /api/storage/local/generate-proxy-url
     */
    async generateProxyUrl(req: Request, res: Response): Promise<void> {
        try {
            const { logoPath, companyId } = req.body;
            
            let proxyUrl: string;
            
            if (logoPath) {
                // Dacă avem logoPath, generăm URL-ul direct
                proxyUrl = localStorageService.getLogoPublicUrl(logoPath);
            } else if (companyId) {
                // Dacă avem doar companyId, încercăm să găsim logo-ul
                const hasLogo = await localStorageService.hasCompanyLogo(companyId);
                if (hasLogo) {
                    const logos = await localStorageService.listCompanyLogos();
                    const companyLogo = logos.find(l => l.companyId === companyId);
                    if (companyLogo) {
                        proxyUrl = localStorageService.getLogoPublicUrl(companyLogo.logoPath);
                    } else {
                        res.status(404).json({
                            success: false,
                            message: 'Logo-ul companiei nu a fost găsit'
                        });
                        return;
                    }
                } else {
                    res.status(404).json({
                        success: false,
                        message: 'Logo-ul companiei nu a fost găsit'
                    });
                    return;
                }
            } else {
                res.status(400).json({
                    success: false,
                    message: 'logoPath sau companyId este obligatoriu'
                });
                return;
            }

            res.json({
                success: true,
                url: proxyUrl
            });

        } catch (error) {
            console.error('❌ Eroare la generarea URL-ului proxy:', error);
            res.status(500).json({
                success: false,
                message: 'Eroare la generarea URL-ului proxy',
                error: error instanceof Error ? error.message : 'Eroare necunoscută'
            });
        }
    }
}

export const localStorageController = new LocalStorageController();
