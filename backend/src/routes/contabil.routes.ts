import { Router } from 'express';
import { ContabilController } from '../controllers/contabil.controller';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware';
import { emailService } from '../services/email.service';

const router = Router();
const contabilController = new ContabilController(emailService);

// Ruta pentru crearea unui contabil nou - doar MASTER poate crea
router.post('/', 
    authMiddleware, 
    roleMiddleware(['MASTER']), 
    contabilController.createContabil.bind(contabilController)
);

// Ruta pentru obținerea listei de contabili - doar MASTER poate vedea lista
router.get('/', 
    authMiddleware, 
    roleMiddleware(['MASTER']), 
    contabilController.getAllContabili.bind(contabilController)
);

// Ruta pentru obținerea unui contabil după ID
router.get('/:id', 
    authMiddleware, 
    contabilController.getContabilById.bind(contabilController)
);

// Ruta pentru actualizarea unui contabil - doar MASTER poate actualiza
router.put('/:id', 
    authMiddleware, 
    roleMiddleware(['MASTER']), 
    contabilController.updateContabil.bind(contabilController)
);

// Ruta pentru ștergearea unui contabil - doar MASTER poate șterge
router.delete('/:id', 
    authMiddleware, 
    roleMiddleware(['MASTER']), 
    contabilController.deleteContabil.bind(contabilController)
);

// Ruta pentru actualizarea permisiunilor unui contabil - doar MASTER poate actualiza
router.put('/:id/permisiuni', 
    authMiddleware, 
    roleMiddleware(['MASTER']), 
    contabilController.updateContabilPermisiuni.bind(contabilController)
);

// Ruta pentru activarea/dezactivarea unui contabil - doar MASTER poate modifica
router.put('/:id/status', 
    authMiddleware, 
    roleMiddleware(['MASTER']), 
    contabilController.setContabilStatus.bind(contabilController)
);

// Ruta pentru resetarea parolei unui contabil - doar MASTER poate reseta
router.post('/:id/reset-password', 
    authMiddleware, 
    roleMiddleware(['MASTER']), 
    contabilController.resetContabilPassword.bind(contabilController)
);

// Ruta pentru schimbarea parolei de către contabil
router.post('/change-password', 
    authMiddleware, 
    contabilController.changeContabilPassword.bind(contabilController)
);

export default router;
