import { Router } from 'express';
import { jurnalCereriConfirmareController } from '../controllers/jurnal.cereri.confirmare.controller';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware';

const router = Router();

/**
 * Rute pentru gestionarea jurnalului cererilor de confirmare
 * Toate rutele necesită autentificare și rol de CONTABIL
 */

// Creează o nouă cerere de confirmare în jurnal
router.post('/', 
    authMiddleware, 
    roleMiddleware(['CONTABIL']), 
    jurnalCereriConfirmareController.createCerereConfirmare.bind(jurnalCereriConfirmareController)
);

// Obține statistici pentru cereri
router.get('/statistici', 
    authMiddleware, 
    roleMiddleware(['CONTABIL']), 
    jurnalCereriConfirmareController.getStatisticiCereri.bind(jurnalCereriConfirmareController)
);

// Obține toate cererile cu paginare și filtrare
router.get('/', 
    authMiddleware, 
    roleMiddleware(['CONTABIL']), 
    jurnalCereriConfirmareController.getAllCereri.bind(jurnalCereriConfirmareController)
);

// Obține o cerere specifică
router.get('/:idCerere', 
    authMiddleware, 
    roleMiddleware(['CONTABIL']), 
    jurnalCereriConfirmareController.getCerereById.bind(jurnalCereriConfirmareController)
);

// Actualizează o cerere
router.put('/:idCerere', 
    authMiddleware, 
    roleMiddleware(['CONTABIL']), 
    jurnalCereriConfirmareController.updateCerereConfirmare.bind(jurnalCereriConfirmareController)
);

// Marchează o cerere ca expirată
router.put('/:idCerere/expire', 
    authMiddleware, 
    roleMiddleware(['CONTABIL']), 
    jurnalCereriConfirmareController.expireCerere.bind(jurnalCereriConfirmareController)
);

// Procesează răspunsul unui partener
router.put('/:idCerere/raspuns', 
    authMiddleware, 
    roleMiddleware(['CONTABIL']), 
    jurnalCereriConfirmareController.procesRaspunsPartener.bind(jurnalCereriConfirmareController)
);

export default router;
