import { Request, Response } from 'express';
import { getDatabase } from '../config/sqlite';

export interface ReminderSettings {
    autoReminderEnabled: boolean;
    daysBeforeReminder: number;
    reminderIntervalDays: number;
    maxReminders: number;
    ccSelf: boolean;
    trackOpens: boolean;
    enableTrackingInReminders: boolean;
    urgentThresholdDays: number;
}

export class ReminderSettingsController {

    /**
     * Obține setările pentru remindere
     */
    async getReminderSettings(req: Request, res: Response): Promise<void> {
        try {
            const db = await getDatabase();
            const dbSettings = await db.get(`
                SELECT 
                    AutoReminderEnabled,
                    DaysBeforeReminder,
                    ReminderIntervalDays,
                    MaxReminders,
                    UrgentThresholdDays,
                    TrackOpens,
                    EnableTrackingInReminders,
                    CcSelf,
                    EnablePartnerTracking,
                    DefaultPartnerReminders,
                    PartnerReminderInterval
                FROM SetariAvansate 
                ORDER BY Id DESC 
                LIMIT 1
            `);

            let settings: ReminderSettings;

            if (dbSettings) {
                settings = {
                    autoReminderEnabled: Boolean(dbSettings.AutoReminderEnabled),
                    daysBeforeReminder: dbSettings.DaysBeforeReminder,
                    reminderIntervalDays: dbSettings.ReminderIntervalDays,
                    maxReminders: dbSettings.MaxReminders,
                    ccSelf: Boolean(dbSettings.CcSelf),
                    trackOpens: Boolean(dbSettings.TrackOpens),
                    enableTrackingInReminders: Boolean(dbSettings.EnableTrackingInReminders),
                    urgentThresholdDays: dbSettings.UrgentThresholdDays
                };
            } else {
                // Setări implicite dacă nu există în baza de date
                settings = {
                    autoReminderEnabled: false,
                    daysBeforeReminder: 7,
                    reminderIntervalDays: 3,
                    maxReminders: 2,
                    ccSelf: true,
                    trackOpens: true,
                    enableTrackingInReminders: true,
                    urgentThresholdDays: 14
                };
            }

            res.status(200).json({
                success: true,
                settings: settings,
                message: 'Setările de remindere au fost obținute cu succes'
            });

        } catch (error) {
            console.error('❌ Eroare la obținerea setărilor de remindere:', error);
            res.status(500).json({
                success: false,
                message: 'Eroare la obținerea setărilor de remindere',
                error: error instanceof Error ? error.message : 'Eroare necunoscută'
            });
        }
    }

    /**
     * Actualizează setările pentru remindere
     */
    async updateReminderSettings(req: Request, res: Response): Promise<void> {
        try {
            const {
                autoReminderEnabled,
                daysBeforeReminder,
                reminderIntervalDays,
                maxReminders,
                ccSelf,
                trackOpens,
                enableTrackingInReminders,
                urgentThresholdDays
            }: ReminderSettings = req.body;

            // Validare câmpuri
            if (daysBeforeReminder < 1 || daysBeforeReminder > 30) {
                res.status(400).json({
                    success: false,
                    message: 'Numărul de zile până la reamintire trebuie să fie între 1 și 30'
                });
                return;
            }

            if (reminderIntervalDays < 1 || reminderIntervalDays > 14) {
                res.status(400).json({
                    success: false,
                    message: 'Intervalul între remindere trebuie să fie între 1 și 14 zile'
                });
                return;
            }

            if (maxReminders < 0 || maxReminders > 10) {
                res.status(400).json({
                    success: false,
                    message: 'Numărul maxim de remindere trebuie să fie între 0 și 10'
                });
                return;
            }

            const db = await getDatabase();
            
            // Verifică dacă există deja setări în tabelul SetariAvansate
            const existingSettings = await db.get(`
                SELECT Id FROM SetariAvansate LIMIT 1
            `);

            if (existingSettings) {
                // Actualizează setările existente
                await db.run(`
                    UPDATE SetariAvansate 
                    SET 
                        AutoReminderEnabled = ?,
                        DaysBeforeReminder = ?,
                        ReminderIntervalDays = ?,
                        MaxReminders = ?,
                        UrgentThresholdDays = ?,
                        TrackOpens = ?,
                        EnableTrackingInReminders = ?,
                        CcSelf = ?,
                        DataUltimeiModificari = CURRENT_TIMESTAMP
                    WHERE Id = ?
                `, [
                    autoReminderEnabled ? 1 : 0,
                    daysBeforeReminder,
                    reminderIntervalDays,
                    maxReminders,
                    urgentThresholdDays || 14,
                    trackOpens ? 1 : 0,
                    enableTrackingInReminders ? 1 : 0,
                    ccSelf ? 1 : 0,
                    existingSettings.Id
                ]);
            } else {
                // Inserează setări noi
                await db.run(`
                    INSERT INTO SetariAvansate (
                        AutoReminderEnabled,
                        DaysBeforeReminder,
                        ReminderIntervalDays,
                        MaxReminders,
                        UrgentThresholdDays,
                        TrackOpens,
                        EnableTrackingInReminders,
                        CcSelf
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    autoReminderEnabled ? 1 : 0,
                    daysBeforeReminder,
                    reminderIntervalDays,
                    maxReminders,
                    urgentThresholdDays || 14,
                    trackOpens ? 1 : 0,
                    enableTrackingInReminders ? 1 : 0,
                    ccSelf ? 1 : 0
                ]);
            }

            res.status(200).json({
                success: true,
                message: 'Setările de remindere au fost actualizate cu succes'
            });

        } catch (error) {
            console.error('❌ Eroare la actualizarea setărilor de remindere:', error);
            res.status(500).json({
                success: false,
                message: 'Eroare la actualizarea setărilor de remindere',
                error: error instanceof Error ? error.message : 'Eroare necunoscută'
            });
        }
    }

    /**
     * Resetează setările la valorile implicite
     */
    async resetReminderSettings(req: Request, res: Response): Promise<void> {
        try {
            const defaultSettings: ReminderSettings = {
                autoReminderEnabled: false,
                daysBeforeReminder: 7,
                reminderIntervalDays: 3,
                maxReminders: 2,
                ccSelf: true,
                trackOpens: true,
                enableTrackingInReminders: true,
                urgentThresholdDays: 14
            };

            // Apelează metoda de actualizare cu setările implicite
            req.body = defaultSettings;
            await this.updateReminderSettings(req, res);

        } catch (error) {
            console.error('❌ Eroare la resetarea setărilor de remindere:', error);
            res.status(500).json({
                success: false,
                message: 'Eroare la resetarea setărilor de remindere',
                error: error instanceof Error ? error.message : 'Eroare necunoscută'
            });
        }
    }
}

export const reminderSettingsController = new ReminderSettingsController();
