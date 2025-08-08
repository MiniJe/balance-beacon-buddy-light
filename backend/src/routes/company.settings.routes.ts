import { Router } from 'express';
import { companySettingsController } from '../controllers/company.settings.controller';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware';

const router = Router();

/**
 * Rute pentru gestionarea setărilor companiei (SQLite)
 * Toate rutele necesită autentificare și rol de MASTER sau CONTABIL
 */

// GET /api/company-settings - Obține setările companiei
router.get('/', 
    authMiddleware, 
    roleMiddleware(['MASTER', 'CONTABIL']),
    companySettingsController.getCompanySettings.bind(companySettingsController)
);

// POST /api/company-settings - Salvează setările companiei
router.post('/', 
    authMiddleware, 
    roleMiddleware(['MASTER', 'CONTABIL']),
    companySettingsController.saveCompanySettings.bind(companySettingsController)
);

// PUT /api/company-settings - Actualizează setările companiei
router.put('/', 
    authMiddleware, 
    roleMiddleware(['MASTER', 'CONTABIL']),
    companySettingsController.updateCompanySettings.bind(companySettingsController)
);

export default router;
