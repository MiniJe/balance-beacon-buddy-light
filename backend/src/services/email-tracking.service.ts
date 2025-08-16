import { Request, Response } from 'express';
import { getDatabase } from '../config/sqlite';
import crypto from 'crypto';

export class EmailTrackingService {
    // Asigură existența tabelelor pentru action tokens și events
    static async ensureSchema() {
        try {
            const db = await getDatabase();
            await db.run(`
                CREATE TABLE IF NOT EXISTS EmailTrackingTokens (
                    Id INTEGER PRIMARY KEY AUTOINCREMENT,
                    IdJurnalEmail TEXT NOT NULL,
                    TrackingToken TEXT NOT NULL UNIQUE,
                    CreatedAt TEXT NOT NULL
                )
            `);
            await db.run(`
                CREATE TABLE IF NOT EXISTS EmailTrackingOpens (
                    Id INTEGER PRIMARY KEY AUTOINCREMENT,
                    IdJurnalEmail TEXT NOT NULL,
                    IpAddress TEXT,
                    UserAgent TEXT,
                    OpenedAt TEXT NOT NULL
                )
            `);
            await db.run(`
                CREATE TABLE IF NOT EXISTS EmailActionTokens (
                    Token TEXT PRIMARY KEY,
                    IdJurnalEmail TEXT NOT NULL,
                    Action TEXT NOT NULL, -- CONFIRM | WILL_RESPOND
                    CreatedAt TEXT NOT NULL,
                    FirstHitAt TEXT,
                    UsedAt TEXT,
                    UsedIp TEXT,
                    UsedUserAgent TEXT
                )
            `);
            await db.run(`
                CREATE TABLE IF NOT EXISTS EmailActionEvents (
                    Id INTEGER PRIMARY KEY AUTOINCREMENT,
                    IdJurnalEmail TEXT NOT NULL,
                    Token TEXT,
                    Action TEXT NOT NULL,
                    IpAddress TEXT,
                    UserAgent TEXT,
                    CreatedAt TEXT NOT NULL
                )
            `);
        } catch (e) {
            console.error('❌ Eroare ensureSchema EmailAction*:', e);
        }
    }

    /**
     * Generează un tracking pixel pentru un email
     */
    static generateTrackingPixel(idJurnalEmail: string, baseUrl: string): string {
        // Creează un token unic pentru tracking
        const trackingToken = crypto.randomBytes(32).toString('hex');
        
        // Construiește URL-ul pentru pixel
        const pixelUrl = `${baseUrl}/api/email-tracking/pixel/${trackingToken}`;
        
        // Salvează token-ul în baza de date
        this.saveTrackingToken(idJurnalEmail, trackingToken);
        
        // Returnează HTML-ul pentru pixel (1x1 transparent)
        return `<img src="${pixelUrl}" width="1" height="1" style="display:none;" alt="" />`;
    }

    /**
     * Generează butoane de acțiune (confirmare / va răspunde) pentru email
     */
    static async generateActionButtons(idJurnalEmail: string, baseUrl: string): Promise<string> {
        await this.ensureSchema();
        const tokenConfirm = crypto.randomBytes(24).toString('hex');
        const tokenWill = crypto.randomBytes(24).toString('hex');
        const now = new Date().toISOString();
        try {
            const db = await getDatabase();
            await db.run(`INSERT INTO EmailActionTokens (Token, IdJurnalEmail, Action, CreatedAt) VALUES (?, ?, 'CONFIRM', ?)`, [tokenConfirm, idJurnalEmail, now]);
            await db.run(`INSERT INTO EmailActionTokens (Token, IdJurnalEmail, Action, CreatedAt) VALUES (?, ?, 'WILL_RESPOND', ?)`, [tokenWill, idJurnalEmail, now]);
        } catch (e) {
            console.error('❌ Eroare la salvarea token-urilor acțiune:', e);
        }
        const urlConfirm = `${baseUrl}/api/email-tracking/confirm/${tokenConfirm}`;
        const urlWill = `${baseUrl}/api/email-tracking/will-respond/${tokenWill}`;
        return `
        <div style="margin:16px 0;padding:12px;border:1px solid #e5e7eb;border-radius:10px;background:#f8fafc">
          <div style="font-size:13px;color:#334155;margin-bottom:8px;font-weight:600">Confirmare rapidă</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <a href="${urlConfirm}" style="background:#16a34a;color:#fff;text-decoration:none;padding:8px 12px;border-radius:8px;font-weight:600;display:inline-block">CONFIRMĂ PRIMIREA</a>
            <a href="${urlWill}" style="background:#2563eb;color:#fff;text-decoration:none;padding:8px 12px;border-radius:8px;font-weight:600;display:inline-block">VOM RĂSPUNDE ÎN SCURT TIMP</a>
          </div>
        </div>`;
    }

    static async recordActionHit(token: string, action: 'CONFIRM'|'WILL_RESPOND', req: Request) {
        try {
            await this.ensureSchema();
            const db = await getDatabase();
            const row = await db.get(`SELECT * FROM EmailActionTokens WHERE Token = ? AND Action = ?`, [token, action]);
            if (!row) return { ok: false };
            const now = new Date().toISOString();
            if (!row.FirstHitAt) {
                await db.run(`UPDATE EmailActionTokens SET FirstHitAt = ? WHERE Token = ?`, [now, token]);
            }
            await db.run(`INSERT INTO EmailActionEvents (IdJurnalEmail, Token, Action, IpAddress, UserAgent, CreatedAt) VALUES (?, ?, ?, ?, ?, ?)`, [row.IdJurnalEmail, token, `${action}_HIT`, (req.ip || ''), (req.get('User-Agent') || ''), now]);
            return { ok: true, idJurnalEmail: row.IdJurnalEmail };
        } catch (e) {
            console.error('❌ Eroare recordActionHit:', e);
            return { ok: false };
        }
    }

    static async recordActionConfirm(token: string, action: 'CONFIRM'|'WILL_RESPOND', req: Request) {
        try {
            await this.ensureSchema();
            const db = await getDatabase();
            const row = await db.get(`SELECT * FROM EmailActionTokens WHERE Token = ? AND Action = ?`, [token, action]);
            if (!row) return { ok: false };
            const now = new Date().toISOString();
            await db.run(`UPDATE EmailActionTokens SET UsedAt = ?, UsedIp = ?, UsedUserAgent = ? WHERE Token = ?`, [now, (req.ip || ''), (req.get('User-Agent') || ''), token]);
            await db.run(`INSERT INTO EmailActionEvents (IdJurnalEmail, Token, Action, IpAddress, UserAgent, CreatedAt) VALUES (?, ?, ?, ?, ?, ?)`, [row.IdJurnalEmail, token, `${action}_CONFIRMED`, (req.ip || ''), (req.get('User-Agent') || ''), now]);
            // Actualizează JurnalEmail: marchează răspunsul și citirea (dacă lipsește)
            const tipRaspuns = action === 'CONFIRM' ? 'CONFIRMED' : 'GENERAL_RESPONSE';
            await db.run(`
                UPDATE JurnalEmail
                SET 
                  DataRaspuns = COALESCE(DataRaspuns, ?),
                  TipRaspuns = ?,
                  StatusRaspuns = 'RECEIVED',
                  StatusTrimitere = 'RESPONDED',
                  DataCitire = COALESCE(DataCitire, ?)
                WHERE IdJurnalEmail = ?
            `, [now, tipRaspuns, now, row.IdJurnalEmail]);
            return { ok: true, idJurnalEmail: row.IdJurnalEmail };
        } catch (e) {
            console.error('❌ Eroare recordActionConfirm:', e);
            return { ok: false };
        }
    }

    /**
     * Reconciliere stări pentru un email deja trimis (post-factum)
     * Actualizează JurnalEmail pe baza EmailActionEvents și deschiderilor
     */
    static async reconcileEmailState(idJurnalEmail: string): Promise<{ updated: boolean }>{
        try {
            await this.ensureSchema();
            const db = await getDatabase();
            const confirm = await db.get(`SELECT MIN(CreatedAt) as At FROM EmailActionEvents WHERE IdJurnalEmail = ? AND Action = 'CONFIRM_CONFIRMED'`, [idJurnalEmail]);
            const will = await db.get(`SELECT MIN(CreatedAt) as At FROM EmailActionEvents WHERE IdJurnalEmail = ? AND Action = 'WILL_RESPOND_CONFIRMED'`, [idJurnalEmail]);
            const anyHit = await db.get(`SELECT MIN(CreatedAt) as At FROM EmailActionEvents WHERE IdJurnalEmail = ? AND Action IN ('CONFIRM_HIT','WILL_RESPOND_HIT')`, [idJurnalEmail]);
            const anyOpen = await db.get(`SELECT MIN(OpenedAt) as At FROM EmailTrackingOpens WHERE IdJurnalEmail = ?`, [idJurnalEmail]);

            let updated = false;
            if (confirm?.At || will?.At || anyHit?.At || anyOpen?.At) {
                const nowReadAt = anyOpen?.At || anyHit?.At || null;
                const raspAt = confirm?.At || will?.At || null;
                const tipRaspuns = confirm?.At ? 'CONFIRMED' : (will?.At ? 'GENERAL_RESPONSE' : null);
                const sets: string[] = [];
                const vals: any[] = [];
                if (raspAt && tipRaspuns) {
                    sets.push('DataRaspuns = COALESCE(DataRaspuns, ?)', 'TipRaspuns = ?', `StatusRaspuns = 'RECEIVED'`, `StatusTrimitere = 'RESPONDED'`);
                    vals.push(raspAt, tipRaspuns);
                }
                if (nowReadAt) {
                    sets.push('DataCitire = COALESCE(DataCitire, ?)');
                    vals.push(nowReadAt);
                }
                if (sets.length > 0) {
                    vals.push(idJurnalEmail);
                    await db.run(`UPDATE JurnalEmail SET ${sets.join(', ')} WHERE IdJurnalEmail = ?`, vals);
                    updated = true;
                }
            }
            return { updated };
        } catch (e) {
            console.error('❌ Eroare reconcileEmailState:', e);
            return { updated: false };
        }
    }

    /**
     * Salvează token-ul de tracking în baza de date
     */
    private static async saveTrackingToken(idJurnalEmail: string, trackingToken: string): Promise<void> {
        try {
            await this.ensureSchema();
            const db = await getDatabase();
            await db.run(`
                INSERT INTO EmailTrackingTokens (IdJurnalEmail, TrackingToken, CreatedAt)
                VALUES (?, ?, ?)
            `, [idJurnalEmail, trackingToken, new Date().toISOString()]);
        } catch (error) {
            console.error('❌ Eroare la salvarea token-ului de tracking:', error);
        }
    }

    /**
     * Înregistrează deschiderea unui email
     */
    static async recordEmailOpen(trackingToken: string, ipAddress: string, userAgent: string): Promise<boolean> {
        try {
            const db = await getDatabase();
            
            // Găsește emailul asociat cu token-ul
            const tokenResult = await db.get(`
                SELECT IdJurnalEmail FROM EmailTrackingTokens 
                WHERE TrackingToken = ?
            `, [trackingToken]);

            if (!tokenResult) {
                console.log('⚠️ Token de tracking invalid:', trackingToken);
                return false;
            }

            const idJurnalEmail = tokenResult.IdJurnalEmail;

            // Verifică dacă nu a fost deja înregistrată o deschidere recentă (în ultimele 5 minute)
            const recentOpenCheck = await db.get(`
                SELECT COUNT(*) as RecentOpens 
                FROM EmailTrackingOpens 
                WHERE IdJurnalEmail = ? 
                AND OpenedAt >= datetime('now', '-5 minutes')
            `, [idJurnalEmail]);

            if (recentOpenCheck && recentOpenCheck.RecentOpens > 0) {
                console.log('⚠️ Deschidere duplicată detectată în ultimele 5 minute');
                return false;
            }

            // Înregistrează deschiderea
            await db.run(`
                INSERT INTO EmailTrackingOpens (IdJurnalEmail, IpAddress, UserAgent, OpenedAt)
                VALUES (?, ?, ?, ?)
            `, [idJurnalEmail, ipAddress, userAgent, new Date().toISOString()]);

            // Actualizează emailul cu prima deschidere (dacă nu există deja)
            await db.run(`
                UPDATE JurnalEmail 
                SET DataCitire = ?
                WHERE IdJurnalEmail = ? 
                AND DataCitire IS NULL
            `, [new Date().toISOString(), idJurnalEmail]);

            console.log(`✅ Înregistrată deschiderea emailului ${idJurnalEmail}`);
            return true;

        } catch (error) {
            console.error('❌ Eroare la înregistrarea deschiderii emailului:', error);
            return false;
        }
    }

    /**
     * Obține statistici de deschidere pentru un email
     */
    static async getEmailOpenStats(idJurnalEmail: string): Promise<any> {
        try {
            const db = await getDatabase();
            const result = await db.get(`
                SELECT 
                    COUNT(*) as TotalOpens,
                    COUNT(DISTINCT IpAddress) as UniqueOpens,
                    MIN(OpenedAt) as FirstOpenedAt,
                    MAX(OpenedAt) as LastOpenedAt,
                    je.DataCitire,
                    je.DataTrimitere
                FROM EmailTrackingOpens eto
                RIGHT JOIN JurnalEmail je ON eto.IdJurnalEmail = je.IdJurnalEmail
                WHERE je.IdJurnalEmail = ?
                GROUP BY je.DataCitire, je.DataTrimitere
            `, [idJurnalEmail]);

            return result || null;

        } catch (error) {
            console.error('❌ Eroare la obținerea statisticilor de deschidere:', error);
            return null;
        }
    }

    /**
     * Identifică partenerii care nu au deschis emailurile în ultimele N zile
     */
    static async getUnresponsivePartners(days: number = 7): Promise<any[]> {
        try {
            const db = await getDatabase();
            const result = await db.all(`
                SELECT 
                    je.IdJurnalEmail,
                    je.EmailDestinatar,
                    je.NumeDestinatar,
                    je.SubiectEmail,
                    je.DataTrimitere,
                    je.TipEmail,
                    je.PriorityLevel,
                    je.IdPartener,
                    je.IdCerereConfirmare,
                    
                    -- Verifică dacă emailul a fost deschis
                    CASE 
                        WHEN je.DataCitire IS NOT NULL THEN 1
                        WHEN EXISTS (
                            SELECT 1 FROM EmailTrackingOpens eto 
                            WHERE eto.IdJurnalEmail = je.IdJurnalEmail
                        ) THEN 1
                        ELSE 0
                    END as EmailDeschis,
                    
                    -- Verifică dacă a răspuns
                    CASE 
                        WHEN je.DataRaspuns IS NOT NULL THEN 1
                        ELSE 0
                    END as ARaspuns,
                    
                    -- Calculează zilele de la trimitere
                    julianday('now') - julianday(je.DataTrimitere) as ZileDeLaTrimitere
                    
                FROM JurnalEmail je
                WHERE je.DataTrimitere >= datetime('now', '-' || ? || ' days')
                AND je.StatusTrimitere IN ('SUCCESS', 'RESPONDED')
                AND je.TipEmail IN ('CONFIRMARE', 'REMINDER')
                
                -- Nu a deschis emailul
                AND je.DataCitire IS NULL
                AND NOT EXISTS (
                    SELECT 1 FROM EmailTrackingOpens eto 
                    WHERE eto.IdJurnalEmail = je.IdJurnalEmail
                )
                
                -- Nu a răspuns
                AND je.DataRaspuns IS NULL
                
                ORDER BY je.DataTrimitere ASC
            `, [days]);

            return result;

        } catch (error) {
            console.error('❌ Eroare la identificarea partenerilor neresponsivi:', error);
            return [];
        }
    }

    /**
     * Generează raport de tracking pentru un lot de emailuri
     */
    static async generateTrackingReport(idLot?: string, idCerereConfirmare?: string): Promise<any> {
        try {
            const db = await getDatabase();
            let whereClause = '';
            let params: any[] = [];

            if (idLot) {
                whereClause = 'WHERE je.IdLot = ?';
                params = [idLot];
            } else if (idCerereConfirmare) {
                whereClause = 'WHERE je.IdCerereConfirmare = ?';
                params = [idCerereConfirmare];
            } else {
                whereClause = `WHERE je.DataTrimitere >= datetime('now', '-30 days')`;
                params = [];
            }

            const result = await db.get(`
                SELECT 
                    COUNT(*) as TotalEmailuri,
                    COUNT(CASE WHEN je.DataCitire IS NOT NULL OR EXISTS (
                        SELECT 1 FROM EmailTrackingOpens eto WHERE eto.IdJurnalEmail = je.IdJurnalEmail
                    ) THEN 1 END) as EmailuriDeschise,
                    COUNT(CASE WHEN je.DataRaspuns IS NOT NULL THEN 1 END) as EmailuriRaspunse,
                    
                    -- Rata de deschidere
                    CASE 
                        WHEN COUNT(*) > 0 THEN 
                            ROUND(CAST(COUNT(CASE WHEN je.DataCitire IS NOT NULL OR EXISTS (
                                SELECT 1 FROM EmailTrackingOpens eto WHERE eto.IdJurnalEmail = je.IdJurnalEmail
                            ) THEN 1 END) AS REAL) / COUNT(*) * 100, 2)
                        ELSE 0 
                    END as RataDeschidere,
                    
                    -- Rata de răspuns
                    CASE 
                        WHEN COUNT(*) > 0 THEN 
                            ROUND(CAST(COUNT(CASE WHEN je.DataRaspuns IS NOT NULL THEN 1 END) AS REAL) / COUNT(*) * 100, 2)
                        ELSE 0 
                    END as RataRaspuns,
                    
                    -- Timpul mediu până la deschidere (în ore)
                    AVG(CASE 
                        WHEN je.DataCitire IS NOT NULL THEN 
                            (julianday(je.DataCitire) - julianday(je.DataTrimitere)) * 24
                        ELSE NULL 
                    END) as TimpMediuDeschidereOre
                    
                FROM JurnalEmail je
                ${whereClause}
                AND je.StatusTrimitere IN ('SUCCESS', 'RESPONDED')
            `, params);

            return result;

        } catch (error) {
            console.error('❌ Eroare la generarea raportului de tracking:', error);
            return null;
        }
    }
}

export class EmailTrackingController {

    /**
     * Endpoint pentru pixel de tracking
     * GET /api/email-tracking/pixel/:token
     */
    async trackPixel(req: Request, res: Response): Promise<void> {
        try {
            const { token } = req.params;
            const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
            const userAgent = req.get('User-Agent') || 'unknown';

            await EmailTrackingService.recordEmailOpen(token, ipAddress, userAgent);

            // Returnează un pixel transparent 1x1
            const pixelBuffer = Buffer.from(
                'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 
                'base64'
            );

            res.setHeader('Content-Type', 'image/gif');
            res.setHeader('Content-Length', pixelBuffer.length);
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            
            res.end(pixelBuffer);

        } catch (error) {
            console.error('❌ Eroare la tracking pixel:', error);
            
            // Returnează un pixel gol chiar și în caz de eroare
            const pixelBuffer = Buffer.from(
                'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 
                'base64'
            );
            res.setHeader('Content-Type', 'image/gif');
            res.end(pixelBuffer);
        }
    }

    // Afișează pagina de confirmare cu buton explicit (pentru evitarea click-urilor automate)
    private renderActionPage(title: string, description: string, confirmUrl: string) {
        return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
        <style>body{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f6f7fb;margin:0;padding:40px}
        .card{max-width:520px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;box-shadow:0 6px 18px rgba(0,0,0,.06);padding:24px}
        .h{font-weight:700;color:#111827;margin:0 0 6px}
        .p{color:#6b7280;margin:0 0 16px}
        .btn{display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600}
        .ok{background:#16a34a}
        </style></head><body>
        <div class="card"><h1 class="h">${title}</h1><p class="p">${description}</p><a class="btn ok" href="${confirmUrl}">Confirmă</a></div>
        </body></html>`;
    }

    async confirmIntent(req: Request, res: Response): Promise<void> {
        const { token } = req.params;
        await EmailTrackingService.recordActionHit(token, 'CONFIRM', req);
        const url = `${(process.env.BASE_URL || '')}/api/email-tracking/confirm/ok/${token}`;
        res.status(200).send(this.renderActionPage('Confirmare primire', 'Te rugăm să confirmi că ai primit acest e-mail.', url));
    }

    async confirmFinalize(req: Request, res: Response): Promise<void> {
        const { token } = req.params;
        const ok = await EmailTrackingService.recordActionConfirm(token, 'CONFIRM', req);
        res.status(200).send(this.renderActionPage('Mulțumim!', 'Confirmarea a fost înregistrată.', '#'));
    }

    async willRespondIntent(req: Request, res: Response): Promise<void> {
        const { token } = req.params;
        await EmailTrackingService.recordActionHit(token, 'WILL_RESPOND', req);
        const url = `${(process.env.BASE_URL || '')}/api/email-tracking/will-respond/ok/${token}`;
        res.status(200).send(this.renderActionPage('Vom răspunde în scurt timp', 'Confirmă intenția de a răspunde în curând.', url));
    }

    async willRespondFinalize(req: Request, res: Response): Promise<void> {
        const { token } = req.params;
        const ok = await EmailTrackingService.recordActionConfirm(token, 'WILL_RESPOND', req);
        res.status(200).send(this.renderActionPage('Mulțumim!', 'Am înregistrat intenția de a răspunde.', '#'));
    }

    /**
     * Obține statistici de tracking pentru un email
     * GET /api/email-tracking/stats/:idJurnalEmail
     */
    async getEmailStats(req: Request, res: Response): Promise<void> {
        try {
            const { idJurnalEmail } = req.params;
            
            const stats = await EmailTrackingService.getEmailOpenStats(idJurnalEmail);
            
            res.json({
                success: true,
                data: stats
            });

        } catch (error) {
            console.error('❌ Eroare la obținerea statisticilor:', error);
            res.status(500).json({
                success: false,
                error: 'Eroare la obținerea statisticilor de tracking'
            });
        }
    }

    /**
     * Identifică partenerii neresponsivi
     * GET /api/email-tracking/unresponsive-partners
     */
    async getUnresponsivePartners(req: Request, res: Response): Promise<void> {
        try {
            const { days = 7 } = req.query;
            
            const partners = await EmailTrackingService.getUnresponsivePartners(parseInt(days as string));
            
            res.json({
                success: true,
                data: partners,
                summary: {
                    totalUnresponsive: partners.length,
                    daysChecked: parseInt(days as string)
                }
            });

        } catch (error) {
            console.error('❌ Eroare la identificarea partenerilor neresponsivi:', error);
            res.status(500).json({
                success: false,
                error: 'Eroare la identificarea partenerilor neresponsivi'
            });
        }
    }

    /**
     * Generează raport de tracking
     * GET /api/email-tracking/report
     */
    async generateReport(req: Request, res: Response): Promise<void> {
        try {
            const { idLot, idCerereConfirmare } = req.query;
            
            const report = await EmailTrackingService.generateTrackingReport(
                idLot as string, 
                idCerereConfirmare as string
            );
            
            res.json({
                success: true,
                data: report
            });

        } catch (error) {
            console.error('❌ Eroare la generarea raportului:', error);
            res.status(500).json({
                success: false,
                error: 'Eroare la generarea raportului de tracking'
            });
        }
    }

    /**
     * Reconciliere manuală pentru un email (admin)
     * GET /api/email-tracking/reconcile/:idJurnalEmail
     */
    async reconcile(req: Request, res: Response): Promise<void> {
        try {
            const { idJurnalEmail } = req.params;
            const result = await EmailTrackingService.reconcileEmailState(idJurnalEmail);
            res.json({ success: true, data: result });
        } catch (error) {
            console.error('❌ Eroare la reconciliere:', error);
            res.status(500).json({ success: false, error: 'Eroare la reconciliere' });
        }
    }

    /**
     * Trimite reminder automat către partenerii neresponsivi
     * POST /api/email-tracking/send-reminders
     */
    async sendReminders(req: Request, res: Response): Promise<void> {
        try {
            const { days = 7, reminderType = 'SOFT' } = req.body;
            
            // Găsește partenerii neresponsivi
            const unresponsivePartners = await EmailTrackingService.getUnresponsivePartners(days);
            
            if (unresponsivePartners.length === 0) {
                res.json({
                    success: true,
                    message: 'Nu există parteneri neresponsivi în perioada specificată',
                    data: { remindersCount: 0 }
                });
                return;
            }

            let remindersCount = 0;
            const errors: string[] = [];

            // Trimite remindere pentru fiecare partener
            for (const partner of unresponsivePartners) {
                try {
                    // Construiește subiectul reminder-ului
                    let reminderSubject = '';
                    if (reminderType === 'SOFT') {
                        reminderSubject = `REAMINTIRE: ${partner.SubiectEmail}`;
                    } else {
                        reminderSubject = `URGENT - REAMINTIRE: ${partner.SubiectEmail}`;
                    }

                    // Construiește conținutul reminder-ului
                    const reminderContent = this.buildReminderContent(partner, reminderType);

                    // Aici ar trebui să integrezi cu serviciul de email pentru trimiterea efectivă
                    // Pentru moment, doar simulez trimiterea
                    console.log(`📧 Trimitere reminder către: ${partner.EmailDestinatar}`);
                    
                    remindersCount++;

                } catch (error) {
                    console.error(`❌ Eroare la trimiterea reminder-ului către ${partner.EmailDestinatar}:`, error);
                    errors.push(`Eroare pentru ${partner.EmailDestinatar}: ${error}`);
                }
            }

            res.json({
                success: true,
                message: `Trimise ${remindersCount} remindere din ${unresponsivePartners.length} parteneri neresponsivi`,
                data: {
                    remindersCount,
                    totalUnresponsive: unresponsivePartners.length,
                    errors: errors.length > 0 ? errors : undefined
                }
            });

        } catch (error) {
            console.error('❌ Eroare la trimiterea reminder-elor:', error);
            res.status(500).json({
                success: false,
                error: 'Eroare la trimiterea reminder-elor automate'
            });
        }
    }

    /**
     * Construiește conținutul pentru reminder
     */
    private buildReminderContent(partner: any, reminderType: string): string {
        const urgencyText = reminderType === 'URGENT' ? 'URGENT - ' : '';
        
        return `
        <h3>${urgencyText}Reamintire Confirmare Sold</h3>
        <p>Stimate partener,</p>
        
        <p>Vă reamintim cu privire la cererea de confirmare a soldului trimisă în data de 
        <strong>${new Date(partner.DataTrimitere).toLocaleDateString('ro-RO')}</strong>.</p>
        
        <p>Subiect original: <strong>${partner.SubiectEmail}</strong></p>
        
        <p>Vă rugăm să răspundeți la acest email pentru a confirma sau contesta soldul prezentat.</p>
        
        <p>Pentru orice întrebări, vă rugăm să ne contactați.</p>
        
        <p>Cu respect,<br>
        Echipa Financiară</p>
        `;
    }
}

export const emailTrackingController = new EmailTrackingController();
