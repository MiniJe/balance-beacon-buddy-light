import { Router } from 'express';
import { emailMonitorController } from '../controllers/email-monitor.controller';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Aplicăm middleware-ul de autentificare și rolul pentru toate rutele
router.use(authMiddleware);
router.use(roleMiddleware(['MASTER', 'CONTABIL']));

/**
 * @route POST /api/email-monitor/start
 * @desc Pornește monitorizarea automată a emailurilor
 * @access Private (MASTER, CONTABIL)
 * @body {number} [intervalMinutes=5] - Intervalul în minute pentru verificări
 */
router.post('/start', emailMonitorController.startMonitoring.bind(emailMonitorController));

/**
 * @route POST /api/email-monitor/stop
 * @desc Oprește monitorizarea automată a emailurilor
 * @access Private (MASTER, CONTABIL)
 */
router.post('/stop', emailMonitorController.stopMonitoring.bind(emailMonitorController));

/**
 * @route POST /api/email-monitor/check-now
 * @desc Verifică manual pentru emailuri noi acum
 * @access Private (MASTER, CONTABIL)
 */
router.post('/check-now', emailMonitorController.checkNow.bind(emailMonitorController));

/**
 * @route GET /api/email-monitor/response-stats
 * @desc Obține statisticile răspunsurilor din ultimele 30 de zile
 * @access Private (MASTER, CONTABIL)
 */
router.get('/response-stats', emailMonitorController.getResponseStats.bind(emailMonitorController));

/**
 * @route GET /api/email-monitor/orphan-responses
 * @desc Obține lista răspunsurilor orphan (neprelucrate)
 * @access Private (MASTER, CONTABIL)
 * @query {number} [limit=50] - Numărul de înregistrări per pagină
 * @query {number} [offset=0] - Offset pentru paginare
 */
router.get('/orphan-responses', emailMonitorController.getOrphanResponses.bind(emailMonitorController));

/**
 * @route POST /api/email-monitor/process-orphan/:id
 * @desc Procesează manual un răspuns orphan
 * @access Private (MASTER, CONTABIL)
 * @param {string} id - ID-ul răspunsului orphan
 * @body {string} [linkedToEmailId] - ID-ul emailului cu care să fie asociat
 * @body {string} [processingNotes] - Observații despre procesare
 */
router.post('/process-orphan/:id', emailMonitorController.processOrphanResponse.bind(emailMonitorController));

/**
 * @route GET /api/email-monitor/recent-responses
 * @desc Obține emailurile cu răspunsuri recente
 * @access Private (MASTER, CONTABIL)
 * @query {number} [days=7] - Numărul de zile înapoi pentru căutare
 * @query {number} [limit=20] - Numărul maxim de rezultate
 */
router.get('/recent-responses', emailMonitorController.getRecentResponses.bind(emailMonitorController));

export default router;
