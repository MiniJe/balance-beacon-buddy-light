import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { promises as fs } from 'fs';
import { authMiddleware } from '../middleware/auth.middleware';
import { folderSettingsService } from '../services/folder.settings.service';

const router = Router();

// Configurare multer pentru upload logo
const storage = multer.memoryStorage(); // Stochează temporar în memorie
const upload = multer({ 
    storage: storage,
    limits: { 
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        // Acceptă doar imagini
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(null, false);
        }
    }
});

/**
 * POST /api/logo/upload
 * Upload logo companie cu salvare în directorul configurat
 */
router.post('/upload', authMiddleware, upload.single('logo'), async (req: Request, res: Response): Promise<void> => {
    try {
        console.log('🖼️ [LOGO UPLOAD] Request primit pentru upload logo');
        
        if (!req.file) {
            res.status(400).json({
                success: false,
                message: 'Nu a fost furnizat niciun fișier pentru upload'
            });
            return;
        }

        console.log('📄 Detalii fișier:', {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
        });

        // Obține setările pentru foldere pentru a afla unde să salveze logo-ul
        const folderSettings = await folderSettingsService.getFolderSettings();
        let logosBasePath = folderSettings.logosPath;

        console.log('📁 Cale logos din setări:', logosBasePath);

        // Obține CUI-ul companiei din corp cerere (va fi trimis din frontend)
        const { cui } = req.body;
        
        if (!cui) {
            res.status(400).json({
                success: false,
                message: 'CUI-ul companiei este obligatoriu pentru salvarea logo-ului'
            });
            return;
        }

        // Sanitizează CUI-ul pentru nume director sigur
        const sanitizedCui = cui.replace(/[^A-Za-z0-9]/g, '');
        
        // Creează calea completă: LogosPath/CUI/logo.png
        const companyLogoDir = path.join(logosBasePath, sanitizedCui);
        const fileExtension = path.extname(req.file.originalname) || '.png';
        const logoFilePath = path.join(companyLogoDir, `logo${fileExtension}`);

        console.log('📁 Director companie logo:', companyLogoDir);
        console.log('💾 Cale finală logo:', logoFilePath);

        // Creează directorul companiei dacă nu există
        await fs.mkdir(companyLogoDir, { recursive: true });

        // Salvează fișierul
        await fs.writeFile(logoFilePath, req.file.buffer);

        console.log('✅ Logo salvat cu succes:', logoFilePath);

        // Returnează calea relativă pentru frontend
        const relativePath = path.relative(logosBasePath, logoFilePath);
        
        res.json({
            success: true,
            message: 'Logo-ul companiei a fost încărcat cu succes',
            data: {
                logoPath: logoFilePath,
                relativePath: relativePath,
                filename: `logo${fileExtension}`,
                size: req.file.size,
                mimetype: req.file.mimetype
            }
        });

    } catch (error) {
        console.error('❌ [LOGO UPLOAD] Eroare:', error);
        res.status(500).json({
            success: false,
            message: 'Eroare la încărcarea logo-ului',
            error: error instanceof Error ? error.message : 'Eroare necunoscută'
        });
    }
});

/**
 * GET /api/logo/:cui
 * Obține logo-ul pentru o companie specifică
 */
router.get('/:cui', authMiddleware, async (req: Request, res: Response): Promise<void> => {
    try {
        const { cui } = req.params;
        
        if (!cui) {
            res.status(400).json({
                success: false,
                message: 'CUI-ul companiei este obligatoriu'
            });
            return;
        }

        // Obține setările pentru foldere
        const folderSettings = await folderSettingsService.getFolderSettings();
        const logosBasePath = folderSettings.logosPath;

        // Sanitizează CUI-ul
        const sanitizedCui = cui.replace(/[^A-Za-z0-9]/g, '');
        const companyLogoDir = path.join(logosBasePath, sanitizedCui);

        // Caută fișierele logo cu extensii comune
        const possibleExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg'];
        let logoPath: string | null = null;

        for (const ext of possibleExtensions) {
            const testPath = path.join(companyLogoDir, `logo${ext}`);
            try {
                await fs.access(testPath);
                logoPath = testPath;
                break;
            } catch {
                // Continuă să caute
            }
        }

        if (!logoPath) {
            res.status(404).json({
                success: false,
                message: 'Logo-ul nu a fost găsit pentru această companie'
            });
            return;
        }

        // Returnează fișierul
        res.sendFile(logoPath);

    } catch (error) {
        console.error('❌ [LOGO GET] Eroare:', error);
        res.status(500).json({
            success: false,
            message: 'Eroare la încărcarea logo-ului',
            error: error instanceof Error ? error.message : 'Eroare necunoscută'
        });
    }
});

export default router;
