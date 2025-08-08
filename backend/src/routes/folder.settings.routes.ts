import { Router } from 'express';
import { FolderSettingsController } from '../controllers/folder.settings.controller';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware';

const router = Router();
const folderSettingsController = new FolderSettingsController();

/**
 * Rute pentru gestionarea setărilor de foldere
 * Toate rutele necesită autentificare
 */

// GET /api/folder-settings - Obține setările de foldere
router.get('/', 
    authMiddleware, 
    roleMiddleware(['MASTER', 'CONTABIL']),
    folderSettingsController.getFolderSettings.bind(folderSettingsController)
);

// PUT /api/folder-settings - Salvează setările de foldere
router.put('/', 
    authMiddleware, 
    roleMiddleware(['MASTER', 'CONTABIL']),
    folderSettingsController.updateFolderSettings.bind(folderSettingsController)
);

// POST /api/folder-settings/test - Testează accesul la un folder
router.post('/test', 
    authMiddleware, 
    roleMiddleware(['MASTER', 'CONTABIL']),
    folderSettingsController.testFolderAccess.bind(folderSettingsController)
);

// POST /api/folder-settings/create - Creează un folder dacă nu există
router.post('/create', 
    authMiddleware, 
    roleMiddleware(['MASTER', 'CONTABIL']),
    folderSettingsController.createFolder.bind(folderSettingsController)
);

// DELETE /api/folder-settings/reset - Resetează setările la valorile implicite
router.delete('/reset', 
    authMiddleware, 
    roleMiddleware(['MASTER']),
    folderSettingsController.resetFolderSettings.bind(folderSettingsController)
);

export default router;
