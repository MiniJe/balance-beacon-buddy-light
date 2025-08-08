import { EmailTrackingService } from './email-tracking.service';
import { emailService } from './email.service';
import { getDatabase } from '../config/sqlite';

export class AutoReminderService {
    private static isRunning = false;
    private static intervalId: NodeJS.Timeout | null = null;

    /**
     * Pornește serviciul de auto-remindere
     */
    static async startAutoReminder(intervalHours: number = 24): Promise<void> {
        if (this.isRunning) {
            console.log('⚠️ Serviciul de auto-remindere rulează deja');
            return;
        }

        console.log(`🚀 Pornește serviciul de auto-remindere cu interval de ${intervalHours} ore`);
        
        this.isRunning = true;
        
        // Rulează imediat prima verificare
        await this.checkAndSendReminders();
        
        // Programează verificări periodice
        this.intervalId = setInterval(async () => {
            await this.checkAndSendReminders();
        }, intervalHours * 60 * 60 * 1000); // Convertește orele în milisecunde
    }

    /**
     * Oprește serviciul de auto-remindere
     */
    static stopAutoReminder(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        this.isRunning = false;
        console.log('🛑 Serviciul de auto-remindere a fost oprit');
    }

    /**
     * Verifică și trimite remindere automate
     */
    private static async checkAndSendReminders(): Promise<void> {
        try {
            console.log('🔍 Verifică partenerii neresponsivi pentru auto-remindere...');

            // Obține setările pentru auto-remindere din baza de date
            const settings = await this.getReminderSettings();
            
            if (!settings.autoReminderEnabled) {
                console.log('⚠️ Auto-remindere dezactivate în setări');
                return;
            }

            // Găsește partenerii neresponsivi
            const unresponsivePartners = await EmailTrackingService.getUnresponsivePartners(
                settings.daysBeforeReminder
            );

            if (unresponsivePartners.length === 0) {
                console.log('✅ Nu există parteneri neresponsivi în perioada specificată');
                return;
            }

            console.log(`📧 Găsit ${unresponsivePartners.length} parteneri neresponsivi`);

            let remindersCount = 0;
            const errors: string[] = [];

            // Trimite remindere pentru fiecare partener
            for (const partner of unresponsivePartners) {
                try {
                    // Verifică dacă nu s-a atins numărul maxim de remindere (folosim o valoare fixă)
                    const reminderCount = await this.getReminderCount(partner.IdJurnalEmail);
                    const maxReminders = 3; // Valoare fixă configurabilă
                    
                    if (reminderCount >= maxReminders) {
                        console.log(`⏭️ Sărește ${partner.EmailDestinatar} - atins numărul maxim de remindere (${maxReminders})`);
                        continue;
                    }

                    // Verifică dacă nu s-a trimis deja un reminder recent
                    const recentReminder = await this.checkRecentReminder(
                        partner.IdJurnalEmail, 
                        settings.reminderIntervalDays
                    );

                    if (recentReminder) {
                        console.log(`⏭️ Sărește ${partner.EmailDestinatar} - reminder recent trimis`);
                        continue;
                    }

                    // Determină tipul de reminder bazat pe prioritate și zile
                    const reminderType = this.determineReminderType(
                        partner.ZileDeLaTrimitere, 
                        partner.PriorityLevel
                    );

                    // Trimite reminder-ul
                    const result = await this.sendReminder(partner, reminderType, settings);
                    
                    if (result.success) {
                        remindersCount++;
                        console.log(`✅ Reminder trimis către: ${partner.EmailDestinatar}`);
                    } else {
                        errors.push(`Eroare pentru ${partner.EmailDestinatar}: ${result.error}`);
                    }

                } catch (error) {
                    console.error(`❌ Eroare la procesarea partenerului ${partner.EmailDestinatar}:`, error);
                    errors.push(`Eroare pentru ${partner.EmailDestinatar}: ${error}`);
                }
            }

            // Logare rezultate
            console.log(`📊 Auto-remindere complete: ${remindersCount}/${unresponsivePartners.length} trimise`);
            
            if (errors.length > 0) {
                console.error('❌ Erori în timpul trimiterii:', errors);
            }

            // Salvează statisticile în baza de date
            await this.logReminderBatch({
                totalChecked: unresponsivePartners.length,
                remindersSent: remindersCount,
                errors: errors.length,
                timestamp: new Date()
            });

        } catch (error) {
            console.error('❌ Eroare în serviciul de auto-remindere:', error);
        }
    }

    /**
     * Obține setările pentru auto-remindere
     */
    private static async getReminderSettings(): Promise<{
        autoReminderEnabled: boolean;
        daysBeforeReminder: number;
        reminderIntervalDays: number;
        urgentThresholdDays: number;
        enableTrackingInReminders: boolean;
    }> {
        try {
            const db = await getDatabase();
            const settings = await db.get(`
                SELECT 
                    COALESCE(AutoReminderEnabled, 0) as AutoReminderEnabled,
                    COALESCE(DaysBeforeReminder, 7) as DaysBeforeReminder,
                    COALESCE(ReminderIntervalDays, 3) as ReminderIntervalDays,
                    COALESCE(UrgentThresholdDays, 14) as UrgentThresholdDays,
                    COALESCE(EnableTrackingInReminders, 1) as EnableTrackingInReminders,
                    COALESCE(UrmaresteDeschdereEmailurilor, 1) as UrmaresteDeschdereEmailurilor
                FROM SetariEmail 
                WHERE IdEmail IS NOT NULL
            `);

            if (settings) {
                return {
                    autoReminderEnabled: Boolean(settings.AutoReminderEnabled),
                    daysBeforeReminder: settings.DaysBeforeReminder,
                    reminderIntervalDays: settings.ReminderIntervalDays,
                    urgentThresholdDays: settings.UrgentThresholdDays,
                    enableTrackingInReminders: Boolean(settings.EnableTrackingInReminders)
                };
            }

        } catch (error) {
            console.error('❌ Eroare la obținerea setărilor de reminder:', error);
        }

        // Valori implicite dacă nu se găsesc setări
        return {
            autoReminderEnabled: false,
            daysBeforeReminder: 7,
            reminderIntervalDays: 3,
            urgentThresholdDays: 14,
            enableTrackingInReminders: true
        };
    }

    /**
     * Obține numărul de remindere trimise pentru un email original
     */
    private static async getReminderCount(originalEmailId: string): Promise<number> {
        try {
            const db = await getDatabase();
            const result = await db.get(`
                SELECT COUNT(*) as ReminderCount
                FROM JurnalEmail 
                WHERE TipEmail = 'REMINDER'
                AND ReferenceEmailId = ?
                AND StatusTrimitere = 'SUCCESS'
            `, originalEmailId);

            return result?.ReminderCount || 0;

        } catch (error) {
            console.error('❌ Eroare la obținerea numărului de remindere:', error);
            return 0;
        }
    }

    /**
     * Verifică dacă s-a trimis un reminder recent
     */
    private static async checkRecentReminder(
        originalEmailId: string, 
        intervalDays: number
    ): Promise<boolean> {
        try {
            const db = await getDatabase();
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - intervalDays);
            
            const result = await db.get(`
                SELECT COUNT(*) as RecentReminders
                FROM JurnalEmail 
                WHERE TipEmail = 'REMINDER'
                AND ReferenceEmailId = ?
                AND DataTrimitere >= ?
                AND StatusTrimitere = 'SUCCESS'
            `, [originalEmailId, cutoffDate.toISOString()]);

            return (result?.RecentReminders || 0) > 0;

        } catch (error) {
            console.error('❌ Eroare la verificarea reminder-elor recente:', error);
            return false;
        }
    }

    /**
     * Determină tipul de reminder bazat pe zile și prioritate
     */
    private static determineReminderType(
        daysFromSent: number, 
        priority: string
    ): 'SOFT' | 'NORMAL' | 'URGENT' {
        // Reminder urgent pentru emailuri cu prioritate mare sau foarte vechi
        if (priority === 'HIGH' || priority === 'URGENT' || daysFromSent >= 14) {
            return 'URGENT';
        }
        
        // Reminder normal pentru emailuri de prioritate medie sau mai vechi de 10 zile
        if (priority === 'NORMAL' || daysFromSent >= 10) {
            return 'NORMAL';
        }
        
        // Reminder soft pentru celelalte cazuri
        return 'SOFT';
    }

    /**
     * Trimite un reminder pentru un partener specific
     */
    private static async sendReminder(
        partner: any, 
        reminderType: 'SOFT' | 'NORMAL' | 'URGENT',
        settings: any
    ): Promise<{ success: boolean; error?: string }> {
        try {
            // Construiește subiectul reminder-ului
            const subjectPrefix = reminderType === 'URGENT' ? 'URGENT - ' : 
                                reminderType === 'NORMAL' ? 'REAMINTIRE - ' : 
                                'Reamintire prietenoasă - ';
            
            const reminderSubject = `${subjectPrefix}${partner.SubiectEmail}`;

            // Construiește conținutul reminder-ului
            const reminderContent = this.buildReminderContent(partner, reminderType);

            // Pregătește datele pentru email
            const emailData = {
                to: partner.EmailDestinatar,
                subject: reminderSubject,
                html: reminderContent,
                enableTracking: settings.enableTrackingInReminders,
                // Nu setez idJurnalEmail pentru că va fi generat un nou ID
            };

            // Trimite email-ul
            const result = await emailService.sendEmail(emailData);

            if (result.success) {
                // Înregistrează legătura cu emailul original
                await this.linkReminderToOriginal(result.messageId!, partner.IdJurnalEmail);
            }

            return result;

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Eroare necunoscută'
            };
        }
    }

    /**
     * Construiește conținutul HTML pentru reminder
     */
    private static buildReminderContent(partner: any, reminderType: string): string {
        const urgencyClass = reminderType === 'URGENT' ? 'style="color: #d32f2f; font-weight: bold;"' : '';
        const urgencyText = reminderType === 'URGENT' ? 'URGENT - ' : '';
        
        const dataTrimitere = new Date(partner.DataTrimitere).toLocaleDateString('ro-RO', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reamintire Confirmare Sold</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h2 ${urgencyClass}>${urgencyText}Reamintire Confirmare Sold</h2>
            </div>
            
            <p>Stimate <strong>${partner.NumeDestinatar || 'partener'}</strong>,</p>
            
            <p>Vă reamintim cu privire la cererea de confirmare a soldului trimisă în data de 
            <strong>${dataTrimitere}</strong>.</p>
            
            <div style="background-color: #e3f2fd; padding: 15px; border-left: 4px solid #2196f3; margin: 20px 0;">
                <p><strong>Subiect original:</strong> ${partner.SubiectEmail}</p>
                <p><strong>Zile de la trimitere:</strong> ${partner.ZileDeLaTrimitere}</p>
                ${partner.PriorityLevel !== 'NORMAL' ? `<p><strong>Prioritate:</strong> ${partner.PriorityLevel}</p>` : ''}
            </div>
            
            ${reminderType === 'URGENT' ? `
            <div style="background-color: #ffebee; padding: 15px; border-left: 4px solid #f44336; margin: 20px 0;">
                <p style="color: #d32f2f; font-weight: bold; margin: 0;">
                    ⚠️ ATENȚIE: Această cerere necesită răspuns urgent!
                </p>
            </div>
            ` : ''}
            
            <p>Vă rugăm să răspundeți la acest email pentru a confirma sau contesta soldul prezentat. 
            Răspunsul dumneavoastră este important pentru completarea procesului de reconciliere contabilă.</p>
            
            <div style="background-color: #f1f8e9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0;"><strong>💡 Cum să răspundeți:</strong></p>
                <ul style="margin: 10px 0;">
                    <li><strong>CONFIRM</strong> - dacă soldul este corect</li>
                    <li><strong>CONTEST</strong> - dacă aveți obiecții</li>
                    <li><strong>CORECȚII</strong> - dacă aveți modificări de adăugat</li>
                </ul>
            </div>
            
            <p>Pentru orice întrebări sau clarificări, nu ezitați să ne contactați.</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 14px; color: #666;">
                <p>Cu respect,<br>
                <strong>Echipa Financiară</strong></p>
                
                <p style="font-size: 12px; color: #999;">
                    Acest email a fost generat automat de sistemul de management financiar.
                </p>
            </div>
            
        </body>
        </html>
        `;
    }

    /**
     * Leagă reminder-ul de emailul original
     */
    private static async linkReminderToOriginal(
        reminderMessageId: string, 
        originalEmailId: string
    ): Promise<void> {
        try {
            const db = await getDatabase();
            await db.run(`
                UPDATE JurnalEmail 
                SET ReferenceEmailId = ?
                WHERE IdMessageEmail = ?
            `, [originalEmailId, reminderMessageId]);

        } catch (error) {
            console.error('❌ Eroare la legarea reminder-ului de emailul original:', error);
        }
    }

    /**
     * Salvează statisticile unui batch de remindere
     */
    private static async logReminderBatch(batchData: {
        totalChecked: number;
        remindersSent: number;
        errors: number;
        timestamp: Date;
    }): Promise<void> {
        try {
            const db = await getDatabase();
            await db.run(`
                INSERT INTO AutoReminderLog (TotalChecked, RemindersSent, Errors, Timestamp)
                VALUES (?, ?, ?, ?)
            `, [
                batchData.totalChecked,
                batchData.remindersSent,
                batchData.errors,
                batchData.timestamp.toISOString()
            ]);

        } catch (error) {
            console.error('❌ Eroare la salvarea log-ului de reminder:', error);
        }
    }

    /**
     * Obține status-ul serviciului
     */
    static getStatus(): { 
        isRunning: boolean; 
        intervalId: boolean; 
        uptime: string;
    } {
        return {
            isRunning: this.isRunning,
            intervalId: this.intervalId !== null,
            uptime: this.isRunning ? 'Activ' : 'Inactiv'
        };
    }
}

export const autoReminderService = AutoReminderService;
