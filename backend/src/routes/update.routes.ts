import { Router } from 'express';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware';
import { updateService } from '../services/update.service';

const router = Router();

router.get('/version', authMiddleware, roleMiddleware(['MASTER']), async (_req, res) => {
  const info = updateService.getVersionInfo();
  const git = await updateService.checkGitStatus();
  res.json({ success: true, data: { ...info, git } });
});

router.post('/check', authMiddleware, roleMiddleware(['MASTER']), async (_req, res) => {
  const result = await updateService.checkForUpdates();
  res.json({ success: true, data: result });
});

// Rezumat rapid (folosit la startup UI) – folosește cache 5 minute
router.get('/summary', authMiddleware, roleMiddleware(['MASTER']), async (_req, res) => {
  const version = updateService.getVersionInfo();
  const updates = await updateService.cachedCheck(false);
  res.json({ success: true, data: { version, updates } });
});

router.post('/apply', authMiddleware, roleMiddleware(['MASTER']), async (_req, res) => {
  const result = await updateService.applyUpdateWithBackup();
  res.status(result.success ? 200 : 400).json({ success: result.success, data: result });
});

export default router;
