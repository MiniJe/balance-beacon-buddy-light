import { getDatabase } from '../config/sqlite';
import { SetariBackup, CreateBackupRequest, UpdateBackupRequest, BackupHistoryResponse, BackupStatsResponse } from '../models/SetariBackup';

export class SetariBackupService {
    
    // Creează o nouă înregistrare de backup
    async createBackupRecord(request: CreateBackupRequest): Promise<string> {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const backupId = `${request.TipBackup}-${timestamp}`;
            const caleBackup = `${request.TipBackup}-backups/${timestamp}`;
            
            const db = await getDatabase();
            
            await db.run(`
                INSERT INTO SetariBackup (
                    BackupID, TipBackup, CaleBackup, ContainerBackup, 
                    EsteBackupAutomat, CreatDe, ConfiguratieBackup
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                backupId,
                request.TipBackup,
                caleBackup,
                'freshcrmbackup',
                0, // false
                request.CreatDe || 'sistem',
                request.ConfiguratieBackup ? JSON.stringify(request.ConfiguratieBackup) : null
            ]);
                
            console.log(`✅ Înregistrare backup creată: ${backupId}`);
            return backupId;
            
        } catch (error) {
            console.error('Eroare la crearea înregistrării backup:', error);
            throw error;
        }
    }
    
    // Actualizează o înregistrare de backup
    async updateBackupRecord(backupId: string, updateData: UpdateBackupRequest): Promise<void> {
        try {
            const db = await getDatabase();
            let setParts: string[] = ['ModificatLa = ?'];
            let params: any[] = [new Date().toISOString()];
            
            // Construiește dynamic query-ul bazat pe câmpurile furnizate
            if (updateData.StatusBackup !== undefined) {
                setParts.push('StatusBackup = ?');
                params.push(updateData.StatusBackup);
            }
            
            if (updateData.DataFinalizare !== undefined) {
                setParts.push('DataFinalizare = ?');
                params.push(updateData.DataFinalizare.toISOString());
            }
            
            if (updateData.DurataBackup !== undefined) {
                setParts.push('DurataBackup = ?');
                params.push(updateData.DurataBackup);
            }
            
            if (updateData.DimensiuneBackup !== undefined) {
                setParts.push('DimensiuneBackup = ?');
                params.push(updateData.DimensiuneBackup);
            }
            
            if (updateData.DetaliiEroare !== undefined) {
                setParts.push('DetaliiEroare = ?');
                params.push(updateData.DetaliiEroare);
            }
            
            if (updateData.ConfiguratieBackup !== undefined) {
                setParts.push('ConfiguratieBackup = ?');
                params.push(JSON.stringify(updateData.ConfiguratieBackup));
            }
            
            // Adaugă BackupID la finalul parametrilor pentru WHERE clause
            params.push(backupId);
            
            const query = `UPDATE SetariBackup SET ${setParts.join(', ')} WHERE BackupID = ?`;
            
            await db.run(query, params);
            
            console.log(`✅ Înregistrare backup actualizată: ${backupId}`);
            
        } catch (error) {
            console.error('Eroare la actualizarea înregistrării backup:', error);
            throw error;
        }
    }
    
    // Obține toate înregistrările de backup
    async getAllBackups(): Promise<SetariBackup[]> {
        try {
            const db = await getDatabase();
            
            const result = await db.all(`
                SELECT 
                    BackupID,
                    TipBackup,
                    CaleBackup,
                    ContainerBackup,
                    StatusBackup,
                    DataCreare,
                    DataFinalizare,
                    DurataBackup,
                    DimensiuneBackup,
                    EsteBackupAutomat,
                    DetaliiEroare,
                    CreatDe,
                    ModificatLa,
                    ConfiguratieBackup
                FROM SetariBackup
                ORDER BY DataCreare DESC
            `);
            
            // Parse JSON fields
            return result.map(backup => ({
                ...backup,
                EsteBackupAutomat: Boolean(backup.EsteBackupAutomat),
                ConfiguratieBackup: backup.ConfiguratieBackup ? JSON.parse(backup.ConfiguratieBackup) : null
            }));
            
        } catch (error) {
            console.error('Eroare la obținerea înregistrărilor backup:', error);
            throw error;
        }
    }
    
    // Obține backup după ID
    async getBackupById(backupId: string): Promise<SetariBackup | null> {
        try {
            const db = await getDatabase();
            
            const result = await db.get(`
                SELECT 
                    BackupID,
                    TipBackup,
                    CaleBackup,
                    ContainerBackup,
                    StatusBackup,
                    DataCreare,
                    DataFinalizare,
                    DurataBackup,
                    DimensiuneBackup,
                    EsteBackupAutomat,
                    DetaliiEroare,
                    CreatDe,
                    ModificatLa,
                    ConfiguratieBackup
                FROM SetariBackup
                WHERE BackupID = ?
            `, [backupId]);
            
            if (!result) return null;
            
            return {
                ...result,
                EsteBackupAutomat: Boolean(result.EsteBackupAutomat),
                ConfiguratieBackup: result.ConfiguratieBackup ? JSON.parse(result.ConfiguratieBackup) : null
            };
            
        } catch (error) {
            console.error('Eroare la obținerea backup-ului după ID:', error);
            throw error;
        }
    }
    
    // Șterge o înregistrare de backup
    async deleteBackup(backupId: string): Promise<void> {
        try {
            const db = await getDatabase();
            
            await db.run(`
                DELETE FROM SetariBackup 
                WHERE BackupID = ?
            `, [backupId]);
            
            console.log(`✅ Înregistrare backup ștearsă: ${backupId}`);
            
        } catch (error) {
            console.error('Eroare la ștergerea înregistrării backup:', error);
            throw error;
        }
    }
    
    // Obține istoricul backup-urilor cu paginare
    async getBackupHistory(page: number = 1, pageSize: number = 20, tipBackup?: string): Promise<BackupHistoryResponse> {
        try {
            const db = await getDatabase();
            const offset = (page - 1) * pageSize;
            let whereClause = '';
            let params: any[] = [];
            
            if (tipBackup) {
                whereClause = 'WHERE TipBackup = ?';
                params = [tipBackup];
            }
            
            // Obține numărul total de înregistrări
            const countResult = await db.get(`
                SELECT COUNT(*) as total 
                FROM SetariBackup 
                ${whereClause}
            `, params);
            
            const total = countResult?.total || 0;
            
            // Obține înregistrările cu paginare
            const backupsResult = await db.all(`
                SELECT 
                    BackupID,
                    TipBackup,
                    CaleBackup,
                    StatusBackup,
                    DataCreare,
                    DataFinalizare,
                    DurataBackup,
                    DimensiuneBackup,
                    EsteBackupAutomat,
                    DetaliiEroare,
                    CreatDe
                FROM SetariBackup
                ${whereClause}
                ORDER BY DataCreare DESC
                LIMIT ? OFFSET ?
            `, [...params, pageSize, offset]);
            
            const backups = backupsResult.map(backup => ({
                ...backup,
                EsteBackupAutomat: Boolean(backup.EsteBackupAutomat)
            }));
            
            return {
                backups,
                pagination: {
                    currentPage: page,
                    pageSize,
                    totalRecords: total,
                    totalPages: Math.ceil(total / pageSize)
                }
            };
            
        } catch (error) {
            console.error('Eroare la obținerea istoricului backup-urilor:', error);
            throw error;
        }
    }
    
    // Obține statistici despre backup-uri
    async getBackupStats(): Promise<BackupStatsResponse> {
        try {
            const db = await getDatabase();
            
            const result = await db.get(`
                SELECT 
                    COUNT(*) as TotalBackups,
                    COUNT(CASE WHEN StatusBackup = 'SUCCESS' THEN 1 END) as BackupuriReussite,
                    COUNT(CASE WHEN StatusBackup = 'FAILED' THEN 1 END) as BackupuriEsuate,
                    COUNT(CASE WHEN StatusBackup = 'IN_PROGRESS' THEN 1 END) as BackupuriInProgress,
                    COUNT(CASE WHEN EsteBackupAutomat = 1 THEN 1 END) as BackupuriAutomate,
                    AVG(CASE WHEN DurataBackup IS NOT NULL THEN DurataBackup END) as DurataMediaBackup,
                    SUM(CASE WHEN DimensiuneBackup IS NOT NULL THEN DimensiuneBackup END) as DimensiuneTotalBackups,
                    MAX(DataCreare) as UltimulBackup
                FROM SetariBackup
            `);
            
            return {
                totalBackups: result?.TotalBackups || 0,
                backupuriReussite: result?.BackupuriReussite || 0,
                backupuriEsuate: result?.BackupuriEsuate || 0,
                backupuriInProgress: result?.BackupuriInProgress || 0,
                backupuriAutomate: result?.BackupuriAutomate || 0,
                durataMediaBackup: result?.DurataMediaBackup || 0,
                dimensiuneTotalBackups: result?.DimensiuneTotalBackups || 0,
                ultimulBackup: result?.UltimulBackup
            };
            
        } catch (error) {
            console.error('Eroare la obținerea statisticilor backup:', error);
            throw error;
        }
    }
    
    // Curăță backup-urile vechi (păstrează doar ultimele N)
    async cleanupOldBackups(keepCount: number = 50, tipBackup?: string): Promise<void> {
        try {
            const db = await getDatabase();
            let whereClause = '';
            let params: any[] = [keepCount];
            
            if (tipBackup) {
                whereClause = 'AND TipBackup = ?';
                params.push(tipBackup);
            }
            
            await db.run(`
                DELETE FROM SetariBackup 
                WHERE BackupID NOT IN (
                    SELECT BackupID FROM (
                        SELECT BackupID 
                        FROM SetariBackup 
                        WHERE 1=1 ${whereClause}
                        ORDER BY DataCreare DESC 
                        LIMIT ?
                    ) AS recent_backups
                )
                ${whereClause ? 'AND TipBackup = ?' : ''}
            `, params);
            
            console.log(`✅ Curățare backup-uri vechi completată. Păstrate: ${keepCount}`);
            
        } catch (error) {
            console.error('Eroare la curățarea backup-urilor vechi:', error);
            throw error;
        }
    }
    
    // Obține backup-urile din ultimele N zile
    async getRecentBackups(days: number = 7): Promise<SetariBackup[]> {
        try {
            const db = await getDatabase();
            
            const result = await db.all(`
                SELECT 
                    BackupID,
                    TipBackup,
                    CaleBackup,
                    ContainerBackup,
                    StatusBackup,
                    DataCreare,
                    DataFinalizare,
                    DurataBackup,
                    DimensiuneBackup,
                    EsteBackupAutomat,
                    DetaliiEroare,
                    CreatDe,
                    ModificatLa,
                    ConfiguratieBackup
                FROM SetariBackup
                WHERE DataCreare >= datetime('now', '-' || ? || ' days')
                ORDER BY DataCreare DESC
            `, [days]);
            
            return result.map(backup => ({
                ...backup,
                EsteBackupAutomat: Boolean(backup.EsteBackupAutomat),
                ConfiguratieBackup: backup.ConfiguratieBackup ? JSON.parse(backup.ConfiguratieBackup) : null
            }));
            
        } catch (error) {
            console.error('Eroare la obținerea backup-urilor recente:', error);
            throw error;
        }
    }
}
