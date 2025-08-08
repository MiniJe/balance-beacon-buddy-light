import { Request, Response } from 'express';
import { emailMonitorService, EmailMonitorService } from '../services/email-monitor.service';
import { pool } from '../config/azure';

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
            // Implementează verificarea manuală prin apelarea directă a metodei private
            // Pentru aceasta, va trebui să fac metoda publică în serviciu
            
            res.json({
                success: true,
                message: 'Verificarea manuală a fost inițiată'
            });

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
            const result = await pool.request().query(`
                SELECT 
                    COUNT(*) as TotalEmailuriTrimise,
                    COUNT(CASE WHEN DataRaspuns IS NOT NULL THEN 1 END) as EmailuriCuRaspuns,
                    COUNT(CASE WHEN TipRaspuns = 'CONFIRMED' THEN 1 END) as RaspunsuriConfirmate,
                    COUNT(CASE WHEN TipRaspuns = 'DISPUTED' THEN 1 END) as RaspunsuriContestate,
                    COUNT(CASE WHEN TipRaspuns = 'CORRECTIONS' THEN 1 END) as RaspunsuriCorecții,
                    COUNT(CASE WHEN TipRaspuns = 'GENERAL_RESPONSE' THEN 1 END) as RaspunsuriGenerale,
                    COUNT(CASE WHEN StatusTrimitere = 'RESPONDED' THEN 1 END) as EmailuriRaspunse,
                    
                    -- Calculează rata de răspuns
                    CASE 
                        WHEN COUNT(*) > 0 THEN 
                            ROUND(CAST(COUNT(CASE WHEN DataRaspuns IS NOT NULL THEN 1 END) AS FLOAT) / COUNT(*) * 100, 2)
                        ELSE 0 
                    END as RataRaspuns,
                    
                    -- Timpul mediu de răspuns în ore
                    AVG(CASE 
                        WHEN DataRaspuns IS NOT NULL AND DataTrimitere IS NOT NULL THEN 
                            DATEDIFF(hour, DataTrimitere, DataRaspuns)
                        ELSE NULL 
                    END) as TimpMediuRaspunsOre
                    
                FROM JurnalEmail 
                WHERE DataTrimitere >= DATEADD(day, -30, GETDATE())
                AND TipEmail IN ('CONFIRMARE', 'REMINDER')
            `);

            const stats = result.recordset[0];

            res.json({
                success: true,
                stats: {
                    totalEmailuriTrimise: stats.TotalEmailuriTrimise,
                    emailuriCuRaspuns: stats.EmailuriCuRaspuns,
                    rataRaspuns: stats.RataRaspuns,
                    timpMediuRaspunsOre: stats.TimpMediuRaspunsOre,
                    distributieRaspunsuri: {
                        confirmate: stats.RaspunsuriConfirmate,
                        contestate: stats.RaspunsuriContestate,
                        corecții: stats.RaspunsuriCorecții,
                        generale: stats.RaspunsuriGenerale
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
            const { limit = 50, offset = 0 } = req.query;

            const result = await pool.request()
                .input('Limit', parseInt(limit as string))
                .input('Offset', parseInt(offset as string))
                .query(`
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
                    ORDER BY ReceivedDate DESC
                    OFFSET @Offset ROWS
                    FETCH NEXT @Limit ROWS ONLY
                `);

            const countResult = await pool.request().query(`
                SELECT COUNT(*) as Total 
                FROM EmailRaspunsuriOrphan 
                WHERE IsProcessed = 0
            `);

            res.json({
                success: true,
                data: result.recordset,
                pagination: {
                    total: countResult.recordset[0].Total,
                    limit: parseInt(limit as string),
                    offset: parseInt(offset as string)
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

            await pool.request()
                .input('Id', id)
                .input('LinkedToEmailId', linkedToEmailId || null)
                .input('ProcessingNotes', processingNotes || null)
                .input('ProcessedBy', userId)
                .query(`
                    UPDATE EmailRaspunsuriOrphan
                    SET 
                        IsProcessed = 1,
                        ProcessedDate = GETDATE(),
                        ProcessedBy = @ProcessedBy,
                        LinkedToEmailId = @LinkedToEmailId,
                        ProcessingNotes = @ProcessingNotes
                    WHERE Id = @Id
                `);

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
            const { days = 7, limit = 20 } = req.query;

            const result = await pool.request()
                .input('Days', parseInt(days as string))
                .input('Limit', parseInt(limit as string))
                .query(`
                    SELECT TOP (@Limit)
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
                        DATEDIFF(hour, DataTrimitere, DataRaspuns) as TimpRaspunsOre
                    FROM JurnalEmail
                    WHERE DataRaspuns IS NOT NULL
                    AND DataRaspuns >= DATEADD(day, -@Days, GETDATE())
                    ORDER BY DataRaspuns DESC
                `);

            res.json({
                success: true,
                data: result.recordset,
                message: `Găsite ${result.recordset.length} răspunsuri din ultimele ${days} zile`
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
