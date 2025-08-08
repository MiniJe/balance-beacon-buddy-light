import { Request, Response } from 'express';
import { pool } from '../config/azure';
import { ApiResponseHelper } from '../types/api.types';

export class DatabaseController {
    
    // Lista toate tabelele din baza de date
    async getTables(req: Request, res: Response): Promise<void> {
        try {
            const result = await pool.request()
                .query(`
                    SELECT TABLE_NAME 
                    FROM INFORMATION_SCHEMA.TABLES 
                    WHERE TABLE_TYPE = 'BASE TABLE'
                    ORDER BY TABLE_NAME
                `);
                
            const tables = result.recordset.map(row => row.TABLE_NAME);
            
            const response = ApiResponseHelper.success(
                { tables, count: tables.length },
                `S-au găsit ${tables.length} tabele în baza de date`
            );
            res.json(response);
            
        } catch (error) {
            console.error('Eroare la obținerea tabelelor:', error);
            const errorResponse = ApiResponseHelper.error(
                'Eroare la obținerea tabelelor',
                'DB_TABLES_FETCH_ERROR',
                error instanceof Error ? error.message : 'Eroare necunoscută'
            );
            res.status(500).json(errorResponse);
        }
    }
    
    // Obține setările de email
    async getEmailSettings(req: Request, res: Response): Promise<void> {
        try {
            // Încearcă mai multe variante de nume pentru tabelul de email
            const possibleTableNames = [
                'SetariEmail',
                'EmailSettings', 
                'ConfigEmail',
                'EmailConfig',
                'MailSettings'
            ];
            
            let emailSettings: any[] | null = null;
            let tableName: string | null = null;
            
            for (const table of possibleTableNames) {
                try {
                    const result = await pool.request()
                        .query(`SELECT * FROM ${table}`);
                    
                    if (result.recordset.length > 0) {
                        emailSettings = result.recordset;
                        tableName = table;
                        break;
                    }
                } catch (error) {
                    // Tabelul nu există, continuă cu următorul
                    continue;
                }
            }
            
            if (emailSettings && tableName) {
                const response = ApiResponseHelper.success(
                    { 
                        tableName,
                        settings: emailSettings,
                        count: emailSettings.length
                    },
                    `Setări de email găsite în tabelul ${tableName}`
                );
                res.json(response);
            } else {
                const response = ApiResponseHelper.error(
                    'Nu s-au găsit setări de email în niciun tabel',
                    'EMAIL_SETTINGS_NOT_FOUND',
                    `Tabele căutate: ${possibleTableNames.join(', ')}`
                );
                res.status(404).json(response);
            }
            
        } catch (error) {
            console.error('Eroare la obținerea setărilor de email:', error);
            const errorResponse = ApiResponseHelper.error(
                'Eroare la obținerea setărilor de email',
                'EMAIL_SETTINGS_FETCH_ERROR',
                error instanceof Error ? error.message : 'Eroare necunoscută'
            );
            res.status(500).json(errorResponse);
        }
    }
    
    // Obține setările companiei
    async getCompanySettings(req: Request, res: Response): Promise<void> {
        try {
            const result = await pool.request()
                .query(`SELECT * FROM SetariCompanie`);
            
            if (result.recordset.length > 0) {
                const response = ApiResponseHelper.success(
                    { settings: result.recordset[0] },
                    'Setări companie obținute cu succes'
                );
                res.json(response);
            } else {
                const defaultSettings = {
                    NumeCompanie: "",
                    CUICompanie: "",
                    ONRCCompanie: "",
                    AdresaCompanie: "",
                    EmailCompanie: "",
                    TelefonCompanie: "",
                    ContBancarCompanie: "",
                    BancaCompanie: "",
                    CaleLogoCompanie: ""
                };
                
                const response = ApiResponseHelper.success(
                    { settings: defaultSettings },
                    'Nu s-au găsit setări pentru companie - returnez valori implicite'
                );
                res.json(response);
            }
            
        } catch (error) {
            console.error('Eroare la obținerea setărilor companiei:', error);
            const errorResponse = ApiResponseHelper.error(
                'Eroare la obținerea setărilor companiei',
                'COMPANY_SETTINGS_FETCH_ERROR',
                error instanceof Error ? error.message : 'Eroare necunoscută'
            );
            res.status(500).json(errorResponse);
        }
    }
    // Salvează setările companiei
    async saveCompanySettings(req: Request, res: Response): Promise<void> {
        try {
            const { 
                NumeCompanie, 
                CUICompanie,
                ONRCCompanie,
                AdresaCompanie,
                EmailCompanie, 
                TelefonCompanie, 
                ContBancarCompanie,
                BancaCompanie,
                CaleLogoCompanie 
            } = req.body;
            
            console.log("Date primite pentru salvare setări companie:", req.body);
            
            // Validări de bază
            if (!NumeCompanie || NumeCompanie.trim() === '') {
                res.status(400).json({
                    success: false,
                    message: 'Numele companiei este obligatoriu'
                });
                return;
            }
            
            if (!CUICompanie || CUICompanie.trim() === '') {
                res.status(400).json({
                    success: false,
                    message: 'CUI-ul companiei este obligatoriu'
                });
                return;
            }
            
            // Verifică dacă există deja setări
            const checkResult = await pool.request()
                .query(`SELECT COUNT(*) as count FROM SetariCompanie`);
            
            if (checkResult.recordset[0].count > 0) {
                console.log("Actualizez setările existente pentru companie");
                
                // Update existing settings cu numele reale de coloane
                await pool.request()
                    .input('NumeCompanie', NumeCompanie)
                    .input('CUICompanie', CUICompanie)
                    .input('ONRCCompanie', ONRCCompanie || null)
                    .input('AdresaCompanie', AdresaCompanie || null)
                    .input('EmailCompanie', EmailCompanie || null)
                    .input('TelefonCompanie', TelefonCompanie || null)
                    .input('ContBancarCompanie', ContBancarCompanie || null)
                    .input('BancaCompanie', BancaCompanie || null)
                    .input('CaleLogoCompanie', CaleLogoCompanie || null)
                    .query(`
                        UPDATE SetariCompanie
                        SET 
                            NumeCompanie = @NumeCompanie,
                            CUICompanie = @CUICompanie,
                            ONRCCompanie = @ONRCCompanie,
                            AdresaCompanie = @AdresaCompanie,
                            EmailCompanie = @EmailCompanie,
                            TelefonCompanie = @TelefonCompanie,
                            ContBancarCompanie = @ContBancarCompanie,
                            BancaCompanie = @BancaCompanie,
                            CaleLogoCompanie = @CaleLogoCompanie,
                            DataModificareCompanie = GETDATE()
                    `);
            } else {
                console.log("Inserez setări noi pentru companie");
                
                // Insert new settings cu numele reale de coloane
                await pool.request()
                    .input('IdCompanie', require('uuid').v4())
                    .input('NumeCompanie', NumeCompanie)
                    .input('CUICompanie', CUICompanie)
                    .input('ONRCCompanie', ONRCCompanie || null)
                    .input('AdresaCompanie', AdresaCompanie || null)
                    .input('EmailCompanie', EmailCompanie || null)
                    .input('TelefonCompanie', TelefonCompanie || null)
                    .input('ContBancarCompanie', ContBancarCompanie || null)
                    .input('BancaCompanie', BancaCompanie || null)
                    .input('CaleLogoCompanie', CaleLogoCompanie || null)
                    .query(`
                        INSERT INTO SetariCompanie (
                            IdCompanie,
                            NumeCompanie, 
                            CUICompanie, 
                            ONRCCompanie,
                            AdresaCompanie,
                            EmailCompanie, 
                            TelefonCompanie, 
                            ContBancarCompanie,
                            BancaCompanie,
                            CaleLogoCompanie,
                            DataCreareCompanie,
                            DataModificareCompanie
                        ) VALUES (
                            @IdCompanie,
                            @NumeCompanie,
                            @CUICompanie,
                            @ONRCCompanie,
                            @AdresaCompanie,
                            @EmailCompanie,
                            @TelefonCompanie,
                            @ContBancarCompanie,
                            @BancaCompanie,
                            @CaleLogoCompanie,
                            GETDATE(),
                            GETDATE()
                        )
                    `);
            }
            
            res.json({
                success: true,
                message: 'Setările companiei au fost salvate cu succes'
            });
            
        } catch (error) {
            console.error('Eroare la salvarea setărilor companiei:', error);
            res.status(500).json({
                success: false,
                message: 'Eroare la salvarea setărilor companiei',
                error: error instanceof Error ? error.message : 'Eroare necunoscută'
            });
        }
    }
}

export default DatabaseController;
