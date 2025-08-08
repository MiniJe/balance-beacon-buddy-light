import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { advancedCereriConfirmareController } from '../controllers/advanced.cereri.confirmare.controller';

/**
 * Rute pentru procesul îmbunătățit de cereri de confirmare
 * Implementează fluxul business complet cu noile servicii
 */
const router = Router();

// Aplică middleware-ul de autentificare pentru toate rutele
router.use(authMiddleware);

/**
 * POST /api/advanced-cereri-confirmare/initialize-session
 * Inițializează o nouă sesiune de cereri de confirmare
 * 
 * Body:
 * {
 *   parteneriSelectati: string[],
 *   partnerCategory: string, // ✅ STEP 1: Categoria din dropdown pentru selectarea automată template
 *   dataSold: string (YYYY-MM-DD),
 *   subiectEmail: string,
 *   folderLocal: string,
 *   observatii?: string
 * }
 */
router.post(
    '/initialize-session',
    advancedCereriConfirmareController.initializeSession.bind(advancedCereriConfirmareController)
);

/**
 * POST /api/advanced-cereri-confirmare/generate-documents
 * Generează documentele PDF pentru sesiune
 * 
 * Body:
 * {
 *   idSesiune: string,
 *   documenteReservate: DocumentGenerat[],
 *   templateBlobContainer?: string
 * }
 */
router.post(
    '/generate-documents',
    advancedCereriConfirmareController.generateDocuments.bind(advancedCereriConfirmareController)
);

/**
 * POST /api/advanced-cereri-confirmare/process-signed-documents
 * Procesează documentele semnate și le încarcă în Azure Blob Storage
 * 
 * Body:
 * {
 *   idSesiune: string,
 *   documenteGenerate: DocumentGenerat[],
 *   folderDocumenteSemnate: string
 * }
 */
router.post(
    '/process-signed-documents',
    advancedCereriConfirmareController.processSignedDocuments.bind(advancedCereriConfirmareController)
);

/**
 * POST /api/advanced-cereri-confirmare/finalize-session
 * Finalizează sesiunea și trimite cererile de confirmare
 * 
 * Body:
 * {
 *   idSesiune: string,
 *   documenteProcesate: DocumentGenerat[],
 *   sesiuneData: SesiuneCereriData
 * }
 */
router.post(
    '/finalize-session',
    advancedCereriConfirmareController.finalizeSession.bind(advancedCereriConfirmareController)
);

/**
 * GET /api/advanced-cereri-confirmare/session/:idSesiune/documents
 * Listează documentele unei sesiuni din Azure Blob Storage
 * 
 * Params:
 * - idSesiune: string
 * 
 * Query:
 * - tipDocument?: 'cereri' | 'semnate' | 'templates'
 */
router.get(
    '/session/:idSesiune/documents',
    advancedCereriConfirmareController.getSessionDocuments.bind(advancedCereriConfirmareController)
);

/**
 * GET /api/advanced-cereri-confirmare/documents/:blobPath/download-url
 * Generează URL pre-semnat pentru descărcarea unui document
 * 
 * Params:
 * - blobPath: string (encoded)
 * 
 * Query:
 * - expiryHours?: number (default: 24)
 */
router.get(
    '/documents/:blobPath/download-url',
    advancedCereriConfirmareController.generateDownloadUrl.bind(advancedCereriConfirmareController)
);

/**
 * DELETE /api/advanced-cereri-confirmare/session/:idSesiune/documents
 * Șterge toate documentele unei sesiuni
 * 
 * Params:
 * - idSesiune: string
 */
router.delete(
    '/session/:idSesiune/documents',
    advancedCereriConfirmareController.deleteSessionDocuments.bind(advancedCereriConfirmareController)
);

export default router;
