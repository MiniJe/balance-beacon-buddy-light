import { Request, Response } from 'express';
import { jurnalEmailService } from '../services/JurnalEmailService';
import { JurnalEmailFilters } from '../models/JurnalEmail';

export class JurnalEmailController {
    
    /**
     * Obține înregistrările din jurnalul de emailuri cu filtrare și paginare
     * GET /api/jurnal-email
     */
    async getJurnalEmailuri(req: Request, res: Response): Promise<void> {
        try {
            const filters: JurnalEmailFilters = {
                // Filtrare după date
                DataTrimitereStart: req.query.dataStart ? new Date(req.query.dataStart as string) : undefined,
                DataTrimitereEnd: req.query.dataEnd ? new Date(req.query.dataEnd as string) : undefined,
                
                // Filtrare după status și tip
                StatusTrimitere: req.query.status ? (req.query.status as string).split(',') as any[] : undefined,
                TipEmail: req.query.tipEmail ? (req.query.tipEmail as string).split(',') as any[] : undefined,
                
                // Filtrare după entități
                IdPartener: req.query.idPartener as string,
                IdLot: req.query.idLot as string,
                IdCerereConfirmare: req.query.idCerere as string,
                
                // Filtrare după email
                EmailDestinatar: req.query.emailDestinatar as string,
                TipDestinatar: req.query.tipDestinatar ? (req.query.tipDestinatar as string).split(',') as any[] : undefined,
                
                
                // Filtrare după prioritate
                PriorityLevel: req.query.prioritate ? (req.query.prioritate as string).split(',') as any[] : undefined,
                
                // Paginare
                offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
                limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
                
                // Sortare
                sortBy: req.query.sortBy as any || 'CreatLa',
                sortOrder: req.query.sortOrder as any || 'DESC'
            };

            const result = await jurnalEmailService.getJurnalEmailuri(filters);
            
            if (result.success) {
                res.json({
                    success: true,
                    data: result.data,
                    pagination: result.pagination,
                    message: 'Înregistrări obținute cu succes din jurnalul de emailuri'
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: result.error || 'Eroare la obținerea înregistrărilor din jurnalul de emailuri'
                });
            }
        } catch (error) {
            console.error('❌ Eroare în getJurnalEmailuri:', error);
            res.status(500).json({
                success: false,
                error: 'Eroare internă de server'
            });
        }
    }

    /**
     * Obține o înregistrare specifică din jurnalul de emailuri
     * GET /api/jurnal-email/:id
     */
    async getJurnalEmailById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            
            if (!id) {
                res.status(400).json({
                    success: false,
                    error: 'ID-ul înregistrării este obligatoriu'
                });
                return;
            }

            const record = await jurnalEmailService.getJurnalEmailById(id);
            
            if (record) {
                res.json({
                    success: true,
                    data: record,
                    message: 'Înregistrare găsită în jurnalul de emailuri'
                });
            } else {
                res.status(404).json({
                    success: false,
                    error: 'Înregistrarea nu a fost găsită în jurnalul de emailuri'
                });
            }
        } catch (error) {
            console.error('❌ Eroare în getJurnalEmailById:', error);
            res.status(500).json({
                success: false,
                error: 'Eroare internă de server'
            });
        }
    }

    /**
     * Obține statistici pentru jurnalul de emailuri
     * GET /api/jurnal-email/statistics
     */
    async getJurnalEmailStats(req: Request, res: Response): Promise<void> {
        try {
            const result = await jurnalEmailService.getJurnalEmailStats();
            
            if (result.success) {
                res.json({
                    success: true,
                    stats: result.stats,
                    message: 'Statistici obținute cu succes pentru jurnalul de emailuri'
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: result.error || 'Eroare la obținerea statisticilor pentru jurnalul de emailuri'
                });
            }
        } catch (error) {
            console.error('❌ Eroare în getJurnalEmailStats:', error);
            res.status(500).json({
                success: false,
                error: 'Eroare internă de server'
            });
        }
    }

    /**
     * Actualizează o înregistrare din jurnalul de emailuri
     * PUT /api/jurnal-email/:id
     */
    async updateJurnalEmail(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            
            if (!id) {
                res.status(400).json({
                    success: false,
                    error: 'ID-ul înregistrării este obligatoriu'
                });
                return;
            }

            // Construiește obiectul de actualizare din body
            const updateData = {
                IdJurnalEmail: id,
                ...req.body,
                ModificatDe: req.body.modificatDe || 'UTILIZATOR' // Default user
            };

            const result = await jurnalEmailService.updateJurnalEmail(updateData);
            
            if (result.success) {
                res.json({
                    success: true,
                    data: result.data,
                    message: result.message || 'Înregistrare actualizată cu succes în jurnalul de emailuri'
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: result.error || 'Eroare la actualizarea înregistrării din jurnalul de emailuri'
                });
            }
        } catch (error) {
            console.error('❌ Eroare în updateJurnalEmail:', error);
            res.status(500).json({
                success: false,
                error: 'Eroare internă de server'
            });
        }
    }

    /**
     * Marchează emailurile pentru retrimitere
     * POST /api/jurnal-email/retry
     */
    async markForRetry(req: Request, res: Response): Promise<void> {
        try {
            const { ids, modificatDe } = req.body;
            
            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                res.status(400).json({
                    success: false,
                    error: 'Lista de ID-uri este obligatorie și trebuie să conțină cel puțin un element'
                });
                return;
            }

            if (!modificatDe) {
                res.status(400).json({
                    success: false,
                    error: 'Câmpul modificatDe este obligatoriu'
                });
                return;
            }

            const result = await jurnalEmailService.markForRetry(ids, modificatDe);
            
            if (result.success) {
                res.json({
                    success: true,
                    message: result.message || 'Emailurile au fost marcate pentru retrimitere'
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: result.error || 'Eroare la marcarea emailurilor pentru retrimitere'
                });
            }
        } catch (error) {
            console.error('❌ Eroare în markForRetry:', error);
            res.status(500).json({
                success: false,
                error: 'Eroare internă de server'
            });
        }
    }

    /**
     * Exportă emailurile într-un format specific (CSV, Excel, etc.)
     * GET /api/jurnal-email/export
     */
    async exportJurnalEmailuri(req: Request, res: Response): Promise<void> {
        try {
            const format = req.query.format as string || 'json';
            
            // Pentru moment, returnăm doar JSON
            // În viitor se poate extinde pentru CSV, Excel, etc.
            if (format !== 'json') {
                res.status(400).json({
                    success: false,
                    error: 'Momentan este suportat doar formatul JSON pentru export'
                });
                return;
            }

            // Folosește aceleași filtre ca la getJurnalEmailuri, dar fără limite
            const filters: JurnalEmailFilters = {
                DataTrimitereStart: req.query.dataStart ? new Date(req.query.dataStart as string) : undefined,
                DataTrimitereEnd: req.query.dataEnd ? new Date(req.query.dataEnd as string) : undefined,
                StatusTrimitere: req.query.status ? (req.query.status as string).split(',') as any[] : undefined,
                TipEmail: req.query.tipEmail ? (req.query.tipEmail as string).split(',') as any[] : undefined,
                IdPartener: req.query.idPartener as string,
                IdLot: req.query.idLot as string,
                EmailDestinatar: req.query.emailDestinatar as string,
                PriorityLevel: req.query.prioritate ? (req.query.prioritate as string).split(',') as any[] : undefined,
                sortBy: req.query.sortBy as any || 'CreatLa',
                sortOrder: req.query.sortOrder as any || 'DESC',
                // Fără limite pentru export
                limit: 10000 // Limită de siguranță
            };

            const result = await jurnalEmailService.getJurnalEmailuri(filters);
            
            if (result.success) {
                // Setează header-ele pentru download
                const filename = `jurnal-email-${new Date().toISOString().split('T')[0]}.json`;
                res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
                res.setHeader('Content-Type', 'application/json');
                
                res.json({
                    success: true,
                    data: result.data,
                    exportedAt: new Date(),
                    totalRecords: result.pagination?.total || 0,
                    message: 'Export realizat cu succes'
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: result.error || 'Eroare la exportul jurnalului de emailuri'
                });
            }
        } catch (error) {
            console.error('❌ Eroare în exportJurnalEmailuri:', error);
            res.status(500).json({
                success: false,
                error: 'Eroare internă de server'
            });
        }
    }
}

// Instanță singleton
export const jurnalEmailController = new JurnalEmailController();
