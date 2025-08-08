/**
 * Routes pentru gestionarea permisiunilor de către utilizatorii MASTER
 * Permite MASTER să configureze permisiunile contabililor
 */

import express from 'express';
import { MasterPermissionsService, ContabilPermissions, AVAILABLE_PERMISSIONS, DEFAULT_CONTABIL_PERMISSIONS, FULL_CONTABIL_PERMISSIONS } from '../services/master-permissions.service';
import { authMiddleware, masterOnlyMiddleware, AuthenticatedRequest } from '../middleware/auth.middleware';
import { ApiResponseHelper } from '../types/api.types';

const router = express.Router();

/**
 * GET /api/master-permissions/contabili
 * Obține lista tuturor contabililor cu permisiunile lor
 * Doar pentru MASTER
 */
router.get('/contabili', authMiddleware, masterOnlyMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
        const masterId = req.user?.IdUtilizatori || req.user?.id;
        if (!masterId) {
            res.status(401).json(ApiResponseHelper.error('ID utilizator lipsă'));
            return;
        }
        
        const result = await MasterPermissionsService.getAllContabiliPermissions(masterId);
        
        if (result.success) {
            res.json(ApiResponseHelper.success(result.data, 'Lista contabililor obținută cu succes'));
        } else {
            res.status(403).json(ApiResponseHelper.error(result.message));
        }
        
    } catch (error) {
        console.error('❌ MASTER-ROUTES: Error getting contabili list:', error);
        res.status(500).json(ApiResponseHelper.error('Eroare la obținerea listei de contabili'));
    }
});

/**
 * GET /api/master-permissions/contabil/:id
 * Obține permisiunile unui contabil specific
 * Doar pentru MASTER
 */
router.get('/contabil/:id', authMiddleware, masterOnlyMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
        const { id } = req.params;
        
        const permissions = await MasterPermissionsService.getContabilPermissions(id);
        
        if (permissions) {
            res.json(ApiResponseHelper.success({
                idContabil: id,
                permissions
            }, 'Permisiuni obținute cu succes'));
        } else {
            res.status(404).json(ApiResponseHelper.error('Contabilul nu a fost găsit sau nu este activ'));
        }
        
    } catch (error) {
        console.error('❌ MASTER-ROUTES: Error getting contabil permissions:', error);
        res.status(500).json(ApiResponseHelper.error('Eroare la obținerea permisiunilor'));
    }
});

/**
 * PUT /api/master-permissions/contabil/:id
 * Setează permisiunile unui contabil
 * Doar pentru MASTER
 */
router.put('/contabil/:id', authMiddleware, masterOnlyMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
        const { id } = req.params;
        const { permissions } = req.body;
        const masterId = req.user?.IdUtilizatori || req.user?.id;
        
        if (!masterId) {
            res.status(401).json(ApiResponseHelper.error('ID utilizator lipsă'));
            return;
        }
        
        // Validate permissions structure
        if (!permissions || typeof permissions !== 'object') {
            res.status(400).json(ApiResponseHelper.error('Structura permisiunilor este invalidă'));
            return;
        }
        
        // Ensure all required permissions are present
        const validatedPermissions: ContabilPermissions = {
            ...DEFAULT_CONTABIL_PERMISSIONS,
            ...permissions
        };
        
        const result = await MasterPermissionsService.setContabilPermissions(masterId, id, validatedPermissions);
        
        if (result.success) {
            res.json(ApiResponseHelper.success({ 
                idContabil: id, 
                permissions: validatedPermissions 
            }, result.message));
        } else {
            res.status(400).json(ApiResponseHelper.error(result.message));
        }
        
    } catch (error) {
        console.error('❌ MASTER-ROUTES: Error setting contabil permissions:', error);
        res.status(500).json(ApiResponseHelper.error('Eroare la setarea permisiunilor'));
    }
});

/**
 * POST /api/master-permissions/contabil/:id/reset
 * Resetează permisiunile unui contabil la valorile default
 * Doar pentru MASTER
 */
router.post('/contabil/:id/reset', authMiddleware, masterOnlyMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
        const { id } = req.params;
        const masterId = req.user?.IdUtilizatori || req.user?.id;
        
        if (!masterId) {
            res.status(401).json(ApiResponseHelper.error('ID utilizator lipsă'));
            return;
        }
        
        const result = await MasterPermissionsService.resetContabilPermissions(masterId, id);
        
        if (result.success) {
            res.json(ApiResponseHelper.success({
                idContabil: id,
                permissions: DEFAULT_CONTABIL_PERMISSIONS
            }, result.message));
        } else {
            res.status(400).json(ApiResponseHelper.error(result.message));
        }
        
    } catch (error) {
        console.error('❌ MASTER-ROUTES: Error resetting contabil permissions:', error);
        res.status(500).json(ApiResponseHelper.error('Eroare la resetarea permisiunilor'));
    }
});

/**
 * POST /api/master-permissions/contabil/:id/grant-full
 * Acordă permisiuni complete unui contabil (fără acces administrativ)
 * Doar pentru MASTER
 */
router.post('/contabil/:id/grant-full', authMiddleware, masterOnlyMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
        const { id } = req.params;
        const masterId = req.user?.IdUtilizatori || req.user?.id;
        
        if (!masterId) {
            res.status(401).json(ApiResponseHelper.error('ID utilizator lipsă'));
            return;
        }
        
        const result = await MasterPermissionsService.grantFullContabilPermissions(masterId, id);
        
        if (result.success) {
            res.json(ApiResponseHelper.success({
                idContabil: id,
                permissions: FULL_CONTABIL_PERMISSIONS
            }, result.message));
        } else {
            res.status(400).json(ApiResponseHelper.error(result.message));
        }
        
    } catch (error) {
        console.error('❌ MASTER-ROUTES: Error granting full permissions:', error);
        res.status(500).json(ApiResponseHelper.error('Eroare la acordarea permisiunilor complete'));
    }
});

/**
 * GET /api/master-permissions/available-permissions
 * Obține lista tuturor permisiunilor disponibile cu descrieri
 * Doar pentru MASTER
 */
router.get('/available-permissions', authMiddleware, masterOnlyMiddleware, (req: AuthenticatedRequest, res) => {
    try {
        res.json(ApiResponseHelper.success({
            permissions: AVAILABLE_PERMISSIONS,
            templates: {
                default: DEFAULT_CONTABIL_PERMISSIONS,
                full: FULL_CONTABIL_PERMISSIONS
            }
        }, 'Lista permisiunilor disponibile'));
        
    } catch (error) {
        console.error('❌ MASTER-ROUTES: Error getting available permissions:', error);
        res.status(500).json(ApiResponseHelper.error('Eroare la obținerea listei de permisiuni'));
    }
});

/**
 * POST /api/master-permissions/contabil/:id/permission/:permission
 * Activează o permisiune specifică pentru un contabil
 * Doar pentru MASTER
 */
router.post('/contabil/:id/permission/:permission', authMiddleware, masterOnlyMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
        const { id, permission } = req.params;
        const masterId = req.user?.IdUtilizatori || req.user?.id;
        
        if (!masterId) {
            res.status(401).json(ApiResponseHelper.error('ID utilizator lipsă'));
            return;
        }
        
        // Validate permission name
        if (!AVAILABLE_PERMISSIONS.hasOwnProperty(permission)) {
            res.status(400).json(ApiResponseHelper.error('Permisiunea specificată nu există'));
            return;
        }
        
        // Get current permissions
        const currentPermissions = await MasterPermissionsService.getContabilPermissions(id);
        if (!currentPermissions) {
            res.status(404).json(ApiResponseHelper.error('Contabilul nu a fost găsit'));
            return;
        }
        
        // Update specific permission
        const updatedPermissions = {
            ...currentPermissions,
            [permission]: true
        };
        
        const result = await MasterPermissionsService.setContabilPermissions(masterId, id, updatedPermissions);
        
        if (result.success) {
            res.json(ApiResponseHelper.success({
                idContabil: id,
                permission,
                enabled: true,
                permissions: updatedPermissions
            }, `Permisiunea ${permission} a fost activată`));
        } else {
            res.status(400).json(ApiResponseHelper.error(result.message));
        }
        
    } catch (error) {
        console.error('❌ MASTER-ROUTES: Error enabling permission:', error);
        res.status(500).json(ApiResponseHelper.error('Eroare la activarea permisiunii'));
    }
});

/**
 * DELETE /api/master-permissions/contabil/:id/permission/:permission
 * Dezactivează o permisiune specifică pentru un contabil
 * Doar pentru MASTER
 */
router.delete('/contabil/:id/permission/:permission', authMiddleware, masterOnlyMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
        const { id, permission } = req.params;
        const masterId = req.user?.IdUtilizatori || req.user?.id;
        
        if (!masterId) {
            res.status(401).json(ApiResponseHelper.error('ID utilizator lipsă'));
            return;
        }
        
        // Validate permission name
        if (!AVAILABLE_PERMISSIONS.hasOwnProperty(permission)) {
            res.status(400).json(ApiResponseHelper.error('Permisiunea specificată nu există'));
            return;
        }
        
        // Get current permissions
        const currentPermissions = await MasterPermissionsService.getContabilPermissions(id);
        if (!currentPermissions) {
            res.status(404).json(ApiResponseHelper.error('Contabilul nu a fost găsit'));
            return;
        }
        
        // Update specific permission
        const updatedPermissions = {
            ...currentPermissions,
            [permission]: false
        };
        
        const result = await MasterPermissionsService.setContabilPermissions(masterId, id, updatedPermissions);
        
        if (result.success) {
            res.json(ApiResponseHelper.success({
                idContabil: id,
                permission,
                enabled: false,
                permissions: updatedPermissions
            }, `Permisiunea ${permission} a fost dezactivată`));
        } else {
            res.status(400).json(ApiResponseHelper.error(result.message));
        }
        
    } catch (error) {
        console.error('❌ MASTER-ROUTES: Error disabling permission:', error);
        res.status(500).json(ApiResponseHelper.error('Eroare la dezactivarea permisiunii'));
    }
});

export default router;
