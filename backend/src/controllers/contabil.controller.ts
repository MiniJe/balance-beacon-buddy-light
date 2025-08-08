import { Request, Response } from 'express';
import { ContabilService } from '../services/contabil.service';
import { EmailService } from '../services/email.service';
import { creareContabilService } from '../services/creare.cont.contabil';
import { ApiResponseHelper } from '../types/api.types';

const contabilService = new ContabilService();

class ContabilController {
    private emailService: EmailService;

    constructor(emailService: EmailService) {
        this.emailService = emailService;
    }    // Creează un cont nou de contabil
    async createContabil(req: Request, res: Response): Promise<void> {
        try {
            console.log('🆕 createContabil called');
            // Verifică dacă utilizatorul care face cererea este MASTER
            const requestingUser = (req as any).user;
            console.log('👤 Requesting user:', requestingUser);
            
            if (requestingUser?.RolUtilizator !== 'MASTER') {
                console.log('❌ Access denied - user is not MASTER');
                res.status(403).json(ApiResponseHelper.forbiddenError('Doar administratorul MASTER poate crea conturi noi de contabili'));
                return;
            }

            const contabilData = req.body;
            console.log('📝 Contabil data received:', JSON.stringify(contabilData, null, 2));
            
            if (!contabilData || typeof contabilData !== 'object') {
                console.log('❌ Invalid contabil data format');
                res.status(400).json(ApiResponseHelper.validationError('contabilData', 'Datele contabilului sunt invalide'));
                return;
            }

            console.log('✅ Creating new contabil...');
            const contabil = await creareContabilService.createContabil(contabilData);
            console.log('✅ Contabil created successfully:', contabil.IdContabil);
            
            res.status(201).json(ApiResponseHelper.success(contabil, 'Contabil creat cu succes'));
        } catch (error: any) {
            if (error.message === 'Există deja un contabil cu acest email') {
                console.log('❌ Duplicate email error');
                res.status(400).json(ApiResponseHelper.validationError('EmailContabil', error.message));
                return;
            }
            console.error('💥 Eroare la crearea contabilului:', error);
            res.status(500).json(ApiResponseHelper.error(
                'Eroare la crearea contabilului',
                'CREATE_ERROR',
                process.env.NODE_ENV === 'development' ? error.message : undefined
            ));
        }
    }

    // Obține lista tuturor contabililor
    async getAllContabili(req: Request, res: Response): Promise<void> {
        console.log('🔍 getAllContabili called - checking user permissions...');
        try {
            // Verifică dacă utilizatorul care face cererea este MASTER
            const requestingUser = (req as any).user;
            console.log('👤 Requesting user:', requestingUser);
            if (requestingUser?.RolUtilizator !== 'MASTER') {
                console.log('❌ Access denied - user is not MASTER');
                res.status(403).json(ApiResponseHelper.forbiddenError('Doar administratorul MASTER poate vedea lista de contabili'));
                return;
            }

            console.log('✅ User is MASTER, fetching contabili list...');
            const contabili = await contabilService.getAllContabili();
            console.log(`📋 Found ${contabili.length} contabili`);
            
            // Verifică prezența ID-urilor corecte
            contabili.forEach((contabil, index) => {
                console.log(`Contabil ${index + 1} - IdContabil: ${contabil.IdContabil}, Nume: ${contabil.NumeContabil} ${contabil.PrenumeContabil}`);
            });
            
            res.json(ApiResponseHelper.success(contabili, 'Lista contabililor obținută cu succes'));
        } catch (error) {
            console.error('💥 Eroare la obținerea listei de contabili:', error);
            res.status(500).json(ApiResponseHelper.error(
                'Eroare la obținerea listei de contabili',
                'GET_LIST_ERROR'
            ));
        }
    }

    // Obține un contabil după ID
    async getContabilById(req: Request, res: Response): Promise<void> {
        try {
            const contabilId = req.params.id;
            if (!contabilId) {
                res.status(400).json(ApiResponseHelper.validationError('id', 'ID contabil invalid'));
                return;
            }

            // Verifică dacă utilizatorul care face cererea este MASTER sau contabilul respectiv
            const requestingUser = (req as any).user;
            if (requestingUser?.RolUtilizator !== 'MASTER' && requestingUser?.IdContabil !== contabilId) {
                res.status(403).json(ApiResponseHelper.forbiddenError('Nu aveți permisiunea de a accesa acest profil'));
                return;
            }

            const contabil = await contabilService.getContabilById(contabilId);
            if (!contabil) {
                res.status(404).json(ApiResponseHelper.notFoundError('Contabilul'));
                return;
            }

            res.json(ApiResponseHelper.success(contabil, 'Contabil obținut cu succes'));
        } catch (error) {
            console.error('Eroare la obținerea contabilului:', error);
            res.status(500).json(ApiResponseHelper.error(
                'Eroare la obținerea contabilului',
                'GET_CONTABIL_ERROR'
            ));
        }
    }

    // Actualizează permisiunile unui contabil
    async updateContabilPermisiuni(req: Request, res: Response): Promise<void> {
        try {
            // Verifică dacă utilizatorul care face cererea este MASTER
            const requestingUser = (req as any).user;
            if (requestingUser?.RolUtilizator !== 'MASTER') {
                res.status(403).json(ApiResponseHelper.forbiddenError('Doar administratorul MASTER poate actualiza permisiunile contabililor'));
                return;
            }

            const contabilId = req.params.id;
            if (!contabilId) {
                res.status(400).json(ApiResponseHelper.validationError('id', 'ID contabil invalid'));
                return;
                return;
            }

            const permisiuni = req.body;
            if (!permisiuni || typeof permisiuni !== 'object') {
                res.status(400).json(ApiResponseHelper.validationError('permisiuni', 'Datele permisiunilor sunt invalide'));
                return;
            }

            // Update the contabil with the new permissions
            await contabilService.updateContabil(contabilId, { PermisiuniAcces: permisiuni });
            res.json(ApiResponseHelper.success(null, 'Permisiunile contabilului au fost actualizate cu succes'));
        } catch (error: any) {
            if (error.message === 'Contabilul nu există') {
                res.status(404).json(ApiResponseHelper.notFoundError('Contabilul'));
                return;
            }
            console.error('Eroare la actualizarea permisiunilor contabilului:', error);
            res.status(500).json(ApiResponseHelper.error(
                'Eroare la actualizarea permisiunilor contabilului',
                'UPDATE_PERMISSIONS_ERROR',
                process.env.NODE_ENV === 'development' ? error.message : undefined
            ));
        }
    }

    // Activează/dezactivează un contabil
    async setContabilStatus(req: Request, res: Response): Promise<void> {
        try {
            // Verifică dacă utilizatorul care face cererea este MASTER
            const requestingUser = (req as any).user;
            if (requestingUser?.RolUtilizator !== 'MASTER') {
                res.status(403).json(ApiResponseHelper.forbiddenError('Doar administratorul MASTER poate activa/dezactiva contabili'));
                return;
            }

            const contabilId = req.params.id;
            if (!contabilId) {
                res.status(400).json(ApiResponseHelper.validationError('id', 'ID contabil invalid'));
                return;
            }

            const { active } = req.body;
            if (typeof active !== 'boolean') {
                res.status(400).json(ApiResponseHelper.validationError('active', 'Statusul activ/inactiv trebuie să fie de tip boolean'));
                return;
            }            // For status change, we need to use updateContabil with StatusContabil property
            await contabilService.updateContabil(contabilId, { StatusContabil: active ? 'Activ' : 'Inactiv' });
            res.json(ApiResponseHelper.success(null, `Contabilul a fost ${active ? 'activat' : 'dezactivat'} cu succes`));
        } catch (error) {
            console.error('Eroare la modificarea statusului contabilului:', error);
            res.status(500).json(ApiResponseHelper.error(
                'Eroare la modificarea statusului contabilului',
                'UPDATE_STATUS_ERROR'
            ));
        }
    }

    // Resetează parola unui contabil
    async resetContabilPassword(req: Request, res: Response): Promise<void> {
        try {
            // Verifică dacă utilizatorul care face cererea este MASTER
            const requestingUser = (req as any).user;
            if (requestingUser?.RolUtilizator !== 'MASTER') {
                res.status(403).json(ApiResponseHelper.forbiddenError('Doar administratorul MASTER poate reseta parolele contabililor'));
                return;
            }

            const contabilId = req.params.id;
            if (!contabilId) {
                res.status(400).json(ApiResponseHelper.validationError('id', 'ID contabil invalid'));
                return;
            }

            await creareContabilService.resetPassword(contabilId);
            res.json(ApiResponseHelper.success(null, 'Parola contabilului a fost resetată cu succes și trimisă pe email'));
        } catch (error: any) {
            if (error.message === 'Contabilul nu există') {
                res.status(404).json(ApiResponseHelper.notFoundError('Contabilul'));
                return;
            }
            console.error('Eroare la resetarea parolei contabilului:', error);
            res.status(500).json(ApiResponseHelper.error(
                'Eroare la resetarea parolei contabilului',
                'RESET_PASSWORD_ERROR',
                process.env.NODE_ENV === 'development' ? error.message : undefined
            ));
        }
    }

    // Actualizează datele unui contabil
    async updateContabil(req: Request, res: Response): Promise<void> {
        try {
            console.log('🔄 updateContabil called');
            // Verifică dacă utilizatorul care face cererea este MASTER
            const requestingUser = (req as any).user;
            console.log('👤 Requesting user:', requestingUser);
            
            if (requestingUser?.RolUtilizator !== 'MASTER') {
                console.log('❌ Access denied - user is not MASTER');
                res.status(403).json(ApiResponseHelper.forbiddenError('Doar administratorul MASTER poate actualiza contabilii'));
                return;
            }

            const contabilId = req.params.id;
            if (!contabilId) {
                res.status(400).json(ApiResponseHelper.validationError('id', 'ID contabil invalid'));
                return;
            }

            const updateData = req.body;
            console.log('📝 Update data received:', JSON.stringify(updateData, null, 2));
            
            if (!updateData || typeof updateData !== 'object') {
                console.log('❌ Invalid update data format');
                res.status(400).json(ApiResponseHelper.validationError('updateData', 'Datele de actualizare sunt invalide'));
                return;
            }

            console.log('✅ Updating contabil...');
            const updatedContabil = await contabilService.updateContabil(contabilId, updateData);
            console.log('✅ Contabil updated successfully:', updatedContabil.IdContabil);
            
            res.json(ApiResponseHelper.success(updatedContabil, 'Contabil actualizat cu succes'));
        } catch (error: any) {
            if (error.message === 'Contabilul nu a fost găsit sau nu este activ' || error.message === 'Contabilul nu există') {
                console.log('❌ Contabil not found');
                res.status(404).json(ApiResponseHelper.notFoundError('Contabilul'));
                return;
            }
            console.error('💥 Eroare la actualizarea contabilului:', error);
            res.status(500).json(ApiResponseHelper.error(
                'Eroare la actualizarea contabilului',
                'UPDATE_ERROR',
                process.env.NODE_ENV === 'development' ? error.message : undefined
            ));
        }
    }

    // Șterge un contabil
    async deleteContabil(req: Request, res: Response): Promise<void> {
        try {
            console.log('🗑️ deleteContabil called');
            // Verifică dacă utilizatorul care face cererea este MASTER
            const requestingUser = (req as any).user;
            console.log('👤 Requesting user:', requestingUser);
            
            if (requestingUser?.RolUtilizator !== 'MASTER') {
                console.log('❌ Access denied - user is not MASTER');
                res.status(403).json(ApiResponseHelper.forbiddenError('Doar administratorul MASTER poate șterge contabilii'));
                return;
            }

            const contabilId = req.params.id;
            if (!contabilId) {
                res.status(400).json(ApiResponseHelper.validationError('id', 'ID contabil invalid'));
                return;
            }

            console.log('✅ Deleting contabil...');
            const success = await contabilService.deleteContabil(contabilId);
            
            if (!success) {
                res.status(404).json(ApiResponseHelper.notFoundError('Contabilul'));
                return;
            }
            
            console.log('✅ Contabil deleted successfully');
            res.json(ApiResponseHelper.success(null, 'Contabil șters cu succes'));
        } catch (error: any) {
            if (error.message === 'Contabilul nu există') {
                console.log('❌ Contabil not found');
                res.status(404).json(ApiResponseHelper.notFoundError('Contabilul'));
                return;
            }
            console.error('💥 Eroare la ștergerea contabilului:', error);
            res.status(500).json(ApiResponseHelper.error(
                'Eroare la ștergerea contabilului',
                'DELETE_ERROR',
                process.env.NODE_ENV === 'development' ? error.message : undefined
            ));
        }
    }

    // Schimbă parola contabilului
    async changeContabilPassword(req: Request, res: Response): Promise<void> {
        try {
            const { IdContabil, ParolaVeche, ParolaNoua } = req.body;
            if (!IdContabil || !ParolaVeche || !ParolaNoua) {
                res.status(400).json(ApiResponseHelper.validationError('IdContabil|ParolaVeche|ParolaNoua', 'Datele pentru schimbarea parolei sunt incomplete'));
                return;
            }            // Verifică dacă utilizatorul care face cererea este contabilul respectiv
            const requestingUser = (req as any).user;
            console.log('Change password request from user:', requestingUser);
            console.log('For contabil ID:', IdContabil);
            
            // Convert IDs to strings for comparison
            const requestIdContabil = requestingUser?.IdContabil?.toString();
            const requestId = requestingUser?.id?.toString();
            const targetIdContabil = IdContabil?.toString();
            
            console.log('Comparing IDs - requestIdContabil:', requestIdContabil, 'requestId:', requestId, 'targetIdContabil:', targetIdContabil);
            
            if (requestIdContabil !== targetIdContabil && requestId !== targetIdContabil) {
                console.log('Permission denied: requesting user ID does not match contabil ID');
                res.status(403).json(ApiResponseHelper.forbiddenError('Nu aveți permisiunea de a schimba parola acestui cont'));
                return;
            }

            await contabilService.changePassword({ IdContabil, ParolaVeche, ParolaNoua });
            res.json(ApiResponseHelper.success(null, 'Parola a fost schimbată cu succes'));
        } catch (error: any) {
            if (error.message === 'Contabilul nu există') {
                res.status(404).json(ApiResponseHelper.notFoundError('Contabilul'));
                return;
            }
            if (error.message === 'Parola curentă este incorectă') {
                res.status(400).json(ApiResponseHelper.validationError('ParolaVeche', 'Parola curentă este incorectă'));
                return;
            }
            console.error('Eroare la schimbarea parolei contabilului:', error);
            res.status(500).json(ApiResponseHelper.error(
                'Eroare la schimbarea parolei',
                'CHANGE_PASSWORD_ERROR',
                process.env.NODE_ENV === 'development' ? error.message : undefined
            ));
        }
    }}

export { ContabilController };
