import { Router } from 'express';
import { emailTrackingController } from '../services/email-tracking.service';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

/**
 * Endpoint public pentru tracking pixel (nu necesită autentificare)
 * GET /api/email-tracking/pixel/:token
 */
router.get('/pixel/:token', emailTrackingController.trackPixel.bind(emailTrackingController));

/**
 * Endpoint pentru obținerea statisticilor unui email (necesită autentificare)
 * GET /api/email-tracking/stats/:idJurnalEmail
 */
router.get('/stats/:idJurnalEmail', authMiddleware, emailTrackingController.getEmailStats.bind(emailTrackingController));

/**
 * Endpoint pentru identificarea partenerilor neresponsivi (necesită autentificare)
 * GET /api/email-tracking/unresponsive-partners?days=7
 */
router.get('/unresponsive-partners', authMiddleware, emailTrackingController.getUnresponsivePartners.bind(emailTrackingController));

/**
 * Endpoint pentru generarea raportului de tracking (necesită autentificare)
 * GET /api/email-tracking/report?idLot=123&idCerereConfirmare=456
 */
router.get('/report', authMiddleware, emailTrackingController.generateReport.bind(emailTrackingController));

/**
 * Endpoint pentru trimiterea reminder-elor automate (necesită autentificare)
 * POST /api/email-tracking/send-reminders
 * Body: { days: 7, reminderType: 'SOFT' | 'URGENT' }
 */
router.post('/send-reminders', authMiddleware, emailTrackingController.sendReminders.bind(emailTrackingController));

export default router;
