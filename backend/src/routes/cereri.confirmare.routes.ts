import { Router } from 'express';
import { cereriConfirmareController } from '../controllers/cereri.confirmare.controller';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware';

const router = Router();

/**
 * Rute pentru orchestrarea procesului complet de cereri de confirmare
 * Toate rutele necesită autentificare și rol de MASTER, ADMIN, USER sau CONTABIL
 */

// Inițiază o nouă sesiune de cereri de confirmare
router.post('/initialize-session', 
    authMiddleware, 
    roleMiddleware(['MASTER', 'ADMIN', 'USER', 'CONTABIL']), 
    cereriConfirmareController.initializeSession.bind(cereriConfirmareController)
);

// Generează documentele PDF pentru o sesiune
router.post('/generate-documents', 
    authMiddleware, 
    roleMiddleware(['MASTER', 'ADMIN', 'USER', 'CONTABIL']), 
    cereriConfirmareController.generateDocuments.bind(cereriConfirmareController)
);

// Procesează documentele semnate
router.post('/process-signed-documents', 
    authMiddleware, 
    roleMiddleware(['MASTER', 'ADMIN', 'USER', 'CONTABIL']), 
    cereriConfirmareController.processSignedDocuments.bind(cereriConfirmareController)
);

// Finalizează sesiunea și trimite cererile
router.post('/finalize-session', 
    authMiddleware, 
    roleMiddleware(['MASTER', 'ADMIN', 'USER', 'CONTABIL']), 
    cereriConfirmareController.finalizeSession.bind(cereriConfirmareController)
);

// Orchestrează întregul proces într-o singură operațiune
router.post('/process-complete', 
    authMiddleware, 
    roleMiddleware(['MASTER', 'ADMIN', 'USER', 'CONTABIL']), 
    cereriConfirmareController.processComplete.bind(cereriConfirmareController)
);

// Obține statusul unei sesiuni de cereri
router.get('/session-status/:idSesiune', 
    authMiddleware, 
    roleMiddleware(['MASTER', 'ADMIN', 'USER', 'CONTABIL']), 
    cereriConfirmareController.getSessionStatus.bind(cereriConfirmareController)
);

export default router;
