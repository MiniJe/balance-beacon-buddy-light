import { Router } from 'express';
import { EmailController } from '../controllers/email.controller';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware';

const router = Router();
const emailController = new EmailController();

// Rute protejate pentru administratorul MASTER
router.get('/test-connection', 
    authMiddleware, 
    roleMiddleware(['MASTER']),
    emailController.testEmailConnection.bind(emailController)
);

router.post('/test-connection-with-password', 
    authMiddleware, 
    roleMiddleware(['MASTER']),
    emailController.testEmailConnectionWithPassword.bind(emailController)
);

// NOTĂ: Funcțiile sendTestEmail și sendTestEmailDynamic au fost mutate în email.settings.controller.ts
// Rutele /send-test și /send-test-dynamic sunt acum disponibile prin /api/email-settings/

router.post('/send', 
    authMiddleware, 
    roleMiddleware(['MASTER']),
    emailController.sendEmail.bind(emailController)
);

router.post('/send-with-attachment', 
    authMiddleware, 
    roleMiddleware(['MASTER']),
    emailController.sendEmailWithAttachment.bind(emailController)
);

// Endpoint special pentru trimiterea email-urilor către parteneri pentru fișe
router.post('/send-fise-partener', 
    authMiddleware, 
    emailController.sendFisePartenerEmail.bind(emailController)
);

router.post('/update-password', 
    authMiddleware, 
    roleMiddleware(['MASTER']),
    emailController.updateEmailPassword.bind(emailController)
);

router.get('/settings', 
    authMiddleware, 
    roleMiddleware(['MASTER']),
    emailController.getEmailSettings.bind(emailController)
);

export default router;
