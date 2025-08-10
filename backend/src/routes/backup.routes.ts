import { Router } from 'express';
import BackupController from '../controllers/backup.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const backupController = new BackupController();

// Rută pentru obținerea setărilor de backup
router.get('/settings', 
    authMiddleware,
    backupController.getBackupSettings.bind(backupController)
);

// Rută pentru actualizarea setărilor de backup
router.put('/settings', 
    authMiddleware,
    backupController.updateBackupSettings.bind(backupController)
);

// Rută pentru crearea backup-ului manual cu folder configurat
router.post('/create', 
    authMiddleware,
    backupController.createManualBackup.bind(backupController)
);

// Rută pentru testarea funcționalității de backup
router.post('/test', 
    authMiddleware,
    backupController.testBackup.bind(backupController)
);

// Rută pentru listarea backup-urilor locale
router.get('/list', 
    authMiddleware,
    backupController.listLocalBackups.bind(backupController)
);

// Rută pentru descărcarea backup-ului local
router.get('/download/:backupId', 
    authMiddleware,
    backupController.downloadLocalBackup.bind(backupController)
);

// Rutele pentru compatibilitate cu Azure (returnează răspunsuri goale)
router.get('/history', 
    authMiddleware,
    backupController.getBackupHistory.bind(backupController)
);

router.get('/stats', 
    authMiddleware,
    backupController.getBackupStats.bind(backupController)
);

export default router;
