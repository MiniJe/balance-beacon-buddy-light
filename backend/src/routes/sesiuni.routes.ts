import { Router } from 'express';
import { JurnalSesiuniController } from '../controllers/sesiuni.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const sesiuniController = new JurnalSesiuniController();

/**
 * Rute pentru gestionarea jurnalului de sesiuni
 */

// Creează sesiune (login) - nu necesită autentificare deoarece este procesul de login
router.post('/login', sesiuniController.login.bind(sesiuniController));

// Toate rutele de mai jos necesită autentificare
router.use(authMiddleware);

// Logout - închide sesiunea curentă
router.put('/:idSesiune/logout', sesiuniController.logout.bind(sesiuniController));

// Actualizează activitatea utilizatorului în sesiune
router.put('/:idSesiune/activitate', sesiuniController.updateActivitate.bind(sesiuniController));

// Obține sesiunea activă pentru un utilizator
router.get('/activa/:idUtilizator', sesiuniController.getSesiuneActiva.bind(sesiuniController));

// Obține lista sesiunilor cu filtrare și paginare
router.get('/', sesiuniController.getSesiuni.bind(sesiuniController));

// Obține statistici despre sesiuni
router.get('/statistici', sesiuniController.getStatistici.bind(sesiuniController));

// Închide sesiunile expirate (operație administrativă)
router.post('/close-expired', sesiuniController.closeExpiredSessions.bind(sesiuniController));

export default router;
