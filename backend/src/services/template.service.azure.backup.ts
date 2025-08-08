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
            const idSablon = require('crypto').randomUUID();
            
            await pool.request()
                .input('IdSablon', idSablon)
                .input('NumeSablon', template.NumeSablon)
                .input('ContinutSablon', template.ContinutSablon)
                .input('TipSablon', template.TipSablon)
                .input('CategorieSablon', template.CategorieSablon)
                .input('CreatDe', template.CreatDe || 'SYSTEM')
                .query(`
                    INSERT INTO EmailSabloane (
                        IdSablon, NumeSablon, ContinutSablon, TipSablon, 
                        CategorieSablon, Activ, CreatLa, CreatDe
                    ) VALUES (
                        @IdSablon, @NumeSablon, @ContinutSablon, @TipSablon,
                        @CategorieSablon, 1, GETDATE(), @CreatDe
                    )
                `);

            return idSablon;
        } catch (error) {
            console.error('❌ Eroare la crearea șablonului:', error);
            throw error;
        }
    }

    /**
     * Actualizează un șablon existent
     */
    static async updateTemplate(idSablon: string, template: Partial<EmailTemplate>): Promise<void> {
        try {
            await pool.request()
                .input('IdSablon', idSablon)
                .input('NumeSablon', template.NumeSablon)
                .input('ContinutSablon', template.ContinutSablon)
                .input('TipSablon', template.TipSablon)
                .input('CategorieSablon', template.CategorieSablon)
                .input('ModificatDe', template.ModificatDe || 'SYSTEM')
                .query(`
                    UPDATE EmailSabloane 
                    SET 
                        NumeSablon = @NumeSablon,
                        ContinutSablon = @ContinutSablon,
                        TipSablon = @TipSablon,
                        CategorieSablon = @CategorieSablon,
                        ModificatLa = GETDATE(),
                        ModificatDe = @ModificatDe
                    WHERE IdSablon = @IdSablon AND Activ = 1
                `);
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
            await pool.request()
                .input('IdSablon', idSablon)
                .query(`
                    UPDATE EmailSabloane 
                    SET Activ = 0, ModificatLa = GETDATE()
                    WHERE IdSablon = @IdSablon
                `);
        } catch (error) {
            console.error('❌ Eroare la ștergerea șablonului:', error);
            throw error;
        }
    }

    /**
     * Obține variabilele disponibile pentru șabloane (hard-coded)
     */
    static async getTemplateVariables(): Promise<TemplateVariable[]> {
        try {
            // Returnează variabilele hard-codate care corespund cu cele din processTemplate
            const variables: TemplateVariable[] = [
                {
                    IdVariabila: '1',
                    NumeVariabila: '[NUME_PARTENER]',
                    DescriereVariabila: 'Numele partenerului',
                    ValoareDefault: '',
                    TipVariabila: 'text',
                    Obligatorie: true
                },
                {
                    IdVariabila: '2',
                    NumeVariabila: '[CUI_PARTENER]',
                    DescriereVariabila: 'CUI-ul partenerului',
                    ValoareDefault: '',
                    TipVariabila: 'text',
                    Obligatorie: false
                },
                {
                    IdVariabila: '3',
                    NumeVariabila: '[DATA]',
                    DescriereVariabila: 'Data curentă',
                    ValoareDefault: new Date().toLocaleDateString('ro-RO'),
                    TipVariabila: 'date',
                    Obligatorie: false
                },
                {
                    IdVariabila: '4',
                    NumeVariabila: '[NUME_COMPANIE]',
                    DescriereVariabila: 'Numele companiei',
                    ValoareDefault: 'DUCFARM S.R.L.',
                    TipVariabila: 'text',
                    Obligatorie: false
                },
                {
                    IdVariabila: '5',
                    NumeVariabila: '[DATA_TRIMITERE]',
                    DescriereVariabila: 'Data trimiterii documentului',
                    ValoareDefault: new Date().toLocaleDateString('ro-RO'),
                    TipVariabila: 'date',
                    Obligatorie: false
                },
                {
                    IdVariabila: '6',
                    NumeVariabila: '[PERIOADA]',
                    DescriereVariabila: 'Perioada pentru care se solicită confirmarea de sold',
                    ValoareDefault: '',
                    TipVariabila: 'date',
                    Obligatorie: true
                },
                {
                    IdVariabila: '7',
                    NumeVariabila: '[REPREZENTANT_PARTENER]',
                    DescriereVariabila: 'Numele reprezentantului partenerului',
                    ValoareDefault: '',
                    TipVariabila: 'text',
                    Obligatorie: false
                },
                {
                    IdVariabila: '8',
                    NumeVariabila: '[OBSERVATII]',
                    DescriereVariabila: 'Observații suplimentare',
                    ValoareDefault: '',
                    TipVariabila: 'text',
                    Obligatorie: false
                },
                {
                    IdVariabila: '9',
                    NumeVariabila: '[ADRESA_PARTENER]',
                    DescriereVariabila: 'Adresa partenerului',
                    ValoareDefault: '',
                    TipVariabila: 'text',
                    Obligatorie: false
                },
                {
                    IdVariabila: '10',
                    NumeVariabila: '[TELEFON_PARTENER]',
                    DescriereVariabila: 'Numărul de telefon al partenerului',
                    ValoareDefault: '',
                    TipVariabila: 'text',
                    Obligatorie: false
                },
                {
                    IdVariabila: '11',
                    NumeVariabila: '[EMAIL_PARTENER]',
                    DescriereVariabila: 'Adresa de email a partenerului',
                    ValoareDefault: '',
                    TipVariabila: 'text',
                    Obligatorie: false
                },
                {
                    IdVariabila: '12',
                    NumeVariabila: '[NUMĂR_ORDINE]',
                    DescriereVariabila: 'Numărul de ordine din documentele emise',
                    ValoareDefault: '',
                    TipVariabila: 'number',
                    Obligatorie: false
                }
            ];

            return variables;
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
                throw new Error('Șablonul nu a fost găsit');
            }

            let processedContent = template.ContinutSablon;

            // Înlocuiește variabilele cu datele reale
            const replacements: { [key: string]: string } = {
                '[NUME_PARTENER]': partnerData.numePartener || '',
                '[CUI_PARTENER]': partnerData.cuiPartener || '',
                '[DATA]': partnerData.data || new Date().toLocaleDateString('ro-RO'),
                '[NUME_COMPANIE]': partnerData.numeCompanie || 'DUCFARM S.R.L.',
                '[DATA_TRIMITERE]': partnerData.dataTrimitere || new Date().toLocaleDateString('ro-RO'),
                '[PERIOADA]': partnerData.dataSold || partnerData.perioada || '',
                '[REPREZENTANT_PARTENER]': partnerData.reprezentantPartener || '',
                '[OBSERVATII]': partnerData.observatii || '',
                '[ADRESA_PARTENER]': partnerData.adresaPartener || '',
                '[TELEFON_PARTENER]': partnerData.telefonPartener || '',
                '[EMAIL_PARTENER]': partnerData.emailPartener || '',
                '[NUMĂR_ORDINE]': partnerData.numarOrdine || partnerData.orderNumber || ''
            };

            // Aplică înlocuirile
            Object.keys(replacements).forEach(variable => {
                const regex = new RegExp(variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
                processedContent = processedContent.replace(regex, replacements[variable]);
            });

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
            const result = await pool.request()
                .input('Categorie', category)
                .query(`
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
                    WHERE CategorieSablon = @Categorie AND Activ = 1
                    ORDER BY NumeSablon
                `);

            return result.recordset;
        } catch (error) {
            console.error('❌ Eroare la obținerea șabloanelor după categorie:', error);
            throw error;
        }
    }
}

export const templateService = new EmailTemplateService();
