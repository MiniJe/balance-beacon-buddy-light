import { Request, Response } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { folderSettingsService } from '../services';

export class FolderSettingsController {
    constructor() {
        // Nu mai avem nevoie de instanțiere, folosim direct serviciul exportat
    }

    /**
     * Obține setările de foldere pentru utilizatorul curent
     * GET /api/folder-settings
     */
    async getFolderSettings(req: Request, res: Response): Promise<void> {
        try {
            console.log('📂 Controller: Se încarcă setările de foldere...');
            
            const folderSettings = await folderSettingsService.getFolderSettings();
            
            res.json({
                success: true,
                folderSettings,
                message: 'Setările de foldere au fost încărcate cu succes'
            });

            console.log('✅ Controller: Setările de foldere au fost încărcate cu succes');

        } catch (error) {
            console.error('❌ Controller: Eroare la încărcarea setărilor de foldere:', error);
            res.status(500).json({
                success: false,
                message: 'Eroare la încărcarea setărilor de foldere',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Actualizează setările de foldere
     * PUT /api/folder-settings
     */
    async updateFolderSettings(req: Request, res: Response): Promise<void> {
        try {
            console.log('📂 Controller: Se actualizează setările de foldere...');
            
            const { folderSettings } = req.body;
            
            if (!folderSettings) {
                res.status(400).json({
                    success: false,
                    message: 'Datele setărilor de foldere sunt obligatorii'
                });
                return;
            }

            const updatedSettings = await folderSettingsService.updateFolderSettings(folderSettings);
            
            res.json({
                success: true,
                folderSettings: updatedSettings,
                message: 'Setările de foldere au fost actualizate cu succes'
            });

            console.log('✅ Controller: Setările de foldere au fost actualizate cu succes');

        } catch (error) {
            console.error('❌ Controller: Eroare la actualizarea setărilor de foldere:', error);
            res.status(500).json({
                success: false,
                message: 'Eroare la actualizarea setărilor de foldere',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Testează accesul la un folder
     * POST /api/folder-settings/test
     */
    async testFolderAccess(req: Request, res: Response): Promise<void> {
        try {
            console.log('📂 Controller: Se testează accesul la folder...');
            
            const { path: folderPath, folderType } = req.body;
            
            if (!folderPath || !folderType) {
                res.status(400).json({
                    success: false,
                    message: 'Calea folderului și tipul sunt obligatorii'
                });
                return;
            }

            const testResult = await folderSettingsService.testFolderAccess(folderPath, folderType);
            
            if (testResult.success) {
                res.json({
                    success: true,
                    message: `Folderul ${folderType} este accesibil`,
                    details: testResult.details
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: testResult.message,
                    details: testResult.details
                });
            }

            console.log(`📂 Controller: Test folder ${folderType}: ${testResult.success ? 'SUCCESS' : 'FAILED'}`);

        } catch (error) {
            console.error('❌ Controller: Eroare la testarea folderului:', error);
            res.status(500).json({
                success: false,
                message: 'Eroare la testarea accesului la folder',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Creează un folder dacă nu există
     * POST /api/folder-settings/create
     */
    async createFolder(req: Request, res: Response): Promise<void> {
        try {
            console.log('📂 Controller: Se creează folderul...');
            
            const { path: folderPath, folderType } = req.body;
            
            if (!folderPath || !folderType) {
                res.status(400).json({
                    success: false,
                    message: 'Calea folderului și tipul sunt obligatorii'
                });
                return;
            }

            const createResult = await folderSettingsService.createFolder(folderPath, folderType);
            
            if (createResult.success) {
                res.json({
                    success: true,
                    message: createResult.message,
                    details: createResult.details
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: createResult.message,
                    details: createResult.details
                });
            }

            console.log(`📂 Controller: Creare folder ${folderType}: ${createResult.success ? 'SUCCESS' : 'FAILED'}`);

        } catch (error) {
            console.error('❌ Controller: Eroare la crearea folderului:', error);
            res.status(500).json({
                success: false,
                message: 'Eroare la crearea folderului',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Resetează setările de foldere la valorile implicite
     * DELETE /api/folder-settings/reset
     */
    async resetFolderSettings(req: Request, res: Response): Promise<void> {
        try {
            console.log('📂 Controller: Se resetează setările de foldere...');
            
            const defaultSettings = await folderSettingsService.resetToDefaults();
            
            res.json({
                success: true,
                folderSettings: defaultSettings,
                message: 'Setările de foldere au fost resetate la valorile implicite'
            });

            console.log('✅ Controller: Setările de foldere au fost resetate cu succes');

        } catch (error) {
            console.error('❌ Controller: Eroare la resetarea setărilor de foldere:', error);
            res.status(500).json({
                success: false,
                message: 'Eroare la resetarea setărilor de foldere',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
}
