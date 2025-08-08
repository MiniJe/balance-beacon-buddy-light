import { Router, Request, Response } from 'express';
import { autoReminderService } from '../services/auto-reminder.service';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

/**
 * Pornește serviciul de auto-remindere
 * POST /api/auto-reminder/start
 * Body: { intervalHours?: number }
 */
router.post('/start', authMiddleware, async (req: Request, res: Response): Promise<void> => {
    try {
        const { intervalHours = 24 } = req.body;
        
        await autoReminderService.startAutoReminder(intervalHours);
        
        res.json({
            success: true,
            message: `Serviciul de auto-remindere a fost pornit cu interval de ${intervalHours} ore`,
            data: autoReminderService.getStatus()
        });

    } catch (error) {
        console.error('❌ Eroare la pornirea auto-reminder-ului:', error);
        res.status(500).json({
            success: false,
            error: 'Eroare la pornirea serviciului de auto-remindere'
        });
    }
});

/**
 * Oprește serviciul de auto-remindere
 * POST /api/auto-reminder/stop
 */
router.post('/stop', authMiddleware, async (req: Request, res: Response): Promise<void> => {
    try {
        autoReminderService.stopAutoReminder();
        
        res.json({
            success: true,
            message: 'Serviciul de auto-remindere a fost oprit',
            data: autoReminderService.getStatus()
        });

    } catch (error) {
        console.error('❌ Eroare la oprirea auto-reminder-ului:', error);
        res.status(500).json({
            success: false,
            error: 'Eroare la oprirea serviciului de auto-remindere'
        });
    }
});

/**
 * Obține status-ul serviciului de auto-remindere
 * GET /api/auto-reminder/status
 */
router.get('/status', authMiddleware, async (req: Request, res: Response): Promise<void> => {
    try {
        const status = autoReminderService.getStatus();
        
        res.json({
            success: true,
            data: status
        });

    } catch (error) {
        console.error('❌ Eroare la obținerea status-ului:', error);
        res.status(500).json({
            success: false,
            error: 'Eroare la obținerea status-ului serviciului'
        });
    }
});

/**
 * Rulează manual o verificare pentru remindere
 * POST /api/auto-reminder/check-now
 */
router.post('/check-now', authMiddleware, async (req: Request, res: Response): Promise<void> => {
    try {
        // Pentru rularea manuală, chemăm metoda privată prin reflexie
        // Aceasta e o abordare temporară - în producție ar trebui să existe o metodă publică
        const AutoReminderService = require('../services/auto-reminder.service').AutoReminderService;
        await (AutoReminderService as any).checkAndSendReminders();
        
        res.json({
            success: true,
            message: 'Verificarea manuală a fost executată cu succes'
        });

    } catch (error) {
        console.error('❌ Eroare la verificarea manuală:', error);
        res.status(500).json({
            success: false,
            error: 'Eroare la executarea verificării manuale'
        });
    }
});

export default router;
