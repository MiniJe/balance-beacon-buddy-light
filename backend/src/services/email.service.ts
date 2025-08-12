import nodemailer from 'nodemailer';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { getDatabase } from '../config/sqlite';
import { jurnalEmailService } from './JurnalEmailService';
import { CreateJurnalEmailRequest } from '../models/JurnalEmail';
import { EmailTrackingService } from './email-tracking.service';

export interface EmailSettings {
    IdEmail: string;
    ServerSMTP: string;
    PortSMTP: number;
    NumeUtilizatorEmail: string;
    ParolaEmail: string;
    NumeExpeditor: string;
    EmailExpeditor: string;
    SemnaturaEmail: string;
    RaspundeLa?: string;
    CopieAscunsa?: string;
    UtilizeazaSSL: boolean;
    MetodaAutentificare: string;
}

export interface EmailData {
    to: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
    subject: string;
    text?: string;
    html?: string;
    replyTo?: string;
    // Opțiuni pentru tracking
    enableTracking?: boolean;
    idJurnalEmail?: string; // ID-ul înregistrării din JurnalEmail pentru tracking
}

export class EmailService {
    private transporter: nodemailer.Transporter | null = null;
    private emailSettings: EmailSettings | null = null;
    private decryptedPassword: string | null = null;

    // Inițializează serviciul de email cu setările din baza de date
    async initialize(): Promise<void> {
        try {
            console.log('🔄 Inițializează serviciul de email...');
            
            const db = await getDatabase();
            
            // Obține setările de email din baza de date SQLite
            const emailSettings = await db.get('SELECT * FROM SetariEmail WHERE IdEmail IS NOT NULL');

            if (!emailSettings) {
                throw new Error('Nu s-au găsit setări de email în baza de date');
            }

            this.emailSettings = emailSettings as EmailSettings;
            
            console.log('📧 Setări email încărcate:');
            console.log(`   Server: ${this.emailSettings.ServerSMTP}`);
            console.log(`   Port: ${this.emailSettings.PortSMTP}`);
            console.log(`   Username: ${this.emailSettings.NumeUtilizatorEmail}`);
            console.log(`   SSL: ${this.emailSettings.UtilizeazaSSL}`);
            console.log(`   Auth Method: ${this.emailSettings.MetodaAutentificare}`);
            console.log(`   Password length: ${this.emailSettings.ParolaEmail.length} chars`);
            
            // Verifică dacă parola este hash-uită sau în clar
            this.decryptedPassword = await this.getDecryptedPassword();
            
            // Creează transporter-ul nodemailer cu configurații specifice pentru Zoho
            this.transporter = nodemailer.createTransport({
                host: this.emailSettings.ServerSMTP,
                port: this.emailSettings.PortSMTP,
                secure: false, // false pentru STARTTLS pe port 587
                auth: {
                    user: this.emailSettings.NumeUtilizatorEmail,
                    pass: this.decryptedPassword
                },                tls: {
                    // Configurații securizate TLS - îndepărtez SSLv3 vulnerabil
                    minVersion: 'TLSv1.2',
                    maxVersion: 'TLSv1.3',
                    rejectUnauthorized: true,
                    ciphers: [
                        'ECDHE-RSA-AES128-GCM-SHA256',
                        'ECDHE-RSA-AES256-GCM-SHA384',
                        'ECDHE-RSA-AES128-SHA256',
                        'ECDHE-RSA-AES256-SHA384',
                        'DHE-RSA-AES128-GCM-SHA256',
                        'DHE-RSA-AES256-GCM-SHA384'
                    ].join(':'),
                    secureOptions: crypto.constants.SSL_OP_NO_SSLv2 | 
                                  crypto.constants.SSL_OP_NO_SSLv3 |
                                  crypto.constants.SSL_OP_NO_TLSv1 |
                                  crypto.constants.SSL_OP_NO_TLSv1_1
                },
                debug: true, // Activează logging detaliat
                logger: true
            });

            // Testează conexiunea
            await this.transporter.verify();
            console.log('✅ Serviciul de email a fost inițializat cu succes');
            console.log(`📧 Server SMTP: ${this.emailSettings.ServerSMTP}:${this.emailSettings.PortSMTP}`);
            console.log(`👤 Utilizator: ${this.emailSettings.NumeUtilizatorEmail}`);
            
        } catch (error) {
            console.error('❌ Eroare la inițializarea serviciului de email:', error);
            throw error;
        }
    }

    // Trimite un email
    async sendEmail(emailData: EmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
        try {
            if (!this.transporter || !this.emailSettings) {
                await this.initialize();
            }

            if (!this.transporter || !this.emailSettings) {
                throw new Error('Serviciul de email nu este inițializat');
            }

            // Construiește opțiunile de email
            const mailOptions = {
                from: {
                    name: this.emailSettings.NumeExpeditor,
                    address: this.emailSettings.EmailExpeditor
                },
                to: emailData.to,
                cc: emailData.cc,
                bcc: emailData.bcc || this.emailSettings.CopieAscunsa,
                subject: emailData.subject,
                text: emailData.text,
                html: emailData.html,
                replyTo: emailData.replyTo || this.emailSettings.RaspundeLa || this.emailSettings.EmailExpeditor
            };

            // Adaugă semnătura la sfârșitul mesajului
            if (this.emailSettings.SemnaturaEmail) {
                if (mailOptions.html) {
                    mailOptions.html += `<br><br>${this.emailSettings.SemnaturaEmail.replace(/\n/g, '<br>')}`;
                } else if (mailOptions.text) {
                    mailOptions.text += `\n\n${this.emailSettings.SemnaturaEmail}`;
                }
            }

            // Adaugă tracking pixel dacă este activat
            if (emailData.enableTracking && emailData.idJurnalEmail && mailOptions.html) {
                const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
                const trackingPixel = EmailTrackingService.generateTrackingPixel(
                    emailData.idJurnalEmail, 
                    baseUrl
                );
                
                // Adaugă pixel-ul la sfârșitul conținutului HTML
                mailOptions.html += trackingPixel;
                
                console.log(`📊 Tracking pixel adăugat pentru email ${emailData.idJurnalEmail}`);
            }

            // Trimite email-ul
            const result = await this.transporter.sendMail(mailOptions);
            
            // Loghează în baza de date
            await this.logEmail({
                to: Array.isArray(emailData.to) ? emailData.to.join(', ') : emailData.to,
                subject: emailData.subject,
                messageId: result.messageId,
                status: 'SUCCESS',
                trackingEnabled: emailData.enableTracking || false,
                idJurnalEmail: emailData.idJurnalEmail
            });

            console.log('✅ Email trimis cu succes:', result.messageId);
            return { success: true, messageId: result.messageId };

        } catch (error) {
            console.error('❌ Eroare la trimiterea email-ului:', error);
            
            // Loghează eroarea în baza de date
            await this.logEmail({
                to: Array.isArray(emailData.to) ? emailData.to.join(', ') : emailData.to,
                subject: emailData.subject,
                messageId: null,
                status: 'FAILED',
                error: error instanceof Error ? error.message : 'Eroare necunoscută',
                trackingEnabled: emailData.enableTracking || false,
                idJurnalEmail: emailData.idJurnalEmail
            });

            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Eroare necunoscută' 
            };
        }
    }

    // Testează conexiunea email
    async testConnection(): Promise<{ success: boolean; error?: string }> {
        try {
            if (!this.transporter) {
                await this.initialize();
            }

            if (!this.transporter) {
                throw new Error('Serviciul de email nu este inițializat');
            }

            await this.transporter.verify();
            return { success: true };
        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Eroare necunoscută' 
            };
        }
    }

    // Testează conexiunea cu o parolă furnizată
    async testConnectionWithPassword(password: string): Promise<{ success: boolean; error?: string }> {
        try {
            if (!this.emailSettings) {
                await this.initialize();
            }

            if (!this.emailSettings) {
                throw new Error('Setările de email nu sunt încărcate');
            }            // Creează un transporter temporar cu parola furnizată  
            const tempTransporter = nodemailer.createTransport({
                host: this.emailSettings.ServerSMTP,
                port: this.emailSettings.PortSMTP,
                secure: this.emailSettings.PortSMTP === 465,
                auth: {
                    user: this.emailSettings.NumeUtilizatorEmail,
                    pass: password
                },
                tls: {
                    rejectUnauthorized: false
                }
            });

            await tempTransporter.verify();
            return { success: true };
        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Eroare necunoscută' 
            };
        }
    }

    // Trimite email cu parolă furnizată direct
    async sendEmailWithPlainPassword(emailData: EmailData, password: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
        try {
            if (!this.emailSettings) {
                await this.initialize();
            }

            if (!this.emailSettings) {
                throw new Error('Setările de email nu sunt încărcate');
            }            // Creează un transporter temporar cu parola furnizată
            const tempTransporter = nodemailer.createTransport({
                host: this.emailSettings.ServerSMTP,
                port: this.emailSettings.PortSMTP,
                secure: this.emailSettings.PortSMTP === 465,
                auth: {
                    user: this.emailSettings.NumeUtilizatorEmail,
                    pass: password
                },
                tls: {
                    rejectUnauthorized: false
                }
            });

            const mailOptions = {
                from: `${this.emailSettings.NumeExpeditor} <${this.emailSettings.EmailExpeditor}>`,
                to: emailData.to,
                cc: emailData.cc,
                bcc: emailData.bcc,
                subject: emailData.subject,
                text: emailData.text,
                html: emailData.html,
                replyTo: emailData.replyTo || this.emailSettings.RaspundeLa
            };

            const info = await tempTransporter.sendMail(mailOptions);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Eroare necunoscută' 
            };
        }
    }

    // Loghează email-ul în noul tabel JurnalEmail
    private async logEmail(logData: {
        to: string;
        subject: string;
        messageId: string | null;
        status: 'SUCCESS' | 'FAILED';
        error?: string;
        partnerId?: string;  // Modificat de la number la string pentru UNIQUEIDENTIFIER
        templateId?: string;         // Modificat de la number la string pentru UNIQUEIDENTIFICATOR
        content?: string;
        emailType?: string;
        batchId?: string;    // Modificat de la number la string pentru UNIQUEIDENTIFICATOR
        createdBy?: string;
        senderName?: string;
        senderEmail?: string;
        recipientName?: string;
        recipientType?: 'PARTENER' | 'CONTABIL' | 'UTILIZATOR' | 'EXTERN';
        priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
        cc?: string;
        bcc?: string;
        replyTo?: string;
        confirmationRequestId?: string;
        // Opțiuni pentru tracking
        trackingEnabled?: boolean;
        idJurnalEmail?: string;
        attachmentHash?: string;    // Hash-ul fișierului PDF atașat
        digitalSignatureStatus?: string; // Status validare semnătură digitală (SEMNAT_VALID / NESEMNAT_DETECTAT / ERROR_VALIDATION)
        originalDocumentHash?: string;   // Hash-ul documentului original pentru comparație
        // ✅ Nou: meta-informații despre procesarea șablonului (variabile, status)
        templateMeta?: any;
    }): Promise<void> {
        try {
            // Construcție payload Atasamente (poate conține și meta despre șablon)
            let attachmentsPayload: string | undefined = undefined;
            try {
                const payloadObj: any = {};
                if (logData.attachmentHash) {
                    payloadObj.hash = logData.attachmentHash;
                    payloadObj.digitalSignatureStatus = logData.digitalSignatureStatus || 'UNKNOWN';
                    payloadObj.originalDocumentHash = logData.originalDocumentHash || null;
                    payloadObj.validationTimestamp = new Date().toISOString();
                }
                if (logData.templateMeta) {
                    payloadObj.templateMeta = logData.templateMeta;
                }
                if (Object.keys(payloadObj).length > 0) {
                    attachmentsPayload = JSON.stringify(payloadObj);
                }
            } catch (jsonErr) {
                console.error('❌ Eroare la serializarea meta/atașamente:', jsonErr);
            }

            const jurnalEmailData: CreateJurnalEmailRequest = {
                EmailDestinatar: logData.to,
                SubiectEmail: logData.subject,
                ContinutEmail: logData.content || undefined,
                TipEmail: this.mapEmailTypeToTipEmail(logData.emailType || 'TEST'),
                CreatDe: logData.createdBy || 'SISTEM',
                
                // Informații opționale
                IdPartener: logData.partnerId,
                IdSablon: logData.templateId,
                IdLot: logData.batchId,
                IdCerereConfirmare: logData.confirmationRequestId,
                PriorityLevel: logData.priority || 'NORMAL',
                
                // Informații despre expeditor
                NumeExpeditor: logData.senderName || this.emailSettings?.NumeExpeditor,
                EmailExpeditor: logData.senderEmail || this.emailSettings?.EmailExpeditor,
                
                // Informații despre destinatar
                NumeDestinatar: logData.recipientName,
                TipDestinatar: logData.recipientType,
                
                // Informații suplimentare
                EmailCC: logData.cc,
                EmailBCC: logData.bcc,
                EmailReplyTo: logData.replyTo,
                Atașamente: attachmentsPayload,  // JSON cu hash + meta șablon dacă există
                
                // Configurare încercări
                MaximIncercari: 3
            };

            const result = await jurnalEmailService.createJurnalEmail(jurnalEmailData);
            
            if (result.success && result.data) {
                // Actualizează cu rezultatul trimiterii
                await jurnalEmailService.updateJurnalEmail({
                    IdJurnalEmail: (result.data as any).IdJurnalEmail,
                    StatusTrimitere: logData.status,
                    MesajEroare: logData.error,
                    IdMessageEmail: logData.messageId || undefined,
                    DataUltimaIncercare: new Date(),
                    ModificatDe: logData.createdBy || 'SISTEM'
                });
                
                // Dacă tracking este activat, actualizează flag-ul în baza de date
                if (logData.trackingEnabled) {
                    try {
                        const db = await getDatabase();
                        await db.run(`
                            UPDATE JurnalEmail 
                            SET TrackingEnabled = 1
                            WHERE IdJurnalEmail = ?
                        `, [(result.data as any).IdJurnalEmail]);
                        
                        console.log(`📊 Flag de tracking activat pentru email ${(result.data as any).IdJurnalEmail}`);
                    } catch (trackingError) {
                        console.error('❌ Eroare la activarea tracking-ului:', trackingError);
                    }
                }
                
                console.log('✅ Email înregistrat cu succes în JurnalEmail');
            } else {
                console.error('❌ Eroare la înregistrarea în JurnalEmail:', result.error);
            }
        } catch (error) {
            console.error('❌ Eroare la logarea email-ului în JurnalEmail:', error);
            // Nu aruncă eroarea pentru că nu vrem să întrerupă trimiterea email-ului
        }
    }

    // Mapează tipul de email la enum-ul din JurnalEmail
    private mapEmailTypeToTipEmail(emailType: string): 'CONFIRMARE' | 'REMINDER' | 'TEST' | 'GENERAL' {
        switch (emailType.toUpperCase()) {
            case 'CONFIRMARE':
            case 'CONFIRMATION':
                return 'CONFIRMARE';
            case 'REMINDER':
                return 'REMINDER';
            case 'TEST':
                return 'TEST';
            default:
                return 'GENERAL';
        }
    }

    // Actualizează parola email cu hash
    async updateEmailPassword(password: string): Promise<{ success: boolean; error?: string }> {
        try {
            const saltRounds = 12;
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            
            const db = await getDatabase();
            const result = await db.run(`
                UPDATE SetariEmail 
                SET ParolaEmail = ?
                WHERE IdEmail IS NOT NULL
            `, [hashedPassword]);

            if (result.changes && result.changes > 0) {
                // Reinitializează serviciul cu noile setări
                await this.initialize();
                return { success: true };
            } else {
                return { success: false, error: 'Nu s-au actualizat înregistrări' };
            }
        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Eroare necunoscută' 
            };
        }
    }

    // Trimite email cu atașament
    async sendEmailWithAttachment(
        emailData: EmailData & { attachments: any[] },
        logData?: {
            partnerId?: string;
            recipientName?: string;
            recipientType?: 'PARTENER' | 'CONTABIL' | 'UTILIZATOR' | 'EXTERN';
            batchId?: string;
            confirmationRequestId?: string;
            emailType?: string;
            createdBy?: string;
            senderName?: string;
            senderEmail?: string;
            priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
            templateId?: string;        // ID-ul șablonului de email folosit (UNIQUEIDENTIFIER ca string)
            attachmentHash?: string;    // Hash-ul fișierului PDF atașat
            digitalSignatureStatus?: string; // Status validare semnătură digitală (SEMNAT_VALID / NESEMNAT_DETECTAT / ERROR_VALIDATION)
            originalDocumentHash?: string;   // Hash-ul documentului original pentru comparație
            templateMeta?: any;              // ✅ meta info șablon
        }
    ): Promise<{ success: boolean; messageId?: string; error?: string }> {
        try {
            if (!this.transporter) {
                await this.initialize();
            }

            if (!this.transporter) {
                throw new Error('Serviciul de email nu este inițializat');
            }

            const mailOptions = {
                from: `${this.emailSettings?.NumeExpeditor} <${this.emailSettings?.EmailExpeditor}>`,
                to: emailData.to,
                cc: emailData.cc,
                bcc: emailData.bcc,
                subject: emailData.subject,
                text: emailData.text,
                html: emailData.html,
                replyTo: emailData.replyTo || this.emailSettings?.RaspundeLa,
                attachments: emailData.attachments
            };

            const info = await this.transporter.sendMail(mailOptions);
            
            // Loghează în baza de date cu informații suplimentare
            await this.logEmail({
                to: Array.isArray(emailData.to) ? emailData.to.join(', ') : emailData.to,
                subject: emailData.subject,
                messageId: info.messageId,
                status: 'SUCCESS',
                // Adaugă informații din logData dacă sunt disponibile
                partnerId: logData?.partnerId,
                recipientName: logData?.recipientName,
                recipientType: logData?.recipientType,
                batchId: logData?.batchId,
                confirmationRequestId: logData?.confirmationRequestId,
                emailType: logData?.emailType || 'CONFIRMARE',
                createdBy: logData?.createdBy,
                senderName: logData?.senderName,
                senderEmail: logData?.senderEmail,
                priority: logData?.priority || 'NORMAL',
                templateId: logData?.templateId,        // ID-ul șablonului de email
                attachmentHash: logData?.attachmentHash,  // Hash-ul fișierului PDF
                digitalSignatureStatus: logData?.digitalSignatureStatus, // Status validare semnătură
                originalDocumentHash: logData?.originalDocumentHash,      // Hash original pentru comparație
                // ✅ Salvăm și conținutul final al emailului pentru audit
                content: emailData.html
            });
            
            console.log('✅ Email cu atașament trimis cu succes:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('❌ Eroare la trimiterea email-ului cu atașament:', error);
            
            // Loghează eroarea în baza de date cu informații suplimentare
            await this.logEmail({
                to: Array.isArray(emailData.to) ? emailData.to.join(', ') : emailData.to,
                subject: emailData.subject,
                messageId: null,
                status: 'FAILED',
                error: error instanceof Error ? error.message : 'Eroare necunoscută',
                // Adaugă informații din logData dacă sunt disponibile
                partnerId: logData?.partnerId,
                recipientName: logData?.recipientName,
                recipientType: logData?.recipientType,
                batchId: logData?.batchId,
                confirmationRequestId: logData?.confirmationRequestId,
                emailType: logData?.emailType || 'CONFIRMARE',
                createdBy: logData?.createdBy,
                senderName: logData?.senderName,
                senderEmail: logData?.senderEmail,
                priority: logData?.priority || 'NORMAL',
                templateId: logData?.templateId,        // ID-ul șablonului de email
                attachmentHash: logData?.attachmentHash,  // Hash-ul fișierului PDF
                digitalSignatureStatus: logData?.digitalSignatureStatus, // Status validare semnătură
                originalDocumentHash: logData?.originalDocumentHash,      // Hash original pentru comparație
                // ✅ Dacă avem HTML, îl salvăm pentru audit chiar și pe eșec
                content: emailData.html
            });
            
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Eroare necunoscută' 
            };
        }
    }

    // Obține setările de email
    getEmailSettings(): EmailSettings | null {
        return this.emailSettings;
    }

    // Decrypt password
    private async decryptPassword(encryptedPassword: string): Promise<string> {
        try {
            if (!this.decryptedPassword) {
                const saltRounds = 10;
                const hashedPassword = await bcrypt.hash(encryptedPassword, saltRounds);
                this.decryptedPassword = hashedPassword;
            }
            return this.decryptedPassword;
        } catch (error) {
            console.error('❌ Eroare la decriptarea parolei:', error);
            throw error;
        }
    }

    // Determină parola corectă (acceptă atât hash-uri cât și plain-text)
    private async getDecryptedPassword(): Promise<string> {
        if (!this.emailSettings) {
            throw new Error('Setările de email nu sunt încărcate');
        }

        const storedPassword = this.emailSettings.ParolaEmail;
        
        // Verifică dacă parola este un hash bcrypt (începe cu $2b$)
        if (storedPassword.startsWith('$2b$')) {
            console.log('🔐 Parola este hash-uită cu bcrypt - nu poate fi folosită direct');
            console.log('💡 Pentru a rezolva această problemă:');
            console.log('   1. Accesează Setări > Configurare Server Email');
            console.log('   2. Introdu parola originală în câmpul "Parola email curentă"');
            console.log('   3. Folosește funcția "Resetează Parola" pentru a o salva în format utilizabil');
            throw new Error('Parola email este hash-uită și nu poate fi folosită pentru autentificare SMTP. Accesează Setări pentru a o reseta cu parola originală.');
        } else {
            console.log('✅ Parola este în format utilizabil pentru SMTP');
            return storedPassword;
        }
    }

    /**
     * Înregistrează un email ca fiind eșuat din motive de securitate (fișier nesemnat, etc.)
     * Această metodă nu încearcă trimiterea, doar înregistrează eșecul în JurnalEmail
     */
    async logEmailFailed(logData: {
        to: string;
        subject: string;
        error: string;
        partnerId?: string;
        recipientName?: string;
        recipientType?: 'PARTENER' | 'CONTABIL' | 'UTILIZATOR' | 'EXTERN';
        batchId?: string;
        confirmationRequestId?: string;
        emailType?: string;
        createdBy?: string;
        senderName?: string;
        senderEmail?: string;
        templateId?: string;
        attachmentHash?: string;
        digitalSignatureStatus?: string;
        originalDocumentHash?: string;
    }): Promise<void> {
        try {
            console.log(`📝 Înregistrare email eșuat: ${logData.to} - ${logData.error}`);
            
            await this.logEmail({
                to: logData.to,
                subject: logData.subject,
                messageId: null,
                status: 'FAILED',
                error: logData.error,
                partnerId: logData.partnerId,
                recipientName: logData.recipientName,
                recipientType: logData.recipientType,
                batchId: logData.batchId,
                confirmationRequestId: logData.confirmationRequestId,
                emailType: logData.emailType || 'CONFIRMARE',
                createdBy: logData.createdBy,
                senderName: logData.senderName,
                senderEmail: logData.senderEmail,
                templateId: logData.templateId,
                attachmentHash: logData.attachmentHash,
                digitalSignatureStatus: logData.digitalSignatureStatus,
                originalDocumentHash: logData.originalDocumentHash
            });
            
            console.log(`✅ Email eșuat înregistrat cu succes pentru ${logData.to}`);
        } catch (error) {
            console.error('❌ Eroare la înregistrarea email-ului eșuat:', error);
            throw error;
        }
    }
}

// Instanță singleton a serviciului de email
export const emailService = new EmailService();
