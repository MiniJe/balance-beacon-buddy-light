import { Request, Response } from 'express';
import { emailService, EmailData } from '../services/email.service';
import { ApiResponseHelper } from '../types/api.types';
import { pool } from '../config/azure';
import { jurnalDocumenteEmiseCleanService } from '../services/JurnalDocumenteEmiseClean.service';
import { CreateJurnalDocumenteEmiseDto } from '../models/JurnalDocumenteEmise';
import crypto from 'crypto';

export class EmailController {
    
    // Testează conexiunea email
    async testEmailConnection(req: Request, res: Response): Promise<void> {
        try {
            const result = await emailService.testConnection();
            
            if (result.success) {
                res.json(ApiResponseHelper.success(
                    { settings: emailService.getEmailSettings() },
                    'Conexiunea email funcționează corect'
                ));
            } else {
                res.status(500).json(ApiResponseHelper.error(
                    'Eroare la testarea conexiunii email',
                    'CONNECTION_TEST_ERROR',
                    result.error
                ));
            }
            
        } catch (error) {
            console.error('Eroare la testarea conexiunii email:', error);
            res.status(500).json(ApiResponseHelper.error(
                'Eroare fatală la testarea conexiunii email',
                'FATAL_CONNECTION_ERROR',
                error instanceof Error ? error.message : 'Eroare necunoscută'
            ));
        }
    }
    
    // Trimite un email de test
    async sendTestEmail(req: Request, res: Response): Promise<void> {
        try {
            const { emailDestinatar, subiect, mesaj } = req.body;
            
            if (!emailDestinatar || !subiect) {
                res.status(400).json(ApiResponseHelper.validationError('emailDestinatar|subiect', 'Email destinatar și subiect sunt obligatorii'));
                return;
            }
            
            const emailData: EmailData = {
                to: emailDestinatar,
                subject: subiect,
                html: `
                    <h2>Email de test - Balance Beacon Buddy</h2>
                    <p><strong>Data:</strong> ${new Date().toLocaleString('ro-RO')}</p>
                    <p><strong>Mesaj:</strong></p>
                    <p>${mesaj || 'Acesta este un email de test pentru a verifica funcționalitatea sistemului de email.'}</p>
                    <hr>
                    <p><em>Acest email a fost trimis automat de sistemul Balance Beacon Buddy.</em></p>
                `,
                text: `
Email de test - Balance Beacon Buddy

Data: ${new Date().toLocaleString('ro-RO')}
Mesaj: ${mesaj || 'Acesta este un email de test pentru a verifica funcționalitatea sistemului de email.'}

---
Acest email a fost trimis automat de sistemul Balance Beacon Buddy.
                `
            };
            
            const result = await emailService.sendEmail(emailData);
            
            if (result.success) {
                res.json(ApiResponseHelper.success(
                    { messageId: result.messageId },
                    'Email de test trimis cu succes'
                ));
            } else {
                res.status(500).json(ApiResponseHelper.error(
                    'Eroare la trimiterea email-ului de test',
                    'SEND_TEST_EMAIL_ERROR',
                    result.error
                ));
            }
            
        } catch (error) {
            console.error('Eroare la trimiterea email-ului de test:', error);
            res.status(500).json(ApiResponseHelper.error(
                'Eroare fatală la trimiterea email-ului de test',
                'FATAL_SEND_ERROR',
                error instanceof Error ? error.message : 'Eroare necunoscută'
            ));
        }
    }
    
    // Trimite email personalizat
    async sendEmail(req: Request, res: Response): Promise<void> {
        try {
            const { to, cc, bcc, subject, text, html, replyTo } = req.body;
            
            if (!to || !subject) {
                res.status(400).json(ApiResponseHelper.validationError('to|subject', 'Destinatarul și subiectul sunt obligatorii'));
                return;
            }
            
            if (!text && !html) {
                res.status(400).json(ApiResponseHelper.validationError('text|html', 'Trebuie să furnizați conținut text sau HTML'));
                return;
            }
            
            const emailData: EmailData = {
                to,
                cc,
                bcc,
                subject,
                text,
                html,
                replyTo
            };
            
            const result = await emailService.sendEmail(emailData);
            
            if (result.success) {
                res.json(ApiResponseHelper.success(
                    { messageId: result.messageId },
                    'Email trimis cu succes'
                ));
            } else {
                res.status(500).json(ApiResponseHelper.error(
                    'Eroare la trimiterea email-ului',
                    'SEND_EMAIL_ERROR',
                    result.error
                ));
            }
            
        } catch (error) {
            console.error('Eroare la trimiterea email-ului:', error);
            res.status(500).json(ApiResponseHelper.error(
                'Eroare fatală la trimiterea email-ului',
                'FATAL_SEND_ERROR',
                error instanceof Error ? error.message : 'Eroare necunoscută'
            ));
        }
    }
    
    // Obține setările de email
    async getEmailSettings(req: Request, res: Response): Promise<void> {
        try {
            const settings = emailService.getEmailSettings();
            
            if (settings) {
                // Ascunde parola în răspuns
                const safeSettings = {
                    ...settings,
                    ParolaEmail: '••••••••••••'
                };
                
                res.json(ApiResponseHelper.success(safeSettings, 'Setări email obținute cu succes'));
            } else {
                res.status(404).json(ApiResponseHelper.notFoundError('Setările de email nu sunt încărcate'));
            }
            
        } catch (error) {
            console.error('Eroare la obținerea setărilor de email:', error);
            res.status(500).json(ApiResponseHelper.error(
                'Eroare la obținerea setărilor de email',
                'GET_SETTINGS_ERROR',
                error instanceof Error ? error.message : 'Eroare necunoscută'
            ));
        }
    }

    // Testează conexiunea email cu parolă dinamică
    async testEmailConnectionWithPassword(req: Request, res: Response): Promise<void> {
        try {
            const { password } = req.body;
            
            if (!password) {
                res.status(400).json(ApiResponseHelper.validationError('password', 'Parola este obligatorie pentru test'));
                return;
            }
            
            const result = await emailService.testConnectionWithPassword(password);
            
            if (result.success) {
                res.json(ApiResponseHelper.success(null, 'Conexiunea email funcționează corect cu parola furnizată'));
            } else {
                res.status(500).json(ApiResponseHelper.error(
                    'Eroare la testarea conexiunii email cu parola furnizată',
                    'CONNECTION_TEST_PASSWORD_ERROR',
                    result.error
                ));
            }
            
        } catch (error) {
            console.error('Eroare la testarea conexiunii email cu parolă:', error);
            res.status(500).json(ApiResponseHelper.error(
                'Eroare fatală la testarea conexiunii email',
                'FATAL_CONNECTION_TEST_ERROR',
                error instanceof Error ? error.message : 'Eroare necunoscută'
            ));
        }
    }

    // Trimite email de test cu adresă dinamică și parolă
    async sendTestEmailDynamic(req: Request, res: Response): Promise<void> {
        try {
            const { testEmail, password } = req.body;
            
            if (!testEmail || !password) {
                res.status(400).json(ApiResponseHelper.validationError('testEmail|password', 'Email de test și parola sunt obligatorii'));
                return;
            }
            
            // Validare format email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(testEmail)) {
                res.status(400).json(ApiResponseHelper.validationError('testEmail', 'Formatul email-ului de test nu este valid'));
                return;
            }
            
            const emailData: EmailData = {
                to: testEmail,
                subject: 'TEST',
                html: `
                    <h2>🧪 Email de Test - Balance Beacon Buddy</h2>
                    <p><strong>Data și ora:</strong> ${new Date().toLocaleString('ro-RO')}</p>
                    <p><strong>Destinatar:</strong> ${testEmail}</p>
                    <p><strong>Status:</strong> ✅ Funcționalitatea email funcționează corect!</p>
                    <hr>
                    <p><small>Acest email de test a fost trimis automat de sistemul Balance Beacon Buddy pentru a verifica configurația SMTP.</small></p>
                `,
                text: `
🧪 Email de Test - Balance Beacon Buddy

Data și ora: ${new Date().toLocaleString('ro-RO')}
Destinatar: ${testEmail}
Status: ✅ Funcționalitatea email funcționează corect!

---
Acest email de test a fost trimis automat pentru a verifica configurația SMTP.
                `
            };
            
            const result = await emailService.sendEmailWithPlainPassword(emailData, password);
            
            if (result.success) {
                res.json(ApiResponseHelper.success(
                    { messageId: result.messageId },
                    `Email de test trimis cu succes la ${testEmail}`
                ));
            } else {
                res.status(500).json(ApiResponseHelper.error(
                    'Eroare la trimiterea email-ului de test',
                    'SEND_TEST_DYNAMIC_ERROR',
                    result.error
                ));
            }
            
        } catch (error) {
            console.error('Eroare la trimiterea email-ului de test dinamic:', error);
            res.status(500).json(ApiResponseHelper.error(
                'Eroare fatală la trimiterea email-ului de test',
                'FATAL_SEND_DYNAMIC_ERROR',
                error instanceof Error ? error.message : 'Eroare necunoscută'
            ));
        }
    }

    // Actualizează parola email cu hash
    async updateEmailPassword(req: Request, res: Response): Promise<void> {
        try {
            const { password } = req.body;
            
            if (!password) {
                res.status(400).json(ApiResponseHelper.validationError('password', 'Parola este obligatorie'));
                return;
            }
            
            if (password.length < 6) {
                res.status(400).json(ApiResponseHelper.validationError('password', 'Parola trebuie să aibă cel puțin 6 caractere'));
                return;
            }
            
            const result = await emailService.updateEmailPassword(password);
            
            if (result.success) {
                res.json(ApiResponseHelper.success(null, 'Parola email a fost actualizată și hash-uită cu succes'));
            } else {
                res.status(500).json(ApiResponseHelper.error(
                    'Eroare la actualizarea parolei email',
                    'UPDATE_PASSWORD_ERROR',
                    result.error
                ));
            }
            
        } catch (error) {
            console.error('Eroare la actualizarea parolei email:', error);
            res.status(500).json(ApiResponseHelper.error(
                'Eroare fatală la actualizarea parolei email',
                'FATAL_UPDATE_PASSWORD_ERROR',
                error instanceof Error ? error.message : 'Eroare necunoscută'
            ));
        }
    }

    // Trimite email cu atașament
    async sendEmailWithAttachment(req: Request, res: Response): Promise<void> {
        try {
            const { to, subject, message, attachment } = req.body;
            
            if (!to || !subject || !attachment) {
                res.status(400).json(ApiResponseHelper.validationError('to|subject|attachment', 'Destinatar, subiect și atașament sunt obligatorii'));
                return;
            }

            if (!attachment.filename || !attachment.content || !attachment.contentType) {
                res.status(400).json(ApiResponseHelper.validationError('attachment', 'Atașamentul trebuie să conțină filename, content și contentType'));
                return;
            }

            const emailData: EmailData = {
                to,
                subject,
                html: `
                    <h2>${subject}</h2>
                    <p>${message || 'Vă trimitem în anexă documentul solicitat.'}</p>
                    <hr>
                    <p><em>Email trimis automat de sistemul Balance Beacon Buddy.</em></p>
                `,
                text: `
${subject}

${message || 'Vă trimitem în anexă documentul solicitat.'}

---
Email trimis automat de sistemul Balance Beacon Buddy.
                `
            };

            // Adaugă atașamentul
            const emailWithAttachment = {
                ...emailData,
                attachments: [{
                    filename: attachment.filename,
                    content: attachment.content,
                    contentType: attachment.contentType,
                    encoding: 'base64'
                }]
            };
            
            const result = await emailService.sendEmailWithAttachment(emailWithAttachment);
            
            if (result.success) {
                res.json(ApiResponseHelper.success(
                    { messageId: result.messageId },
                    'Email cu atașament trimis cu succes'
                ));
            } else {
                res.status(500).json(ApiResponseHelper.error(
                    'Eroare la trimiterea email-ului cu atașament',
                    'SEND_ATTACHMENT_ERROR',
                    result.error
                ));
            }
            
        } catch (error) {
            console.error('Eroare la trimiterea email-ului cu atașament:', error);
            res.status(500).json(ApiResponseHelper.error(
                'Eroare fatală la trimiterea email-ului cu atașament',
                'FATAL_SEND_ATTACHMENT_ERROR',
                error instanceof Error ? error.message : 'Eroare necunoscută'
            ));
        }
    }

    // Trimite email pentru fișe parteneri și înregistrează în baza de date
    async sendFisePartenerEmail(req: Request, res: Response): Promise<void> {
        try {
            const { 
                partnerId, 
                partnerEmail, 
                partnerName, 
                subject, 
                htmlContent, 
                orderNumber, 
                tipDocument,
                utilizator 
            } = req.body;
            
            if (!partnerId || !partnerEmail || !partnerName || !subject || !htmlContent || !orderNumber || !utilizator) {
                res.status(400).json(ApiResponseHelper.validationError(
                    'partnerId|partnerEmail|partnerName|subject|htmlContent|orderNumber|utilizator', 
                    'Toate câmpurile sunt obligatorii pentru trimiterea email-ului către partener'
                ));
                return;
            }

            console.log(`📧 FISE PARTENER: Încerc trimiterea email către ${partnerName} (${partnerEmail}) cu numărul de ordine ${orderNumber}`);

            // 1. PRIMUL PAS: Trimite email-ul (înainte de orice înregistrare în tabele)
            const emailData: EmailData = {
                to: partnerEmail,
                subject: subject,
                html: htmlContent,
                enableTracking: true // Activează tracking pentru email-uri către parteneri
            };

            const emailResult = await emailService.sendEmail(emailData);
            
            if (!emailResult.success) {
                throw new Error(`Eroare la trimiterea email-ului: ${emailResult.error}`);
            }

            console.log(`✅ EMAIL TRIMIS: MessageID: ${emailResult.messageId}`);
            console.log(`🔄 FISE PARTENER: Încep înregistrarea în tabele DUPĂ succesul trimiterii...`);

            // 2. DOAR DUPĂ SUCCESUL TRIMITERII: Înregistrează în tabele
            const emailContentHash = crypto.createHash('sha256')
                .update(htmlContent + subject + partnerEmail)
                .digest('hex');

            // 3. Înregistrează în JurnalDocumenteEmise folosind serviciul existent
            const documentData: CreateJurnalDocumenteEmiseDto = {
                NumeDocument: `Fișă partener - ${partnerName} - Nr. ${orderNumber}`,
                hashDocument: emailContentHash,
                dimensiuneDocument: Buffer.byteLength(htmlContent, 'utf8'),
                idUtilizator: utilizator.idUtilizator,
                numeUtilizator: utilizator.numeUtilizator,
                emailUtilizator: utilizator.emailUtilizator,
                caleFisier: `email://sent/${emailResult.messageId}`, // Referință la email-ul trimis
                observatii: `Email trimis către ${partnerName} (${partnerEmail}) - MessageID: ${emailResult.messageId} - Numărul ordine: ${orderNumber}`
            };

            const documentRecord = await jurnalDocumenteEmiseCleanService.createDocument(documentData);

            console.log(`✅ FISE PARTENER: Document înregistrat în jurnal cu ID: ${documentRecord.IdDocumente}`);

            // 4. Înregistrează în JurnalEmail folosind structura corectă a tabelei
            // VERIFICĂ ÎNTÂI dacă există deja o înregistrare cu acest MessageID
            const currentDate = new Date();
            const emailHash = crypto.createHash('sha256')
                .update(subject + partnerEmail + (emailResult.messageId || ''))
                .digest('hex');

            // Verifică dacă există deja o înregistrare cu acest MessageID
            const existingEmailCheck = await pool.request()
                .input('IdMessageEmail', emailResult.messageId)
                .query('SELECT IdJurnalEmail FROM JurnalEmail WHERE IdMessageEmail = @IdMessageEmail');

            let emailId: string;

            if (existingEmailCheck.recordset.length > 0) {
                // Există deja o înregistrare - o ACTUALIZEAZĂ cu datele complete
                emailId = existingEmailCheck.recordset[0].IdJurnalEmail;
                
                console.log(`⚠️ FISE PARTENER: Găsită înregistrare existentă cu MessageID ${emailResult.messageId}, actualizez cu datele complete...`);
                
                await pool.request()
                    .input('IdJurnalEmail', emailId)
                    .input('IdPartener', partnerId)
                    .input('NumeDestinatar', partnerName)
                    .input('ContinutEmail', htmlContent)
                    .input('TipEmail', 'FISE_PARTENER')
                    .input('CreatDe', utilizator.numeUtilizator)
                    .input('HashEmail', emailHash)
                    .input('TrackingEnabled', true)
                    .query(`
                        UPDATE JurnalEmail SET
                            IdPartener = @IdPartener,
                            NumeDestinatar = @NumeDestinatar,
                            ContinutEmail = @ContinutEmail,
                            TipEmail = @TipEmail,
                            CreatDe = @CreatDe,
                            HashEmail = @HashEmail,
                            TrackingEnabled = @TrackingEnabled,
                            ModificatLa = GETDATE(),
                            ModificatDe = @CreatDe
                        WHERE IdJurnalEmail = @IdJurnalEmail
                    `);
                
                console.log(`✅ FISE PARTENER: Înregistrare existentă actualizată cu ID: ${emailId}`);
            } else {
                // Nu există - creează o înregistrare nouă
                const jurnalEmailRequest = await pool.request()
                    .input('IdPartener', partnerId) // UNIQUEIDENTIFIER - va fi convertit automat
                    .input('EmailDestinatar', partnerEmail) // NVARCHAR(510)
                    .input('NumeDestinatar', partnerName) // NVARCHAR(510)
                    .input('SubiectEmail', subject) // NVARCHAR(1000)
                    .input('ContinutEmail', htmlContent) // NVARCHAR(MAX)
                    .input('TipEmail', 'FISE_PARTENER') // NVARCHAR(100)
                    .input('StatusTrimitere', 'SUCCESS') // NVARCHAR(100)
                    .input('IdMessageEmail', emailResult.messageId) // NVARCHAR(500)
                    .input('CreatDe', utilizator.numeUtilizator) // NVARCHAR(200)
                    .input('DataTrimitere', currentDate) // DATETIME2(7)
                    .input('HashEmail', emailHash) // NVARCHAR(256)
                    .input('TrackingEnabled', true) // BIT
                    .query(`
                        INSERT INTO JurnalEmail (
                            IdPartener, EmailDestinatar, NumeDestinatar, SubiectEmail, ContinutEmail,
                            TipEmail, StatusTrimitere, IdMessageEmail, CreatDe, DataTrimitere,
                            HashEmail, TrackingEnabled
                        )
                        OUTPUT INSERTED.IdJurnalEmail
                        VALUES (
                            @IdPartener, @EmailDestinatar, @NumeDestinatar, @SubiectEmail, @ContinutEmail,
                            @TipEmail, @StatusTrimitere, @IdMessageEmail, @CreatDe, @DataTrimitere,
                            @HashEmail, @TrackingEnabled
                        )
                    `);

                emailId = jurnalEmailRequest.recordset[0]?.IdJurnalEmail;
                console.log(`✅ FISE PARTENER: Înregistrare nouă creată cu ID: ${emailId}`);
            }

            console.log(`✅ FISE PARTENER: Email înregistrat în jurnal cu EmailID: ${emailId}, DocumentID: ${documentRecord.IdDocumente}`);
            console.log(`📊 FISE PARTENER: Partner: ${partnerName}, Tip: FISE_PARTENER, Hash: ${emailHash.substring(0, 16)}...`);

            res.json(ApiResponseHelper.success(
                { 
                    messageId: emailResult.messageId,
                    documentId: documentRecord.IdDocumente,
                    emailId: emailId,
                    orderNumber: orderNumber,
                    partnerName: partnerName,
                    emailHash: emailHash.substring(0, 16) + '...',
                    wasUpdated: existingEmailCheck.recordset.length > 0
                },
                `Email trimis cu succes către ${partnerName}`
            ));
            
        } catch (error) {
            console.error('❌ FISE PARTENER: Eroare la trimiterea email-ului:', error);
            
            // În caz de eroare, NU înregistrăm nimic în tabele
            // Doar returnăm eroarea către frontend
            res.status(500).json(ApiResponseHelper.error(
                'Eroare la trimiterea email-ului către partener',
                'SEND_FISE_PARTENER_ERROR',
                error instanceof Error ? error.message : 'Eroare necunoscută'
            ));
        }
    }
}

export default EmailController;
