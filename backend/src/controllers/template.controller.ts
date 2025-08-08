import { Request, Response } from 'express';
import { EmailTemplateService } from '../services/template.service';

export class TemplateController {
    
    /**
     * GET /api/templates - Obține toate șabloanele
     */
    static async getAllTemplates(req: Request, res: Response): Promise<void> {
        try {
            const templates = await EmailTemplateService.getAllTemplates();
            
            res.json({
                success: true,
                data: templates,
                message: 'Șabloane obținute cu succes'
            });
        } catch (error: any) {
            console.error('❌ Eroare la obținerea șabloanelor:', error);
            res.status(500).json({
                success: false,
                message: 'Eroare la obținerea șabloanelor',
                error: error.message
            });
        }
    }

    /**
     * GET /api/templates/:id - Obține un șablon după ID
     */
    static async getTemplateById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const template = await EmailTemplateService.getTemplateById(id);
            
            if (!template) {
                res.status(404).json({
                    success: false,
                    message: 'Șablonul nu a fost găsit'
                });
                return;
            }

            res.json({
                success: true,
                data: template,
                message: 'Șablon obținut cu succes'
            });
        } catch (error: any) {
            console.error('❌ Eroare la obținerea șablonului:', error);
            res.status(500).json({
                success: false,
                message: 'Eroare la obținerea șablonului',
                error: error.message
            });
        }
    }

    /**
     * POST /api/templates - Creează un șablon nou
     */
    static async createTemplate(req: Request, res: Response): Promise<void> {
        try {
            const templateData = req.body;
            
            // Validare
            if (!templateData.NumeSablon || !templateData.ContinutSablon) {
                res.status(400).json({
                    success: false,
                    message: 'Numele și conținutul șablonului sunt obligatorii'
                });
                return;
            }

            const idSablon = await EmailTemplateService.createTemplate({
                ...templateData,
                CreatDe: (req as any).user?.email || 'SYSTEM'
            });

            res.status(201).json({
                success: true,
                data: { IdSablon: idSablon },
                message: 'Șablon creat cu succes'
            });
        } catch (error: any) {
            console.error('❌ Eroare la crearea șablonului:', error);
            res.status(500).json({
                success: false,
                message: 'Eroare la crearea șablonului',
                error: error.message
            });
        }
    }

    /**
     * PUT /api/templates/:id - Actualizează un șablon
     */
    static async updateTemplate(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const templateData = req.body;

            await EmailTemplateService.updateTemplate(id, {
                ...templateData,
                ModificatDe: (req as any).user?.email || 'SYSTEM'
            });

            res.json({
                success: true,
                message: 'Șablon actualizat cu succes'
            });
        } catch (error: any) {
            console.error('❌ Eroare la actualizarea șablonului:', error);
            res.status(500).json({
                success: false,
                message: 'Eroare la actualizarea șablonului',
                error: error.message
            });
        }
    }

    /**
     * DELETE /api/templates/:id - Șterge un șablon
     */
    static async deleteTemplate(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            
            await EmailTemplateService.deleteTemplate(id);

            res.json({
                success: true,
                message: 'Șablon șters cu succes'
            });
        } catch (error: any) {
            console.error('❌ Eroare la ștergerea șablonului:', error);
            res.status(500).json({
                success: false,
                message: 'Eroare la ștergerea șablonului',
                error: error.message
            });
        }
    }

    /**
     * GET /api/templates/variables - Obține variabilele disponibile
     */
    static async getTemplateVariables(req: Request, res: Response): Promise<void> {
        try {
            const variables = await EmailTemplateService.getTemplateVariables();
            
            res.json({
                success: true,
                data: variables,
                message: 'Variabile obținute cu succes'
            });
        } catch (error: any) {
            console.error('❌ Eroare la obținerea variabilelor:', error);
            res.status(500).json({
                success: false,
                message: 'Eroare la obținerea variabilelor',
                error: error.message
            });
        }
    }

    /**
     * GET /api/templates/category/:category - Obține șabloane după categorie
     */
    static async getTemplatesByCategory(req: Request, res: Response): Promise<void> {
        try {
            const { category } = req.params;
            const templates = await EmailTemplateService.getTemplatesByCategory(category);
            
            res.json({
                success: true,
                data: templates,
                message: `Șabloane din categoria ${category} obținute cu succes`
            });
        } catch (error: any) {
            console.error('❌ Eroare la obținerea șabloanelor după categorie:', error);
            res.status(500).json({
                success: false,
                message: 'Eroare la obținerea șabloanelor după categorie',
                error: error.message
            });
        }
    }

    /**
     * POST /api/templates/:id/process - Procesează un șablon cu date
     */
    static async processTemplate(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const partnerData = req.body;
            
            const processedContent = await EmailTemplateService.processTemplate(id, partnerData);
            
            res.json({
                success: true,
                data: { processedContent },
                message: 'Șablon procesat cu succes'
            });
        } catch (error: any) {
            console.error('❌ Eroare la procesarea șablonului:', error);
            res.status(500).json({
                success: false,
                message: 'Eroare la procesarea șablonului',
                error: error.message
            });
        }
    }

    /**
     * POST /api/templates/preview - Preview șablon cu date
     */
    static async previewTemplate(req: Request, res: Response): Promise<void> {
        try {
            const { content, partnerData } = req.body;
            
            let processedContent = content;

            // Înlocuiește variabilele cu datele reale pentru preview
            const replacements: { [key: string]: string } = {
                '[NUME_PARTENER]': partnerData?.numePartener || 'PARTENER EXEMPLU SRL',
                '[CUI_PARTENER]': partnerData?.cuiPartener || 'RO12345678',
                '[DATA]': partnerData?.data || new Date().toLocaleDateString('ro-RO'),
                '[NUME_COMPANIE]': partnerData?.numeCompanie || 'DUCFARM S.R.L.',
                '[DATA_TRIMITERE]': partnerData?.dataTrimitere || new Date().toLocaleDateString('ro-RO'),
                '[PERIOADA]': partnerData?.perioada || 'Decembrie 2024',
                '[OBSERVATII]': partnerData?.observatii || 'Fără observații',
                '[ADRESA_PARTENER]': partnerData?.adresaPartener || 'Str. Exemplu Nr. 123, București',
                '[TELEFON_PARTENER]': partnerData?.telefonPartener || '0721-123-456',
                '[EMAIL_PARTENER]': partnerData?.emailPartener || 'contact@exemplu.ro'
            };

            // Aplică înlocuirile
            Object.keys(replacements).forEach(variable => {
                const regex = new RegExp(variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
                processedContent = processedContent.replace(regex, replacements[variable]);
            });

            res.json({
                success: true,
                data: processedContent,
                message: 'Preview generat cu succes'
            });
        } catch (error: any) {
            console.error('❌ Eroare la generarea preview-ului:', error);
            res.status(500).json({
                success: false,
                message: 'Eroare la generarea preview-ului',
                error: error.message
            });
        }
    }
}
