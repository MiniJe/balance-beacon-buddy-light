import { Router } from 'express';
import { reminderSettingsController } from '../controllers/reminder.settings.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

/**
 * Obține setările pentru remindere
 * GET /api/reminders/settings
 */
router.get('/settings', authMiddleware, reminderSettingsController.getReminderSettings.bind(reminderSettingsController));

/**
 * Actualizează setările pentru remindere
 * POST /api/reminders/settings
 */
router.post('/settings', authMiddleware, reminderSettingsController.updateReminderSettings.bind(reminderSettingsController));

/**
 * Resetează setările la valorile implicite
 * POST /api/reminders/settings/reset
 */
router.post('/settings/reset', authMiddleware, reminderSettingsController.resetReminderSettings.bind(reminderSettingsController));

export default router;
