import { getDatabase } from '../config/sqlite';
import { SetariBackup, CreateBackupRequest, UpdateBackupRequest, BackupHistoryResponse, BackupStatsResponse } from '../models/SetariBackup';

export class SetariBackupService {
    
    // Creează o nouă înregistrare de backup
    async createBackupRecord(request: CreateBackupRequest): Promise<string> {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const backupId = `${request.TipBackup}-${timestamp}`;
            const caleBackup = `${request.TipBackup}-backups/${timestamp}`;
            
            const sqlRequest = pool.request();
            
            await sqlRequest
                .input('BackupID', backupId)
                .input('TipBackup', request.TipBackup)
                .input('CaleBackup', caleBackup)
                .input('ContainerBackup', 'freshcrmbackup')
                .input('EsteBackupAutomat', false)
                .input('CreatDe', request.CreatDe || 'sistem')
                .input('ConfiguratieBackup', request.ConfiguratieBackup ? JSON.stringify(request.ConfiguratieBackup) : null)
                .query(`
                    INSERT INTO SetariBackup (
                        BackupID, TipBackup, CaleBackup, ContainerBackup, 
                        EsteBackupAutomat, CreatDe, ConfiguratieBackup
                    ) VALUES (
                        @BackupID, @TipBackup, @CaleBackup, @ContainerBackup,
                        @EsteBackupAutomat, @CreatDe, @ConfiguratieBackup
                    )
                `);
                
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
            const sqlRequest = pool.request();
            let query = 'UPDATE SetariBackup SET ModificatLa = GETDATE()';
            const params: any = { BackupID: backupId };
            
            // Construiește dynamic query-ul bazat pe câmpurile furnizate
            if (updateData.StatusBackup !== undefined) {
                query += ', StatusBackup = @StatusBackup';
                params.StatusBackup = updateData.StatusBackup;
            }
            
            if (updateData.DataFinalizare !== undefined) {
                query += ', DataFinalizare = @DataFinalizare';
                params.DataFinalizare = updateData.DataFinalizare;
            }
            
            if (updateData.DurataSecunde !== undefined) {
                query += ', DurataSecunde = @DurataSecunde';
                params.DurataSecunde = updateData.DurataSecunde;
            }
            
            if (updateData.NumeTabeleSQLBackup !== undefined) {
                query += ', NumeTabeleSQLBackup = @NumeTabeleSQLBackup';
                params.NumeTabeleSQLBackup = JSON.stringify(updateData.NumeTabeleSQLBackup);
            }
            
            if (updateData.DimensiuneSQLBytes !== undefined) {
                query += ', DimensiuneSQLBytes = @DimensiuneSQLBytes';
                params.DimensiuneSQLBytes = updateData.DimensiuneSQLBytes;
            }
            
            if (updateData.NumarInregistrariSQL !== undefined) {
                query += ', NumarInregistrariSQL = @NumarInregistrariSQL';
                params.NumarInregistrariSQL = updateData.NumarInregistrariSQL;
            }
            
            if (updateData.NumarBloburi !== undefined) {
                query += ', NumarBloburi = @NumarBloburi';
                params.NumarBloburi = updateData.NumarBloburi;
            }
            
            if (updateData.DimensiuneBlobBytes !== undefined) {
                query += ', DimensiuneBlobBytes = @DimensiuneBlobBytes';
                params.DimensiuneBlobBytes = updateData.DimensiuneBlobBytes;
            }
            
            if (updateData.NumeBloburi !== undefined) {
                query += ', NumeBloburi = @NumeBloburi';
                params.NumeBloburi = JSON.stringify(updateData.NumeBloburi);
            }
            
            if (updateData.MesajSucces !== undefined) {
                query += ', MesajSucces = @MesajSucces';
                params.MesajSucces = updateData.MesajSucces;
            }
            
            if (updateData.MesajEroare !== undefined) {
                query += ', MesajEroare = @MesajEroare';
                params.MesajEroare = updateData.MesajEroare;
            }
            
            if (updateData.ManifestBackup !== undefined) {
                query += ', ManifestBackup = @ManifestBackup';
                params.ManifestBackup = JSON.stringify(updateData.ManifestBackup);
            }
            
            if (updateData.ModificatDe !== undefined) {
                query += ', ModificatDe = @ModificatDe';
                params.ModificatDe = updateData.ModificatDe;
            }
            
            query += ' WHERE BackupID = @BackupID';
            
            // Adaugă parametrii la request
            Object.keys(params).forEach(key => {
                sqlRequest.input(key, params[key]);
            });
            
            await sqlRequest.query(query);
            console.log(`✅ Înregistrare backup actualizată: ${backupId}`);
            
        } catch (error) {
            console.error('Eroare la actualizarea înregistrării backup:', error);
            throw error;
        }
    }
    
    // Obține istoricul backup-urilor
    async getBackupHistory(limit: number = 50, offset: number = 0): Promise<BackupHistoryResponse> {
        try {
            const sqlRequest = pool.request();
            
            const result = await sqlRequest
                .input('Limit', limit)
                .input('Offset', offset)
                .query(`
                    SELECT 
                        ID, BackupID, TipBackup, StatusBackup,
                        DataCreare, DataFinalizare, DurataSecunde,
                        NumeTabeleSQLBackup, DimensiuneSQLBytes, NumarInregistrariSQL,
                        NumarBloburi, DimensiuneBlobBytes, NumeBloburi,
                        CaleBackup, ContainerBackup,
                        MesajSucces, MesajEroare,
                        ConfiguratieBackup, ManifestBackup,
                        EsteBackupAutomat, IntervalZile, ProximulBackupAutomat,
                        CreatDe, ModificatLa, ModificatDe
                    FROM SetariBackup
                    ORDER BY DataCreare DESC
                    OFFSET @Offset ROWS
                    FETCH NEXT @Limit ROWS ONLY
                `);
                
            // Obține totalul de înregistrări
            const countResult = await pool.request().query(`
                SELECT COUNT(*) as Total FROM SetariBackup
            `);
            
            const backups: SetariBackup[] = result.recordset.map(record => ({
                ...record,
                EsteBackupAutomat: record.EsteBackupAutomat === 1,
                NumeTabeleSQLBackup: record.NumeTabeleSQLBackup ? JSON.parse(record.NumeTabeleSQLBackup) : undefined,
                NumeBloburi: record.NumeBloburi ? JSON.parse(record.NumeBloburi) : undefined,
                ConfiguratieBackup: record.ConfiguratieBackup ? JSON.parse(record.ConfiguratieBackup) : undefined,
                ManifestBackup: record.ManifestBackup ? JSON.parse(record.ManifestBackup) : undefined
            }));
            
            return {
                success: true,
                backups,
                total: countResult.recordset[0].Total
            };
            
        } catch (error) {
            console.error('Eroare la obținerea istoricului backup:', error);
            return {
                success: false,
                backups: [],
                total: 0,
                message: error instanceof Error ? error.message : 'Eroare necunoscută'
            };
        }
    }
    
    // Obține statistici despre backup-uri
    async getBackupStats(): Promise<BackupStatsResponse> {
        try {
            const sqlRequest = pool.request();
            
            const result = await sqlRequest.query(`
                SELECT 
                    COUNT(*) as TotalBackups,
                    COUNT(CASE WHEN StatusBackup = 'completed' THEN 1 END) as SuccessfulBackups,
                    COUNT(CASE WHEN StatusBackup = 'failed' THEN 1 END) as FailedBackups,
                    SUM(ISNULL(DimensiuneSQLBytes, 0) + ISNULL(DimensiuneBlobBytes, 0)) as TotalSizeBytes,
                    AVG(CAST(DurataSecunde as FLOAT)) as AvgDurationSeconds
                FROM SetariBackup
            `);
            
            // Obține ultimul backup
            const lastBackupResult = await sqlRequest.query(`
                SELECT TOP 1 
                    ID, BackupID, TipBackup, StatusBackup,
                    DataCreare, DataFinalizare, DurataSecunde,
                    NumeTabeleSQLBackup, DimensiuneSQLBytes, NumarInregistrariSQL,
                    NumarBloburi, DimensiuneBlobBytes, NumeBloburi,
                    CaleBackup, ContainerBackup,
                    MesajSucces, MesajEroare,
                    EsteBackupAutomat, CreatDe
                FROM SetariBackup
                ORDER BY DataCreare DESC
            `);
            
            const stats = result.recordset[0];
            const lastBackup = lastBackupResult.recordset.length > 0 ? {
                ...lastBackupResult.recordset[0],
                EsteBackupAutomat: lastBackupResult.recordset[0].EsteBackupAutomat === 1
            } : undefined;
            
            return {
                success: true,
                stats: {
                    totalBackups: stats.TotalBackups || 0,
                    successfulBackups: stats.SuccessfulBackups || 0,
                    failedBackups: stats.FailedBackups || 0,
                    lastBackup,
                    totalSizeBytes: stats.TotalSizeBytes || 0,
                    avgDurationSeconds: Math.round(stats.AvgDurationSeconds || 0)
                }
            };
            
        } catch (error) {
            console.error('Eroare la obținerea statisticilor backup:', error);
            return {
                success: false,
                stats: {
                    totalBackups: 0,
                    successfulBackups: 0,
                    failedBackups: 0,
                    totalSizeBytes: 0,
                    avgDurationSeconds: 0
                },
                message: error instanceof Error ? error.message : 'Eroare necunoscută'
            };
        }
    }
    
    // Obține un backup specific
    async getBackupById(backupId: string): Promise<SetariBackup | null> {
        try {
            const sqlRequest = pool.request();
            
            const result = await sqlRequest
                .input('BackupID', backupId)
                .query(`
                    SELECT 
                        ID, BackupID, TipBackup, StatusBackup,
                        DataCreare, DataFinalizare, DurataSecunde,
                        NumeTabeleSQLBackup, DimensiuneSQLBytes, NumarInregistrariSQL,
                        NumarBloburi, DimensiuneBlobBytes, NumeBloburi,
                        CaleBackup, ContainerBackup,
                        MesajSucces, MesajEroare,
                        ConfiguratieBackup, ManifestBackup,
                        EsteBackupAutomat, IntervalZile, ProximulBackupAutomat,
                        CreatDe, ModificatLa, ModificatDe
                    FROM SetariBackup
                    WHERE BackupID = @BackupID
                `);
                
            if (result.recordset.length === 0) {
                return null;
            }
            
            const record = result.recordset[0];
            return {
                ...record,
                EsteBackupAutomat: record.EsteBackupAutomat === 1,
                NumeTabeleSQLBackup: record.NumeTabeleSQLBackup ? JSON.parse(record.NumeTabeleSQLBackup) : undefined,
                NumeBloburi: record.NumeBloburi ? JSON.parse(record.NumeBloburi) : undefined,
                ConfiguratieBackup: record.ConfiguratieBackup ? JSON.parse(record.ConfiguratieBackup) : undefined,
                ManifestBackup: record.ManifestBackup ? JSON.parse(record.ManifestBackup) : undefined
            };
            
        } catch (error) {
            console.error('Eroare la obținerea backup-ului:', error);
            return null;
        }
    }
}

export default new SetariBackupService();
