import { Router } from 'express';
import BackupController from '../controllers/backup.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const backupController = new BackupController();

// Rută pentru crearea backup-ului SQL
router.post('/create-sql-backup', 
    authMiddleware,
    backupController.createSqlBackup.bind(backupController)
);

// Rută pentru crearea backup-ului blob
router.post('/create-blob-backup', 
    authMiddleware,
    backupController.createBlobBackup.bind(backupController)
);

// Rută pentru crearea backup-ului complet (SQL + Blob)
router.post('/create-full-backup', 
    authMiddleware,
    backupController.createFullBackup.bind(backupController)
);

// Rută pentru listarea backup-urilor
router.get('/list', 
    authMiddleware,
    backupController.listBackups.bind(backupController)
);

// Rută pentru istoricul backup-urilor (cu paginare)
router.get('/history', 
    authMiddleware,
    backupController.getBackupHistory.bind(backupController)
);

// Rută pentru statistici backup-uri
router.get('/stats', 
    authMiddleware,
    backupController.getBackupStats.bind(backupController)
);

// Rută pentru detaliile unui backup specific
router.get('/details/:backupId', 
    authMiddleware,
    backupController.getBackupDetails.bind(backupController)
);

// Rută pentru descărcarea unui backup (cu tipul opțional)
router.get('/download/:backupId', 
    authMiddleware,
    backupController.downloadBackup.bind(backupController)
);

// Rută pentru descărcarea unui backup cu tip specificat
router.get('/download/:backupId/:type', 
    authMiddleware,
    backupController.downloadBackup.bind(backupController)
);

export default router;
