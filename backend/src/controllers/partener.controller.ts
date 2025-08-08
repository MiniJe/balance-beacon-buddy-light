import { Request, Response } from 'express';
import { Partener } from '../models/Partener';
import { ApiResponseHelper, PaginationInfo } from '../types/api.types';
import partenerService from '../services/partener.service';

interface DashboardStats {
    totalPartners: number;
    respondedPartners: number;
    pendingPartners: number;
    lastRequestDate: Date | null;
}

export class PartenerController {
    // Obține toți partenerii cu sortare, filtrare și paginare
    async getAllParteneri(req: Request, res: Response): Promise<void> {
        try {
            const { 
                sortBy = 'numePartener', 
                sortOrder = 'asc', 
                status = 'all', 
                partnerType = 'all',
                page = '1',
                limit = '50'
            } = req.query;

            // Calculează offset pentru paginare
            const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
            const requestedLimit = parseInt(limit as string, 10) || 50;
            const limitNum = requestedLimit > 500 ? requestedLimit : Math.min(100, Math.max(10, requestedLimit));

            const { parteneri, totalCount } = await partenerService.getAllParteneri(
                sortBy as string,
                sortOrder as string,
                status as string,
                partnerType as string,
                pageNum,
                limitNum
            );

            const paginationInfo: PaginationInfo = {
                currentPage: pageNum,
                totalPages: Math.ceil(totalCount / limitNum),
                totalItems: totalCount,
                itemsPerPage: limitNum,
                hasNextPage: pageNum < Math.ceil(totalCount / limitNum),
                hasPreviousPage: pageNum > 1
            };

            res.json(ApiResponseHelper.successWithPagination(
                parteneri,
                paginationInfo,
                'Parteneri obținuți cu succes'
            ));

        } catch (error) {
            console.error('Eroare la obținerea partenerilor:', error);
            res.status(500).json(ApiResponseHelper.error(
                'Eroare la obținerea partenerilor din baza de date',
                'DB_ERROR',
                error instanceof Error ? error.message : 'Eroare necunoscută'
            ));
        }
    }

    // Obține un partener după ID
    async getPartenerById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;

            if (!id) {
                res.status(400).json(ApiResponseHelper.validationError('id', 'ID-ul partenerului este obligatoriu'));
                return;
            }

            const partener = await partenerService.getPartenerById(id);

            if (!partener) {
                res.status(404).json(ApiResponseHelper.notFoundError('Partenerul'));
                return;
            }

            res.json(ApiResponseHelper.success(partener, 'Partener obținut cu succes'));

        } catch (error) {
            console.error('Eroare la obținerea partenerului:', error);
            res.status(500).json(ApiResponseHelper.error(
                'Eroare la obținerea partenerului din baza de date',
                'DB_ERROR',
                error instanceof Error ? error.message : 'Eroare necunoscută'
            ));
        }
    }

    // Caută parteneri după nume, CUI sau email
    async searchParteneri(req: Request, res: Response): Promise<void> {
        try {
            const { query, type } = req.query;

            if (!query) {
                res.status(400).json(ApiResponseHelper.validationError('query', 'Termenul de căutare este obligatoriu'));
                return;
            }

            const parteneri = await partenerService.searchParteneri(query as string, type as string);

            res.json(ApiResponseHelper.success(parteneri, `Găsite ${parteneri.length} rezultate`));

        } catch (error) {
            console.error('Eroare la căutarea partenerilor:', error);
            res.status(500).json(ApiResponseHelper.error(
                'Eroare la căutarea partenerilor în baza de date',
                'DB_ERROR',
                error instanceof Error ? error.message : 'Eroare necunoscută'
            ));
        }
    }

    // Obține parteneri după ID-uri (pentru selecție din multiple pagini)
    async getPartenersByIds(req: Request, res: Response): Promise<void> {
        try {
            const { ids } = req.query;

            if (!ids) {
                res.status(400).json(ApiResponseHelper.validationError('ids', 'Nu s-au furnizat ID-uri pentru căutare'));
                return;
            }

            // Convertește la array dacă este string sau array
            const idArray = Array.isArray(ids) ? ids : [ids];

            if (idArray.length === 0) {
                res.json(ApiResponseHelper.success([], 'Niciun ID furnizat'));
                return;
            }

            const parteneri = await partenerService.getPartenersByIds(idArray as string[]);

            res.json(ApiResponseHelper.success(parteneri, `Găsiți ${parteneri.length} parteneri`));

        } catch (error) {
            console.error('Eroare la obținerea partenerilor după ID-uri:', error);
            res.status(500).json(ApiResponseHelper.error(
                'Eroare la obținerea partenerilor după ID-uri',
                'DB_ERROR',
                error instanceof Error ? error.message : 'Eroare necunoscută'
            ));
        }
    }

    // Obține statistici pentru dashboard
    async getDashboardStats(req: Request, res: Response): Promise<void> {
        try {
            const statsData = await partenerService.getDashboardStats();
            
            res.status(200).json(ApiResponseHelper.success(statsData, 'Statistici pentru dashboard obținute cu succes'));
        } catch (error) {
            console.error('Eroare la obținerea statisticilor pentru dashboard:', error);
            res.status(500).json(ApiResponseHelper.error(
                'Eroare la obținerea statisticilor pentru dashboard',
                'DB_ERROR'
            ));
        }
    }

    // Obține partenerii adăugați recent
    async getRecentParteneri(req: Request, res: Response): Promise<void> {
        try {
            const { limit = '3' } = req.query;
            const limitNum = Math.min(10, Math.max(1, parseInt(limit as string, 10) || 3));
            
            const parteneri = await partenerService.getRecentParteneri(limitNum);
            
            res.status(200).json(ApiResponseHelper.success(parteneri, 'Partenerii recenți au fost obținuți cu succes'));
        } catch (error) {
            console.error('Eroare la obținerea partenerilor recenți:', error);
            res.status(500).json(ApiResponseHelper.error(
                'Eroare la obținerea partenerilor recenți',
                'DB_ERROR'
            ));
        }
    }

    // Creează un partener nou
    async createPartener(req: Request, res: Response): Promise<void> {
        try {
            const partenerData = req.body;

            // Validare de bază
            if (!partenerData.numePartener) {
                res.status(400).json(ApiResponseHelper.validationError('numePartener', 'Numele partenerului este obligatoriu'));
                return;
            }

            if (!partenerData.cuiPartener) {
                res.status(400).json(ApiResponseHelper.validationError('cuiPartener', 'CUI-ul partenerului este obligatoriu'));
                return;
            }

            const newPartener = await partenerService.createPartener(partenerData);
            
            res.status(201).json(ApiResponseHelper.success(newPartener, 'Partenerul a fost creat cu succes'));
        } catch (error) {
            console.error('Eroare la crearea partenerului:', error);
            res.status(500).json(ApiResponseHelper.error(
                'Eroare la crearea partenerului',
                'DB_ERROR',
                error instanceof Error ? error.message : 'Eroare necunoscută'
            ));
        }
    }

    // Actualizează un partener existent
    async updatePartener(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const partenerData = req.body;

            if (!id) {
                res.status(400).json(ApiResponseHelper.validationError('id', 'ID-ul partenerului este obligatoriu'));
                return;
            }

            const updatedPartener = await partenerService.updatePartener(id, partenerData);
            
            if (!updatedPartener) {
                res.status(404).json(ApiResponseHelper.notFoundError('Partenerul'));
                return;
            }

            res.json(ApiResponseHelper.success(updatedPartener, 'Partenerul a fost actualizat cu succes'));
        } catch (error) {
            console.error('Eroare la actualizarea partenerului:', error);
            res.status(500).json(ApiResponseHelper.error(
                'Eroare la actualizarea partenerului',
                'DB_ERROR',
                error instanceof Error ? error.message : 'Eroare necunoscută'
            ));
        }
    }

    // Șterge un partener
    async deletePartener(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;

            if (!id) {
                res.status(400).json(ApiResponseHelper.validationError('id', 'ID-ul partenerului este obligatoriu'));
                return;
            }

            const deleted = await partenerService.deletePartener(id);
            
            if (!deleted) {
                res.status(404).json(ApiResponseHelper.notFoundError('Partenerul'));
                return;
            }

            res.json(ApiResponseHelper.success(null, 'Partenerul a fost șters cu succes'));
        } catch (error) {
            console.error('Eroare la ștergerea partenerului:', error);
            res.status(500).json(ApiResponseHelper.error(
                'Eroare la ștergerea partenerului',
                'DB_ERROR',
                error instanceof Error ? error.message : 'Eroare necunoscută'
            ));
        }
    }
}

export default PartenerController;
