import { Request, Response } from 'express';
import * as fs from 'fs-extra';
import * as path from 'path';
import { ApiResponseHelper } from '../types/api.types';
import { getDatabase } from '../config/sqlite';
import { folderSettingsService } from '../services/folder.settings.service';

interface TableBackupResult {
    table: string;
    records?: number;
    filePath?: string;
    status: 'success' | 'error';
    error?: string;
}

interface FileBackupResult {
    source: string;
    destination: string;
    status: 'success' | 'error' | 'skipped';
    size?: number;
    filesCount?: number;
    note?: string;
    message?: string;
    error?: string;
}

class SimpleBackupController {
    constructor() {
        // Nu mai este nevoie de inițializare pentru că folosim instanța exportată
    }

    // Obține setările de backup
    async getBackupSettings(req: Request, res: Response): Promise<void> {
        try {
            const folderSettings = await folderSettingsService.getFolderSettings();
            
            const settings = {
                backupPath: folderSettings.backupPath,
                backupAutomat: false,
                notificariEmail: false,
                backupInterval: '24h'
            };

            res.json(ApiResponseHelper.success(settings, 'Setările de backup au fost obținute cu succes'));
        } catch (error) {
            console.error('Eroare la obținerea setărilor backup:', error);
            res.status(500).json(ApiResponseHelper.error(
                'Eroare la obținerea setărilor backup',
                'BACKUP_SETTINGS_ERROR',
                error instanceof Error ? error.message : 'Eroare necunoscută'
            ));
        }
    }

    // Actualizează setările de backup
    async updateBackupSettings(req: Request, res: Response): Promise<void> {
        try {
            const { backupPath, backupAutomat, notificariEmail, backupInterval } = req.body;
            
            if (backupPath) {
                // Actualizează path-ul de backup în setările de foldere
                const currentSettings = await folderSettingsService.getFolderSettings();
                const updatedSettings = { ...currentSettings, backupPath };
                await folderSettingsService.updateFolderSettings(updatedSettings);
            }
            
            res.json(ApiResponseHelper.success(
                { updated: true, backupPath },
                'Setările de backup au fost actualizate cu succes'
            ));
        } catch (error) {
            console.error('Eroare la actualizarea setărilor backup:', error);
            res.status(500).json(ApiResponseHelper.error(
                'Eroare la actualizarea setărilor backup',
                'BACKUP_UPDATE_ERROR',
                error instanceof Error ? error.message : 'Eroare necunoscută'
            ));
        }
    }

    // Crează backup manual local
    async createManualBackup(req: Request, res: Response): Promise<void> {
        try {
            const { type } = req.body; // 'sql', 'files', 'full'
            const folderSettings = await folderSettingsService.getFolderSettings();
            const backupPath = folderSettings.backupPath;
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            
            // Nume fișier în funcție de tip
            let backupFolderName: string;
            switch (type) {
                case 'sql':
                    backupFolderName = `backup-SQL-${timestamp}`;
                    break;
                case 'files':
                    backupFolderName = `backup-FIȘIERE-${timestamp}`;
                    break;
                case 'full':
                default:
                    backupFolderName = `backup-GENERAL-${timestamp}`;
                    break;
            }
            
            const backupFolder = path.join(backupPath, backupFolderName);
            console.log(`Creez backup ${type || 'general'} în: ${backupFolder}`);
            
            // Asigură-te că folder-ul de backup există
            await fs.ensureDir(backupFolder);
            
            const results = {
                timestamp: timestamp,
                backupType: type || 'full',
                backupFolder: backupFolder,
                sqlBackup: null as any,
                localFiles: null as any,
                success: false,
                message: ''
            };
            
            // 1. Backup SQL către folder local (dacă este necesar)
            if (type === 'sql' || type === 'full' || !type) {
                try {
                    const sqlBackupPath = path.join(backupFolder, 'sql-data');
                    await fs.ensureDir(sqlBackupPath);
                    
                    // Pentru SQLite, facem backup pentru TOATE tabelele
                    const db = await getDatabase();
                    
                    // Obținem lista tuturor tabelelor din baza de date
                    const tablesResult = await db.all(`
                        SELECT name FROM sqlite_master 
                        WHERE type='table' AND name NOT LIKE 'sqlite_%'
                        ORDER BY name
                    `);
                    
                    const allTables = tablesResult.map((row: any) => row.name);
                    console.log(`📊 Backup SQLite pentru ${allTables.length} tabele:`, allTables);
                    
                    const tableResults: TableBackupResult[] = [];
                    
                    for (const tableName of allTables) {
                        try {
                            const result = await db.all(`SELECT * FROM ${tableName}`);
                            const tableData = {
                                tableName: tableName,
                                timestamp: new Date().toISOString(),
                                recordCount: result.length,
                                data: result
                            };
                            
                            const filePath = path.join(sqlBackupPath, `${tableName.toLowerCase()}.json`);
                            await fs.writeJson(filePath, tableData, { spaces: 2 });
                            
                            tableResults.push({
                                table: tableName,
                                records: result.length,
                                filePath: filePath,
                                status: 'success'
                            });
                            
                            console.log(`✅ SQL Backup local ${tableName}: ${result.length} înregistrări`);
                        } catch (tableError) {
                            console.error(`Eroare backup tabel ${tableName}:`, tableError);
                            tableResults.push({
                                table: tableName,
                                status: 'error',
                                error: tableError instanceof Error ? tableError.message : 'Eroare necunoscută'
                            });
                        }
                    }
                    
                    results.sqlBackup = {
                        success: tableResults.some(r => r.status === 'success'),
                        results: tableResults,
                        path: sqlBackupPath
                    };
                    
                } catch (sqlError) {
                    console.error('Eroare la backup SQL local:', sqlError);
                    results.sqlBackup = {
                        success: false,
                        error: sqlError instanceof Error ? sqlError.message : 'Backup SQL failed'
                    };
                }
            }
            
            // 2. Backup fișiere locale importante (dacă este necesar)
            if (type === 'files' || type === 'full' || !type) {
                try {
                    const localFilesPath = path.join(backupFolder, 'local-files');
                    await fs.ensureDir(localFilesPath);
                    
                    const today = new Date();
                    today.setHours(0, 0, 0, 0); // Începutul zilei
                    const endOfDay = new Date(today);
                    endOfDay.setHours(23, 59, 59, 999); // Sfârșitul zilei
                    
                    const filesToBackup = [
                        { source: folderSettings.sabloanePath, dest: path.join(localFilesPath, 'sabloane'), name: 'Sabloane' },
                        { source: folderSettings.logosPath, dest: path.join(localFilesPath, 'logos'), name: 'Logos' },
                        { source: folderSettings.cereriConfirmarePath, dest: path.join(localFilesPath, 'cereri-confirmare'), name: 'Cereri Confirmare' },
                        { source: folderSettings.cereriSemnatePath, dest: path.join(localFilesPath, 'cereri-semnate'), name: 'Cereri Semnate' }
                    ];
                    
                    const fileResults: FileBackupResult[] = [];
                    
                    for (const fileInfo of filesToBackup) {
                        try {
                            const exists = await fs.pathExists(fileInfo.source);
                            if (exists) {
                                await fs.ensureDir(fileInfo.dest);
                                
                                // Pentru backup FIȘIERE, copiem doar fișierele din ziua curentă
                                if (type === 'files') {
                                    const todayFiles = await this.getTodayFiles(fileInfo.source, today, endOfDay);
                                    let copiedCount = 0;
                                    let totalSize = 0;
                                    
                                    for (const file of todayFiles) {
                                        const relativePath = path.relative(fileInfo.source, file);
                                        const destPath = path.join(fileInfo.dest, relativePath);
                                        await fs.ensureDir(path.dirname(destPath));
                                        await fs.copy(file, destPath);
                                        const stats = await fs.stat(destPath);
                                        totalSize += stats.size;
                                        copiedCount++;
                                    }
                                    
                                    fileResults.push({
                                        source: fileInfo.source,
                                        destination: fileInfo.dest,
                                        status: 'success',
                                        size: totalSize,
                                        filesCount: copiedCount,
                                        note: `Fișiere din ${today.toLocaleDateString('ro-RO')}`
                                    });
                                    
                                    console.log(`✅ Backup fișiere ${fileInfo.name} din ziua curentă: ${copiedCount} fișiere, ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
                                } else {
                                    // Pentru backup GENERAL, copiem tot folder-ul
                                    await fs.copy(fileInfo.source, fileInfo.dest);
                                    const folderSize = await this.getFolderSize(fileInfo.dest);
                                    
                                    fileResults.push({
                                        source: fileInfo.source,
                                        destination: fileInfo.dest,
                                        status: 'success',
                                        size: folderSize
                                    });
                                    
                                    console.log(`✅ Backup complet fișiere ${fileInfo.name}: ${(folderSize / 1024 / 1024).toFixed(2)} MB`);
                                }
                            } else {
                                fileResults.push({
                                    source: fileInfo.source,
                                    destination: fileInfo.dest,
                                    status: 'skipped',
                                    message: 'Folder-ul sursă nu există'
                                });
                            }
                        } catch (fileError) {
                            console.error(`Eroare backup fișiere ${fileInfo.source}:`, fileError);
                            fileResults.push({
                                source: fileInfo.source,
                                destination: fileInfo.dest,
                                status: 'error',
                                error: fileError instanceof Error ? fileError.message : 'Eroare necunoscută'
                            });
                        }
                    }
                    
                    results.localFiles = {
                        success: fileResults.some(r => r.status === 'success'),
                        results: fileResults,
                        path: localFilesPath
                    };
                    
                } catch (filesError) {
                    console.error('Eroare la backup fișiere locale:', filesError);
                    results.localFiles = {
                        success: false,
                        error: filesError instanceof Error ? filesError.message : 'Backup fișiere failed'
                    };
                }
            }
            
            // 3. Creează manifest
            const manifest = {
                timestamp: timestamp,
                backupType: type || 'full',
                sqlTables: results.sqlBackup?.results?.length || 0,
                filesFolders: results.localFiles?.results?.length || 0,
                success: (results.sqlBackup?.success || false) || (results.localFiles?.success || false)
            };
            
            await fs.writeJson(path.join(backupFolder, 'manifest.json'), manifest, { spaces: 2 });
            
            results.success = manifest.success;
            results.message = manifest.success ? 
                `Backup ${type || 'general'} creat cu succes` : 
                'Backup parțial sau eșuat';
            
            console.log(`📦 Backup ${type || 'general'} finalizat:`, results.message);
            
            if (results.success) {
                res.json(ApiResponseHelper.success(results, results.message));
            } else {
                res.status(500).json(ApiResponseHelper.error(
                    results.message,
                    'BACKUP_FAILED',
                    JSON.stringify(results)
                ));
            }
            
        } catch (error) {
            console.error('Eroare generală la backup:', error);
            res.status(500).json(ApiResponseHelper.error(
                'Eroare la crearea backup-ului',
                'BACKUP_CREATION_ERROR',
                error instanceof Error ? error.message : 'Eroare necunoscută'
            ));
        }
    }

    // Testează funcționalitatea de backup
    async testBackup(req: Request, res: Response): Promise<void> {
        try {
            const folderSettings = await folderSettingsService.getFolderSettings();
            const backupPath = folderSettings.backupPath;
            
            console.log(`🧪 Test backup în: ${backupPath}`);
            
            let localTest = { success: false, message: '' };
            try {
                await fs.ensureDir(backupPath);
                await fs.access(backupPath, fs.constants.R_OK | fs.constants.W_OK);
                localTest = {
                    success: true,
                    message: `Folder backup accesibil: ${backupPath}`
                };
            } catch (fsError) {
                localTest = {
                    success: false,
                    message: `Folder backup inaccesibil: ${fsError instanceof Error ? fsError.message : 'Eroare necunoscută'}`
                };
            }
            
            // Test bază de date
            let dbTest = { success: false, message: '' };
            try {
                const db = await getDatabase();
                const result = await db.all('SELECT name FROM sqlite_master WHERE type="table"');
                dbTest = {
                    success: true,
                    message: `Baza de date accesibilă: ${result.length} tabele`
                };
            } catch (dbError) {
                dbTest = {
                    success: false,
                    message: `Eroare bază de date: ${dbError instanceof Error ? dbError.message : 'Eroare necunoscută'}`
                };
            }
            
            const testResults = {
                backupFolder: localTest,
                database: dbTest,
                overallSuccess: localTest.success && dbTest.success
            };
            
            if (testResults.overallSuccess) {
                res.json(ApiResponseHelper.success(testResults, 'Test backup reușit'));
            } else {
                res.status(500).json(ApiResponseHelper.error(
                    'Test backup eșuat',
                    'BACKUP_TEST_FAILED',
                    JSON.stringify(testResults)
                ));
            }
            
        } catch (error) {
            console.error('Eroare la testarea backup-ului:', error);
            res.status(500).json(ApiResponseHelper.error(
                'Eroare la testarea backup-ului',
                'BACKUP_TEST_ERROR',
                error instanceof Error ? error.message : 'Eroare necunoscută'
            ));
        }
    }

    // Listează backup-urile locale
    async listLocalBackups(req: Request, res: Response): Promise<void> {
        try {
            const folderSettings = await folderSettingsService.getFolderSettings();
            const backupPath = folderSettings.backupPath;
            
            const backups: any[] = [];
            
            try {
                const items = await fs.readdir(backupPath, { withFileTypes: true });
                const backupFolders = items.filter(item => 
                    item.isDirectory() && 
                    (item.name.startsWith('backup-') || 
                     item.name.includes('SQL') || 
                     item.name.includes('FIȘIERE') || 
                     item.name.includes('GENERAL'))
                );
                
                for (const folder of backupFolders) {
                    const folderPath = path.join(backupPath, folder.name);
                    const manifestPath = path.join(folderPath, 'manifest.json');
                    
                    let manifest: any = null;
                    try {
                        if (await fs.pathExists(manifestPath)) {
                            manifest = await fs.readJson(manifestPath);
                        }
                    } catch (manifestError) {
                        console.warn(`Nu pot citi manifest pentru ${folder.name}:`, manifestError);
                    }
                    
                    const stats = await fs.stat(folderPath);
                    const folderSize = await this.getFolderSize(folderPath);
                    
                    backups.push({
                        id: folder.name,
                        backupId: folder.name,
                        name: folder.name,
                        createdAt: stats.birthtime.toISOString(),
                        size: folderSize,
                        totalSize: folderSize,
                        sqlSize: manifest?.sqlTables ? folderSize / 2 : 0,
                        type: manifest?.backupType || 'unknown',
                        success: manifest?.success !== false,
                        path: folderPath
                    });
                }
                
                backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                
            } catch (readError) {
                console.warn('Nu pot citi folderul de backup:', readError);
            }
            
            res.json(ApiResponseHelper.success(backups, `Găsite ${backups.length} backup-uri locale`));
            
        } catch (error) {
            console.error('Eroare la listarea backup-urilor:', error);
            res.status(500).json(ApiResponseHelper.error(
                'Eroare la listarea backup-urilor',
                'BACKUP_LIST_ERROR',
                error instanceof Error ? error.message : 'Eroare necunoscută'
            ));
        }
    }

    // Descarcă backup local
    async downloadLocalBackup(req: Request, res: Response): Promise<void> {
        try {
            const { backupId } = req.params;
            const folderSettings = await folderSettingsService.getFolderSettings();
            const backupPath = folderSettings.backupPath;
            const backupFolder = path.join(backupPath, backupId);
            
            if (!await fs.pathExists(backupFolder)) {
                res.status(404).json(ApiResponseHelper.notFoundError('Backup-ul'));
                return;
            }
            
            // Pentru download, trimitem un ZIP
            // Alternativ, poți folosi o bibliotecă de arhivare
            res.json(ApiResponseHelper.success({
                backupId: backupId,
                path: backupFolder,
                downloadUrl: `/backup/files/${backupId}`,
                message: 'Backup găsit - implementează descărcarea ZIP'
            }, 'Backup disponibil pentru descărcare'));
            
        } catch (error) {
            console.error('Eroare la descărcarea backup-ului:', error);
            res.status(500).json(ApiResponseHelper.error(
                'Eroare la descărcarea backup-ului',
                'BACKUP_DOWNLOAD_ERROR',
                error instanceof Error ? error.message : 'Eroare necunoscută'
            ));
        }
    }

    // Funcții helper pentru Azure (returnează eroare fără Azure)
    async getBackupHistory(req: Request, res: Response): Promise<void> {
        try {
            res.json(ApiResponseHelper.success({
                backups: [],
                pagination: {
                    currentPage: 1,
                    pageSize: 20,
                    totalRecords: 0,
                    totalPages: 0
                }
            }, 'Istoric backup Azure nu este disponibil - folosește backup local'));
        } catch (error) {
            console.error('Eroare la obținerea istoricului backup:', error);
            res.status(500).json(ApiResponseHelper.error(
                'Eroare la obținerea istoricului backup',
                'BACKUP_HISTORY_ERROR',
                error instanceof Error ? error.message : 'Eroare necunoscută'
            ));
        }
    }
    
    async getBackupStats(req: Request, res: Response): Promise<void> {
        try {
            res.json(ApiResponseHelper.success({
                totalBackups: 0,
                backupuriReussite: 0,
                backupuriEsuate: 0,
                backupuriInProgress: 0,
                backupuriAutomate: 0,
                durataMediaBackup: 0,
                dimensiuneTotalBackups: 0,
                ultimulBackup: null
            }, 'Statistici backup Azure nu sunt disponibile - folosește backup local'));
        } catch (error) {
            console.error('Eroare la obținerea statisticilor backup:', error);
            res.status(500).json(ApiResponseHelper.error(
                'Eroare la obținerea statisticilor backup',
                'BACKUP_STATS_ERROR',
                error instanceof Error ? error.message : 'Eroare necunoscută'
            ));
        }
    }

    // Metodă pentru a obține fișierele din ziua curentă
    private async getTodayFiles(folderPath: string, startOfDay: Date, endOfDay: Date): Promise<string[]> {
        const files: string[] = [];
        
        try {
            if (!await fs.pathExists(folderPath)) {
                return files;
            }
            
            const items = await fs.readdir(folderPath, { withFileTypes: true });
            
            for (const item of items) {
                const itemPath = path.join(folderPath, item.name);
                
                if (item.isDirectory()) {
                    // Recursiv pentru subdirectoare
                    const subFiles = await this.getTodayFiles(itemPath, startOfDay, endOfDay);
                    files.push(...subFiles);
                } else {
                    // Verifică data fișierului
                    const stats = await fs.stat(itemPath);
                    if (stats.mtime >= startOfDay && stats.mtime <= endOfDay) {
                        files.push(itemPath);
                    }
                }
            }
        } catch (error) {
            console.warn(`Nu pot scana folderul ${folderPath}:`, error);
        }
        
        return files;
    }

    private async getFolderSize(folderPath: string): Promise<number> {
        try {
            let totalSize = 0;
            const items = await fs.readdir(folderPath, { withFileTypes: true });
            
            for (const item of items) {
                const itemPath = path.join(folderPath, item.name);
                
                if (item.isDirectory()) {
                    totalSize += await this.getFolderSize(itemPath);
                } else {
                    const stats = await fs.stat(itemPath);
                    totalSize += stats.size;
                }
            }
            
            return totalSize;
        } catch (error) {
            console.warn(`Eroare la calcularea dimensiunii pentru ${folderPath}:`, error);
            return 0;
        }
    }
}

const simpleBackupController = new SimpleBackupController();
export default simpleBackupController;
