import { Router, Request, Response, NextFunction } from 'express';
import { BlobStorageController, upload } from '../controllers/blob.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const blobStorageController = new BlobStorageController();

// Rută pentru încărcarea logo-ului companiei în Azure Blob Storage
router.post('/upload-company-logo', 
    authMiddleware,
    upload.single('logo'),
    blobStorageController.uploadToBlob.bind(blobStorageController)
);

// Rută pentru ștergerea unui blob
router.post('/delete-blob', 
    authMiddleware,
    blobStorageController.deleteBlob.bind(blobStorageController)
);

// Rută simplă pentru a servi blob-uri fără wildcards
router.get('/blob', 
    (req: any, res: any, next: any) => {
        let blobPath = req.query.path;
        if (!blobPath || typeof blobPath !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Parametrul path este obligatoriu'
            });
        }
        
        // Elimină query parameters din path (cum ar fi timestamp-ul pentru cache busting)
        blobPath = blobPath.split('?')[0];
        
        console.log(`Blob request received: path=${blobPath} (original: ${req.query.path})`);
        req.blobPath = blobPath;
        next();
    },
    blobStorageController.getBlobContent.bind(blobStorageController)
);

// Rută pentru a genera un URL proxy pentru un blob
router.post('/generate-proxy-url',
    authMiddleware,
    blobStorageController.generateProxyUrl.bind(blobStorageController)
);

export default router;
