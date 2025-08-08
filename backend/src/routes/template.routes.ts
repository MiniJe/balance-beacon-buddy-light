import { Router } from 'express';
import { TemplateController } from '../controllers/template.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Middleware de autentificare pentru toate rutele
router.use(authMiddleware);

// GET /api/templates - Obține toate șabloanele
router.get('/', TemplateController.getAllTemplates);

// GET /api/templates/variables - Obține variabilele disponibile
router.get('/variables', TemplateController.getTemplateVariables);

// GET /api/templates/category/:category - Obține șabloane după categorie
router.get('/category/:category', TemplateController.getTemplatesByCategory);

// GET /api/templates/:id - Obține un șablon după ID
router.get('/:id', TemplateController.getTemplateById);

// POST /api/templates - Creează un șablon nou
router.post('/', TemplateController.createTemplate);

// POST /api/templates/preview - Preview șablon cu date
router.post('/preview', TemplateController.previewTemplate);

// POST /api/templates/:id/process - Procesează un șablon cu date
router.post('/:id/process', TemplateController.processTemplate);

// PUT /api/templates/:id - Actualizează un șablon
router.put('/:id', TemplateController.updateTemplate);

// DELETE /api/templates/:id - Șterge un șablon
router.delete('/:id', TemplateController.deleteTemplate);

export default router;
