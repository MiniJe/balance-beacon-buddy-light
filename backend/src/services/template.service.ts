import { getDatabase } from '../config/sqlite';
import { Request, Response } from 'express';

export interface EmailTemplate {
    IdSablon: string;
    NumeSablon: string;
    ContinutSablon: string;
    TipSablon: 'email' | 'pdf';
    CategorieSablon: 'client' | 'furnizor' | 'general' | 'reminder' | 'fise';
    Activ: boolean;
    CreatLa: Date;
    CreatDe: string;
    ModificatLa?: Date;
    ModificatDe?: string;
}

export interface TemplateVariable {
    IdVariabila: string;
    NumeVariabila: string;
    DescriereVariabila: string;
    ValoareDefault?: string;
    TipVariabila: 'text' | 'number' | 'date' | 'currency';
    Obligatorie: boolean;
}

export class EmailTemplateService {
    
    /**
     * Obține toate șabloanele active
     */
    static async getAllTemplates(): Promise<EmailTemplate[]> {
        try {
            const db = await getDatabase();
            const result = await db.all(`
                SELECT 
                    IdSablon,
                    NumeSablon,
                    ContinutSablon,
                    TipSablon,
                    CategorieSablon,
                    Activ,
                    CreatLa,
                    CreatDe,
                    ModificatLa,
                    ModificatDe
                FROM EmailSabloane
                WHERE Activ = 1
                ORDER BY CategorieSablon, NumeSablon
            `);

            return result;
        } catch (error) {
            console.error('❌ Eroare la obținerea șabloanelor:', error);
            throw error;
        }
    }

    /**
     * Obține un șablon după ID
     */
    static async getTemplateById(idSablon: string): Promise<EmailTemplate | null> {
        try {
            const db = await getDatabase();
            const result = await db.get(`
                SELECT 
                    IdSablon,
                    NumeSablon,
                    ContinutSablon,
                    TipSablon,
                    CategorieSablon,
                    Activ,
                    CreatLa,
                    CreatDe,
                    ModificatLa,
                    ModificatDe
                FROM EmailSabloane
                WHERE IdSablon = ? AND Activ = 1
            `, [idSablon]);

            return result || null;
        } catch (error) {
            console.error('❌ Eroare la obținerea șablonului:', error);
            throw error;
        }
    }

    /**
     * Creează un șablon nou
     */
    static async createTemplate(template: Partial<EmailTemplate>): Promise<string> {
        try {
            const db = await getDatabase();
            const idSablon = `TMPL_${Date.now()}`;
            
            await db.run(`
                INSERT INTO EmailSabloane (
                    IdSablon, NumeSablon, ContinutSablon, TipSablon, 
                    CategorieSablon, Activ, CreatLa, CreatDe
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                idSablon,
                template.NumeSablon,
                template.ContinutSablon,
                template.TipSablon,
                template.CategorieSablon,
                template.Activ !== false ? 1 : 0,
                new Date().toISOString(),
                template.CreatDe
            ]);

            console.log(`✅ Șablon creat cu ID: ${idSablon}`);
            return idSablon;
        } catch (error) {
            console.error('❌ Eroare la crearea șablonului:', error);
            throw error;
        }
    }

    /**
     * Actualizează un șablon
     */
    static async updateTemplate(idSablon: string, template: Partial<EmailTemplate>): Promise<void> {
        try {
            const db = await getDatabase();
            
            await db.run(`
                UPDATE EmailSabloane 
                SET NumeSablon = ?, ContinutSablon = ?, TipSablon = ?, 
                    CategorieSablon = ?, Activ = ?, ModificatLa = ?, ModificatDe = ?
                WHERE IdSablon = ?
            `, [
                template.NumeSablon,
                template.ContinutSablon,
                template.TipSablon,
                template.CategorieSablon,
                template.Activ !== false ? 1 : 0,
                new Date().toISOString(),
                template.ModificatDe,
                idSablon
            ]);

            console.log(`✅ Șablon actualizat: ${idSablon}`);
        } catch (error) {
            console.error('❌ Eroare la actualizarea șablonului:', error);
            throw error;
        }
    }

    /**
     * Șterge un șablon (soft delete)
     */
    static async deleteTemplate(idSablon: string): Promise<void> {
        try {
            const db = await getDatabase();
            
            await db.run(`
                UPDATE EmailSabloane 
                SET Activ = 0
                WHERE IdSablon = ?
            `, [idSablon]);

            console.log(`✅ Șablon șters: ${idSablon}`);
        } catch (error) {
            console.error('❌ Eroare la ștergerea șablonului:', error);
            throw error;
        }
    }

    /**
     * Obține variabilele de șablon disponibile
     */
    static async getTemplateVariables(): Promise<TemplateVariable[]> {
        try {
            const db = await getDatabase();
            const result = await db.all(`
                SELECT 
                    IdVariabila,
                    NumeVariabila,
                    DescriereVariabila,
                    ValoareDefault,
                    TipVariabila,
                    Obligatorie
                FROM VariabileSabloane
                WHERE Activa = 1
                ORDER BY NumeVariabila
            `);

            return result;
        } catch (error) {
            console.error('❌ Eroare la obținerea variabilelor:', error);
            throw error;
        }
    }

    /**
     * Procesează un șablon cu datele partenerului
     */
    static async processTemplate(idSablon: string, partnerData: any): Promise<string> {
        try {
            const template = await this.getTemplateById(idSablon);
            if (!template) {
                throw new Error(`Șablonul ${idSablon} nu a fost găsit`);
            }
            let processedContent = template.ContinutSablon;
            const pick = (...vals: any[]) => vals.find(v => v !== undefined && v !== null && String(v).trim() !== '') ?? '';
            const tokenValues: Record<string,string> = {
                'NUME_PARTENER': pick(partnerData.numePartener, partnerData.nume, 'Nume necunoscut'),
                'CUI_PARTENER': pick(partnerData.cuiPartener, partnerData.cui, 'CUI necunoscut'),
                'EMAIL_PARTENER': pick(partnerData.emailPartener, partnerData.email, ''),
                'TELEFON_PARTENER': pick(partnerData.telefonPartener, partnerData.telefon, ''),
                'ADRESA_PARTENER': pick(partnerData.adresaPartener, partnerData.adresa, ''),
                'REPREZENTANT_PARTENER': pick(partnerData.reprezentantPartener, partnerData.reprezentant, ''),
                'DATA_CURENTA': pick(partnerData.dataActuala, new Date().toLocaleDateString('ro-RO')),
                'SOLD_CURENT': pick(partnerData.soldCurent, '0'),
                'MONEDA': pick(partnerData.moneda, 'RON'),
                'PERIOADA_CONFIRMARE': pick(partnerData.perioadaConfirmare, partnerData.dataSold, partnerData.PERIOADA, ''),
                'PERIOADA': pick(partnerData.dataSold, partnerData.perioadaConfirmare, ''),
                'NUME_COMPANIE': pick(partnerData.numeCompanie, process.env.NUME_COMPANIE, 'Compania Noastră'),
                'DATA': pick(partnerData.dataActuala, new Date().toLocaleDateString('ro-RO'))
            };
            for (const [token, value] of Object.entries(tokenValues)) {
                const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const patterns = [
                    new RegExp('\\{' + escaped + '\\}', 'g'),
                    new RegExp('\\[' + escaped + '\\]', 'g')
                ];
                patterns.forEach(rx => processedContent = processedContent.replace(rx, String(value)));
            }
            return processedContent;
        } catch (error) {
            console.error('❌ Eroare la procesarea șablonului:', error);
            throw error;
        }
    }

    /**
     * Obține șabloanele după categorie
     */
    static async getTemplatesByCategory(category: string): Promise<EmailTemplate[]> {
        try {
            const db = await getDatabase();
            const result = await db.all(`
                SELECT 
                    IdSablon,
                    NumeSablon,
                    ContinutSablon,
                    TipSablon,
                    CategorieSablon,
                    Activ,
                    CreatLa,
                    CreatDe,
                    ModificatLa,
                    ModificatDe
                FROM EmailSabloane
                WHERE CategorieSablon = ? AND Activ = 1
                ORDER BY NumeSablon
            `, [category]);

            return result;
        } catch (error) {
            console.error('❌ Eroare la obținerea șabloanelor după categorie:', error);
            throw error;
        }
    }

    /**
     * Caută șabloane după nume
     */
    static async searchTemplates(searchTerm: string): Promise<EmailTemplate[]> {
        try {
            const db = await getDatabase();
            const result = await db.all(`
                SELECT 
                    IdSablon,
                    NumeSablon,
                    ContinutSablon,
                    TipSablon,
                    CategorieSablon,
                    Activ,
                    CreatLa,
                    CreatDe,
                    ModificatLa,
                    ModificatDe
                FROM EmailSabloane
                WHERE (NumeSablon LIKE ? OR ContinutSablon LIKE ?) 
                AND Activ = 1
                ORDER BY NumeSablon
            `, [`%${searchTerm}%`, `%${searchTerm}%`]);

            return result;
        } catch (error) {
            console.error('❌ Eroare la căutarea șabloanelor:', error);
            throw error;
        }
    }

    /**
     * Obține statistici despre utilizarea șabloanelor
     */
    static async getTemplateUsageStats(): Promise<any[]> {
        try {
            const db = await getDatabase();
            const result = await db.all(`
                SELECT 
                    t.IdSablon,
                    t.NumeSablon,
                    t.CategorieSablon,
                    COUNT(j.IdJurnalEmail) as NumarUtilizari,
                    MAX(j.DataTrimitere) as UltimaUtilizare
                FROM EmailSabloane t
                LEFT JOIN JurnalEmail j ON t.IdSablon = j.IdSablon
                WHERE t.Activ = 1
                GROUP BY t.IdSablon, t.NumeSablon, t.CategorieSablon
                ORDER BY NumarUtilizari DESC, t.NumeSablon
            `);

            return result;
        } catch (error) {
            console.error('❌ Eroare la obținerea statisticilor de utilizare:', error);
            throw error;
        }
    }
}

export class EmailTemplateController {
    
    /**
     * GET /api/templates
     */
    async getAllTemplates(req: Request, res: Response): Promise<void> {
        try {
            const templates = await EmailTemplateService.getAllTemplates();
            res.json({
                success: true,
                data: templates,
                count: templates.length
            });
        } catch (error) {
            console.error('❌ Eroare controller getAllTemplates:', error);
            res.status(500).json({
                success: false,
                error: 'Eroare la obținerea șabloanelor'
            });
        }
    }

    /**
     * GET /api/templates/:id
     */
    async getTemplateById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const template = await EmailTemplateService.getTemplateById(id);
            
            if (!template) {
                res.status(404).json({
                    success: false,
                    error: 'Șablonul nu a fost găsit'
                });
                return;
            }

            res.json({
                success: true,
                data: template
            });
        } catch (error) {
            console.error('❌ Eroare controller getTemplateById:', error);
            res.status(500).json({
                success: false,
                error: 'Eroare la obținerea șablonului'
            });
        }
    }

    /**
     * POST /api/templates
     */
    async createTemplate(req: Request, res: Response): Promise<void> {
        try {
            const template = req.body;
            const idSablon = await EmailTemplateService.createTemplate(template);
            
            res.status(201).json({
                success: true,
                data: { idSablon },
                message: 'Șablon creat cu succes'
            });
        } catch (error) {
            console.error('❌ Eroare controller createTemplate:', error);
            res.status(500).json({
                success: false,
                error: 'Eroare la crearea șablonului'
            });
        }
    }

    /**
     * PUT /api/templates/:id
     */
    async updateTemplate(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const template = req.body;
            
            await EmailTemplateService.updateTemplate(id, template);
            
            res.json({
                success: true,
                message: 'Șablon actualizat cu succes'
            });
        } catch (error) {
            console.error('❌ Eroare controller updateTemplate:', error);
            res.status(500).json({
                success: false,
                error: 'Eroare la actualizarea șablonului'
            });
        }
    }

    /**
     * DELETE /api/templates/:id
     */
    async deleteTemplate(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            
            await EmailTemplateService.deleteTemplate(id);
            
            res.json({
                success: true,
                message: 'Șablon șters cu succes'
            });
        } catch (error) {
            console.error('❌ Eroare controller deleteTemplate:', error);
            res.status(500).json({
                success: false,
                error: 'Eroare la ștergerea șablonului'
            });
        }
    }

    /**
     * GET /api/templates/variables
     */
    async getTemplateVariables(req: Request, res: Response): Promise<void> {
        try {
            const variables = await EmailTemplateService.getTemplateVariables();
            res.json({
                success: true,
                data: variables
            });
        } catch (error) {
            console.error('❌ Eroare controller getTemplateVariables:', error);
            res.status(500).json({
                success: false,
                error: 'Eroare la obținerea variabilelor'
            });
        }
    }

    /**
     * POST /api/templates/:id/process
     */
    async processTemplate(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const partnerData = req.body;
            
            const processedContent = await EmailTemplateService.processTemplate(id, partnerData);
            
            res.json({
                success: true,
                data: { processedContent }
            });
        } catch (error) {
            console.error('❌ Eroare controller processTemplate:', error);
            res.status(500).json({
                success: false,
                error: 'Eroare la procesarea șablonului'
            });
        }
    }

    /**
     * GET /api/templates/category/:category
     */
    async getTemplatesByCategory(req: Request, res: Response): Promise<void> {
        try {
            const { category } = req.params;
            const templates = await EmailTemplateService.getTemplatesByCategory(category);
            
            res.json({
                success: true,
                data: templates,
                count: templates.length
            });
        } catch (error) {
            console.error('❌ Eroare controller getTemplatesByCategory:', error);
            res.status(500).json({
                success: false,
                error: 'Eroare la obținerea șablonelor după categorie'
            });
        }
    }

    /**
     * GET /api/templates/search?q=term
     */
    async searchTemplates(req: Request, res: Response): Promise<void> {
        try {
            const { q } = req.query;
            if (!q) {
                res.status(400).json({
                    success: false,
                    error: 'Termenul de căutare este obligatoriu'
                });
                return;
            }

            const templates = await EmailTemplateService.searchTemplates(q as string);
            
            res.json({
                success: true,
                data: templates,
                count: templates.length
            });
        } catch (error) {
            console.error('❌ Eroare controller searchTemplates:', error);
            res.status(500).json({
                success: false,
                error: 'Eroare la căutarea șablonelor'
            });
        }
    }

    /**
     * GET /api/templates/stats/usage
     */
    async getUsageStats(req: Request, res: Response): Promise<void> {
        try {
            const stats = await EmailTemplateService.getTemplateUsageStats();
            
            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            console.error('❌ Eroare controller getUsageStats:', error);
            res.status(500).json({
                success: false,
                error: 'Eroare la obținerea statisticilor'
            });
        }
    }
}

export const emailTemplateController = new EmailTemplateController();
