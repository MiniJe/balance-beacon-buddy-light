import { Router } from 'express';
import EmailSettingsController from '../controllers/email.settings.controller';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware';

const router = Router();
const emailSettingsController = new EmailSettingsController();

// Rute protejate pentru gestionarea setărilor de email
router.get('/', 
    authMiddleware, 
    roleMiddleware(['MASTER', 'ADMIN']),
    emailSettingsController.getEmailSettings.bind(emailSettingsController)
);

router.get('/table-structure', 
    authMiddleware, 
    roleMiddleware(['MASTER', 'ADMIN']),
    emailSettingsController.getTableStructure.bind(emailSettingsController)
);

router.put('/', 
    authMiddleware, 
    roleMiddleware(['MASTER', 'ADMIN']),
    emailSettingsController.updateEmailSettings.bind(emailSettingsController)
);

router.post('/test', 
    authMiddleware, 
    roleMiddleware(['MASTER', 'ADMIN']),
    emailSettingsController.testEmailConnection.bind(emailSettingsController)
);

router.post('/reset-password', 
    authMiddleware, 
    roleMiddleware(['MASTER', 'ADMIN']),
    emailSettingsController.resetEmailPassword.bind(emailSettingsController)
);

export default router;
