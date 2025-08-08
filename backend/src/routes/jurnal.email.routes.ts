import { Router } from 'express';
import { jurnalEmailController } from '../controllers/jurnal.email.controller';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Aplicăm middleware-ul de autentificare pentru toate rutele
router.use(authMiddleware);
router.use(roleMiddleware(['CONTABIL', 'MASTER']));

/**
 * @route GET /api/jurnal-email
 * @desc Obține înregistrările din jurnalul de emailuri cu filtrare și paginare
 * @access Private
 * @query {string} [dataStart] - Data de început pentru filtrare (ISO format)
 * @query {string} [dataEnd] - Data de sfârșit pentru filtrare (ISO format)
 * @query {string} [status] - Statusuri separate prin virgulă (SUCCESS,FAILED,PENDING,RETRY)
 * @query {string} [tipEmail] - Tipuri de email separate prin virgulă (CONFIRMARE,REMINDER,TEST,GENERAL)
 * @query {string} [idPartener] - ID-ul partenerului
 * @query {string} [idLot] - ID-ul lotului
 * @query {string} [idCerere] - ID-ul cererii de confirmare
 * @query {string} [emailDestinatar] - Filtru pentru email destinatar (căutare parțială)
 * @query {string} [tipDestinatar] - Tipuri destinatar separate prin virgulă (PARTENER,CONTABIL,UTILIZATOR,EXTERN)
 * @query {string} [stareBlockchain] - Stări blockchain separate prin virgulă (PENDING,CONFIRMED,FAILED)
 * @query {string} [reteaBlockchain] - Rețeaua blockchain
 * @query {string} [prioritate] - Niveluri de prioritate separate prin virgulă (LOW,NORMAL,HIGH,URGENT)
 * @query {number} [offset=0] - Offset pentru paginare
 * @query {number} [limit=50] - Numărul de înregistrări per pagină
 * @query {string} [sortBy=CreatLa] - Câmpul pentru sortare (DataTrimitere,StatusTrimitere,PriorityLevel,CreatLa)
 * @query {string} [sortOrder=DESC] - Ordinea sortării (ASC,DESC)
 */
router.get('/', jurnalEmailController.getJurnalEmailuri.bind(jurnalEmailController));

/**
 * @route GET /api/jurnal-email/statistics
 * @desc Obține statistici pentru jurnalul de emailuri
 * @access Private
 * @query {string} [dataStart] - Data de început pentru filtrare (ISO format)
 * @query {string} [dataEnd] - Data de sfârșit pentru filtrare (ISO format)
 * @query {string} [status] - Statusuri separate prin virgulă
 * @query {string} [tipEmail] - Tipuri de email separate prin virgulă
 * @query {string} [idPartener] - ID-ul partenerului
 * @query {string} [idLot] - ID-ul lotului
 * @query {string} [stareBlockchain] - Stări blockchain separate prin virgulă
 * @query {string} [reteaBlockchain] - Rețeaua blockchain
 * @query {string} [prioritate] - Niveluri de prioritate separate prin virgulă
 */
router.get('/statistics', jurnalEmailController.getJurnalEmailStats.bind(jurnalEmailController));

/**
 * @route GET /api/jurnal-email/stats
 * @desc Alias pentru /statistics - Obține statistici pentru jurnalul de emailuri
 * @access Private
 */
router.get('/stats', jurnalEmailController.getJurnalEmailStats.bind(jurnalEmailController));

/**
 * @route GET /api/jurnal-email/export
 * @desc Exportă emailurile în format specificat
 * @access Private
 * @query {string} [format=json] - Formatul de export (json)
 * @query {string} [dataStart] - Data de început pentru filtrare (ISO format)
 * @query {string} [dataEnd] - Data de sfârșit pentru filtrare (ISO format)
 * @query {string} [status] - Statusuri separate prin virgulă
 * @query {string} [tipEmail] - Tipuri de email separate prin virgulă
 * @query {string} [idPartener] - ID-ul partenerului
 * @query {string} [idLot] - ID-ul lotului
 * @query {string} [emailDestinatar] - Filtru pentru email destinatar
 * @query {string} [stareBlockchain] - Stări blockchain separate prin virgulă
 * @query {string} [reteaBlockchain] - Rețeaua blockchain
 * @query {string} [prioritate] - Niveluri de prioritate separate prin virgulă
 * @query {string} [sortBy=CreatLa] - Câmpul pentru sortare
 * @query {string} [sortOrder=DESC] - Ordinea sortării
 */
router.get('/export', jurnalEmailController.exportJurnalEmailuri.bind(jurnalEmailController));

/**
 * @route GET /api/jurnal-email/:id
 * @desc Obține o înregistrare specifică din jurnalul de emailuri
 * @access Private
 * @param {string} id - ID-ul înregistrării (GUID)
 */
router.get('/:id', jurnalEmailController.getJurnalEmailById.bind(jurnalEmailController));

/**
 * @route PUT /api/jurnal-email/:id
 * @desc Actualizează o înregistrare din jurnalul de emailuri
 * @access Private
 * @param {string} id - ID-ul înregistrării (GUID)
 * @body {object} updateData - Datele pentru actualizare
 * @body {string} [updateData.StatusTrimitere] - Noul status (SUCCESS,FAILED,PENDING,RETRY)
 * @body {string} [updateData.MesajEroare] - Mesajul de eroare
 * @body {string} [updateData.IdMessageEmail] - ID-ul mesajului de la SMTP
 * @body {number} [updateData.NumarIncercari] - Numărul de încercări
 * @body {string} [updateData.DataUltimaIncercare] - Data ultimei încercări (ISO format)
 * @body {string} [updateData.DataUrmatoareaIncercare] - Data următoarei încercări (ISO format)
 * @body {string} [updateData.DataCitire] - Data citirii emailului (ISO format)
 * @body {string} [updateData.DataRaspuns] - Data răspunsului (ISO format)
 * @body {string} [updateData.RaspunsEmail] - Conținutul răspunsului
 * @body {string} [updateData.HashEmail] - Hash-ul emailului
 * @body {string} [updateData.HashTranzactieBlockchain] - Hash-ul tranzacției blockchain
 * @body {string} [updateData.StareBlockchain] - Starea blockchain (PENDING,CONFIRMED,FAILED)
 * @body {string} [updateData.TimestampBlockchain] - Timestamp blockchain (ISO format)
 * @body {string} [updateData.ReteaBlockchain] - Rețeaua blockchain
 * @body {string} [updateData.AdresaContractBlockchain] - Adresa contractului blockchain
 * @body {number} [updateData.GazUtilizat] - Gazul utilizat pentru tranzacție
 * @body {number} [updateData.CostTranzactie] - Costul tranzacției
 * @body {string} updateData.modificatDe - Utilizatorul care face modificarea
 */
router.put('/:id', jurnalEmailController.updateJurnalEmail.bind(jurnalEmailController));

/**
 * @route POST /api/jurnal-email/retry
 * @desc Marchează emailurile pentru retrimitere
 * @access Private
 * @body {string[]} ids - Lista de ID-uri ale emailurilor care trebuie reîncercate
 * @body {string} modificatDe - Utilizatorul care face modificarea
 */
router.post('/retry', jurnalEmailController.markForRetry.bind(jurnalEmailController));

export default router;
