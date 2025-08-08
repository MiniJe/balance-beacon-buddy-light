import { getDatabase } from '../config/sqlite';

export interface CompanySettings {
    IdCompanie?: string;
    NumeCompanie: string;
    CUICompanie?: string;
    ONRCCompanie?: string;
    AdresaCompanie?: string;
    EmailCompanie?: string;
    TelefonCompanie?: string;
    ContBancarCompanie?: string;
    BancaCompanie?: string;
    CaleLogoCompanie?: string;
    DataCreareCompanie?: string;
    DataModificareCompanie?: string;
}

export class CompanySettingsService {
    
    /**
     * Obține setările companiei din SQLite
     */
    async getCompanySettings(): Promise<CompanySettings | null> {
        try {
            console.log('📊 Service: Se încarcă setările companiei din SQLite...');
            
            const db = await getDatabase();
            const query = `
                SELECT 
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
                FROM SetariCompanie 
                LIMIT 1
            `;

            const row = await db.get(query);
            
            if (row) {
                console.log('✅ Service: Setări companie găsite:', row.NumeCompanie);
                return row;
            } else {
                console.log('⚠️ Service: Nu s-au găsit setări companie în SQLite');
                return null;
            }

        } catch (error) {
            console.error('❌ Service: Eroare la încărcarea setărilor companiei:', error);
            throw error;
        }
    }

    /**
     * Actualizează setările companiei în SQLite
     */
    async updateCompanySettings(settings: Omit<CompanySettings, 'IdCompanie' | 'DataCreareCompanie' | 'DataModificareCompanie'>): Promise<CompanySettings> {
        try {
            console.log('📊 Service: Se actualizează setările companiei în SQLite...');

            const db = await getDatabase();
            
            // Verifică dacă există deja o înregistrare
            const existingSettings = await this.checkIfSettingsExist();

            let query: string;
            const params = [
                settings.NumeCompanie,
                settings.CUICompanie || null,
                settings.ONRCCompanie || null,
                settings.AdresaCompanie || null,
                settings.EmailCompanie || null,
                settings.TelefonCompanie || null,
                settings.ContBancarCompanie || null,
                settings.BancaCompanie || null,
                settings.CaleLogoCompanie || null
            ];

            if (existingSettings) {
                query = `
                    UPDATE SetariCompanie 
                    SET 
                        NumeCompanie = ?,
                        CUICompanie = ?,
                        ONRCCompanie = ?,
                        AdresaCompanie = ?,
                        EmailCompanie = ?,
                        TelefonCompanie = ?,
                        ContBancarCompanie = ?,
                        BancaCompanie = ?,
                        CaleLogoCompanie = ?,
                        DataModificareCompanie = datetime('now')
                    WHERE IdCompanie IS NOT NULL
                `;
            } else {
                // Pentru SQLite, folosim un ID simplu
                const newId = this.generateUUID();
                query = `
                    INSERT INTO SetariCompanie (
                        IdCompanie, NumeCompanie, CUICompanie, ONRCCompanie, AdresaCompanie, EmailCompanie, 
                        TelefonCompanie, ContBancarCompanie, BancaCompanie, CaleLogoCompanie, 
                        DataCreareCompanie, DataModificareCompanie
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                `;
                params.unshift(newId); // Adaugă ID-ul la început
            }

            await db.run(query, params);

            console.log('✅ Service: Setările companiei au fost actualizate cu succes în SQLite');
            
            // Returnează setările actualizate
            const updatedSettings = await this.getCompanySettings();
            return updatedSettings || {
                NumeCompanie: settings.NumeCompanie,
                CUICompanie: settings.CUICompanie,
                ONRCCompanie: settings.ONRCCompanie,
                AdresaCompanie: settings.AdresaCompanie,
                EmailCompanie: settings.EmailCompanie,
                TelefonCompanie: settings.TelefonCompanie,
                ContBancarCompanie: settings.ContBancarCompanie,
                BancaCompanie: settings.BancaCompanie,
                CaleLogoCompanie: settings.CaleLogoCompanie
            };

        } catch (error) {
            console.error('❌ Service: Eroare la actualizarea setărilor companiei:', error);
            throw error;
        }
    }

    /**
     * Verifică dacă există setări în baza de date
     */
    private async checkIfSettingsExist(): Promise<boolean> {
        try {
            const db = await getDatabase();
            const query = 'SELECT COUNT(*) as count FROM SetariCompanie';
            
            const row = await db.get(query);
            return row && row.count > 0;

        } catch (error) {
            console.error('❌ Service: Eroare la verificarea existenței setărilor companiei:', error);
            return false;
        }
    }

    /**
     * Generează un UUID simplu pentru SQLite
     */
    private generateUUID(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Inițializează tabela SetariCompanie dacă nu există
     */
    async initializeCompanySettingsTable(): Promise<void> {
        try {
            console.log('📊 Service: Se inițializează tabela SetariCompanie...');

            const db = await getDatabase();
            
            // Verifică dacă tabela există deja
            const tableExistsQuery = `
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name='SetariCompanie'
            `;
            
            const tableExists = await db.get(tableExistsQuery);
            
            if (!tableExists) {
                const createTableQuery = `
                    CREATE TABLE SetariCompanie (
                        IdCompanie TEXT PRIMARY KEY,
                        NumeCompanie TEXT NOT NULL,
                        CUICompanie TEXT,
                        ONRCCompanie TEXT,
                        AdresaCompanie TEXT,
                        EmailCompanie TEXT,
                        TelefonCompanie TEXT,
                        ContBancarCompanie TEXT,
                        BancaCompanie TEXT,
                        CaleLogoCompanie TEXT,
                        DataCreareCompanie DATETIME DEFAULT CURRENT_TIMESTAMP,
                        DataModificareCompanie DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `;

                await db.exec(createTableQuery);
                console.log('✅ Service: Tabela SetariCompanie a fost creată cu succes');
            } else {
                console.log('✅ Service: Tabela SetariCompanie există deja');
            }

        } catch (error) {
            console.error('❌ Service: Eroare la inițializarea tabelei SetariCompanie:', error);
            throw error;
        }
    }
}

// Exportăm instanța serviciului
export const companySettingsService = new CompanySettingsService();
