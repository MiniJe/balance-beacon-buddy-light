import { Router } from 'express';
import simpleBackupController from '../controllers/simple-backup.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Rută pentru obținerea setărilor de backup
router.get('/settings', 
    authMiddleware,
    simpleBackupController.getBackupSettings.bind(simpleBackupController)
);

// Rută pentru actualizarea setărilor de backup
router.put('/settings', 
    authMiddleware,
    simpleBackupController.updateBackupSettings.bind(simpleBackupController)
);

// Rută pentru crearea backup-ului manual cu folder configurat
router.post('/create', 
    authMiddleware,
    simpleBackupController.createManualBackup.bind(simpleBackupController)
);

// Rută pentru testarea funcționalității de backup
router.post('/test', 
    authMiddleware,
    simpleBackupController.testBackup.bind(simpleBackupController)
);

// Rută pentru listarea backup-urilor locale
router.get('/list', 
    authMiddleware,
    simpleBackupController.listLocalBackups.bind(simpleBackupController)
);

// Rută pentru descărcarea backup-ului local
router.get('/download/:backupId', 
    authMiddleware,
    simpleBackupController.downloadLocalBackup.bind(simpleBackupController)
);

// Rutele pentru compatibilitate cu Azure (returnează răspunsuri goale)
router.get('/history', 
    authMiddleware,
    simpleBackupController.getBackupHistory.bind(simpleBackupController)
);

router.get('/stats', 
    authMiddleware,
    simpleBackupController.getBackupStats.bind(simpleBackupController)
);

export default router;
