import { Router } from 'express';
import { AuthController } from '../controllers/auth.unified.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const authController = new AuthController();

// Rută publică - login unificat pentru toți utilizatorii (MASTER și CONTABILI)
router.post('/login', authController.login.bind(authController));

// Rute protejate
router.get('/profile', authMiddleware, authController.getProfile.bind(authController));

export default router;
