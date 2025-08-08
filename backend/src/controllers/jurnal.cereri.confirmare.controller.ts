import { Request, Response } from 'express';
import { jurnalCereriConfirmareRealService } from '../services/JurnalCereriConfirmareReal.service';
import { CreateJurnalCereriConfirmareDto, UpdateJurnalCereriConfirmareDto, FilterJurnalCereriConfirmareDto } from '../models/JurnalCereriConfirmare.Real';

/**
 * Controller pentru gestionarea jurnalului cererilor de confirmare
 */
export class JurnalCereriConfirmareController {

    /**
     * Creează o nouă cerere de confirmare în jurnal
     * POST /api/jurnal-cereri-confirmare
     */
    async createCerereConfirmare(req: Request, res: Response): Promise<void> {
        try {
            const cerereData: CreateJurnalCereriConfirmareDto = req.body;

            // Validare de bază
            if (!cerereData.IdPartener) {
                res.status(400).json({
                    success: false,
                    message: 'ID partener este obligatoriu'
                });
                return;
            }

            if (!cerereData.NumeFisier) {
                res.status(400).json({
                    success: false,
                    message: 'Numele fișierului este obligatoriu'
                });
                return;
            }

            if (!cerereData.DataCerere) {
                res.status(400).json({
                    success: false,
                    message: 'Data cererii este obligatorie'
                });
                return;
            }

            if (!cerereData.CreatDe) {
                res.status(400).json({
                    success: false,
                    message: 'Informațiile utilizatorului sunt obligatorii'
                });
                return;
            }

            const cerere = await jurnalCereriConfirmareRealService.createCerereConfirmare(cerereData);

            res.status(201).json({
                success: true,
                message: 'Cerere de confirmare creată cu succes în jurnal',
                data: cerere
            });

        } catch (error) {
            console.error('Eroare la crearea cererii de confirmare:', error);
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Eroare la crearea cererii de confirmare'
            });
        }
    }

    /**
     * Actualizează o cerere de confirmare existentă
     * PUT /api/jurnal-cereri-confirmare/:idCerere
     */
    async updateCerereConfirmare(req: Request, res: Response): Promise<void> {
        try {
            const { idCerere } = req.params;
            const updateData: UpdateJurnalCereriConfirmareDto = req.body;

            if (!idCerere) {
                res.status(400).json({
                    success: false,
                    message: 'ID-ul cererii este obligatoriu'
                });
                return;
            }

            const cerere = await jurnalCereriConfirmareRealService.updateCerereConfirmare(parseInt(idCerere), updateData);

            res.status(200).json({
                success: true,
                message: 'Cerere de confirmare actualizată cu succes',
                data: cerere
            });

        } catch (error) {
            console.error('Eroare la actualizarea cererii de confirmare:', error);
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Eroare la actualizarea cererii de confirmare'
            });
        }
    }

    /**
     * Obține o cerere de confirmare după ID
     * GET /api/jurnal-cereri-confirmare/:idCerere
     */
    async getCerereById(req: Request, res: Response): Promise<void> {
        try {
            const { idCerere } = req.params;

            if (!idCerere) {
                res.status(400).json({
                    success: false,
                    message: 'ID-ul cererii este obligatoriu'
                });
                return;
            }

            const cerere = await jurnalCereriConfirmareRealService.getCerereById(parseInt(idCerere));

            if (!cerere) {
                res.status(404).json({
                    success: false,
                    message: 'Cererea de confirmare nu a fost găsită'
                });
                return;
            }

            res.status(200).json({
                success: true,
                data: cerere
            });

        } catch (error) {
            console.error('Eroare la căutarea cererii de confirmare:', error);
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Eroare la căutarea cererii de confirmare'
            });
        }
    }

    /**
     * Obține toate cererile cu paginare și filtrare
     * GET /api/jurnal-cereri-confirmare
     */
    async getAllCereri(req: Request, res: Response): Promise<void> {
        try {
            const {
                page = '1',
                limit = '50',
                statusCerere,
                tipPartener,
                idUtilizator,
                dataSold,
                dataStart,
                dataEnd
            } = req.query;

            const pageNum = parseInt(page as string, 10);
            const limitNum = parseInt(limit as string, 10);

            // Validare parametri de paginare
            if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
                res.status(400).json({
                    success: false,
                    message: 'Parametrii de paginare sunt invalizi (page >= 1, limit 1-100)'
                });
                return;
            }

            // Construim filtrul pe baza parametrilor
            const filtru: FilterJurnalCereriConfirmareDto = {};
            
            if (statusCerere) filtru.Stare = statusCerere as string;
            if (tipPartener) filtru.IdPartener = tipPartener as string; // Mapare aproximativă
            if (idUtilizator) filtru.CreatDe = idUtilizator as string; // Mapare aproximativă
            if (dataStart) filtru.dataInceput = dataStart as string;
            if (dataEnd) filtru.dataSfarsit = dataEnd as string;

            const result = await jurnalCereriConfirmareRealService.getCereri(
                filtru,
                pageNum,
                limitNum
            );

            res.status(200).json({
                success: true,
                data: result
            });

        } catch (error) {
            console.error('Eroare la obținerea cererilor de confirmare:', error);
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Eroare la obținerea cererilor de confirmare'
            });
        }
    }

    /**
     * Obține statistici pentru cererile de confirmare
     * GET /api/jurnal-cereri-confirmare/statistici
     */
    async getStatisticiCereri(req: Request, res: Response): Promise<void> {
        try {
            const {
                dataStart,
                dataEnd,
                tipPartener
            } = req.query;

            // Construim filtrul pentru statistici
            const filtru: FilterJurnalCereriConfirmareDto = {};
            
            if (dataStart) filtru.dataInceput = dataStart as string;
            if (dataEnd) filtru.dataSfarsit = dataEnd as string;
            if (tipPartener) filtru.IdPartener = tipPartener as string; // Mapare aproximativă

            const statistici = await jurnalCereriConfirmareRealService.getStatisticiCereri(filtru);

            res.status(200).json({
                success: true,
                data: statistici
            });

        } catch (error) {
            console.error('Eroare la obținerea statisticilor:', error);
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Eroare la obținerea statisticilor'
            });
        }
    }

    /**
     * Marchează o cerere ca fiind expirată
     * PUT /api/jurnal-cereri-confirmare/:idCerere/expire
     */
    async expireCerere(req: Request, res: Response): Promise<void> {
        try {
            const { idCerere } = req.params;

            if (!idCerere) {
                res.status(400).json({
                    success: false,
                    message: 'ID-ul cererii este obligatoriu'
                });
                return;
            }

            const updateData: UpdateJurnalCereriConfirmareDto = {
                Stare: 'expirata',
                Observatii: 'Cerere expirată automat'
            };

            const cerere = await jurnalCereriConfirmareRealService.updateCerereConfirmare(parseInt(idCerere), updateData);

            res.status(200).json({
                success: true,
                message: 'Cererea a fost marcată ca expirată',
                data: cerere
            });

        } catch (error) {
            console.error('Eroare la expirarea cererii:', error);
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Eroare la expirarea cererii'
            });
        }
    }

    /**
     * Procesează răspunsul unui partener la o cerere
     * PUT /api/jurnal-cereri-confirmare/:idCerere/raspuns
     */
    async procesRaspunsPartener(req: Request, res: Response): Promise<void> {
        try {
            const { idCerere } = req.params;
            const { tipRaspuns, observatiiRaspuns } = req.body;

            if (!idCerere) {
                res.status(400).json({
                    success: false,
                    message: 'ID-ul cererii este obligatoriu'
                });
                return;
            }

            if (!tipRaspuns || !['confirmat', 'contestat', 'corectii'].includes(tipRaspuns)) {
                res.status(400).json({
                    success: false,
                    message: 'Tipul răspunsului trebuie să fie: confirmat, contestat sau corectii'
                });
                return;
            }

            const statusCerere = tipRaspuns === 'confirmat' ? 'confirmata' : 'refuzata';

            const updateData: UpdateJurnalCereriConfirmareDto = {
                Stare: statusCerere,
                Observatii: observatiiRaspuns
            };

            const cerere = await jurnalCereriConfirmareRealService.updateCerereConfirmare(parseInt(idCerere), updateData);

            res.status(200).json({
                success: true,
                message: 'Răspunsul partenerului a fost procesat cu succes',
                data: cerere
            });

        } catch (error) {
            console.error('Eroare la procesarea răspunsului:', error);
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Eroare la procesarea răspunsului'
            });
        }
    }
}

export const jurnalCereriConfirmareController = new JurnalCereriConfirmareController();
