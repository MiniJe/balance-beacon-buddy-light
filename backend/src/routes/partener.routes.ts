import { Router } from 'express';
import { PartenerController } from '../controllers/partener.controller';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware';

const router = Router();
const partenerController = new PartenerController();

// Rute protejate pentru managementul partenerilor
router.get('/', 
    authMiddleware, 
    roleMiddleware(['MASTER', 'ADMIN', 'USER']),
    partenerController.getAllParteneri.bind(partenerController)
);

router.get('/by-ids', 
    authMiddleware, 
    roleMiddleware(['MASTER', 'ADMIN', 'USER']),
    partenerController.getPartenersByIds.bind(partenerController)
);

router.get('/search', 
    authMiddleware, 
    roleMiddleware(['MASTER', 'ADMIN', 'USER']),
    partenerController.searchParteneri.bind(partenerController)
);

router.get('/stats/dashboard', 
    authMiddleware, 
    roleMiddleware(['MASTER', 'ADMIN', 'USER', 'CONTABIL']),
    partenerController.getDashboardStats.bind(partenerController)
);

router.get('/recent', 
    authMiddleware, 
    roleMiddleware(['MASTER', 'ADMIN', 'USER', 'CONTABIL']),
    partenerController.getRecentParteneri.bind(partenerController)
);

router.get('/:id', 
    authMiddleware, 
    roleMiddleware(['MASTER', 'ADMIN', 'USER']),
    partenerController.getPartenerById.bind(partenerController)
);

router.post('/', 
    authMiddleware, 
    roleMiddleware(['MASTER', 'ADMIN']),
    partenerController.createPartener.bind(partenerController)
);

router.put('/:id', 
    authMiddleware, 
    roleMiddleware(['MASTER', 'ADMIN']),
    partenerController.updatePartener.bind(partenerController)
);

router.delete('/:id', 
    authMiddleware, 
    roleMiddleware(['MASTER', 'ADMIN']),
    partenerController.deletePartener.bind(partenerController)
);

export default router;
