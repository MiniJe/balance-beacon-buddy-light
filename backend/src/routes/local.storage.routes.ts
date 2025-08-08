import { Router } from 'express';
import { localStorageController, upload } from '../controllers/local.storage.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Rută pentru încărcarea logo-ului companiei în storage local
router.post('/upload-company-logo', 
    authMiddleware,
    upload.single('logo'),
    localStorageController.uploadCompanyLogo.bind(localStorageController)
);

// Rută pentru ștergerea logo-ului unei companii
router.post('/delete-company-logo', 
    authMiddleware,
    localStorageController.deleteCompanyLogo.bind(localStorageController)
);

// Rută pentru servirea fișierelor logo
router.get('/logos/:companyId/:filename', 
    localStorageController.serveLogoFile.bind(localStorageController)
);

// Rută pentru listarea tuturor logo-urilor (pentru debugging)
router.get('/list-logos', 
    authMiddleware,
    localStorageController.listLogos.bind(localStorageController)
);

// Rută pentru a genera un URL proxy pentru un logo (compatibilitate cu codul existent)
router.post('/generate-proxy-url',
    authMiddleware,
    localStorageController.generateProxyUrl.bind(localStorageController)
);

export default router;
