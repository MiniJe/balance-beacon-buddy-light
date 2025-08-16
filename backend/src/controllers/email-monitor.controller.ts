import { Request, Response } from 'express';
import { emailMonitorService, EmailMonitorService } from '../services/email-monitor.service';
import { getDatabase } from '../config/sqlite';

export class EmailMonitorController {

    /**
     * Pornește monitorizarea automată a emailurilor
     * POST /api/email-monitor/start
     */
    async startMonitoring(req: Request, res: Response): Promise<void> {
        try {
            const { intervalMinutes = 5 } = req.body;

            // Verifică dacă configurația IMAP este setată
            const config = await EmailMonitorService.getConfigFromDatabase();
            if (!config) {
                res.status(400).json({
                    success: false,
                    error: 'Configurația IMAP nu este setată. Vă rugăm să configurați mai întâi setările IMAP.'
                });
                return;
            }

            await emailMonitorService.startMonitoring(intervalMinutes);

            res.json({
                success: true,
                message: `Monitorizarea emailurilor a fost pornită cu interval de ${intervalMinutes} minute`,
                config: {
                    host: config.host,
                    port: config.port,
                    user: config.user,
                    intervalMinutes
                }
            });

        } catch (error) {
            console.error('❌ Eroare la pornirea monitorizării:', error);
            res.status(500).json({
                success: false,
                error: 'Eroare la pornirea monitorizării emailurilor'
            });
        }
    }

    /**
     * Oprește monitorizarea automată a emailurilor
     * POST /api/email-monitor/stop
     */
    async stopMonitoring(req: Request, res: Response): Promise<void> {
        try {
            emailMonitorService.stopMonitoring();

            res.json({
                success: true,
                message: 'Monitorizarea emailurilor a fost oprită'
            });

        } catch (error) {
            console.error('❌ Eroare la oprirea monitorizării:', error);
            res.status(500).json({
                success: false,
                error: 'Eroare la oprirea monitorizării emailurilor'
            });
        }
    }

    /**
     * Verifică manual pentru emailuri noi
     * POST /api/email-monitor/check-now
     */
    async checkNow(req: Request, res: Response): Promise<void> {
        try {
            const processed = await emailMonitorService.checkForNewEmails();
            res.json({ success: true, processed });
        } catch (error) {
            console.error('❌ Eroare la verificarea manuală:', error);
            res.status(500).json({
                success: false,
                error: 'Eroare la verificarea manuală a emailurilor'
            });
        }
    }

    /**
     * Obține statisticile răspunsurilor
     * GET /api/email-monitor/response-stats
     */
    async getResponseStats(req: Request, res: Response): Promise<void> {
        try {
            const db = await getDatabase();
            const row = await db.get(`
                SELECT 
                    COUNT(*) as TotalEmailuriTrimise,
                    SUM(CASE WHEN DataRaspuns IS NOT NULL THEN 1 ELSE 0 END) as EmailuriCuRaspuns,
                    SUM(CASE WHEN TipRaspuns = 'CONFIRMED' THEN 1 ELSE 0 END) as RaspunsuriConfirmate,
                    SUM(CASE WHEN TipRaspuns = 'DISPUTED' THEN 1 ELSE 0 END) as RaspunsuriContestate,
                    SUM(CASE WHEN TipRaspuns = 'CORRECTIONS' THEN 1 ELSE 0 END) as RaspunsuriCorectii,
                    SUM(CASE WHEN TipRaspuns = 'GENERAL_RESPONSE' THEN 1 ELSE 0 END) as RaspunsuriGenerale,
                    SUM(CASE WHEN StatusTrimitere = 'RESPONDED' THEN 1 ELSE 0 END) as EmailuriRaspunse,
                    
                    -- Timp mediu răspuns în ore
                    AVG(
                        CASE WHEN DataRaspuns IS NOT NULL AND DataTrimitere IS NOT NULL THEN
                            (julianday(DataRaspuns) - julianday(DataTrimitere)) * 24.0
                        ELSE NULL END
                    ) as TimpMediuRaspunsOre
                FROM JurnalEmail
                WHERE datetime(DataTrimitere) >= datetime('now','-30 days')
                  AND TipEmail IN ('CONFIRMARE', 'REMINDER')
            `);

            const total = row?.TotalEmailuriTrimise || 0;
            const cuRaspuns = row?.EmailuriCuRaspuns || 0;
            const rata = total > 0 ? Math.round((cuRaspuns / total) * 10000) / 100 : 0;

            res.json({
                success: true,
                stats: {
                    totalEmailuriTrimise: total,
                    emailuriCuRaspuns: cuRaspuns,
                    rataRaspuns: rata,
                    timpMediuRaspunsOre: row?.TimpMediuRaspunsOre ?? null,
                    distributieRaspunsuri: {
                        confirmate: row?.RaspunsuriConfirmate || 0,
                        contestate: row?.RaspunsuriContestate || 0,
                        corectii: row?.RaspunsuriCorectii || 0,
                        generale: row?.RaspunsuriGenerale || 0
                    }
                }
            });

        } catch (error) {
            console.error('❌ Eroare la obținerea statisticilor:', error);
            res.status(500).json({
                success: false,
                error: 'Eroare la obținerea statisticilor răspunsurilor'
            });
        }
    }

    /**
     * Obține listă cu răspunsurile orphan (neprelucrate)
     * GET /api/email-monitor/orphan-responses
     */
    async getOrphanResponses(req: Request, res: Response): Promise<void> {
        try {
            const { limit = '50', offset = '0' } = req.query as any;
            const db = await getDatabase();
            // Dacă tabela nu există, returnează gol
            const cols = await db.all(`PRAGMA table_info(EmailRaspunsuriOrphan)`);
            if (!cols || cols.length === 0) {
                res.json({ success: true, data: [], pagination: { total: 0, limit: parseInt(limit), offset: parseInt(offset) } });
                return;
            }

            const data = await db.all(`
                SELECT 
                    Id,
                    FromAddress,
                    Subject,
                    Content,
                    ReceivedDate,
                    InReplyTo,
                    IsProcessed,
                    ProcessedDate,
                    ProcessedBy,
                    ProcessingNotes
                FROM EmailRaspunsuriOrphan
                WHERE IsProcessed = 0
                ORDER BY datetime(ReceivedDate) DESC
                LIMIT ? OFFSET ?
            `, [parseInt(limit), parseInt(offset)]);

            const countRow = await db.get(`
                SELECT COUNT(*) as Total FROM EmailRaspunsuriOrphan WHERE IsProcessed = 0
            `);

            res.json({
                success: true,
                data,
                pagination: {
                    total: countRow?.Total || 0,
                    limit: parseInt(limit),
                    offset: parseInt(offset)
                }
            });

        } catch (error) {
            console.error('❌ Eroare la obținerea răspunsurilor orphan:', error);
            res.status(500).json({
                success: false,
                error: 'Eroare la obținerea răspunsurilor orphan'
            });
        }
    }

    /**
     * Procesează manual un răspuns orphan
     * POST /api/email-monitor/process-orphan/:id
     */
    async processOrphanResponse(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { linkedToEmailId, processingNotes } = req.body;
            const userId = (req as any).user?.id || 'UNKNOWN';
            const db = await getDatabase();

            await db.run(`
                UPDATE EmailRaspunsuriOrphan
                SET 
                    IsProcessed = 1,
                    ProcessedDate = ?,
                    ProcessedBy = ?,
                    LinkedToEmailId = ?,
                    ProcessingNotes = ?
                WHERE Id = ?
            `, [
                new Date().toISOString(),
                userId,
                linkedToEmailId || null,
                processingNotes || null,
                id
            ]);

            res.json({
                success: true,
                message: 'Răspunsul orphan a fost procesat cu succes'
            });

        } catch (error) {
            console.error('❌ Eroare la procesarea răspunsului orphan:', error);
            res.status(500).json({
                success: false,
                error: 'Eroare la procesarea răspunsului orphan'
            });
        }
    }

    /**
     * Obține emailurile cu răspunsuri recente
     * GET /api/email-monitor/recent-responses
     */
    async getRecentResponses(req: Request, res: Response): Promise<void> {
        try {
            const { days = '7', limit = '20' } = req.query as any;
            const db = await getDatabase();
            const data = await db.all(`
                SELECT 
                    IdJurnalEmail,
                    EmailDestinatar,
                    NumeDestinatar,
                    SubiectEmail,
                    DataTrimitere,
                    DataRaspuns,
                    TipRaspuns,
                    RaspunsEmail,
                    StatusTrimitere,
                    TipEmail,
                    PriorityLevel,
                    ((julianday(DataRaspuns) - julianday(DataTrimitere)) * 24.0) as TimpRaspunsOre
                FROM JurnalEmail
                WHERE DataRaspuns IS NOT NULL
                  AND datetime(DataRaspuns) >= datetime('now', ?)
                ORDER BY datetime(DataRaspuns) DESC
                LIMIT ?
            `, [
                `-${parseInt(days)} days`,
                parseInt(limit)
            ]);

            res.json({
                success: true,
                data,
                message: `Găsite ${data.length} răspunsuri din ultimele ${days} zile`
            });

        } catch (error) {
            console.error('❌ Eroare la obținerea răspunsurilor recente:', error);
            res.status(500).json({
                success: false,
                error: 'Eroare la obținerea răspunsurilor recente'
            });
        }
    }
}

export const emailMonitorController = new EmailMonitorController();
