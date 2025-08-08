import { Router } from 'express';
import { DatabaseController } from '../controllers/database.controller';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware';

const router = Router();
const databaseController = new DatabaseController();

// Rute protejate pentru administratorul MASTER
router.get('/tables', 
    authMiddleware, 
    roleMiddleware(['MASTER']),
    databaseController.getTables.bind(databaseController)
);

router.get('/email-settings', 
    authMiddleware, 
    roleMiddleware(['MASTER']),
    databaseController.getEmailSettings.bind(databaseController)
);

// Rute pentru setările companiei
router.get('/company-settings', 
    authMiddleware, 
    roleMiddleware(['MASTER']),
    databaseController.getCompanySettings.bind(databaseController)
);

router.post('/company-settings', 
    authMiddleware, 
    roleMiddleware(['MASTER']),
    databaseController.saveCompanySettings.bind(databaseController)
);

export default router;
