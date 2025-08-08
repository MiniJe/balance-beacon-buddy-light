import { Database } from 'sqlite3';
import { promises as fs } from 'fs';
import path from 'path';
import { getDatabase } from '../config/sqlite';

export interface FolderSettings {
    sabloanePath: string;
    cereriConfirmarePath: string;
    backupPath: string;
    cereriSemnatePath: string;
    logosPath: string;
}

export interface FolderTestResult {
    success: boolean;
    message: string;
    details?: {
        exists: boolean;
        readable: boolean;
        writable: boolean;
        absolutePath: string;
    };
}

export class FolderSettingsService {
    private defaultSettings: FolderSettings = {
        sabloanePath: 'C:\\BalanceBeaconBuddy\\Sabloane',
        cereriConfirmarePath: 'C:\\BalanceBeaconBuddy\\CereriGenerate',
        backupPath: 'C:\\BalanceBeaconBuddy\\Backup',
        cereriSemnatePath: 'C:\\BalanceBeaconBuddy\\CereriSemnate',
        logosPath: 'C:\\BalanceBeaconBuddy\\Logos'
    };

    /**
     * Obține setările de foldere din baza de date
     */
    async getFolderSettings(): Promise<FolderSettings> {
        try {
            console.log('📂 Service: Se încarcă setările de foldere din baza de date...');

            const db = await getDatabase();
            const query = `
                SELECT 
                    SabloaneFolder as sabloanePath,
                    CereriConfirmareFolder as cereriConfirmarePath,
                    BackupFolder as backupPath,
                    CereriSemnateFolder as cereriSemnatePath,
                    LogosFolder as logosPath
                FROM SetariFoldere 
                WHERE Id = 1
            `;

            const row = await db.get(query);
            
            if (row) {
                const settings: FolderSettings = {
                    sabloanePath: row.sabloanePath || this.defaultSettings.sabloanePath,
                    cereriConfirmarePath: row.cereriConfirmarePath || this.defaultSettings.cereriConfirmarePath,
                    backupPath: row.backupPath || this.defaultSettings.backupPath,
                    cereriSemnatePath: row.cereriSemnatePath || this.defaultSettings.cereriSemnatePath,
                    logosPath: row.logosPath || this.defaultSettings.logosPath
                };
                console.log('✅ Service: Setările de foldere au fost încărcate cu succes');
                return settings;
            } else {
                console.log('📂 Service: Nu există setări în baza de date, se folosesc valorile implicite');
                return this.defaultSettings;
            }

        } catch (error) {
            console.error('❌ Service: Eroare la încărcarea setărilor de foldere:', error);
            // Returnează valorile implicite în caz de eroare
            return this.defaultSettings;
        }
    }

    /**
     * Actualizează setările de foldere în baza de date
     */
    async updateFolderSettings(folderSettings: FolderSettings): Promise<FolderSettings> {
        try {
            console.log('📂 Service: Se actualizează setările de foldere în baza de date...');

            const db = await getDatabase();
            
            // Verifică dacă există deja o înregistrare
            const existingSettings = await this.checkIfSettingsExist();

            let query: string;
            const params = [
                folderSettings.sabloanePath,
                folderSettings.cereriConfirmarePath,
                folderSettings.backupPath,
                folderSettings.cereriSemnatePath,
                folderSettings.logosPath
            ];

            if (existingSettings) {
                query = `
                    UPDATE SetariFoldere 
                    SET 
                        SabloaneFolder = ?,
                        CereriConfirmareFolder = ?,
                        BackupFolder = ?,
                        CereriSemnateFolder = ?,
                        LogosFolder = ?,
                        DataActualizare = datetime('now')
                    WHERE Id = 1
                `;
            } else {
                query = `
                    INSERT INTO SetariFoldere (
                        Id, SabloaneFolder, CereriConfirmareFolder, BackupFolder, CereriSemnateFolder, LogosFolder, DataCreare, DataActualizare
                    ) VALUES (1, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                `;
            }

            await db.run(query, params);

            console.log('✅ Service: Setările de foldere au fost actualizate cu succes în baza de date');
            return folderSettings;

        } catch (error) {
            console.error('❌ Service: Eroare la actualizarea setărilor de foldere:', error);
            throw error;
        }
    }

    /**
     * Testează accesul la un folder
     */
    async testFolderAccess(folderPath: string, folderType: string): Promise<FolderTestResult> {
        try {
            console.log(`📂 Service: Se testează accesul la folderul ${folderType}: ${folderPath}`);

            const absolutePath = path.resolve(folderPath);
            
            // Verifică dacă folderul există
            let exists = false;
            let readable = false;
            let writable = false;

            try {
                await fs.access(absolutePath, fs.constants.F_OK);
                exists = true;
                console.log(`📂 Service: Folderul ${folderType} există: ${absolutePath}`);

                // Testează dacă este readable
                try {
                    await fs.access(absolutePath, fs.constants.R_OK);
                    readable = true;
                    console.log(`📂 Service: Folderul ${folderType} este readable`);
                } catch (err) {
                    console.warn(`⚠️ Service: Folderul ${folderType} nu este readable`);
                }

                // Testează dacă este writable
                try {
                    await fs.access(absolutePath, fs.constants.W_OK);
                    writable = true;
                    console.log(`📂 Service: Folderul ${folderType} este writable`);
                } catch (err) {
                    console.warn(`⚠️ Service: Folderul ${folderType} nu este writable`);
                }

            } catch (err) {
                console.log(`📂 Service: Folderul ${folderType} nu există: ${absolutePath}`);
            }

            const details = {
                exists,
                readable,
                writable,
                absolutePath
            };

            if (exists && readable && writable) {
                return {
                    success: true,
                    message: `Folderul ${folderType} este accesibil și funcțional`,
                    details
                };
            } else if (exists) {
                return {
                    success: false,
                    message: `Folderul ${folderType} există dar nu are permisiunile necesare (${!readable ? 'nu poate fi citit' : ''}${!readable && !writable ? ', ' : ''}${!writable ? 'nu poate fi scris' : ''})`,
                    details
                };
            } else {
                return {
                    success: false,
                    message: `Folderul ${folderType} nu există`,
                    details
                };
            }

        } catch (error) {
            console.error(`❌ Service: Eroare la testarea folderului ${folderType}:`, error);
            return {
                success: false,
                message: `Eroare la testarea folderului: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Creează un folder dacă nu există
     */
    async createFolder(folderPath: string, folderType: string): Promise<FolderTestResult> {
        try {
            console.log(`📂 Service: Se creează folderul ${folderType}: ${folderPath}`);

            const absolutePath = path.resolve(folderPath);
            
            // Verifică mai întâi dacă folderul există
            const testResult = await this.testFolderAccess(folderPath, folderType);
            
            if (testResult.success) {
                return {
                    success: true,
                    message: `Folderul ${folderType} există deja și este funcțional`,
                    details: testResult.details
                };
            }

            // Încearcă să creeze folderul
            try {
                await fs.mkdir(absolutePath, { recursive: true });
                console.log(`✅ Service: Folderul ${folderType} a fost creat cu succes: ${absolutePath}`);

                // Testează din nou accesul după creare
                const newTestResult = await this.testFolderAccess(folderPath, folderType);
                
                return {
                    success: newTestResult.success,
                    message: newTestResult.success 
                        ? `Folderul ${folderType} a fost creat cu succes și este funcțional`
                        : `Folderul ${folderType} a fost creat dar nu are permisiunile necesare`,
                    details: newTestResult.details
                };

            } catch (err) {
                console.error(`❌ Service: Eroare la crearea folderului ${folderType}:`, err);
                return {
                    success: false,
                    message: `Nu s-a putut crea folderul ${folderType}: ${err instanceof Error ? err.message : 'Unknown error'}`,
                    details: {
                        exists: false,
                        readable: false,
                        writable: false,
                        absolutePath
                    }
                };
            }

        } catch (error) {
            console.error(`❌ Service: Eroare la crearea folderului ${folderType}:`, error);
            return {
                success: false,
                message: `Eroare la crearea folderului: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Resetează setările la valorile implicite
     */
    async resetToDefaults(): Promise<FolderSettings> {
        try {
            console.log('📂 Service: Se resetează setările de foldere la valorile implicite...');

            return await this.updateFolderSettings(this.defaultSettings);

        } catch (error) {
            console.error('❌ Service: Eroare la resetarea setărilor de foldere:', error);
            throw error;
        }
    }

    /**
     * Verifică dacă există setări în baza de date
     */
    private async checkIfSettingsExist(): Promise<boolean> {
        try {
            const db = await getDatabase();
            const query = 'SELECT COUNT(*) as count FROM SetariFoldere WHERE Id = 1';
            
            const row = await db.get(query);
            return row && row.count > 0;

        } catch (error) {
            console.error('❌ Service: Eroare la verificarea existenței setărilor:', error);
            return false;
        }
    }

    /**
     * Inițializează tabela SetariFoldere dacă nu există
     */
    async initializeFolderSettingsTable(): Promise<void> {
        try {
            console.log('📂 Service: Se inițializează tabela SetariFoldere...');

            const db = await getDatabase();
            const createTableQuery = `
                CREATE TABLE IF NOT EXISTS SetariFoldere (
                    Id INTEGER PRIMARY KEY DEFAULT 1,
                    SabloaneFolder TEXT DEFAULT 'C:\\BalanceBeaconBuddy\\Sabloane',
                    CereriConfirmareFolder TEXT DEFAULT 'C:\\BalanceBeaconBuddy\\CereriGenerate',
                    BackupFolder TEXT DEFAULT 'C:\\BalanceBeaconBuddy\\Backup',
                    CereriSemnateFolder TEXT DEFAULT 'C:\\BalanceBeaconBuddy\\CereriSemnate',
                    LogosFolder TEXT DEFAULT 'C:\\BalanceBeaconBuddy\\Logos',
                    DataCreare DATETIME DEFAULT CURRENT_TIMESTAMP,
                    DataActualizare DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(Id)
                )
            `;

            await db.exec(createTableQuery);
            console.log('✅ Service: Tabela SetariFoldere a fost inițializată cu succes');

        } catch (error) {
            console.error('❌ Service: Eroare la inițializarea tabelei SetariFoldere:', error);
            throw error;
        }
    }
}

// Exportăm instanța serviciului
export const folderSettingsService = new FolderSettingsService();
