import { Request, Response } from 'express';
import { jurnalDocumenteEmiseCleanService } from '../services/JurnalDocumenteEmiseClean.service';
import { CreateJurnalDocumenteEmiseDto, UpdateJurnalDocumenteEmiseDto } from '../models/JurnalDocumenteEmise';
import { ApiResponseHelper } from '../types/api.types';

/**
 * Controller pentru gestionarea jurnalului documentelor emise
 */
export class JurnalDocumenteEmiseController {

    /**
     * Creează un nou document în jurnal
     * POST /api/jurnal-documente-emise
     */
    async createDocument(req: Request, res: Response): Promise<void> {
        try {
            const documentData: CreateJurnalDocumenteEmiseDto = req.body;

            // Validare de bază
            if (!documentData.NumeDocument || !documentData.hashDocument) {
                res.status(400).json(ApiResponseHelper.validationError(
                    'NumeDocument', 
                    'Câmpurile NumeDocument și hashDocument sunt obligatorii'
                ));
                return;
            }

            if (!documentData.idUtilizator || !documentData.numeUtilizator || !documentData.emailUtilizator) {
                res.status(400).json(ApiResponseHelper.validationError(
                    'utilizator', 
                    'Informațiile utilizatorului sunt obligatorii'
                ));
                return;
            }

            if (!documentData.caleFisier) {
                res.status(400).json(ApiResponseHelper.validationError(
                    'caleFisier', 
                    'Calea fișierului este obligatorie'
                ));
                return;
            }

            const document = await jurnalDocumenteEmiseCleanService.createDocument(documentData);

            res.status(201).json(ApiResponseHelper.success(
                document, 
                'Document creat cu succes în jurnal'
            ));

        } catch (error) {
            console.error('Eroare la crearea documentului:', error);
            res.status(500).json(ApiResponseHelper.error(
                error instanceof Error ? error.message : 'Eroare la crearea documentului',
                'CREATE_DOCUMENT_ERROR'
            ));
        }
    }

    /**
     * Actualizează un document existent
     * PUT /api/jurnal-documente-emise/:idDocument
     */
    async updateDocument(req: Request, res: Response): Promise<void> {
        try {
            const { idDocument } = req.params;
            const updateData: UpdateJurnalDocumenteEmiseDto = req.body;

            if (!idDocument) {
                res.status(400).json(ApiResponseHelper.validationError(
                    'idDocument', 
                    'ID-ul documentului este obligatoriu'
                ));
                return;
            }

            const document = await jurnalDocumenteEmiseCleanService.updateDocument(parseInt(idDocument), updateData);

            res.status(200).json(ApiResponseHelper.success(
                document, 
                'Document actualizat cu succes'
            ));

        } catch (error) {
            console.error('Eroare la actualizarea documentului:', error);
            res.status(500).json(ApiResponseHelper.error(
                error instanceof Error ? error.message : 'Eroare la actualizarea documentului',
                'UPDATE_DOCUMENT_ERROR'
            ));
        }
    }

    /**
     * Obține un document după ID
     * GET /api/jurnal-documente-emise/:idDocument
     */
    async getDocumentById(req: Request, res: Response): Promise<void> {
        try {
            const { idDocument } = req.params;

            if (!idDocument) {
                res.status(400).json(ApiResponseHelper.validationError(
                    'idDocument', 
                    'ID-ul documentului este obligatoriu'
                ));
                return;
            }

            const document = await jurnalDocumenteEmiseCleanService.getDocumentById(parseInt(idDocument));

            if (!document) {
                res.status(404).json(ApiResponseHelper.notFoundError('Documentul'));
                return;
            }

            res.status(200).json(ApiResponseHelper.success(document));

        } catch (error) {
            console.error('Eroare la căutarea documentului:', error);
            res.status(500).json(ApiResponseHelper.error(
                error instanceof Error ? error.message : 'Eroare la căutarea documentului',
                'GET_DOCUMENT_ERROR'
            ));
        }
    }

    /**
     * Obține următorul număr de înregistrare
     * GET /api/jurnal-documente-emise/next-number
     */
    async getNextRegistrationNumber(req: Request, res: Response): Promise<void> {
        try {
            const nextNumber = await jurnalDocumenteEmiseCleanService.getNextRegistrationNumber();

            res.status(200).json(ApiResponseHelper.success(
                { nextRegistrationNumber: nextNumber },
                'Numărul de înregistrare a fost obținut cu succes'
            ));

        } catch (error) {
            console.error('Eroare la obținerea numărului de înregistrare:', error);
            res.status(500).json(ApiResponseHelper.error(
                error instanceof Error ? error.message : 'Eroare la obținerea numărului de înregistrare',
                'GET_NEXT_NUMBER_ERROR'
            ));
        }
    }

    /**
     * Obține toate documentele cu paginare și filtrare
     * GET /api/jurnal-documente-emise
     */
    async getAllDocuments(req: Request, res: Response): Promise<void> {
        try {
            const {
                page = '1',
                limit = '50',
                tipDocument,
                statusDocument,
                idUtilizator,
                dataStart,
                dataEnd
            } = req.query;

            const pageNum = parseInt(page as string, 10);
            const limitNum = parseInt(limit as string, 10);

            // Validare parametri de paginare
            if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
                res.status(400).json(ApiResponseHelper.validationError(
                    'pagination', 
                    'Parametrii de paginare sunt invalizi (page >= 1, limit 1-100)'
                ));
                return;
            }

            const result = await jurnalDocumenteEmiseCleanService.getAllDocuments(
                pageNum,
                limitNum,
                statusDocument as string,
                idUtilizator as string,
                dataStart as string,
                dataEnd as string
            );

            // Construim răspunsul cu paginare standardizată
            const pagination = {
                currentPage: result.pagina || pageNum,
                totalPages: result.totalPagini || 1,
                totalItems: result.total || 0,
                itemsPerPage: limitNum,
                hasNextPage: (result.pagina || pageNum) < (result.totalPagini || 1),
                hasPreviousPage: (result.pagina || pageNum) > 1
            };

            res.status(200).json(ApiResponseHelper.successWithPagination(
                result.jurnal, 
                pagination,
                'Documentele au fost obținute cu succes'
            ));

        } catch (error) {
            console.error('Eroare la obținerea documentelor:', error);
            res.status(500).json(ApiResponseHelper.error(
                error instanceof Error ? error.message : 'Eroare la obținerea documentelor',
                'GET_DOCUMENTS_ERROR'
            ));
        }
    }

    /**
     * Rezervă un număr de înregistrare pentru un document
     * POST /api/jurnal-documente-emise/reserve-number
     */
    async reserveRegistrationNumber(req: Request, res: Response): Promise<void> {
        try {
            const { idUtilizator, numeUtilizator, emailUtilizator, idSesiune } = req.body;

            if (!idUtilizator || !numeUtilizator || !emailUtilizator) {
                res.status(400).json(ApiResponseHelper.validationError(
                    'utilizator', 
                    'Informațiile utilizatorului sunt obligatorii'
                ));
                return;
            }

            // Creăm un document temporar pentru a rezerva numărul
            const documentData: CreateJurnalDocumenteEmiseDto = {
                NumeDocument: 'REZERVAT_TEMPORAR',
                hashDocument: 'PLACEHOLDER_HASH',
                dimensiuneDocument: 0,
                idUtilizator,
                numeUtilizator,
                emailUtilizator,
                idSesiune,
                caleFisier: 'PLACEHOLDER_PATH'
            };

            const document = await jurnalDocumenteEmiseCleanService.createDocument(documentData);

            res.status(201).json(ApiResponseHelper.success(
                {
                    idDocument: document.IdDocumente,
                    dataEmiterii: document.DataEmiterii,
                    numeDocument: document.NumeDocument
                },
                'Număr de înregistrare rezervat cu succes'
            ));

        } catch (error) {
            console.error('Eroare la rezervarea numărului de înregistrare:', error);
            res.status(500).json(ApiResponseHelper.error(
                error instanceof Error ? error.message : 'Eroare la rezervarea numărului de înregistrare',
                'RESERVE_NUMBER_ERROR'
            ));
        }
    }

    /**
     * Generează numere de ordine consecutive pentru documente
     * POST /api/jurnal-documente-emise/generate-order-numbers
     */
    async generateOrderNumbers(req: Request, res: Response): Promise<void> {
        try {
            const { count, tipDocument } = req.body;

            // Validare de bază
            if (!count || count <= 0) {
                res.status(400).json(ApiResponseHelper.validationError(
                    'count', 
                    'Numărul de ordine solicitat trebuie să fie mai mare ca 0'
                ));
                return;
            }

            if (count > 100) {
                res.status(400).json(ApiResponseHelper.validationError(
                    'count', 
                    'Nu se pot genera mai mult de 100 de numere de ordine odată'
                ));
                return;
            }

            const result = await jurnalDocumenteEmiseCleanService.generateConsecutiveOrderNumbers(
                count, 
                tipDocument || 'FISE_PARTENER'
            );

            res.status(200).json(ApiResponseHelper.success(
                result, 
                `Generate ${count} numere de ordine consecutive`
            ));

        } catch (error) {
            console.error('Eroare la generarea numerelor de ordine:', error);
            res.status(500).json(ApiResponseHelper.error(
                error instanceof Error ? error.message : 'Eroare la generarea numerelor de ordine',
                'GENERATE_ORDER_NUMBERS_ERROR'
            ));
        }
    }
}

export const jurnalDocumenteEmiseController = new JurnalDocumenteEmiseController();
