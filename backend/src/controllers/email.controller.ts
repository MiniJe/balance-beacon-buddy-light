import { Request, Response } from 'express';
import { emailService, EmailData } from '../services/email.service';
import { ApiResponseHelper } from '../types/api.types';
import { getDatabase } from '../config/sqlite';
import { jurnalDocumenteEmiseCleanService } from '../services/JurnalDocumenteEmiseClean.service';
import { CreateJurnalDocumenteEmiseDto } from '../models/JurnalDocumenteEmise';
import crypto from 'crypto';

export class EmailController {
    
    // =============================================================================
    // FUNCȚII DE TESTARE CONEXIUNE
    // =============================================================================

    // Testează conexiunea email standard
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
                'Eroare la testarea conexiunii email',
                'CONNECTION_TEST_ERROR',
                error instanceof Error ? error.message : 'Eroare necunoscută'
            ));
        }
    }

    // Testează conexiunea cu parolă personalizată
    async testEmailConnectionWithPassword(req: Request, res: Response): Promise<void> {
        try {
            const { password } = req.body;
            
            if (!password) {
                res.status(400).json(ApiResponseHelper.validationError('password', 'Parola este obligatorie pentru test'));
                return;
            }
            
            const result = await emailService.testConnectionWithPassword(password);
            
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
            console.error('Eroare la testarea conexiunii email cu parolă:', error);
            res.status(500).json(ApiResponseHelper.error(
                'Eroare la testarea conexiunii email',
                'CONNECTION_TEST_ERROR',
                error instanceof Error ? error.message : 'Eroare necunoscută'
            ));
        }
    }

    // =============================================================================
    // FUNCȚII DE TRIMITERE EMAIL (CONSOLIDATE ȘI OPTIMIZATE)
    // =============================================================================

    // Trimite email simplu (fără atașament) - pentru remindere, notificări
    async sendEmail(req: Request, res: Response): Promise<void> {
        try {
            const { to, cc, bcc, subject, text, html, replyTo, enableTracking, idJurnalEmail, emailTypeHint } = req.body;
            
            if (!to || !subject) {
                res.status(400).json(ApiResponseHelper.validationError('to|subject', 'Adresa de email și subiectul sunt obligatorii'));
                return;
            }

            const emailData: EmailData = {
                to,
                cc,
                bcc,
                subject,
                text,
                html,
                replyTo,
                enableTracking,
                idJurnalEmail,
                emailTypeHint
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
                'Eroare la trimiterea email-ului',
                'SEND_EMAIL_ERROR',
                error instanceof Error ? error.message : 'Eroare necunoscută'
            ));
        }
    }

    // Trimite email cu atașament - pentru cereri de confirmare sold
    async sendEmailWithAttachment(req: Request, res: Response): Promise<void> {
        try {
            const { to, cc, bcc, subject, text, html, replyTo, attachmentPath, attachmentName, enableTracking, idJurnalEmail, emailTypeHint } = req.body;
            
            if (!to || !subject || !attachmentPath) {
                res.status(400).json(ApiResponseHelper.validationError(
                    'to|subject|attachmentPath', 
                    'Adresa de email, subiectul și calea atașamentului sunt obligatorii'
                ));
                return;
            }

            const emailData: EmailData = {
                to,
                cc,
                bcc,
                subject,
                text,
                html,
                replyTo,
                enableTracking,
                idJurnalEmail,
                emailTypeHint
            };

            const result = await emailService.sendEmailWithAttachment({
                ...emailData,
                attachments: [{
                    path: attachmentPath,
                    filename: attachmentName
                }]
            });
            
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
                'Eroare la trimiterea email-ului cu atașament',
                'FATAL_SEND_ATTACHMENT_ERROR',
                error instanceof Error ? error.message : 'Eroare necunoscută'
            ));
        }
    }

    // =============================================================================
    // FUNCȚIE SPECIALIZATĂ - FIȘE PARTENERI (cu tracking și jurnal)
    // =============================================================================

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

            // 4. Înregistrează în JurnalEmail folosind structura corectă a tabelei SQLite
            // VERIFICĂ ÎNTÂI dacă există deja o înregistrare cu acest MessageID
            const currentDate = new Date().toISOString();
            const emailHash = crypto.createHash('sha256')
                .update(subject + partnerEmail + (emailResult.messageId || ''))
                .digest('hex');

            // Verifică dacă există deja o înregistrare cu acest MessageID
            const db = await getDatabase();
            const existingEmailCheck = await db.get(
                'SELECT IdJurnalEmail FROM JurnalEmail WHERE IdMessageEmail = ?', 
                [emailResult.messageId]
            );

            let emailId: string;

            if (existingEmailCheck) {
                // Există deja o înregistrare - o ACTUALIZEAZĂ cu datele complete
                emailId = existingEmailCheck.IdJurnalEmail;
                
                console.log(`⚠️ FISE PARTENER: Găsită înregistrare existentă cu MessageID ${emailResult.messageId}, actualizez cu datele complete...`);
                
                await db.run(`
                    UPDATE JurnalEmail SET
                        IdPartener = ?,
                        NumeDestinatar = ?,
                        ContinutEmail = ?,
                        TipEmail = ?,
                        CreatDe = ?,
                        HashEmail = ?,
                        TrackingEnabled = ?,
                        ModificatLa = ?,
                        ModificatDe = ?
                    WHERE IdJurnalEmail = ?
                `, [
                    partnerId,
                    partnerName,
                    htmlContent,
                    'FISE_PARTENER',
                    utilizator.numeUtilizator,
                    emailHash,
                    1, // TrackingEnabled (SQLite uses 1 for true)
                    currentDate,
                    utilizator.numeUtilizator,
                    emailId
                ]);
                
                console.log(`✅ FISE PARTENER: Înregistrare existentă actualizată cu ID: ${emailId}`);
            } else {
                // Nu există - creează o înregistrare nouă
                const insertResult = await db.run(`
                    INSERT INTO JurnalEmail (
                        IdPartener, EmailDestinatar, NumeDestinatar, SubiectEmail, ContinutEmail,
                        TipEmail, StatusTrimitere, IdMessageEmail, CreatDe, DataTrimitere,
                        HashEmail, TrackingEnabled
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    partnerId,
                    partnerEmail,
                    partnerName,
                    subject,
                    htmlContent,
                    'FISE_PARTENER',
                    'SUCCESS',
                    emailResult.messageId,
                    utilizator.numeUtilizator,
                    currentDate,
                    emailHash,
                    1 // TrackingEnabled (SQLite uses 1 for true)
                ]);

                emailId = insertResult.lastID?.toString() || crypto.randomUUID();
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
                    wasUpdated: !!existingEmailCheck
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

    // =============================================================================
    // FUNCȚII DE ADMINISTRARE
    // =============================================================================

    // Actualizează parola email
    async updateEmailPassword(req: Request, res: Response): Promise<void> {
        try {
            const { newPassword } = req.body;
            
            if (!newPassword) {
                res.status(400).json(ApiResponseHelper.validationError('newPassword', 'Noua parolă este obligatorie'));
                return;
            }

            const result = await emailService.updateEmailPassword(newPassword);
            
            if (result.success) {
                res.json(ApiResponseHelper.success(
                    null,
                    'Parola email a fost actualizată cu succes'
                ));
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
                'Eroare la actualizarea parolei email',
                'UPDATE_PASSWORD_ERROR',
                error instanceof Error ? error.message : 'Eroare necunoscută'
            ));
        }
    }

    // Obține setările de email (fără parolă pentru securitate)
    async getEmailSettings(req: Request, res: Response): Promise<void> {
        try {
            const settings = emailService.getEmailSettings();
            
            if (settings) {
                // Ascunde parola în răspuns pentru securitate
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
}

export default EmailController;
