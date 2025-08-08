import { Router } from 'express';
import { jurnalDocumenteEmiseController } from '../controllers/jurnal.documente.emise.controller';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware';
import { 
    validateCreateDocument, 
    validateUpdateDocument, 
    validateNumericParam,
    validatePagination 
} from '../middleware/validation.middleware';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();

/**
 * Rute pentru gestionarea jurnalului documentelor emise
 * Toate rutele necesită autentificare și rol de CONTABIL
 */

// Creează un nou document în jurnal
router.post('/', 
    authMiddleware, 
    roleMiddleware(['CONTABIL']),
    ...validateCreateDocument,
    asyncHandler(jurnalDocumenteEmiseController.createDocument.bind(jurnalDocumenteEmiseController))
);

// Rezervă un număr de înregistrare
router.post('/reserve-number', 
    authMiddleware, 
    roleMiddleware(['CONTABIL']),
    asyncHandler(jurnalDocumenteEmiseController.reserveRegistrationNumber.bind(jurnalDocumenteEmiseController))
);

// Generează numere de ordine consecutive
router.post('/generate-order-numbers', 
    authMiddleware, 
    roleMiddleware(['CONTABIL']),
    asyncHandler(jurnalDocumenteEmiseController.generateOrderNumbers.bind(jurnalDocumenteEmiseController))
);

// Obține următorul număr de înregistrare
router.get('/next-number', 
    authMiddleware, 
    roleMiddleware(['CONTABIL']),
    asyncHandler(jurnalDocumenteEmiseController.getNextRegistrationNumber.bind(jurnalDocumenteEmiseController))
);

// Obține toate documentele cu paginare și filtrare
router.get('/', 
    authMiddleware, 
    roleMiddleware(['CONTABIL']),
    validatePagination,
    asyncHandler(jurnalDocumenteEmiseController.getAllDocuments.bind(jurnalDocumenteEmiseController))
);

// Obține un document specific
router.get('/:idDocument', 
    authMiddleware, 
    roleMiddleware(['CONTABIL']),
    validateNumericParam('idDocument'),
    asyncHandler(jurnalDocumenteEmiseController.getDocumentById.bind(jurnalDocumenteEmiseController))
);

// Actualizează un document
router.put('/:idDocument', 
    authMiddleware, 
    roleMiddleware(['CONTABIL']),
    validateNumericParam('idDocument'),
    ...validateUpdateDocument,
    asyncHandler(jurnalDocumenteEmiseController.updateDocument.bind(jurnalDocumenteEmiseController))
);

export default router;
