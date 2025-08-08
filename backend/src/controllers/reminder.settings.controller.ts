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
                    COALESCE(AutoReminderEnabled, 0) as AutoReminderEnabled,
                    COALESCE(DaysBeforeReminder, 7) as DaysBeforeReminder,
                    COALESCE(ReminderIntervalDays, 3) as ReminderIntervalDays,
                    COALESCE(UrgentThresholdDays, 14) as UrgentThresholdDays,
                    COALESCE(EnableTrackingInReminders, 1) as EnableTrackingInReminders,
                    COALESCE(UrmaresteDeschdereEmailurilor, 1) as UrmaresteDeschdereEmailurilor
                FROM SetariEmail 
                WHERE IdEmail IS NOT NULL
            `);

            let settings: ReminderSettings;

            if (dbSettings) {
                settings = {
                    autoReminderEnabled: Boolean(dbSettings.AutoReminderEnabled),
                    daysBeforeReminder: dbSettings.DaysBeforeReminder,
                    reminderIntervalDays: dbSettings.ReminderIntervalDays,
                    maxReminders: 2, // Valoare fixă pentru moment
                    ccSelf: true, // Valoare fixă pentru moment
                    trackOpens: Boolean(dbSettings.UrmaresteDeschdereEmailurilor),
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

            // Verifică dacă există deja setări în baza de date
            const db = await getDatabase();
            const existingSettings = await db.get(`
                SELECT COUNT(*) as SettingsCount 
                FROM SetariEmail 
                WHERE IdEmail IS NOT NULL
            `);

            const settingsExist = existingSettings?.SettingsCount > 0;

            if (settingsExist) {
                // Actualizează setările existente (doar câmpurile care există în tabelă)
                await db.run(`
                    UPDATE SetariEmail 
                    SET 
                        AutoReminderEnabled = ?,
                        DaysBeforeReminder = ?,
                        ReminderIntervalDays = ?,
                        UrgentThresholdDays = ?,
                        EnableTrackingInReminders = ?,
                        UrmaresteDeschdereEmailurilor = ?
                    WHERE IdEmail IS NOT NULL
                `, [
                    autoReminderEnabled ? 1 : 0,
                    daysBeforeReminder,
                    reminderIntervalDays,
                    urgentThresholdDays || 14,
                    enableTrackingInReminders ? 1 : 0,
                    trackOpens ? 1 : 0
                ]);
            } else {
                // Pentru că tabela are deja date, nu vom face INSERT
                // În schimb, vom actualiza înregistrarea existentă
                await db.run(`
                    UPDATE SetariEmail 
                    SET 
                        AutoReminderEnabled = ?,
                        DaysBeforeReminder = ?,
                        ReminderIntervalDays = ?,
                        UrgentThresholdDays = ?,
                        EnableTrackingInReminders = ?,
                        UrmaresteDeschdereEmailurilor = ?
                `, [
                    autoReminderEnabled ? 1 : 0,
                    daysBeforeReminder,
                    reminderIntervalDays,
                    urgentThresholdDays || 14,
                    enableTrackingInReminders ? 1 : 0,
                    trackOpens ? 1 : 0
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
