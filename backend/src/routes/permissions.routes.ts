import { Router, Request, Response } from 'express';
import { globalPermissionService, GlobalPermissionService } from '../services/global-permission.service';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

/**
 * GET /api/permissions/templates
 * Obține toate template-urile de permisiuni disponibile
 */
router.get('/templates', authMiddleware, async (req: Request, res: Response) => {
    try {
        const templates = GlobalPermissionService.getPermissionTemplates();
        
        res.json({
            success: true,
            message: 'Template-uri de permisiuni obținute cu succes',
            data: templates
        });
    } catch (error: any) {
        console.error('Error fetching permission templates:', error);
        res.status(500).json({
            success: false,
            message: 'Eroare la obținerea template-urilor de permisiuni'
        });
    }
});

/**
 * GET /api/permissions/user/:userId/:userType
 * Obține permisiunile curente ale unui utilizator
 */
router.get('/user/:userId/:userType', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { userId, userType } = req.params;
        
        if (!['contabil', 'utilizator'].includes(userType)) {
            res.status(400).json({
                success: false,
                message: 'Tip de utilizator invalid'
            });
            return;
        }

        const permissions = await globalPermissionService.getUserPermissions(
            userId, 
            userType as 'contabil' | 'utilizator'
        );
        
        res.json({
            success: true,
            message: 'Permisiuni obținute cu succes',
            data: permissions
        });
    } catch (error: any) {
        console.error('Error fetching user permissions:', error);
        if (error.message === 'Utilizatorul nu a fost găsit') {
            res.status(404).json({
                success: false,
                message: error.message
            });
            return;
        }
        
        res.status(500).json({
            success: false,
            message: 'Eroare la obținerea permisiunilor utilizatorului'
        });
    }
});

/**
 * POST /api/permissions/apply-template
 * Aplică un template de permisiuni unui utilizator
 */
router.post('/apply-template', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { userId, userType, templateId } = req.body;
        const appliedBy = (req as any).user?.EmailContabil || (req as any).user?.EmailUtilizator || 'Unknown';

        if (!userId || !userType || !templateId) {
            res.status(400).json({
                success: false,
                message: 'userId, userType și templateId sunt obligatorii'
            });
            return;
        }

        if (!['contabil', 'utilizator'].includes(userType)) {
            res.status(400).json({
                success: false,
                message: 'Tip de utilizator invalid'
            });
            return;
        }

        await globalPermissionService.applyPermissionTemplate(
            userId,
            userType as 'contabil' | 'utilizator',
            templateId,
            appliedBy
        );
        
        res.json({
            success: true,
            message: 'Template de permisiuni aplicat cu succes'
        });
    } catch (error: any) {
        console.error('Error applying permission template:', error);
        
        if (error.message.includes('nu a fost găsit')) {
            res.status(404).json({
                success: false,
                message: error.message
            });
            return;
        }
        
        res.status(500).json({
            success: false,
            message: 'Eroare la aplicarea template-ului de permisiuni'
        });
    }
});

/**
 * PUT /api/permissions/update
 * Actualizează permisiunile custom ale unui utilizator
 */
router.put('/update', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { userId, userType, permissions, reason } = req.body;
        const updatedBy = (req as any).user?.EmailContabil || (req as any).user?.EmailUtilizator || 'Unknown';

        if (!userId || !userType || !permissions) {
            res.status(400).json({
                success: false,
                message: 'userId, userType și permissions sunt obligatorii'
            });
            return;
        }

        if (!['contabil', 'utilizator'].includes(userType)) {
            res.status(400).json({
                success: false,
                message: 'Tip de utilizator invalid'
            });
            return;
        }

        await globalPermissionService.updateUserPermissions({
            userId,
            userType: userType as 'contabil' | 'utilizator',
            permissions,
            updatedBy,
            reason
        });
        
        res.json({
            success: true,
            message: 'Permisiuni actualizate cu succes'
        });
    } catch (error: any) {
        console.error('Error updating user permissions:', error);
        res.status(500).json({
            success: false,
            message: 'Eroare la actualizarea permisiunilor'
        });
    }
});

/**
 * POST /api/permissions/suspend
 * Suspendă toate permisiunile unui utilizator
 */
router.post('/suspend', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { userId, userType, reason } = req.body;
        const suspendedBy = (req as any).user?.EmailContabil || (req as any).user?.EmailUtilizator || 'Unknown';

        if (!userId || !userType) {
            res.status(400).json({
                success: false,
                message: 'userId și userType sunt obligatorii'
            });
            return;
        }

        if (!['contabil', 'utilizator'].includes(userType)) {
            res.status(400).json({
                success: false,
                message: 'Tip de utilizator invalid'
            });
            return;
        }

        await globalPermissionService.suspendUserPermissions(
            userId,
            userType as 'contabil' | 'utilizator',
            suspendedBy,
            reason
        );
        
        res.json({
            success: true,
            message: 'Permisiuni suspendate cu succes'
        });
    } catch (error: any) {
        console.error('Error suspending user permissions:', error);
        res.status(500).json({
            success: false,
            message: 'Eroare la suspendarea permisiunilor'
        });
    }
});

/**
 * POST /api/permissions/restore
 * Restaurează permisiunile unui utilizator suspendat
 */
router.post('/restore', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { userId, userType } = req.body;
        const restoredBy = (req as any).user?.EmailContabil || (req as any).user?.EmailUtilizator || 'Unknown';

        if (!userId || !userType) {
            res.status(400).json({
                success: false,
                message: 'userId și userType sunt obligatorii'
            });
            return;
        }

        if (!['contabil', 'utilizator'].includes(userType)) {
            res.status(400).json({
                success: false,
                message: 'Tip de utilizator invalid'
            });
            return;
        }

        await globalPermissionService.restoreUserPermissions(
            userId,
            userType as 'contabil' | 'utilizator',
            restoredBy
        );
        
        res.json({
            success: true,
            message: 'Permisiuni restaurate cu succes'
        });
    } catch (error: any) {
        console.error('Error restoring user permissions:', error);
        
        if (error.message.includes('Nu există backup')) {
            res.status(400).json({
                success: false,
                message: error.message
            });
            return;
        }
        
        res.status(500).json({
            success: false,
            message: 'Eroare la restaurarea permisiunilor'
        });
    }
});

/**
 * GET /api/permissions/check/:userId/:userType/:permission
 * Verifică dacă un utilizator are o anumită permisiune
 */
router.get('/check/:userId/:userType/:permission', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { userId, userType, permission } = req.params;
        
        if (!['contabil', 'utilizator'].includes(userType)) {
            res.status(400).json({
                success: false,
                message: 'Tip de utilizator invalid'
            });
            return;
        }

        const hasPermission = await globalPermissionService.hasPermission(
            userId,
            userType as 'contabil' | 'utilizator',
            permission
        );
        
        res.json({
            success: true,
            message: 'Verificare permisiune completă',
            data: {
                userId,
                userType,
                permission,
                hasPermission
            }
        });
    } catch (error: any) {
        console.error('Error checking permission:', error);
        res.status(500).json({
            success: false,
            message: 'Eroare la verificarea permisiunii'
        });
    }
});

export default router;
