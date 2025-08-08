import { Router } from 'express';
import { pdfController } from '../controllers/pdf.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route POST /api/pdf/download
 * @desc Descarcă PDF cu lista partenerilor
 * @access Private
 */
router.post('/download', authMiddleware, pdfController.downloadPartnersPdf);

/**
 * @route POST /api/pdf/print
 * @desc Generează PDF pentru print
 * @access Private
 */
router.post('/print', authMiddleware, pdfController.generatePrintPdf);

/**
 * @route POST /api/pdf/email
 * @desc Generează PDF pentru email
 * @access Private
 */
router.post('/email', authMiddleware, pdfController.generateEmailPdf);

/**
 * Ruta simplificată pentru testare (fără autentificare)
 * NOTĂ: Aceasta ar trebui să fie dezactivată în producție
 */
router.post('/test-download', pdfController.downloadPartnersPdf);

export default router;