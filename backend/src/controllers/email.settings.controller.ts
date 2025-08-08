import { Request, Response } from 'express';
import { getDatabase } from '../config/sqlite';
import crypto from 'crypto';

// Interface pentru setările email
export interface EmailSettings {
    IdEmail?: string;
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

// Chei pentru criptare AES (în producție, acestea ar trebui să fie în variabile de mediu)
const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY || 'mySecretKey12345678901234567890'; // 32 chars
const IV_LENGTH = 16; // Pentru AES, IV-ul este întotdeauna de 16 bytes

export class EmailSettingsController {
    
    // Pentru moment, stocăm parolele în clar pentru a rezolva problema SMTP
    // În producție, se pot cripta cu AES (reversibil)
    private encryptPassword(password: string): string {
        // Pentru dezvoltare, returnăm parola în clar
        // În producție, implementați criptarea AES cu createCipheriv
        return password;
    }

    // Decriptează parola (pentru moment, returnează direct)
    private decryptPassword(encryptedPassword: string): string {
        // Pentru dezvoltare, returnăm parola așa cum este
        // În producție, implementați decriptarea AES cu createDecipheriv
        return encryptedPassword;
    }

    // Obține setările de email
    async getEmailSettings(req: Request, res: Response): Promise<void> {
        try {
            const db = await getDatabase();
            const settings = await db.all('SELECT * FROM SetariEmail WHERE IdEmail IS NOT NULL');

            if (settings.length === 0) {
                res.status(404).json({
                    success: false,
                    message: 'Nu s-au găsit setări de email în baza de date'
                });
                return;
            }

            const safeSettings = settings.map((setting: any) => ({
                ...setting,
                // Nu returnăm parola din motive de securitate
                ParolaEmail: '••••••••••••'
            }));

            res.status(200).json({
                success: true,
                settings: safeSettings,
                message: 'Setările de email au fost obținute cu succes'
            });
        } catch (error) {
            console.error('Eroare la obținerea setărilor de email:', error);
            res.status(500).json({
                success: false,
                message: 'Eroare la obținerea setărilor de email',
                error: error instanceof Error ? error.message : 'Eroare necunoscută'
            });
        }
    }

    // Actualizează setările de email
    async updateEmailSettings(req: Request, res: Response): Promise<void> {
        try {
            const {
                ServerSMTP,
                PortSMTP,
                NumeUtilizatorEmail,
                ParolaEmail,
                NumeExpeditor,
                EmailExpeditor,
                SemnaturaEmail,
                RaspundeLa,
                CopieAscunsa,
                UtilizeazaSSL,
                MetodaAutentificare
            } = req.body;

            // Validare câmpuri obligatorii
            if (!ServerSMTP || !PortSMTP || !NumeUtilizatorEmail || !EmailExpeditor) {
                res.status(400).json({
                    success: false,
                    message: 'Câmpurile ServerSMTP, PortSMTP, NumeUtilizatorEmail și EmailExpeditor sunt obligatorii'
                });
                return;
            }

            const db = await getDatabase();
            
            // Verifică dacă există înregistrări
            const existingResult = await db.get('SELECT COUNT(*) as count FROM SetariEmail');
            const hasExistingSettings = existingResult.count > 0;

            if (hasExistingSettings) {
                // UPDATE - construim query-ul dinamic
                const updateFields = [
                    'ServerSMTP = ?',
                    'PortSMTP = ?',
                    'NumeUtilizatorEmail = ?',
                    'NumeExpeditor = ?',
                    'EmailExpeditor = ?',
                    'SemnaturaEmail = ?',
                    'RaspundeLa = ?',
                    'CopieAscunsa = ?',
                    'UtilizeazaSSL = ?',
                    'MetodaAutentificare = ?'
                ];

                let values = [
                    ServerSMTP,
                    parseInt(PortSMTP),
                    NumeUtilizatorEmail,
                    NumeExpeditor || 'Confirmări Sold',
                    EmailExpeditor,
                    SemnaturaEmail || '',
                    RaspundeLa || null,
                    CopieAscunsa || null,
                    UtilizeazaSSL === true || UtilizeazaSSL === 'true' ? 1 : 0,
                    MetodaAutentificare || 'LOGIN'
                ];

                // Adăugăm parola doar dacă este furnizată și nu este măscată
                if (ParolaEmail && ParolaEmail !== '••••••••••••') {
                    updateFields.push('ParolaEmail = ?');
                    values.push(ParolaEmail);
                }

                const query = `UPDATE SetariEmail SET ${updateFields.join(', ')}`;
                await db.run(query, ...values);
            } else {
                // INSERT - parola este obligatorie pentru înregistrări noi
                if (!ParolaEmail || ParolaEmail === '••••••••••••') {
                    res.status(400).json({
                        success: false,
                        message: 'Parola email este obligatorie pentru crearea noilor setări'
                    });
                    return;
                }

                const query = `
                    INSERT INTO SetariEmail (
                        IdEmail, ServerSMTP, PortSMTP, NumeUtilizatorEmail, ParolaEmail,
                        NumeExpeditor, EmailExpeditor, SemnaturaEmail, RaspundeLa, 
                        CopieAscunsa, UtilizeazaSSL, MetodaAutentificare
                    ) VALUES (
                        ?, ?, ?, ?, ?,
                        ?, ?, ?, ?,
                        ?, ?, ?
                    )
                `;

                const values = [
                    crypto.randomUUID(), // IdEmail
                    ServerSMTP,
                    parseInt(PortSMTP),
                    NumeUtilizatorEmail,
                    ParolaEmail,
                    NumeExpeditor || 'Confirmări Sold',
                    EmailExpeditor,
                    SemnaturaEmail || '',
                    RaspundeLa || null,
                    CopieAscunsa || null,
                    UtilizeazaSSL === true || UtilizeazaSSL === 'true' ? 1 : 0,
                    MetodaAutentificare || 'LOGIN'
                ];

                await db.run(query, ...values);
            }

            res.status(200).json({
                success: true,
                message: 'Setările de email au fost actualizate cu succes'
            });
        } catch (error) {
            console.error('Eroare la actualizarea setărilor de email:', error);
            res.status(500).json({
                success: false,
                message: 'Eroare la actualizarea setărilor de email',
                error: error instanceof Error ? error.message : 'Eroare necunoscută'
            });
        }
    }

    // Testează conexiunea cu parolă furnizată dinamic
    async testEmailConnection(req: Request, res: Response): Promise<void> {
        try {
            const { password, testEmail } = req.body;

            if (!password) {
                res.status(400).json({
                    success: false,
                    message: 'Parola este obligatorie pentru testare'
                });
                return;
            }

            // Importăm serviciul de email și testăm cu parola furnizată
            const { emailService } = await import('../services/email.service');
            
            // Testează conexiunea cu parola furnizată
            const testResult = await emailService.testConnectionWithPassword(password);
            
            if (testResult.success) {
                // Dacă testEmail este furnizat, trimite un email de test
                if (testEmail) {
                    const sendResult = await emailService.sendEmail({
                        to: testEmail,
                        subject: 'TEST - Configurare Server Email',
                        text: 'Acest email confirmă că configurarea serverului SMTP funcționează corect.',
                        html: `
                            <h2>✅ Test Configurare Email</h2>
                            <p>Acest email confirmă că configurarea serverului SMTP funcționează corect.</p>
                            <p><strong>Server:</strong> ${req.body.ServerSMTP || 'N/A'}</p>
                            <p><strong>Data:</strong> ${new Date().toLocaleString('ro-RO')}</p>
                        `
                    });

                    if (sendResult.success) {
                        res.status(200).json({
                            success: true,
                            message: `Email de test trimis cu succes la ${testEmail}`,
                            messageId: sendResult.messageId
                        });
                    } else {
                        res.status(500).json({
                            success: false,
                            message: `Conexiunea SMTP funcționează, dar emailul nu a putut fi trimis: ${sendResult.error}`
                        });
                    }
                } else {
                    res.status(200).json({
                        success: true,
                        message: 'Conexiunea SMTP a fost testată cu succes'
                    });
                }
            } else {
                res.status(500).json({
                    success: false,
                    message: `Testul conexiunii a eșuat: ${testResult.error}`
                });
            }
        } catch (error) {
            console.error('Eroare la testarea conexiunii email:', error);
            res.status(500).json({
                success: false,
                message: 'Eroare la testarea conexiunii email',
                error: error instanceof Error ? error.message : 'Eroare necunoscută'
            });
        }
    }

    // Resetează parola email (pentru rezolvarea problemei cu hash-ul bcrypt)
    async resetEmailPassword(req: Request, res: Response): Promise<void> {
        try {
            const { newPassword } = req.body;

            if (!newPassword) {
                res.status(400).json({
                    success: false,
                    message: 'Parola nouă este obligatorie'
                });
                return;
            }

            // Actualizează parola în baza de date (în clar pentru SMTP)
            const db = await getDatabase();
            await db.run('UPDATE SetariEmail SET ParolaEmail = ?', newPassword);

            res.status(200).json({
                success: true,
                message: 'Parola email a fost resetată cu succes'
            });
        } catch (error) {
            console.error('Eroare la resetarea parolei email:', error);
            res.status(500).json({
                success: false,
                message: 'Eroare la resetarea parolei email',
                error: error instanceof Error ? error.message : 'Eroare necunoscută'
            });
        }
    }

    // Debug: Verifică structura tabelului SetariEmail
    async getTableStructure(req: Request, res: Response): Promise<void> {
        try {
            const db = await getDatabase();
            const columns = await db.all('PRAGMA table_info(SetariEmail)');

            res.status(200).json({
                success: true,
                columns: columns,
                message: 'Structura tabelului SetariEmail'
            });
        } catch (error) {
            console.error('Eroare la obținerea structurii tabelului:', error);
            res.status(500).json({
                success: false,
                message: 'Eroare la obținerea structurii tabelului',
                error: error instanceof Error ? error.message : 'Eroare necunoscută'
            });
        }
    }
}

export default EmailSettingsController;
