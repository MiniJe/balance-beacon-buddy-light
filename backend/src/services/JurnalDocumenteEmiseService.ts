import { Request, Response } from 'express';
import sql from 'mssql';
import { pool } from '../config/azure';
import crypto from 'crypto';
import { 
    JurnalDocumenteEmise, 
    CreateJurnalDocumenteEmiseDto, 
    UpdateJurnalDocumenteEmiseDto,
    JurnalDocumenteEmiseResponse 
} from '../models/JurnalDocumenteEmise';

/**
 * Serviciu pentru gestionarea jurnalului documentelor emise
 * Oferă funcționalități pentru evidența documentelor cu numerotare secvențială
 */
export class JurnalDocumenteEmiseService {
    
    /**
     * Generează hash SHA-256 pentru document
     */
    private generateDocumentHash(content: string | Buffer): string {
        return crypto.createHash('sha256').update(content).digest('hex');
    }

    /**
     * Generează timestamp UTC
     */
    private generateTimestamp(): number {
        return Math.floor(Date.now() / 1000);
    }

    /**
     * Creează un nou document în jurnal
     */
    async createDocument(documentData: CreateJurnalDocumenteEmiseDto): Promise<JurnalDocumenteEmise> {
        try {
            const request = pool.request();            
            const query = `
                INSERT INTO JurnalDocumenteEmise (
                    NumeDocument, HashDocument
                )
                OUTPUT INSERTED.*
                VALUES (
                    @NumeDocument, @HashDocument
                )
            `;
            
            request.input('NumeDocument', sql.NVarChar(255), documentData.NumeDocument);
            request.input('HashDocument', sql.NVarChar(128), documentData.hashDocument || null);
            
            const result = await request.query(query);
            
            if (result.recordset.length === 0) {
                throw new Error('Documentul nu a putut fi creat');
            }
            
            const document = this.formatDocumentFromDB(result.recordset[0]);
            
            console.log(`Document creat cu succes: ${document.IdDocumente}, Nume: ${document.NumeDocument}`);
            return document;
            
        } catch (error) {
            console.error('Eroare la crearea documentului:', error);
            throw new Error(`Eroare la crearea documentului: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`);
        }
    }

    /**
     * Actualizează un document existent
     */
    async updateDocument(idDocument: string, updateData: UpdateJurnalDocumenteEmiseDto): Promise<JurnalDocumenteEmise> {
        try {
            const request = pool.request();
            
            const setClauses: string[] = [];
            
            if (updateData.statusDocument) {
                setClauses.push('StatusDocument = @StatusDocument');
                request.input('StatusDocument', sql.NVarChar(50), updateData.statusDocument);
            }
            
            if (updateData.hashDocumentSemnat !== undefined) {
                setClauses.push('HashDocumentSemnat = @HashDocumentSemnat');
                request.input('HashDocumentSemnat', sql.NVarChar(128), updateData.hashDocumentSemnat);
            }
            
            if (setClauses.length === 0) {
                throw new Error('Nu au fost furnizate date pentru actualizare');
            }
            
            const query = `
                UPDATE JurnalDocumenteEmise 
                SET ${setClauses.join(', ')}
                OUTPUT INSERTED.*
                WHERE IdDocumente = @IdDocumente
            `;
            
            request.input('IdDocumente', sql.Int, parseInt(idDocument));
            
            const result = await request.query(query);
            
            if (result.recordset.length === 0) {
                throw new Error('Documentul nu a fost găsit sau nu a putut fi actualizat');
            }
            
            const document = this.formatDocumentFromDB(result.recordset[0]);
            console.log(`Document actualizat cu succes: ${document.IdDocumente}`);
            return document;
            
        } catch (error) {
            console.error('Eroare la actualizarea documentului:', error);
            throw new Error(`Eroare la actualizarea documentului: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`);
        }
    }    /**
     * Obține un document după ID
     */
    async getDocumentById(idDocument: string): Promise<JurnalDocumenteEmise | null> {
        try {
            const request = pool.request();
            
            const query = `
                SELECT * FROM JurnalDocumenteEmise 
                WHERE IdDocumente = @IdDocumente
            `;
            
            request.input('IdDocumente', sql.Int, parseInt(idDocument));
            const result = await request.query(query);
            
            if (result.recordset.length === 0) {
                return null;
            }
            
            return this.formatDocumentFromDB(result.recordset[0]);
            
        } catch (error) {
            console.error('Eroare la căutarea documentului:', error);
            throw new Error(`Eroare la căutarea documentului: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`);
        }
    }

    /**
     * Obține următorul număr de înregistrare disponibil
     */
    async getNextRegistrationNumber(): Promise<number> {
        try {
            const request = pool.request();
            
            const query = `
                SELECT ISNULL(MAX(numarInregistrare), 0) + 1 as nextNumber
                FROM JurnalDocumenteEmise
            `;
            
            const result = await request.query(query);
            return result.recordset[0].nextNumber;
            
        } catch (error) {
            console.error('Eroare la obținerea numărului de înregistrare:', error);
            throw new Error(`Eroare la obținerea numărului de înregistrare: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`);
        }
    }    /**
     * Obține toate documentele cu paginare și filtrare
     */
    async getAllDocuments(
        page: number = 1, 
        limit: number = 50,
        tipDocument?: string,
        statusDocument?: string,
        idUtilizator?: string,
        dataStart?: string,
        dataEnd?: string
    ): Promise<JurnalDocumenteEmiseResponse> {
        try {
            const request = pool.request();
            const offset = (page - 1) * limit;
            
            const whereConditions: string[] = [];
            
            if (tipDocument) {
                whereConditions.push('tipDocument = @tipDocument');
                request.input('tipDocument', sql.VarChar(50), tipDocument);
            }
            
            if (statusDocument) {
                whereConditions.push('statusDocument = @statusDocument');
                request.input('statusDocument', sql.VarChar(20), statusDocument);
            }
            
            if (idUtilizator) {
                whereConditions.push('idUtilizator = @idUtilizator');
                request.input('idUtilizator', sql.UniqueIdentifier, idUtilizator);
            }
            
            if (dataStart) {
                whereConditions.push('DataCreare >= @dataStart');
                request.input('dataStart', sql.DateTime2, dataStart);
            }
            
            if (dataEnd) {
                whereConditions.push('DataCreare <= @dataEnd');
                request.input('dataEnd', sql.DateTime2, dataEnd);
            }            
            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
            
            const countQuery = `
                SELECT COUNT(*) as total
                FROM JurnalDocumenteEmise
                ${whereClause}
            `;
            
            const dataQuery = `
                SELECT *
                FROM JurnalDocumenteEmise
                ${whereClause}
                ORDER BY DataCreare DESC, IdDocumente DESC
                OFFSET @offset ROWS
                FETCH NEXT @limit ROWS ONLY
            `;
            
            request.input('offset', sql.Int, offset);
            request.input('limit', sql.Int, limit);
            
            const [countResult, dataResult] = await Promise.all([
                request.query(countQuery),
                request.query(dataQuery)
            ]);
            
            const total = countResult.recordset[0].total;
            const totalPages = Math.ceil(total / limit);
            
            const jurnal = dataResult.recordset.map(row => this.formatDocumentFromDB(row));
            
            return {
                jurnal,
                total,
                pagina: page,
                totalPagini: totalPages
            };
            
        } catch (error) {
            console.error('Eroare la obținerea documentelor:', error);
            throw new Error(`Eroare la obținerea documentelor: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`);
        }
    }    /**
     * Formatează datele din baza de date pentru TypeScript
     */
    private formatDocumentFromDB(row: any): JurnalDocumenteEmise {
        return {
            IdDocumente: row.IdDocumente,
            DataEmiterii: row.DataEmiterii ? row.DataEmiterii.toISOString() : new Date().toISOString(),
            DataCreare: row.DataCreare ? row.DataCreare.toISOString() : new Date().toISOString(),
            NumeDocument: row.NumeDocument,
            HashDocument: row.HashDocument
        };
    }
}

export const jurnalDocumenteEmiseService = new JurnalDocumenteEmiseService();