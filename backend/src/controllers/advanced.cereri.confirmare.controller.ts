import { Request, Response } from 'express';
import { cereriConfirmareOrchestratorService } from '../services/cereri.confirmare.orchestrator.service';
import { advancedStorageService } from '../services/advanced.storage.service';

/**
 * Controller îmbunătățit pentru procesul de cereri de confirmare
 * Implementează procedura business completă cu noile servicii
 */
export class AdvancedCereriConfirmareController {

    /**
     * Inițializează o nouă sesiune de cereri de confirmare
     * POST /api/cereri-confirmare/initialize-session
     */
    async initializeSession(req: Request, res: Response): Promise<void> {
        try {
            // Extrage informațiile utilizatorului din JWT (adăugate de middleware)
            const userInfo = (req as any).user;
            
            if (!userInfo) {
                res.status(401).json({
                    success: false,
                    message: 'Utilizator neautentificat'
                });
                return;
            }

            const { 
                parteneriSelectati, 
                partnerCategory, // ✅ STEP 1: Categoria selectată determină template-urile automat
                dataSold, 
                subiectEmail, 
                folderLocal,
                observatii 
            } = req.body;

            // Validare date de intrare
            if (!parteneriSelectati || !Array.isArray(parteneriSelectati) || parteneriSelectati.length === 0) {
                res.status(400).json({
                    success: false,
                    message: 'Lista de parteneri este obligatorie și trebuie să conțină cel puțin un partener'
                });
                return;
            }

            if (!partnerCategory) {
                res.status(400).json({
                    success: false,
                    message: 'Categoria partenerilor este obligatorie pentru determinarea automată a template-ului'
                });
                return;
            }

            if (!dataSold) {
                res.status(400).json({
                    success: false,
                    message: 'Data soldului este obligatorie'
                });
                return;
            }

            if (!subiectEmail) {
                res.status(400).json({
                    success: false,
                    message: 'Subiectul email-ului este obligatoriu'
                });
                return;
            }

            if (!folderLocal) {
                res.status(400).json({
                    success: false,
                    message: 'Folderul local este obligatoriu'
                });
                return;
            }

            // Pregătește datele pentru sesiune cu categoria selectată în Step 1
            const sesiuneData = {
                idUtilizator: userInfo.id,
                numeUtilizator: userInfo.nume,
                emailUtilizator: userInfo.email,
                rolUtilizator: userInfo.rol,
                parteneriSelectati,
                partnerCategory, // ✅ Categoria din Step 1 - determină automat template-urile
                dataSold,
                subiectEmail,
                folderLocal,
                observatii
            };

            // Informații client pentru audit
            const clientInfo = {
                adresaIP: req.ip || req.connection.remoteAddress,
                userAgent: req.get('User-Agent')
            };

            console.log(`🚀 Inițializare sesiune pentru utilizatorul: ${userInfo.nume} (${userInfo.email})`);

            // Inițializează sesiunea
            const rezultat = await cereriConfirmareOrchestratorService.initializeSesiuneCereri(
                sesiuneData,
                clientInfo
            );

            res.status(201).json({
                success: true,
                message: `Sesiune inițializată cu succes: ${rezultat.documenteReservate.length} documente rezervate`,
                data: rezultat
            });

        } catch (error) {
            console.error('❌ Eroare la inițializarea sesiunii:', error);
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Eroare la inițializarea sesiunii'
            });
        }
    }

    /**
     * Generează documentele PDF pentru sesiune
     * POST /api/cereri-confirmare/generate-documents
     */
    /**
     * Generează documentele PDF pentru sesiune - STEP 3 din SESIUNE.md
     * POST /api/advanced-cereri-confirmare/generate-documents
     */
    async generateDocuments(req: Request, res: Response): Promise<void> {
        try {
            const { idSesiune, documenteReservate, templateBlobContainer, sesiuneData } = req.body;

            if (!idSesiune) {
                res.status(400).json({
                    success: false,
                    message: 'ID-ul sesiunii este obligatoriu'
                });
                return;
            }

            if (!documenteReservate || !Array.isArray(documenteReservate)) {
                res.status(400).json({
                    success: false,
                    message: 'Lista documentelor rezervate este obligatorie'
                });
                return;
            }

            if (!sesiuneData) {
                res.status(400).json({
                    success: false,
                    message: 'Datele sesiunii sunt obligatorii pentru Step 3 (lucru în memorie)'
                });
                return;
            }

            console.log(`📄 STEP 3: Generare documente pentru sesiunea: ${idSesiune}`);
            console.log(`⚠️ Categoria din Step 1: ${sesiuneData.partnerCategory} - va determina automat template-urile`);

            const documenteGenerate = await cereriConfirmareOrchestratorService.generateDocumentePentruSesiune(
                idSesiune,
                documenteReservate,
                templateBlobContainer || 'templates',
                sesiuneData // ✅ Trimitem datele sesiunii pentru lucru în memorie
            );

            res.status(200).json({
                success: true,
                message: `${documenteGenerate.length} documente generate cu succes în Step 3 - NU s-a salvat nimic în BD încă!`,
                data: documenteGenerate
            });

        } catch (error) {
            console.error('❌ Eroare la generarea documentelor în Step 3:', error);
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Eroare la generarea documentelor în Step 3'
            });
        }
    }

    /**
     * Procesează documentele semnate
     * POST /api/cereri-confirmare/process-signed-documents
     */
    async processSignedDocuments(req: Request, res: Response): Promise<void> {
        try {
            const { idSesiune, documenteGenerate, folderDocumenteSemnate } = req.body;

            if (!idSesiune) {
                res.status(400).json({
                    success: false,
                    message: 'ID-ul sesiunii este obligatoriu'
                });
                return;
            }

            if (!documenteGenerate || !Array.isArray(documenteGenerate)) {
                res.status(400).json({
                    success: false,
                    message: 'Lista documentelor generate este obligatorie'
                });
                return;
            }

            if (!folderDocumenteSemnate) {
                res.status(400).json({
                    success: false,
                    message: 'Folderul documentelor semnate este obligatoriu'
                });
                return;
            }

            console.log(`✍️ Procesare documente semnate pentru sesiunea: ${idSesiune}`);

            const documenteProcesate = await cereriConfirmareOrchestratorService.procesDocumenteSemnate(
                idSesiune,
                documenteGenerate,
                folderDocumenteSemnate
            );

            res.status(200).json({
                success: true,
                message: `${documenteProcesate.length} documente semnate procesate cu succes`,
                data: documenteProcesate
            });

        } catch (error) {
            console.error('❌ Eroare la procesarea documentelor semnate:', error);
            
            // Verifică dacă este o eroare de blocare securitate
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('BLOCARE SECURITATE')) {
                console.error('🔒 BLOCARE SECURITATE în Step 3 - aplicația nu poate continua!');
                res.status(403).json({
                    success: false,
                    error: 'SECURITY_BLOCK',
                    message: errorMessage,
                    details: 'PDF nesemnat detectat în Step 3. Aplicația nu poate continua cu fișiere nesemnate.',
                    timestamp: new Date().toISOString()
                });
                return;
            }
            
            res.status(500).json({
                success: false,
                message: errorMessage
            });
        }
    }

    /**
     * Finalizează sesiunea și trimite cererile
     * POST /api/cereri-confirmare/finalize-session
     */
    async finalizeSession(req: Request, res: Response): Promise<void> {
        try {
            // Extrage informațiile utilizatorului din JWT
            const userInfo = (req as any).user;
            
            if (!userInfo) {
                res.status(401).json({
                    success: false,
                    message: 'Utilizator neautentificat'
                });
                return;
            }

            const { idSesiune, documenteProcesate, sesiuneData } = req.body;

            if (!idSesiune) {
                res.status(400).json({
                    success: false,
                    message: 'ID-ul sesiunii este obligatoriu'
                });
                return;
            }

            if (!documenteProcesate || !Array.isArray(documenteProcesate)) {
                res.status(400).json({
                    success: false,
                    message: 'Lista documentelor procesate este obligatorie'
                });
                return;
            }

            if (!sesiuneData) {
                res.status(400).json({
                    success: false,
                    message: 'Datele sesiunii sunt obligatorii'
                });
                return;
            }

            // Completează datele sesiunii cu informațiile din JWT
            const sesiuneCompleta = {
                ...sesiuneData,
                idUtilizator: userInfo.id,
                numeUtilizator: userInfo.nume,
                emailUtilizator: userInfo.email,
                rolUtilizator: userInfo.rol
            };

            console.log(`🏁 Finalizare sesiune: ${idSesiune}`);

            // PASO 1: Înregistrează documentele în JurnalDocumenteEmise
            const step4Result = await cereriConfirmareOrchestratorService.finalizeazaSesiuneInStep4(
                idSesiune,
                documenteProcesate,
                sesiuneCompleta
            );

            // PASO 2: Trimite email-urile și înregistrează în JurnalEmail + JurnalCereriConfirmare
            const rezultatFinal = await cereriConfirmareOrchestratorService.finalizareSesiune(
                idSesiune,
                step4Result.documenteInregistrate,
                sesiuneCompleta
            );

            res.status(200).json({
                success: true,
                message: `Sesiune finalizată cu succes: ${step4Result.documenteInregistrate.length} documente înregistrate în JurnalDocumenteEmise, ${rezultatFinal.cereriTrimise.length} email-uri trimise`,
                data: {
                    documenteInregistrate: step4Result.documenteInregistrate,
                    cereriTrimise: rezultatFinal.cereriTrimise,
                    erori: rezultatFinal.erori
                }
            });

        } catch (error) {
            console.error('❌ Eroare la finalizarea sesiunii:', error);
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Eroare la finalizarea sesiunii'
            });
        }
    }

    /**
     * Listează documentele unei sesiuni din Azure Blob Storage
     * GET /api/cereri-confirmare/session/:idSesiune/documents
     */
    async getSessionDocuments(req: Request, res: Response): Promise<void> {
        try {
            const { idSesiune } = req.params;
            const { tipDocument } = req.query;

            if (!idSesiune) {
                res.status(400).json({
                    success: false,
                    message: 'ID-ul sesiunii este obligatoriu'
                });
                return;
            }

            console.log(`📋 Listare documente pentru sesiunea: ${idSesiune}`);

            const documente = await advancedStorageService.listDocumentsForSession(
                idSesiune,
                tipDocument as 'cereri' | 'semnate' | 'templates' | undefined
            );

            res.status(200).json({
                success: true,
                message: `Găsite ${documente.length} documente pentru sesiunea ${idSesiune}`,
                data: {
                    idSesiune,
                    tipDocument: tipDocument || 'toate',
                    documente
                }
            });

        } catch (error) {
            console.error('❌ Eroare la listarea documentelor sesiunii:', error);
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Eroare la listarea documentelor'
            });
        }
    }

    /**
     * Generează URL pre-semnat pentru descărcarea unui document
     * GET /api/cereri-confirmare/documents/:blobPath/download-url
     */
    async generateDownloadUrl(req: Request, res: Response): Promise<void> {
        try {
            const { blobPath } = req.params;
            const { expiryHours } = req.query;

            if (!blobPath) {
                res.status(400).json({
                    success: false,
                    message: 'Calea blob-ului este obligatorie'
                });
                return;
            }

            const url = await advancedStorageService.generatePresignedUrl(
                decodeURIComponent(blobPath),
                'confirmarisolduri',
                expiryHours ? parseInt(expiryHours as string) : 24
            );

            res.status(200).json({
                success: true,
                message: 'URL pre-semnat generat cu succes',
                data: {
                    blobPath,
                    downloadUrl: url,
                    expiryHours: expiryHours || 24
                }
            });

        } catch (error) {
            console.error('❌ Eroare la generarea URL-ului de descărcare:', error);
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Eroare la generarea URL-ului'
            });
        }
    }

    /**
     * Șterge documentele unei sesiuni
     * DELETE /api/cereri-confirmare/session/:idSesiune/documents
     */
    async deleteSessionDocuments(req: Request, res: Response): Promise<void> {
        try {
            const { idSesiune } = req.params;

            if (!idSesiune) {
                res.status(400).json({
                    success: false,
                    message: 'ID-ul sesiunii este obligatoriu'
                });
                return;
            }

            console.log(`🗑️ Ștergere documente pentru sesiunea: ${idSesiune}`);

            const documenteSterse = await advancedStorageService.deleteSessionDocuments(idSesiune);

            res.status(200).json({
                success: true,
                message: `${documenteSterse} documente șterse cu succes pentru sesiunea ${idSesiune}`,
                data: {
                    idSesiune,
                    documenteSterse
                }
            });

        } catch (error) {
            console.error('❌ Eroare la ștergerea documentelor sesiunii:', error);
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Eroare la ștergerea documentelor'
            });
        }
    }
}

export const advancedCereriConfirmareController = new AdvancedCereriConfirmareController();
