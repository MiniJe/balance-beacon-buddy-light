import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { getDatabase } from '../config/sqlite';

interface EmailMonitorConfig {
    host: string;
    port: number;
    user: string;
    password: string;
    tls: boolean;
    tlsOptions?: {
        rejectUnauthorized: boolean;
    };
}

interface ParsedEmailResponse {
    messageId: string;
    from: string;
    to: string[];
    subject: string;
    text: string;
    html?: string;
    date: Date;
    inReplyTo?: string;
    references?: string[];
}

export class EmailMonitorService {
    private imapConfig: EmailMonitorConfig;
    private imap: any;
    private isMonitoring: boolean = false;
    private monitoringInterval: NodeJS.Timeout | null = null;

    constructor(config: EmailMonitorConfig) {
        this.imapConfig = config;
    }

    /**
     * Pornește monitorizarea automată a emailurilor primite
     */
    async startMonitoring(intervalMinutes: number = 5): Promise<void> {
        console.log('🔍 Pornind monitorizarea automată a emailurilor...');
        
        this.isMonitoring = true;
        
        // Verificare inițială
        await this.checkForNewEmails();
        
        // Setează interval pentru verificări periodice
        this.monitoringInterval = setInterval(async () => {
            if (this.isMonitoring) {
                await this.checkForNewEmails();
            }
        }, intervalMinutes * 60 * 1000);

        console.log(`✅ Monitorizare pornită cu interval de ${intervalMinutes} minute`);
    }

    /**
     * Oprește monitorizarea automată
     */
    stopMonitoring(): void {
        console.log('🛑 Oprind monitorizarea automată...');
        
        this.isMonitoring = false;
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }

        if (this.imap) {
            this.imap.end();
        }

        console.log('✅ Monitorizare oprită');
    }

    /**
     * Verifică pentru emailuri noi și le procesează
     */
    public async checkForNewEmails(): Promise<number> {
        try {
            console.log('📧 Verificând pentru emailuri noi...');
            
            // Conectează la IMAP
            await this.connectToImap();
            
            // Caută emailuri necitite
            const unseenEmails = await this.fetchUnseenEmails();
            
            if (unseenEmails.length > 0) {
                console.log(`📬 Găsite ${unseenEmails.length} emailuri noi`);
                
                // Procesează fiecare email
                for (const email of unseenEmails) {
                    await this.processEmailResponse(email);
                }
            } else {
                console.log('✅ Nu sunt emailuri noi');
            }
            
            // Închide conexiunea
            if (this.imap) this.imap.end();
            return unseenEmails.length;
            
        } catch (error) {
            console.error('❌ Eroare la verificarea emailurilor:', error);
            return 0;
        }
    }

    /**
     * Conectează la serverul IMAP
     */
    private async connectToImap(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.imap = new Imap({
                user: this.imapConfig.user,
                password: this.imapConfig.password,
                host: this.imapConfig.host,
                port: this.imapConfig.port,
                tls: this.imapConfig.tls,
                tlsOptions: this.imapConfig.tlsOptions || { rejectUnauthorized: false }
            });

            this.imap.once('ready', () => {
                console.log('✅ Conectat la IMAP');
                resolve();
            });

            this.imap.once('error', (err: Error) => {
                console.error('❌ Eroare IMAP:', err);
                reject(err);
            });

            this.imap.connect();
        });
    }

    /**
     * Preia emailurile necitite din INBOX
     */
    private async fetchUnseenEmails(): Promise<ParsedEmailResponse[]> {
        return new Promise((resolve, reject) => {
            this.imap.openBox('INBOX', false, (err: Error, box: any) => {
                if (err) {
                    reject(err);
                    return;
                }

                // Caută emailuri necitite din ultimele 7 zile
                const searchCriteria = [
                    'UNSEEN',
                    ['SINCE', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)]
                ];

                this.imap.search(searchCriteria, (err: Error, results: number[]) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    if (!results || results.length === 0) {
                        resolve([]);
                        return;
                    }

                    const emails: ParsedEmailResponse[] = [];
                    let processedCount = 0;

                    const fetch = this.imap.fetch(results, { bodies: '' });

                    fetch.on('message', (msg: any, seqno: number) => {
                        let buffer = '';

                        msg.on('body', (stream: any, info: any) => {
                            stream.on('data', (chunk: Buffer) => {
                                buffer += chunk.toString('utf8');
                            });

                            stream.once('end', async () => {
                                try {
                                    const parsed = await simpleParser(buffer);
                                    
                                    const emailData: ParsedEmailResponse = {
                                        messageId: parsed.messageId || '',
                                        from: parsed.from?.text || '',
                                        to: parsed.to?.text ? [parsed.to.text] : [],
                                        subject: parsed.subject || '',
                                        text: parsed.text || '',
                                        html: parsed.html || undefined,
                                        date: parsed.date || new Date(),
                                        inReplyTo: parsed.inReplyTo || undefined,
                                        references: parsed.references || []
                                    };

                                    emails.push(emailData);
                                } catch (parseError) {
                                    console.error('❌ Eroare la parsarea emailului:', parseError);
                                }

                                processedCount++;
                                if (processedCount === results.length) {
                                    resolve(emails);
                                }
                            });
                        });

                        msg.once('attributes', (attrs: any) => {
                            // Marchează emailul ca citit
                            this.imap.addFlags(attrs.uid, '\\Seen', (err: Error) => {
                                if (err) {
                                    console.error('❌ Eroare la marcarea emailului ca citit:', err);
                                }
                            });
                        });
                    });

                    fetch.once('error', (err: Error) => {
                        reject(err);
                    });

                    fetch.once('end', () => {
                        if (processedCount === 0) {
                            resolve([]);
                        }
                    });
                });
            });
        });
    }

    /**
     * Procesează un răspuns email și actualizează baza de date
     */
    private async processEmailResponse(email: ParsedEmailResponse): Promise<void> {
        try {
            console.log(`📝 Procesând email de la: ${email.from}`);
            console.log(`📄 Subiect: ${email.subject}`);

            // Extrage adresa email a expeditorului
            const senderEmail = this.extractEmailAddress(email.from);
            
            // Caută emailul original în baza de date
            const originalEmail = await this.findOriginalEmail(senderEmail, email.subject, email.inReplyTo);
            
            if (originalEmail) {
                console.log(`🔗 Găsit email original: ${originalEmail.IdJurnalEmail}`);
                
                // Determină tipul răspunsului
                const responseType = this.determineResponseType(email.subject, email.text);
                
                // Actualizează înregistrarea din jurnal
                await this.updateEmailWithResponse(originalEmail.IdJurnalEmail, {
                    DataRaspuns: email.date,
                    RaspunsEmail: email.text,
                    TipRaspuns: responseType,
                    StatusRaspuns: 'RECEIVED'
                });

                // (Opțional) Dacă există JurnalCereriConfirmare și e legat, actualizează
                if (originalEmail.IdCerereConfirmare) {
                    await this.updateCerereConfirmare(originalEmail.IdCerereConfirmare, responseType, email.text, email.date);
                }

                console.log(`✅ Email procesat cu succes pentru ${senderEmail}`);
            } else {
                console.log(`⚠️ Nu s-a găsit email original pentru răspunsul de la ${senderEmail}`);
                
                // Salvează răspunsul ca email orphan pentru investigare manuală
                await this.saveOrphanResponse(email);
            }

        } catch (error) {
            console.error('❌ Eroare la procesarea răspunsului email:', error);
        }
    }

    /**
     * Extrage adresa email din string-ul "Nume <email@domain.com>"
     */
    private extractEmailAddress(emailString: string): string {
        const match = emailString.match(/<(.+?)>/);
        return match ? match[1] : emailString.trim();
    }

    /**
     * Caută emailul original în baza de date
     */
    private async findOriginalEmail(senderEmail: string, subject: string, inReplyTo?: string): Promise<any> {
        try {
            const db = await getDatabase();
            // 1) Match precis pe In-Reply-To → IdMessageEmail
            if (inReplyTo) {
                const r = await db.get(`
                    SELECT * FROM JurnalEmail
                    WHERE IdMessageEmail = ?
                    ORDER BY datetime(DataTrimitere) DESC
                    LIMIT 1
                `, [inReplyTo]);
                if (r) return r;
            }

            // 2) Fallback: match pe expeditor (devine destinatarul nostru trimis) și subiect similar în ultimele 30 zile
            const baseSubject = subject.replace(/^(RE:|FW:|FWD:)/i, '').trim();
            const like = `%${baseSubject}%`;
            const r2 = await db.get(`
                SELECT * FROM JurnalEmail
                WHERE lower(EmailDestinatar) = lower(?)
                  AND (
                        SubiectEmail LIKE ?
                     OR ? LIKE '%' || SubiectEmail || '%'
                  )
                  AND datetime(DataTrimitere) >= datetime('now','-30 days')
                ORDER BY datetime(DataTrimitere) DESC
                LIMIT 1
            `, [senderEmail, like, baseSubject]);
            return r2 || null;
        } catch (error) {
            console.error('❌ Eroare la căutarea emailului original:', error);
            return null;
        }
    }

    /**
     * Determină tipul răspunsului pe baza conținutului
     */
    private determineResponseType(subject: string, content: string): string {
        const lowerSubject = subject.toLowerCase();
        const lowerContent = content.toLowerCase();

        // Cuvinte cheie pentru confirmare
        const confirmKeywords = ['confirm', 'agree', 'accept', 'correct', 'ok', 'da', 'confirm', 'acord', 'corect'];
        // Cuvinte cheie pentru contestare
        const disputeKeywords = ['dispute', 'disagree', 'incorrect', 'wrong', 'nu', 'contester', 'incorect', 'greșit'];
        // Cuvinte cheie pentru corecții
        const correctionKeywords = ['correction', 'modify', 'change', 'update', 'corecție', 'modificare', 'schimbare'];

        if (confirmKeywords.some(keyword => lowerContent.includes(keyword) || lowerSubject.includes(keyword))) {
            return 'CONFIRMED';
        }
        
        if (disputeKeywords.some(keyword => lowerContent.includes(keyword) || lowerSubject.includes(keyword))) {
            return 'DISPUTED';
        }
        
        if (correctionKeywords.some(keyword => lowerContent.includes(keyword) || lowerSubject.includes(keyword))) {
            return 'CORRECTIONS';
        }

        return 'GENERAL_RESPONSE';
    }

    /**
     * Actualizează emailul cu informațiile despre răspuns
     */
    private async updateEmailWithResponse(idJurnalEmail: string, responseData: any): Promise<void> {
        try {
            const db = await getDatabase();
            await db.run(`
                UPDATE JurnalEmail
                SET 
                    DataRaspuns = COALESCE(DataRaspuns, ?),
                    RaspunsEmail = ?,
                    TipRaspuns = ?,
                    StatusRaspuns = ?,
                    StatusTrimitere = CASE WHEN StatusTrimitere = 'SUCCESS' THEN 'RESPONDED' ELSE StatusTrimitere END,
                    ModificatLa = ?,
                    ModificatDe = 'EMAIL_MONITOR_SERVICE'
                WHERE IdJurnalEmail = ?
            `, [
                (responseData.DataRaspuns instanceof Date) ? responseData.DataRaspuns.toISOString() : responseData.DataRaspuns,
                responseData.RaspunsEmail || null,
                responseData.TipRaspuns || null,
                responseData.StatusRaspuns || 'RECEIVED',
                new Date().toISOString(),
                idJurnalEmail
            ]);
            console.log(`✅ Actualizat emailul ${idJurnalEmail} cu răspunsul`);
        } catch (error) {
            console.error('❌ Eroare la actualizarea emailului cu răspunsul:', error);
        }
    }

    /**
     * Actualizează cererea de confirmare cu răspunsul
     */
    private async updateCerereConfirmare(idCerere: string, tipRaspuns: string, observatii: string, dataRaspuns: Date): Promise<void> {
        try {
            const db = await getDatabase();
            // Verificăm dacă tabela există
            const cols = await db.all(`PRAGMA table_info(JurnalCereriConfirmare)`);
            if (!cols || cols.length === 0) return; // nu există, ieșim liniștit

            // Mapare status
            let statusCerere = 'trimisa';
            if (tipRaspuns === 'CONFIRMED') statusCerere = 'confirmata';
            else if (tipRaspuns === 'DISPUTED') statusCerere = 'refuzata';

            await db.run(`
                UPDATE JurnalCereriConfirmare
                SET 
                    dataRaspuns = ?,
                    timeStampRaspuns = ?,
                    tipRaspuns = ?,
                    observatiiRaspuns = ?,
                    statusCerere = ?,
                    modificatLa = ?
                WHERE idCerere = ?
            `, [
                dataRaspuns.toISOString(),
                Math.floor(dataRaspuns.getTime()/1000),
                tipRaspuns.toLowerCase(),
                observatii || null,
                statusCerere,
                new Date().toISOString(),
                idCerere
            ]);
            console.log(`✅ Actualizată cererea de confirmare ${idCerere}`);
        } catch (error) {
            console.error('❌ Eroare la actualizarea cererii de confirmare:', error);
        }
    }

    /**
     * Salvează răspunsuri orphan pentru investigare manuală
     */
    private async saveOrphanResponse(email: ParsedEmailResponse): Promise<void> {
        try {
            const db = await getDatabase();
            await this.ensureOrphanSchema();
            await db.run(`
                INSERT INTO EmailRaspunsuriOrphan (
                    MessageId, FromAddress, Subject, Content, ReceivedDate, InReplyTo, CreatedAt, IsProcessed
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 0)
            `, [
                email.messageId || null,
                email.from,
                email.subject,
                email.text || email.html || '',
                (email.date instanceof Date) ? email.date.toISOString() : new Date().toISOString(),
                email.inReplyTo || null,
                new Date().toISOString()
            ]);
            console.log('📝 Salvat răspuns orphan pentru investigare manuală');
        } catch (error) {
            console.error('❌ Eroare la salvarea răspunsului orphan:', error);
        }
    }

    private async ensureOrphanSchema(): Promise<void> {
        try {
            const db = await getDatabase();
            await db.run(`
                CREATE TABLE IF NOT EXISTS EmailRaspunsuriOrphan (
                    Id INTEGER PRIMARY KEY AUTOINCREMENT,
                    MessageId TEXT,
                    FromAddress TEXT,
                    Subject TEXT,
                    Content TEXT,
                    ReceivedDate TEXT,
                    InReplyTo TEXT,
                    CreatedAt TEXT,
                    IsProcessed INTEGER DEFAULT 0,
                    ProcessedDate TEXT,
                    ProcessedBy TEXT,
                    LinkedToEmailId TEXT,
                    ProcessingNotes TEXT
                )
            `);
        } catch (e) {
            console.error('❌ Eroare creare schemă EmailRaspunsuriOrphan:', e);
        }
    }

    /**
     * Obține configurația din setările aplicației
     */
    static async getConfigFromDatabase(): Promise<EmailMonitorConfig | null> {
        // Pentru varianta locală fără Azure: citim din variabile de mediu
        const host = process.env.IMAP_HOST;
        const port = parseInt(process.env.IMAP_PORT || '993');
        const user = process.env.IMAP_USER;
        const password = process.env.IMAP_PASSWORD;
        const tls = (process.env.IMAP_TLS || 'true') === 'true';
        if (host && user && password) {
            return { host, port, user, password, tls, tlsOptions: { rejectUnauthorized: false } };
        }
        return null;
    }
}

// Instanța singleton pentru serviciu
export const emailMonitorService = new EmailMonitorService({
    host: process.env.IMAP_HOST || 'imap.gmail.com',
    port: parseInt(process.env.IMAP_PORT || '993'),
    user: process.env.IMAP_USER || '',
    password: process.env.IMAP_PASSWORD || '',
    tls: (process.env.IMAP_TLS || 'true') === 'true',
    tlsOptions: { rejectUnauthorized: false }
});
