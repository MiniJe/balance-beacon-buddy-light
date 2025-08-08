import { Request, Response } from 'express';
import { pool, backupBlobServiceClient, backupContainerName, blobServiceClient, containerName, templatesContainerName } from '../config/azure';
import SetariBackupService from '../services/SetariBackupService';
import { ApiResponseHelper } from '../types/api.types';

export class BackupController {
    // Crează backup pentru Azure Blob Storage
    async createBlobBackup(req: Request, res: Response): Promise<void> {
        let backupId: string | null = null;
        const startTime = new Date();
        
        try {
            if (!backupBlobServiceClient || !blobServiceClient) {
                res.status(500).json(ApiResponseHelper.error('Configurația de backup nu este disponibilă', 'BACKUP_CONFIG_ERROR'));
                return;
            }

            // Lista containerelor de procesat
            const containersToBackup = [
                { name: containerName, displayName: 'Logo' },
                { name: templatesContainerName, displayName: 'Templates' }
            ];

            // Creează înregistrarea în baza de date
            backupId = await SetariBackupService.createBackupRecord({
                TipBackup: 'blob',
                CreatDe: req.body.userId || 'utilizator_necunoscut',
                ConfiguratieBackup: {
                    sourceContainers: containersToBackup.map(c => c.name),
                    backupContainer: backupContainerName,
                    requestedAt: startTime.toISOString()
                }
            });

            const timestamp = backupId.replace('blob-', '');
            const backupFolder = `blob-backups/${timestamp}`;
            
            console.log(`Creez backup blob pentru ID: ${backupId}`);
            console.log(`Containere de procesat: ${containersToBackup.map(c => c.displayName).join(', ')}`);
            
            const backupContainerClient = backupBlobServiceClient.getContainerClient(backupContainerName);
            
            // Asigură-te că containerul de backup există
            const backupContainerExists = await backupContainerClient.exists();
            if (!backupContainerExists) {
                await backupContainerClient.create();
                console.log(`Container de backup ${backupContainerName} a fost creat`);
            }
            
            const backupResults: Array<{
                blobName: string;
                originalPath: string;
                backupPath: string;
                size?: number;
                status: 'success' | 'error';
                error?: string;
                containerName: string;
            }> = [];
            
            let totalBlobs = 0;
            let totalSize = 0;
            
            // Procesează fiecare container
            for (const containerInfo of containersToBackup) {
                console.log(`\n📁 Procesez containerul: ${containerInfo.displayName} (${containerInfo.name})`);
                
                try {
                    const sourceContainerClient = blobServiceClient.getContainerClient(containerInfo.name);
                    
                    // Verifică dacă containerul există
                    const containerExists = await sourceContainerClient.exists();
                    if (!containerExists) {
                        console.log(`⚠️  Containerul ${containerInfo.name} nu există, se omite`);
                        continue;
                    }
                    
                    // Listează toate blob-urile din containerul curent
                    let containerBlobCount = 0;
                    for await (const blob of sourceContainerClient.listBlobsFlat()) {
                        totalBlobs++;
                        containerBlobCount++;
                        
                        try {
                            console.log(`  📄 Backup blob: ${blob.name} (${blob.properties.contentLength} bytes)`);
                            
                            const sourceBlobClient = sourceContainerClient.getBlobClient(blob.name);
                            const backupBlobName = `${backupFolder}/${containerInfo.name}/${blob.name}`;
                            const backupBlobClient = backupContainerClient.getBlockBlobClient(backupBlobName);
                            
                            // Descarcă blob-ul din sursa și îl încarcă în backup
                            // Folosim downloadToBuffer pentru a evita problemele de autentificare cu copy direct
                            const downloadResponse = await sourceBlobClient.downloadToBuffer();
                            const size = downloadResponse.length;
                            
                            if (size === 0) {
                                console.log(`  ⚠️  Blob ${blob.name} este gol (0 bytes)`);
                            }
                            
                            // Upload în containerul de backup
                            await backupBlobClient.uploadData(downloadResponse, {
                                blobHTTPHeaders: {
                                    blobContentType: blob.properties.contentType || 'application/octet-stream'
                                }
                            });
                            
                            totalSize += size;
                            
                            backupResults.push({
                                blobName: blob.name,
                                originalPath: blob.name,
                                backupPath: backupBlobName,
                                size: size,
                                status: 'success',
                                containerName: containerInfo.name
                            });
                            
                            console.log(`  ✅ Backup reușit: ${blob.name} (${size} bytes)`);
                            
                        } catch (blobError) {
                            console.error(`  ❌ Eroare backup blob ${blob.name}:`, blobError);
                            
                            let errorMessage = 'Eroare necunoscută';
                            if (blobError instanceof Error) {
                                errorMessage = blobError.message;
                                console.error(`  Detalii eroare: ${errorMessage}`);
                            }
                            
                            backupResults.push({
                                blobName: blob.name,
                                originalPath: blob.name,
                                backupPath: `${backupFolder}/${containerInfo.name}/${blob.name}`,
                                status: 'error',
                                error: errorMessage,
                                containerName: containerInfo.name
                            });
                        }
                    }
                    
                    console.log(`📊 Container ${containerInfo.displayName}: ${containerBlobCount} blob-uri procesate`);
                    
                } catch (containerError) {
                    console.error(`❌ Eroare la procesarea containerului ${containerInfo.name}:`, containerError);
                }
            }
            
            // Crează fișierul de manifest
            const endTime = new Date();
            const durataSecunde = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
            
            const manifest = {
                backupType: 'blob',
                backupId: backupId,
                timestamp: timestamp,
                createdAt: startTime.toISOString(),
                completedAt: endTime.toISOString(),
                duration: durataSecunde,
                sourceContainers: containersToBackup.map(c => c.name),
                backupContainer: backupContainerName,
                backupFolder: backupFolder,
                blobs: backupResults,
                totalBlobs: totalBlobs,
                successfulBlobs: backupResults.filter(r => r.status === 'success').length,
                failedBlobs: backupResults.filter(r => r.status === 'error').length,
                totalSize: totalSize,
                containerSummary: containersToBackup.map(containerInfo => ({
                    containerName: containerInfo.name,
                    displayName: containerInfo.displayName,
                    blobCount: backupResults.filter(r => r.containerName === containerInfo.name).length,
                    successCount: backupResults.filter(r => r.containerName === containerInfo.name && r.status === 'success').length,
                    errorCount: backupResults.filter(r => r.containerName === containerInfo.name && r.status === 'error').length
                }))
            };
            
            const manifestBlobName = `${backupFolder}/manifest.json`;
            const manifestBlobClient = backupContainerClient.getBlockBlobClient(manifestBlobName);
            const manifestContent = JSON.stringify(manifest, null, 2);
            await manifestBlobClient.upload(manifestContent, manifestContent.length, {
                blobHTTPHeaders: {
                    blobContentType: 'application/json'
                }
            });
            
            console.log(`📄 Manifest creat: ${manifestBlobName}`);
            
            // Actualizează înregistrarea în baza de date
            const hasErrors = backupResults.some(r => r.status === 'error');
            const statusBackup = hasErrors ? (backupResults.some(r => r.status === 'success') ? 'partial' : 'failed') : 'completed';
            
            const successMessage = statusBackup === 'completed' 
                ? `Backup blob completat cu succes: ${totalBlobs} fișiere din ${containersToBackup.length} containere, ${(totalSize / 1024 / 1024).toFixed(2)} MB`
                : undefined;
                
            const errorMessage = hasErrors 
                ? `Backup parțial: ${backupResults.filter(r => r.status === 'error').length} erori din ${totalBlobs} fișiere`
                : undefined;
            
            await SetariBackupService.updateBackupRecord(backupId, {
                StatusBackup: statusBackup,
                DataFinalizare: endTime,
                DurataSecunde: durataSecunde,
                NumarBloburi: totalBlobs,
                DimensiuneBlobBytes: totalSize,
                NumeBloburi: backupResults.map(r => r.blobName),
                MesajSucces: successMessage,
                MesajEroare: errorMessage,
                ManifestBackup: manifest,
                ModificatDe: req.body.userId || 'sistem'
            });
            
            console.log(`\n🎉 Backup blob finalizat cu statusul: ${statusBackup}`);
            console.log(`📊 Statistici: ${manifest.successfulBlobs} succese, ${manifest.failedBlobs} erori, ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
            
            res.json(ApiResponseHelper.success({
                backupId: backupId,
                backupFolder: backupFolder,
                totalBlobs: totalBlobs,
                successfulBlobs: manifest.successfulBlobs,
                failedBlobs: manifest.failedBlobs,
                totalSize: totalSize,
                duration: durataSecunde,
                status: statusBackup,
                results: backupResults,
                manifest: manifest
            }, 'Backup blob creat cu succes'));
            
        } catch (error) {
            console.error('❌ Eroare la crearea backup-ului blob:', error);
            
            // Marchează backup-ul ca failed în baza de date
            if (backupId) {
                try {
                    const endTime = new Date();
                    const durataSecunde = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
                    
                    await SetariBackupService.updateBackupRecord(backupId, {
                        StatusBackup: 'failed',
                        DataFinalizare: endTime,
                        DurataSecunde: durataSecunde,
                        MesajEroare: error instanceof Error ? error.message : 'Eroare necunoscută',
                        ModificatDe: req.body.userId || 'sistem'
                    });
                } catch (updateError) {
                    console.error('Eroare la actualizarea statusului backup:', updateError);
                }
            }
            
            res.status(500).json(ApiResponseHelper.error(
                'Eroare la crearea backup-ului blob',
                'BACKUP_CREATION_ERROR',
                error instanceof Error ? error.message : 'Eroare necunoscută'
            ));
        }
    }
    
    // Crează backup complet (SQL + Blob)
    async createFullBackup(req: Request, res: Response): Promise<void> {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            console.log(`Creez backup complet pentru timestamp: ${timestamp}`);
            
            const results = {
                timestamp: timestamp,
                sqlBackup: null as any,
                blobBackup: null as any,
                success: false,
                message: ''
            };
            
            // Simulează request-urile pentru backup-urile individuale
            const mockSqlReq = { ...req } as Request;
            const mockBlobReq = { ...req } as Request;
            
            let sqlBackupResult: any = null;
            let blobBackupResult: any = null;
            
            // Crează backup SQL
            try {
                await new Promise<void>((resolve, reject) => {
                    const mockSqlRes = {
                        json: (data: any) => {
                            if (data.success) {
                                sqlBackupResult = data;
                                resolve();
                            } else {
                                reject(new Error(data.message || 'SQL backup failed'));
                            }
                        },
                        status: () => ({
                            json: (data: any) => reject(new Error(data.message || 'SQL backup failed'))
                        })
                    } as any as Response;
                    
                    this.createSqlBackup(mockSqlReq, mockSqlRes);
                });
                
                results.sqlBackup = sqlBackupResult;
                console.log('✅ SQL backup completed');
                
            } catch (sqlError) {
                console.error('❌ SQL backup failed:', sqlError);
                results.sqlBackup = { 
                    success: false, 
                    error: sqlError instanceof Error ? sqlError.message : 'SQL backup failed' 
                };
            }
            
            // Crează backup blob
            try {
                await new Promise<void>((resolve, reject) => {
                    const mockBlobRes = {
                        json: (data: any) => {
                            if (data.success) {
                                blobBackupResult = data;
                                resolve();
                            } else {
                                reject(new Error(data.message || 'Blob backup failed'));
                            }
                        },
                        status: () => ({
                            json: (data: any) => reject(new Error(data.message || 'Blob backup failed'))
                        })
                    } as any as Response;
                    
                    this.createBlobBackup(mockBlobReq, mockBlobRes);
                });
                
                results.blobBackup = blobBackupResult;
                console.log('✅ Blob backup completed');
                
            } catch (blobError) {
                console.error('❌ Blob backup failed:', blobError);
                results.blobBackup = { 
                    success: false, 
                    error: blobError instanceof Error ? blobError.message : 'Blob backup failed' 
                };
            }
            
            const sqlSuccess = results.sqlBackup?.success || false;
            const blobSuccess = results.blobBackup?.success || false;
            
            results.success = sqlSuccess && blobSuccess;
            
            if (results.success) {
                results.message = 'Backup complet creat cu succes';
            } else if (sqlSuccess && !blobSuccess) {
                results.message = 'Backup SQL creat cu succes, dar backup-ul blob a eșuat';
            } else if (!sqlSuccess && blobSuccess) {
                results.message = 'Backup blob creat cu succes, dar backup-ul SQL a eșuat';
            } else {
                results.message = 'Ambele backup-uri au eșuat';
            }
            
            const statusCode = results.success ? 200 : (sqlSuccess || blobSuccess) ? 206 : 500;
            
            res.status(statusCode).json(results);
            
        } catch (error) {
            console.error('Eroare la crearea backup-ului complet:', error);
            res.status(500).json({
                success: false,
                message: 'Eroare la crearea backup-ului complet',
                error: error instanceof Error ? error.message : 'Eroare necunoscută'
            });
        }
    }
    
    // Crează backup pentru Azure SQL Database
    async createSqlBackup(req: Request, res: Response): Promise<void> {
        try {
            if (!backupBlobServiceClient) {
                res.status(500).json({
                    success: false,
                    message: 'Configurația de backup nu este disponibilă'
                });
                return;
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const backupFolder = `sql-backups/${timestamp}`;
            
            console.log(`Creez backup SQL pentru timestamp: ${timestamp}`);
            
            // Lista tabelelor de backup
            const tables = [
                'Contabili',
                'Parteneri', 
                'SetariCompanie',
                'Utilizatori'
            ];
            
            const containerClient = backupBlobServiceClient.getContainerClient(backupContainerName);
            
            // Asigură-te că containerul există
            const containerExists = await containerClient.exists();
            if (!containerExists) {
                await containerClient.create();
                console.log(`Container ${backupContainerName} a fost creat`);
            }
            
            const backupResults: Array<{
                table: string;
                records?: number;
                blobPath?: string;
                status: 'success' | 'error';
                error?: string;
            }> = [];
            
            for (const tableName of tables) {
                try {
                    console.log(`Backup tabel: ${tableName}`);
                    
                    // Extrage datele din tabel
                    const result = await pool.request()
                        .query(`SELECT * FROM ${tableName}`);
                    
                    const tableData = {
                        tableName: tableName,
                        timestamp: new Date().toISOString(),
                        recordCount: result.recordset.length,
                        data: result.recordset
                    };
                    
                    // Salvează în blob storage
                    const blobName = `${backupFolder}/${tableName.toLowerCase()}.json`;
                    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
                    
                    const jsonContent = JSON.stringify(tableData, null, 2);
                    await blockBlobClient.upload(jsonContent, jsonContent.length, {
                        blobHTTPHeaders: {
                            blobContentType: 'application/json'
                        }
                    });
                    
                    backupResults.push({
                        table: tableName,
                        records: result.recordset.length,
                        blobPath: blobName,
                        status: 'success'
                    });
                    
                    console.log(`✅ Backup ${tableName}: ${result.recordset.length} înregistrări`);
                    
                } catch (tableError) {
                    console.error(`Eroare backup ${tableName}:`, tableError);
                    backupResults.push({
                        table: tableName,
                        status: 'error',
                        error: tableError instanceof Error ? tableError.message : 'Eroare necunoscută'
                    });
                }
            }
            
            // Crează fișierul de manifest
            const manifest = {
                backupType: 'sql',
                timestamp: timestamp,
                createdAt: new Date().toISOString(),
                tables: backupResults,
                totalTables: tables.length,
                successfulTables: backupResults.filter(r => r.status === 'success').length
            };
            
            const manifestBlobName = `${backupFolder}/manifest.json`;
            const manifestBlobClient = containerClient.getBlockBlobClient(manifestBlobName);
            const manifestContent = JSON.stringify(manifest, null, 2);
            await manifestBlobClient.upload(manifestContent, manifestContent.length, {
                blobHTTPHeaders: {
                    blobContentType: 'application/json'
                }
            });
            
            res.json({
                success: true,
                message: 'Backup SQL creat cu succes',
                backupId: timestamp,
                backupFolder: backupFolder,
                results: backupResults,
                manifest: manifest
            });
            
        } catch (error) {
            console.error('Eroare la crearea backup-ului SQL:', error);
            res.status(500).json({
                success: false,
                message: 'Eroare la crearea backup-ului SQL',
                error: error instanceof Error ? error.message : 'Eroare necunoscută'
            });
        }
    }
      // Listează backup-urile disponibile
    async listBackups(req: Request, res: Response): Promise<void> {
        try {
            if (!backupBlobServiceClient) {
                res.status(500).json({
                    success: false,
                    message: 'Configurația de backup nu este disponibilă'
                });
                return;
            }
              const containerClient = backupBlobServiceClient.getContainerClient(backupContainerName);
            const backups: Array<{
                id: string;
                type: string;
                createdAt: string;
                folder: string;
                totalTables?: number;
                successfulTables?: number;
                totalBlobs?: number;
                successfulBlobs?: number;
                totalSize?: number;
                size: number | undefined;
            }> = [];
            
            // Listează SQL backups
            for await (const blob of containerClient.listBlobsFlat({ prefix: 'sql-backups/' })) {
                if (blob.name.endsWith('manifest.json')) {
                    try {
                        // Citește manifest-ul pentru informații despre backup
                        const blobClient = containerClient.getBlobClient(blob.name);
                        const downloadResponse = await blobClient.download();
                        
                        if (downloadResponse.readableStreamBody) {
                            const chunks: Buffer[] = [];
                            for await (const chunk of downloadResponse.readableStreamBody) {
                                chunks.push(chunk as Buffer);
                            }
                            const content = Buffer.concat(chunks).toString('utf-8');
                            const manifest = JSON.parse(content);
                            
                            backups.push({
                                id: manifest.timestamp,
                                type: manifest.backupType || 'sql',
                                createdAt: manifest.createdAt,
                                folder: blob.name.replace('/manifest.json', ''),
                                totalTables: manifest.totalTables,
                                successfulTables: manifest.successfulTables,
                                size: blob.properties.contentLength
                            });
                        }
                    } catch (parseError) {
                        console.error('Eroare la parsarea manifest-ului SQL:', parseError);
                    }
                }
            }
            
            // Listează Blob backups
            for await (const blob of containerClient.listBlobsFlat({ prefix: 'blob-backups/' })) {
                if (blob.name.endsWith('manifest.json')) {
                    try {
                        // Citește manifest-ul pentru informații despre backup
                        const blobClient = containerClient.getBlobClient(blob.name);
                        const downloadResponse = await blobClient.download();
                        
                        if (downloadResponse.readableStreamBody) {
                            const chunks: Buffer[] = [];
                            for await (const chunk of downloadResponse.readableStreamBody) {
                                chunks.push(chunk as Buffer);
                            }
                            const content = Buffer.concat(chunks).toString('utf-8');
                            const manifest = JSON.parse(content);
                            
                            backups.push({
                                id: manifest.timestamp,
                                type: manifest.backupType || 'blob',
                                createdAt: manifest.createdAt,
                                folder: blob.name.replace('/manifest.json', ''),
                                totalBlobs: manifest.totalBlobs,
                                successfulBlobs: manifest.successfulBlobs,
                                totalSize: manifest.totalSize,
                                size: blob.properties.contentLength
                            });
                        }
                    } catch (parseError) {
                        console.error('Eroare la parsarea manifest-ului blob:', parseError);
                    }
                }
            }
            
            // Sortează backup-urile după dată (cel mai recent primul)
            backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            
            res.json({
                success: true,
                backups: backups,
                total: backups.length,
                sqlBackups: backups.filter(b => b.type === 'sql').length,
                blobBackups: backups.filter(b => b.type === 'blob').length
            });
            
        } catch (error) {
            console.error('Eroare la listarea backup-urilor:', error);
            res.status(500).json({
                success: false,
                message: 'Eroare la listarea backup-urilor',
                error: error instanceof Error ? error.message : 'Eroare necunoscută'
            });
        }
    }
      // Descarcă un backup specific
    async downloadBackup(req: Request, res: Response): Promise<void> {
        try {
            const { backupId, type } = req.params;
            
            if (!backupBlobServiceClient) {
                res.status(500).json({
                    success: false,
                    message: 'Configurația de backup nu este disponibilă'
                });
                return;
            }
            
            if (!backupId) {
                res.status(400).json({
                    success: false,
                    message: 'ID-ul backup-ului este obligatoriu'
                });
                return;
            }
            
            const backupType = type || 'sql'; // Default to SQL if type not specified
            const containerClient = backupBlobServiceClient.getContainerClient(backupContainerName);
            const manifestBlobName = `${backupType}-backups/${backupId}/manifest.json`;
            
            // Verifică dacă backup-ul există
            const manifestBlobClient = containerClient.getBlobClient(manifestBlobName);
            const exists = await manifestBlobClient.exists();
            
            if (!exists) {
                res.status(404).json({
                    success: false,
                    message: `Backup-ul ${backupType} nu a fost găsit`
                });
                return;
            }
            
            // Returnează URL-ul direct către manifest pentru download
            const downloadUrl = manifestBlobClient.url;
            
            res.json({
                success: true,
                downloadUrl: downloadUrl,
                backupId: backupId,
                backupType: backupType
            });
              } catch (error) {
            console.error('Eroare la descărcarea backup-ului:', error);
            res.status(500).json({
                success: false,
                message: 'Eroare la descărcarea backup-ului',
                error: error instanceof Error ? error.message : 'Eroare necunoscută'
            });
        }
    }
    
    // Obține istoricul backup-urilor
    async getBackupHistory(req: Request, res: Response): Promise<void> {
        try {
            const limit = parseInt(req.query.limit as string) || 50;
            const offset = parseInt(req.query.offset as string) || 0;
            
            const result = await SetariBackupService.getBackupHistory(limit, offset);
            res.json(result);
            
        } catch (error) {
            console.error('Eroare la obținerea istoricului backup:', error);
            res.status(500).json({
                success: false,
                message: 'Eroare la obținerea istoricului backup',
                error: error instanceof Error ? error.message : 'Eroare necunoscută'
            });
        }
    }
    
    // Obține statistici despre backup-uri
    async getBackupStats(req: Request, res: Response): Promise<void> {
        try {
            const result = await SetariBackupService.getBackupStats();
            res.json(result);
            
        } catch (error) {
            console.error('Eroare la obținerea statisticilor backup:', error);
            res.status(500).json({
                success: false,
                message: 'Eroare la obținerea statisticilor backup',
                error: error instanceof Error ? error.message : 'Eroare necunoscută'
            });
        }
    }
    
    // Obține detaliile unui backup specific
    async getBackupDetails(req: Request, res: Response): Promise<void> {
        try {
            const { backupId } = req.params;
            
            if (!backupId) {
                res.status(400).json({
                    success: false,
                    message: 'ID-ul backup-ului este obligatoriu'
                });
                return;
            }
            
            const backup = await SetariBackupService.getBackupById(backupId);
            
            if (!backup) {
                res.status(404).json({
                    success: false,
                    message: 'Backup-ul nu a fost găsit'
                });
                return;
            }
            
            res.json({
                success: true,
                backup: backup
            });
            
        } catch (error) {
            console.error('Eroare la obținerea detaliilor backup:', error);
            res.status(500).json({
                success: false,
                message: 'Eroare la obținerea detaliilor backup',
                error: error instanceof Error ? error.message : 'Eroare necunoscută'
            });
        }
    }
}

export default BackupController;
