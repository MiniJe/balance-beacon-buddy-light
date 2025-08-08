import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { cereriConfirmareOrchestratorService } from '../services/cereri.confirmare.orchestrator.service';

export interface SesiuneCereriData {
    idUtilizator: string;
    numeUtilizator: string;
    emailUtilizator: string;
    rolUtilizator: string;
    parteneriSelectati: string[];
    partnerCategory: string; // Categoria selectată în Step 1 - determină automat template-ul
    dataSold: string;
    folderLocal: string;
    subiectEmail: string;
    templateBlobContainer?: string;
}

/**
 * Controller pentru cereri de confirmare sold
 * Implementează workflow-ul în 4 pași conform procedurii business
 */
export class CereriConfirmareController {

    /**
     * Inițiază o nouă sesiune de cereri de confirmare
     * POST /api/cereri-confirmare/initialize-session
     * 
     * IMPORTANT: În acest pas se rezervă numerele TEMPORAR, dar NU se înregistrează în JurnalDocumenteEmise!
     * Conform procedurii business, numerele se înregistrează doar în Step 4.
     */
    async initializeSession(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            console.log('🚀 Inițializare sesiune cereri confirmare...');
            console.log('📋 Request body parteneriSelectati:', req.body.parteneriSelectati);

            const {
                parteneriSelectati,
                dataSold,
                folderLocal,
                subiectEmail,
                templateBlobContainer = 'templates'
            } = req.body;

            // Validare parametri de intrare
            if (!parteneriSelectati || !Array.isArray(parteneriSelectati) || parteneriSelectati.length === 0) {
                res.status(400).json({
                    success: false,
                    message: 'Lista de parteneri selectați este obligatorie și nu poate fi goală'
                });
                return;
            }

            if (!dataSold || !folderLocal) {
                res.status(400).json({
                    success: false,
                    message: 'Data sold și folder local sunt obligatorii'
                });
                return;
            }

            // Validare autentificare
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'Utilizator neautentificat'
                });
                return;
            }

            // Extrage informațiile utilizatorului din JWT
            let idUtilizator: string;
            let numeUtilizator: string;
            let emailUtilizator: string;
            let rolUtilizator: string;

            if (req.user.IdUtilizatori) {
                // Utilizator MASTER/ADMIN/USER
                idUtilizator = req.user.IdUtilizatori;
                numeUtilizator = req.user.NumeUtilizator || '';
                emailUtilizator = req.user.EmailUtilizator || '';
                rolUtilizator = req.user.RolUtilizator || 'USER';
            } else if (req.user.IdContabil) {
                // Contabil
                idUtilizator = req.user.IdContabil;
                numeUtilizator = req.user.NumeContabil || '';
                emailUtilizator = req.user.EmailContabil || '';
                rolUtilizator = 'CONTABIL';
            } else {
                res.status(401).json({
                    success: false,
                    message: 'Tip utilizator nerecunoscut'
                });
                return;
            }

            // Pregătește datele sesiunii
            const sesiuneData: SesiuneCereriData = {
                idUtilizator,
                numeUtilizator,
                emailUtilizator,
                rolUtilizator,
                parteneriSelectati,
                partnerCategory: req.body.partnerCategory || 'client_duc', // Categoria selectată în Step 1
                dataSold,
                folderLocal,
                subiectEmail,
                templateBlobContainer
            };

            // Informații client pentru auditare
            const clientInfo = {
                adresaIP: req.ip || req.socket.remoteAddress || 'necunoscut',
                userAgent: req.headers['user-agent'] || 'necunoscut'
            };

            console.log('📋 Sesiune data pregătită:', {
                utilizator: numeUtilizator,
                parteneri: parteneriSelectati.length,
                dataSold
            });

            // Apelează serviciul pentru inițializarea sesiunii
            // IMPORTANT: Aceasta REZERVĂ numerele temporar, NU le înregistrează în JurnalDocumenteEmise!
            const rezultat = await cereriConfirmareOrchestratorService.initializeSesiuneCereri(sesiuneData, clientInfo);

            res.status(201).json({
                success: true,
                message: 'Sesiune inițializată cu succes',
                data: rezultat
            });

        } catch (error) {
            console.error('Eroare la inițializarea sesiunii:', error);
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Eroare la inițializarea sesiunii'
            });
        }
    }

    /**
     * Generează documentele PDF pentru o sesiune
     * POST /api/cereri-confirmare/generate-documents
     */
    async generateDocuments(req: Request, res: Response): Promise<void> {
        try {
            const {
                idSesiune,
                documenteReservate,
                templateBlobContainer = 'templates'
            } = req.body;

            if (!idSesiune || !documenteReservate || !Array.isArray(documenteReservate)) {
                res.status(400).json({
                    success: false,
                    message: 'ID sesiune și lista documentelor rezervate sunt obligatorii'
                });
                return;
            }

            const documenteGenerate = await cereriConfirmareOrchestratorService.generateDocumentePentruSesiune(
                idSesiune,
                documenteReservate,
                templateBlobContainer
            );

            res.status(200).json({
                success: true,
                message: 'Documente generate cu succes',
                data: documenteGenerate
            });

        } catch (error) {
            console.error('Eroare la generarea documentelor:', error);
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Eroare la generarea documentelor'
            });
        }
    }

    /**
     * Procesează documentele semnate
     * POST /api/cereri-confirmare/process-signed-documents
     */
    async processSignedDocuments(req: Request, res: Response): Promise<void> {
        try {
            const {
                idSesiune,
                documenteGenerate,
                folderDocumenteSemnate
            } = req.body;

            if (!idSesiune || !documenteGenerate || !folderDocumenteSemnate) {
                res.status(400).json({
                    success: false,
                    message: 'Toate parametrii sunt obligatorii pentru procesarea documentelor semnate'
                });
                return;
            }

            const documenteProcesate = await cereriConfirmareOrchestratorService.procesDocumenteSemnate(
                idSesiune,
                documenteGenerate,
                folderDocumenteSemnate
            );

            res.status(200).json({
                success: true,
                message: 'Documente semnate procesate cu succes',
                data: documenteProcesate
            });

        } catch (error) {
            console.error('Eroare la procesarea documentelor semnate:', error);
            
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
     * CORECTATĂ: Finalizează sesiunea în Step 4 și înregistrează numerele în JurnalDocumenteEmise
     * Conform procedurii business: numerele se înregistrează DOAR la sfârșitul procesului!
     * POST /api/cereri-confirmare/finalize-session
     */
    async finalizeSession(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const {
                idSesiune,
                documenteGenerateFinale,
                sesiuneData
            } = req.body;

            // Validare input
            if (!idSesiune || !documenteGenerateFinale || !Array.isArray(documenteGenerateFinale) || !sesiuneData) {
                res.status(400).json({
                    success: false,
                    message: 'Parametri invalizi: idSesiune, documenteGenerateFinale (array) și sesiuneData sunt obligatorii'
                });
                return;
            }

            // Validare autentificare
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'Utilizator neautentificat'
                });
                return;
            }

            console.log(`🏁 FINALIZARE STEP 4 pentru sesiunea: ${idSesiune}`);
            console.log(`📋 Documente de finalizat: ${documenteGenerateFinale.length}`);

            // ACUM înregistrăm efectiv numerele în JurnalDocumenteEmise!
            const rezultat = await cereriConfirmareOrchestratorService.finalizeazaSesiuneInStep4(
                idSesiune,
                documenteGenerateFinale,
                sesiuneData
            );

            console.log(`✅ STEP 4 COMPLET: Sesiunea ${idSesiune} finalizată cu ${rezultat.documenteInregistrate.length} documente`);

            res.status(200).json({
                success: true,
                message: `Sesiune finalizată cu succes! ${rezultat.documenteInregistrate.length} documente înregistrate în JurnalDocumenteEmise`,
                data: rezultat
            });

        } catch (error) {
            console.error('❌ Eroare la finalizarea sesiunii în Step 4:', error);
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Eroare la finalizarea sesiunii'
            });
        }
    }

    /**
     * Procesează întreaga operațiune într-o singură metodă
     * POST /api/cereri-confirmare/process-complete
     */
    async processComplete(req: Request, res: Response): Promise<void> {
        try {
            const {
                sesiuneData,
                folderDocumenteSemnate,
                templateBlobContainer = 'templates'
            } = req.body;

            // Validare parametri
            if (!sesiuneData || !folderDocumenteSemnate) {
                res.status(400).json({
                    success: false,
                    message: 'Datele sesiunii și folderul documentelor semnate sunt obligatorii'
                });
                return;
            }

            // Informații client pentru auditare
            const clientInfo = {
                adresaIP: req.ip || req.socket.remoteAddress || 'necunoscut',
                userAgent: req.headers['user-agent'] || 'necunoscut'
            };

            const rezultat = await cereriConfirmareOrchestratorService.procesCereriConfirmareComplet(
                sesiuneData,
                folderDocumenteSemnate,
                templateBlobContainer,
                clientInfo
            );

            res.status(200).json({
                success: true,
                message: 'Proces complet finalizat cu succes',
                data: rezultat
            });

        } catch (error) {
            console.error('Eroare la procesul complet:', error);
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Eroare la procesul complet'
            });
        }
    }

    /**
     * Obține statusul unei sesiuni
     * GET /api/cereri-confirmare/session-status/:idSesiune
     */
    async getSessionStatus(req: Request, res: Response): Promise<void> {
        try {
            const { idSesiune } = req.params;

            if (!idSesiune) {
                res.status(400).json({
                    success: false,
                    message: 'ID sesiune obligatoriu'
                });
                return;
            }

            res.status(200).json({
                success: true,
                message: 'Status sesiune obținut cu succes',
                data: {
                    idSesiune,
                    status: 'active',
                    message: 'Implementarea statusului sesiunii este în dezvoltare'
                }
            });

        } catch (error) {
            console.error('Eroare la obținerea statusului sesiunii:', error);
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Eroare la obținerea statusului sesiunii'
            });
        }
    }
}

export const cereriConfirmareController = new CereriConfirmareController();