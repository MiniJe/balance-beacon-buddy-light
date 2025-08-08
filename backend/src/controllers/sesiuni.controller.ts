import { Request, Response } from 'express';
import JurnalSesiuniService from '../services/JurnalSesiuniService';
import { SessionService } from '../services/session.service';
import { CreateJurnalSesiuniDto, UpdateJurnalSesiuniDto, JurnalSesiuniFilterDto } from '../models/JurnalSesiuni';
import { ApiResponseHelper } from '../types/api.types';

/**
 * Controller pentru gestionarea jurnalului de sesiuni
 */
export class JurnalSesiuniController {
    private sessionService: SessionService;

    constructor() {
        this.sessionService = new SessionService();
    }

    /**
     * Creează o nouă sesiune (login)
     * POST /api/sesiuni/login
     */
    async login(req: Request, res: Response): Promise<void> {
        try {
            const data: CreateJurnalSesiuniDto = req.body;
            
            // Validare date obligatorii
            if (!data.idUtilizator || !data.numeUtilizator || !data.emailUtilizator || !data.rolUtilizator) {
                const errorResponse = ApiResponseHelper.validationError(
                    'Date obligatorii lipsă: idUtilizator, numeUtilizator, emailUtilizator, rolUtilizator',
                    'idUtilizator,numeUtilizator,emailUtilizator,rolUtilizator'
                );
                res.status(400).json(errorResponse);
                return;
            }

            const idSesiune = await JurnalSesiuniService.createSesiune(data, req);
            
            const response = ApiResponseHelper.success(
                { idSesiune },
                'Sesiune creată cu succes'
            );
            res.json(response);
            
        } catch (error) {
            console.error('Eroare la login:', error);
            const errorResponse = ApiResponseHelper.error(
                'Eroare la crearea sesiunii',
                'SESSION_CREATE_ERROR',
                error instanceof Error ? error.message : 'Eroare necunoscută'
            );
            res.status(500).json(errorResponse);
        }
    }

    /**
     * Actualizează sesiunea (logout)
     * PUT /api/sesiuni/:idSesiune/logout
     */
    async logout(req: Request, res: Response): Promise<void> {
        try {
            const { idSesiune } = req.params;
            const { observatii } = req.body;

            // Folosim SessionService.endSession pentru a calcula corect durata și a genera hash-urile
            await this.sessionService.endSession(idSesiune, observatii);
            
            const response = ApiResponseHelper.success(
                { idSesiune },
                'Logout înregistrat cu succes'
            );
            res.json(response);
            
        } catch (error) {
            console.error('Eroare la logout:', error);
            const errorResponse = ApiResponseHelper.error(
                'Eroare la logout',
                'SESSION_LOGOUT_ERROR',
                error instanceof Error ? error.message : 'Eroare necunoscută'
            );
            res.status(500).json(errorResponse);
        }
    }

    /**
     * Actualizează activitatea utilizatorului
     * PUT /api/sesiuni/:idSesiune/activitate
     */
    async updateActivitate(req: Request, res: Response): Promise<void> {
        try {
            const { idSesiune } = req.params;
            
            await JurnalSesiuniService.incrementActiuni(idSesiune);
            
            res.json({
                success: true,
                message: 'Activitate actualizată'
            });
            
        } catch (error) {
            console.error('Eroare la actualizarea activității:', error);
            res.status(500).json({
                success: false,
                message: 'Eroare la actualizarea activității',
                error: error instanceof Error ? error.message : 'Eroare necunoscută'
            });
        }
    }

    /**
     * Obține sesiunea activă pentru un utilizator
     * GET /api/sesiuni/activa/:idUtilizator
     */
    async getSesiuneActiva(req: Request, res: Response): Promise<void> {
        try {
            const { idUtilizator } = req.params;
            
            const sesiune = await JurnalSesiuniService.getSesiuneActiva(idUtilizator);
            
            res.json({
                success: true,
                data: sesiune
            });
            
        } catch (error) {
            console.error('Eroare la obținerea sesiunii active:', error);
            res.status(500).json({
                success: false,
                message: 'Eroare la obținerea sesiunii active',
                error: error instanceof Error ? error.message : 'Eroare necunoscută'
            });
        }
    }

    /**
     * Obține lista sesiunilor cu filtrare și paginare
     * GET /api/sesiuni
     */
    async getSesiuni(req: Request, res: Response): Promise<void> {
        try {
            const filter: JurnalSesiuniFilterDto = {
                idUtilizator: req.query.idUtilizator as string,
                numeUtilizator: req.query.numeUtilizator as string,
                tipUtilizator: req.query.tipUtilizator as 'utilizator' | 'contabil',
                statusSesiune: req.query.statusSesiune as 'activa' | 'inchisa' | 'expirata',
                dataInceput: req.query.dataInceput ? new Date(req.query.dataInceput as string) : undefined,
                dataSfarsit: req.query.dataSfarsit ? new Date(req.query.dataSfarsit as string) : undefined,
                adresaIP: req.query.adresaIP as string,
                dispozitiv: req.query.dispozitiv as string,
                blockchainStatus: req.query.blockchainStatus as 'pending' | 'confirmed' | 'failed',
                page: req.query.page ? parseInt(req.query.page as string) : undefined,
                limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
                sortBy: req.query.sortBy as 'dataOraLogin' | 'dataOraLogout' | 'durataSesiune' | 'numeUtilizator',
                sortOrder: req.query.sortOrder as 'ASC' | 'DESC'
            };

            const result = await JurnalSesiuniService.getSesiuni(filter);
            
            res.json({
                success: true,
                data: result.sesiuni,
                pagination: {
                    total: result.total,
                    page: filter.page || 1,
                    limit: filter.limit || 50,
                    totalPages: Math.ceil(result.total / (filter.limit || 50))
                }
            });
            
        } catch (error) {
            console.error('Eroare la obținerea sesiunilor:', error);
            res.status(500).json({
                success: false,
                message: 'Eroare la obținerea sesiunilor',
                error: error instanceof Error ? error.message : 'Eroare necunoscută'
            });
        }
    }

    /**
     * Obține statistici despre sesiuni
     * GET /api/sesiuni/statistici
     */
    async getStatistici(req: Request, res: Response): Promise<void> {
        try {
            const statistici = await JurnalSesiuniService.getStatistici();
            
            res.json({
                success: true,
                data: statistici
            });
            
        } catch (error) {
            console.error('Eroare la obținerea statisticilor:', error);
            res.status(500).json({
                success: false,
                message: 'Eroare la obținerea statisticilor',
                error: error instanceof Error ? error.message : 'Eroare necunoscută'
            });
        }
    }

    /**
     * Închide sesiunile expirate
     * POST /api/sesiuni/close-expired
     */
    async closeExpiredSessions(req: Request, res: Response): Promise<void> {
        try {
            const timeoutMinutes = req.body.timeoutMinutes || 30;
            const closedSessions = await JurnalSesiuniService.closeExpiredSessions(timeoutMinutes);
            
            res.json({
                success: true,
                message: `${closedSessions} sesiuni expirate închise`,
                data: {
                    closedSessions: closedSessions,
                    timeoutMinutes: timeoutMinutes
                }
            });
            
        } catch (error) {
            console.error('Eroare la închiderea sesiunilor expirate:', error);
            res.status(500).json({
                success: false,
                message: 'Eroare la închiderea sesiunilor expirate',
                error: error instanceof Error ? error.message : 'Eroare necunoscută'
            });
        }
    }

    /**
     * Actualizează statusul blockchain pentru o sesiune
     * PUT /api/sesiuni/:idSesiune/blockchain
     */
    async updateBlockchainStatus(req: Request, res: Response): Promise<void> {
        try {
            const { idSesiune } = req.params;
            const { blockchainStatus, transactionIdLogin, transactionIdLogout } = req.body;

            const data: UpdateJurnalSesiuniDto = {
                blockchainStatus,
                ...(transactionIdLogin && { transactionIdLogin }),
                ...(transactionIdLogout && { transactionIdLogout })
            };

            await JurnalSesiuniService.updateSesiune(idSesiune, data);
            
            res.json({
                success: true,
                message: 'Status blockchain actualizat cu succes'
            });
            
        } catch (error) {
            console.error('Eroare la actualizarea statusului blockchain:', error);
            res.status(500).json({
                success: false,
                message: 'Eroare la actualizarea statusului blockchain',
                error: error instanceof Error ? error.message : 'Eroare necunoscută'
            });
        }
    }
}

// Export implicit pentru compatibilitate cu rutele existente
export default new JurnalSesiuniController();
