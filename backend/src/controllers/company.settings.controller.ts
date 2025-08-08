import { Request, Response } from 'express';
import { companySettingsService, CompanySettings } from '../services/company.settings.service';

export class CompanySettingsController {

    /**
     * Obține setările companiei
     * GET /api/company-settings
     */
    async getCompanySettings(req: Request, res: Response): Promise<void> {
        try {
            console.log('📊 Controller: Se încarcă setările companiei...');
            
            const settings = await companySettingsService.getCompanySettings();
            
            if (settings) {
                // Mapează datele în formatul așteptat de frontend
                const frontendSettings = {
                    IdCompanie: settings.IdCompanie,
                    NumeCompanie: settings.NumeCompanie,
                    CUICompanie: settings.CUICompanie,
                    ONRCCompanie: settings.ONRCCompanie,
                    AdresaCompanie: settings.AdresaCompanie,
                    EmailCompanie: settings.EmailCompanie,
                    TelefonCompanie: settings.TelefonCompanie,
                    ContBancarCompanie: settings.ContBancarCompanie,
                    BancaCompanie: settings.BancaCompanie,
                    CaleLogoCompanie: settings.CaleLogoCompanie,
                    DataCreareCompanie: settings.DataCreareCompanie,
                    DataModificareCompanie: settings.DataModificareCompanie
                };

                res.json({
                    success: true,
                    data: { settings: frontendSettings },
                    message: 'Setări companie obținute cu succes'
                });
            } else {
                // Returnează setări default dacă nu există
                const defaultSettings = {
                    IdCompanie: "temp-" + Date.now(),
                    NumeCompanie: "",
                    CUICompanie: "",
                    ONRCCompanie: "",
                    AdresaCompanie: "",
                    EmailCompanie: "",
                    TelefonCompanie: "",
                    ContBancarCompanie: "",
                    BancaCompanie: "",
                    CaleLogoCompanie: "",
                    DataCreareCompanie: new Date().toISOString(),
                    DataModificareCompanie: new Date().toISOString()
                };
                
                res.json({
                    success: true,
                    data: { settings: defaultSettings },
                    message: 'Setări companie implicite returnate'
                });
            }

            console.log('✅ Controller: Setările companiei au fost încărcate cu succes');

        } catch (error) {
            console.error('❌ Controller: Eroare la încărcarea setărilor companiei:', error);
            res.status(500).json({
                success: false,
                message: 'Eroare la încărcarea setărilor companiei',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Actualizează setările companiei
     * POST /api/company-settings
     */
    async saveCompanySettings(req: Request, res: Response): Promise<void> {
        try {
            console.log('📊 Controller: Se salvează setările companiei...');
            console.log('📊 Request body:', req.body);
            
            const {
                NumeCompanie,
                CUICompanie,
                ONRCCompanie,
                AdresaCompanie,
                EmailCompanie,
                TelefonCompanie,
                ContBancarCompanie,
                BancaCompanie,
                CaleLogoCompanie
            } = req.body;

            // Validare de bază
            if (!NumeCompanie || !CUICompanie) {
                res.status(400).json({
                    success: false,
                    message: 'Numele companiei și CUI-ul sunt obligatorii'
                });
                return;
            }

            const settingsData = {
                NumeCompanie,
                CUICompanie,
                ONRCCompanie,
                AdresaCompanie,
                EmailCompanie,
                TelefonCompanie,
                ContBancarCompanie,
                BancaCompanie,
                CaleLogoCompanie
            };

            const updatedSettings = await companySettingsService.updateCompanySettings(settingsData);
            
            // Mapează răspunsul în formatul așteptat de frontend
            const frontendResponse = {
                IdCompanie: updatedSettings.IdCompanie,
                NumeCompanie: updatedSettings.NumeCompanie,
                CUICompanie: updatedSettings.CUICompanie,
                ONRCCompanie: updatedSettings.ONRCCompanie,
                AdresaCompanie: updatedSettings.AdresaCompanie,
                EmailCompanie: updatedSettings.EmailCompanie,
                TelefonCompanie: updatedSettings.TelefonCompanie,
                ContBancarCompanie: updatedSettings.ContBancarCompanie,
                BancaCompanie: updatedSettings.BancaCompanie,
                CaleLogoCompanie: updatedSettings.CaleLogoCompanie,
                DataCreareCompanie: updatedSettings.DataCreareCompanie,
                DataModificareCompanie: updatedSettings.DataModificareCompanie
            };
            
            res.json({
                success: true,
                data: { settings: frontendResponse },
                message: 'Setările companiei au fost actualizate cu succes'
            });

            console.log('✅ Controller: Setările companiei au fost salvate cu succes');

        } catch (error) {
            console.error('❌ Controller: Eroare la salvarea setărilor companiei:', error);
            res.status(500).json({
                success: false,
                message: 'Eroare la salvarea setărilor companiei',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Actualizează setările companiei (alias pentru saveCompanySettings)
     * PUT /api/company-settings
     */
    async updateCompanySettings(req: Request, res: Response): Promise<void> {
        // Folosește aceeași logică ca saveCompanySettings
        await this.saveCompanySettings(req, res);
    }
}

// Exportăm instanța controller-ului
export const companySettingsController = new CompanySettingsController();
