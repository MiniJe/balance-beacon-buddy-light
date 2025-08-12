import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { authMiddleware } from '../middleware/auth.middleware';
import { folderSettingsService } from '../services/folder.settings.service';

const router = Router();

// Configurare multer pentru upload-ul fișierelor semnate folosind setările din SetariFoldere
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const { idSesiune } = req.body;
        if (!idSesiune) {
            return cb(new Error('ID sesiune este obligatoriu'), '');
        }
        try {
            const settings = await folderSettingsService.getFolderSettings();
            const baseDir = settings.cereriSemnatePath || path.join(process.cwd(), 'uploads', 'signed-documents');
            const sessionDir = path.join(baseDir, idSesiune);
            await fs.mkdir(sessionDir, { recursive: true });
            cb(null, sessionDir);
        } catch (error) {
            cb(error instanceof Error ? error : new Error('Eroare necunoscută'), '');
        }
    },
    filename: (req, file, cb) => {
        // Păstrează numele original al fișierului
        cb(null, file.originalname);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB per file
        files: 50 // Maximum 50 files
    },
    fileFilter: (req, file, cb) => {
        // Acceptă doar fișiere PDF
        if (file.mimetype !== 'application/pdf') {
            return cb(null, false);
        }
        cb(null, true);
    }
});

/**
 * Upload fișiere semnate pentru o sesiune
 * POST /api/upload/signed-documents
 */
router.post('/signed-documents', 
    authMiddleware,
    upload.array('files', 50), // Maximum 50 files
    async (req: Request, res: Response): Promise<void> => {
        try {
            const { idSesiune } = req.body;
            const files = req.files as Express.Multer.File[];

            if (!idSesiune) {
                res.status(400).json({
                    success: false,
                    message: 'ID sesiune este obligatoriu'
                });
                return;
            }

            if (!files || files.length === 0) {
                res.status(400).json({
                    success: false,
                    message: 'Nu au fost încărcate fișiere'
                });
                return;
            }

            // Validare: toate fișierele trebuie să fie PDF
            const nonPdfFiles = files.filter(file => file.mimetype !== 'application/pdf');
            if (nonPdfFiles.length > 0) {
                res.status(400).json({
                    success: false,
                    message: `Următoarele fișiere nu sunt PDF: ${nonPdfFiles.map(f => f.originalname).join(', ')}`
                });
                return;
            }

            // Returnează informațiile despre fișierele încărcate
            const uploadedFiles = files.map(file => ({
                originalName: file.originalname,
                filename: file.filename,
                path: file.path,
                size: file.size,
                mimetype: file.mimetype
            }));

            console.log(`✅ Încărcate ${files.length} fișiere semnate pentru sesiunea ${idSesiune}`);
            console.log(`📁 Folderul destinație: ${path.dirname(files[0].path)}`);

            res.json({
                success: true,
                message: `${files.length} fișiere au fost încărcate cu succes`,
                data: {
                    idSesiune,
                    folderPath: path.dirname(files[0].path),
                    files: uploadedFiles
                }
            });

        } catch (error) {
            console.error('Eroare la upload-ul fișierelor semnate:', error);
            res.status(500).json({
                success: false,
                message: 'Eroare la upload-ul fișierelor',
                error: error instanceof Error ? error.message : 'Eroare necunoscută'
            });
        }
    }
);

/**
 * Șterge fișierele pentru o sesiune (cleanup)
 * DELETE /api/upload/signed-documents/:idSesiune
 */
router.delete('/signed-documents/:idSesiune',
    authMiddleware,
    async (req: Request, res: Response): Promise<void> => {
        try {
            const { idSesiune } = req.params;
            const settings = await folderSettingsService.getFolderSettings();
            const baseDir = settings.cereriSemnatePath || path.join(process.cwd(), 'uploads', 'signed-documents');
            const uploadDir = path.join(baseDir, idSesiune);
            try {
                await fs.rm(uploadDir, { recursive: true, force: true });
                console.log(`🗑️ Folder șters pentru sesiunea ${idSesiune}: ${uploadDir}`);
                res.json({ success: true, message: 'Fișierele au fost șterse cu succes' });
            } catch (error) {
                res.json({ success: true, message: 'Folderul nu există sau a fost șters deja' });
            }
        } catch (error) {
            console.error('Eroare la ștergerea fișierelor:', error);
            res.status(500).json({ success: false, message: 'Eroare la ștergerea fișierelor', error: error instanceof Error ? error.message : 'Eroare necunoscută' });
        }
    }
);

export default router;
