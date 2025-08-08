import sql from 'mssql';
import { pool } from '../config/azure';
import { getDatabase } from '../config/sqlite'; // SQLite
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
export class JurnalDocumenteEmiseCleanService {
    
    /**
     * Generează hash SHA-256 pentru document
     */
    private generateDocumentHash(content: string | Buffer): string {
        return crypto.createHash('sha256').update(content).digest('hex');
    }

    /**
     * Formatează datele din DB la format TypeScript
     */
    private formatDocumentFromDB(dbRow: any): JurnalDocumenteEmise {
        return {
            IdDocumente: dbRow.IdDocumente,
            DataEmiterii: dbRow.DataEmiterii || dbRow.DataCreare,
            NumeDocument: dbRow.NumeDocument,
            DataCreare: dbRow.DataCreare,
            HashDocument: dbRow.HashDocument
        };
    }

    /**
     * Creează un nou document în jurnal
     */
    async createDocument(documentData: CreateJurnalDocumenteEmiseDto): Promise<JurnalDocumenteEmise> {
        try {
            const db = await getDatabase();
            
            const query = `
                INSERT INTO JurnalDocumenteEmise (
                    NumeDocument, HashDocument
                )
                VALUES (?, ?)
                RETURNING *
            `;
            
            const result = await db.get(
                query,
                documentData.NumeDocument,
                documentData.hashDocument || null
            );
            
            if (!result) {
                throw new Error('Documentul nu a putut fi creat - result is null');
            }
            
            // Convertim datele SQLite la format TypeScript
            const document = this.formatDocumentFromDB(result);
            
            console.log(`✅ Document creat cu succes: ${document.IdDocumente}, Nume: ${document.NumeDocument}`);
            return document;
            
        } catch (error) {
            console.error('❌ Eroare la crearea documentului:', error);
            throw new Error(`Eroare la crearea documentului: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`);
        }
    }

    /**
     * Actualizează un document existent (de ex. după semnare)
     */
    async updateDocument(idDocument: number, updateData: UpdateJurnalDocumenteEmiseDto): Promise<JurnalDocumenteEmise> {
        try {
            const db = await getDatabase();
            
            // Construim query-ul dinamic bazat pe câmpurile furnizate
            const setClauses: string[] = [];
            const values: any[] = [];
            
            if (updateData.hashDocumentSemnat !== undefined) {
                setClauses.push('HashDocument = ?');
                values.push(updateData.hashDocumentSemnat);
            }
            
            if (setClauses.length === 0) {
                throw new Error('Nu au fost furnizate date pentru actualizare');
            }
            
            const query = `
                UPDATE JurnalDocumenteEmise 
                SET ${setClauses.join(', ')}
                WHERE IdDocumente = ?
                RETURNING *
            `;
            
            values.push(idDocument);
            
            const result = await db.get(query, ...values);
            
            if (!result) {
                throw new Error('Documentul nu a fost găsit sau nu a putut fi actualizat');
            }
            
            const document = this.formatDocumentFromDB(result);
            console.log(`Document actualizat cu succes: ${document.IdDocumente}`);
            return document;
            
        } catch (error) {
            console.error('Eroare la actualizarea documentului:', error);
            throw new Error(`Eroare la actualizarea documentului: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`);
        }
    }

    /**
     * Obține un document după ID
     */
    async getDocumentById(idDocument: number): Promise<JurnalDocumenteEmise | null> {
        try {
            const request = pool.request();
            
            const query = `
                SELECT * FROM JurnalDocumenteEmise 
                WHERE IdDocumente = @IdDocumente
            `;
            
            request.input('IdDocumente', sql.Int, idDocument);
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
     * Obține toate documentele cu paginare
     */
    async getDocuments(
        pagina: number = 1,
        numarPerPagina: number = 50
    ): Promise<JurnalDocumenteEmiseResponse> {
        try {
            const request = pool.request();
            const offset = (pagina - 1) * numarPerPagina;
            
            // Query pentru total
            const countQuery = `
                SELECT COUNT(*) as total
                FROM JurnalDocumenteEmise
            `;
            
            // Query pentru date cu paginare
            const dataQuery = `
                SELECT *
                FROM JurnalDocumenteEmise
                ORDER BY IdDocumente DESC
                OFFSET @offset ROWS
                FETCH NEXT @numarPerPagina ROWS ONLY
            `;
            
            request.input('offset', sql.Int, offset);
            request.input('numarPerPagina', sql.Int, numarPerPagina);
            
            // Executăm ambele query-uri
            const [countResult, dataResult] = await Promise.all([
                request.query(countQuery),
                request.query(dataQuery)
            ]);
            
            const total = countResult.recordset[0].total;
            const documente = dataResult.recordset.map((row: any) => this.formatDocumentFromDB(row));
            
            return {
                jurnal: documente,
                total,
                pagina,
                totalPagini: Math.ceil(total / numarPerPagina)
            };
            
        } catch (error) {
            console.error('Eroare la obținerea documentelor:', error);
            throw new Error(`Eroare la obținerea documentelor: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`);
        }
    }

    /**
     * Șterge un document
     */
    async deleteDocument(idDocument: number): Promise<boolean> {
        try {
            const request = pool.request();
            
            const query = `
                DELETE FROM JurnalDocumenteEmise 
                WHERE IdDocumente = @IdDocumente
            `;
            
            request.input('IdDocumente', sql.Int, idDocument);
            const result = await request.query(query);
            
            console.log(`Document șters: ${idDocument}`);
            return result.rowsAffected[0] > 0;
            
        } catch (error) {
            console.error('Eroare la ștergerea documentului:', error);
            throw new Error(`Eroare la ștergerea documentului: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`);
        }
    }

    /**
     * Obține următorul număr de înregistrare disponibil
     */
    async getNextRegistrationNumber(): Promise<number> {
        try {
            const db = await getDatabase();
            
            const query = `
                SELECT COALESCE(MAX(IdDocumente), 0) + 1 as nextNumber
                FROM JurnalDocumenteEmise
            `;
            
            const result = await db.get(query);
            return result.nextNumber;
            
        } catch (error) {
            console.error('Eroare la obținerea următorului număr de înregistrare:', error);
            throw new Error(`Eroare la obținerea următorului număr de înregistrare: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`);
        }
    }

    /**
     * Obține toate documentele cu filtrare și paginare
     */
    async getAllDocuments(
        pagina: number = 1,
        numarPerPagina: number = 50,
        statusDocument?: string,
        idUtilizator?: string,
        dataStart?: string,
        dataEnd?: string
    ): Promise<JurnalDocumenteEmiseResponse> {
        try {
            const request = pool.request();
            const offset = (pagina - 1) * numarPerPagina;
            
            // Construim WHERE clauses
            const whereClauses: string[] = [];
            
            if (idUtilizator) {
                whereClauses.push('idUtilizator = @idUtilizator');
                request.input('idUtilizator', sql.UniqueIdentifier, idUtilizator);
            }
            
            if (dataStart) {
                whereClauses.push('DataCreare >= @dataStart');
                request.input('dataStart', sql.DateTime2, dataStart);
            }
            
            if (dataEnd) {
                whereClauses.push('DataCreare <= @dataEnd');
                request.input('dataEnd', sql.DateTime2, dataEnd);
            }
            
            const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
            
            // Query pentru total
            const countQuery = `
                SELECT COUNT(*) as total
                FROM JurnalDocumenteEmise
                ${whereClause}
            `;
            
            // Query pentru date cu paginare
            const dataQuery = `
                SELECT *
                FROM JurnalDocumenteEmise
                ${whereClause}
                ORDER BY IdDocumente DESC
                OFFSET @offset ROWS
                FETCH NEXT @numarPerPagina ROWS ONLY
            `; 
            
            request.input('offset', sql.Int, offset);
            request.input('numarPerPagina', sql.Int, numarPerPagina);
            
            // Executăm ambele query-uri
            const [countResult, dataResult] = await Promise.all([
                request.query(countQuery),
                request.query(dataQuery)
            ]);
            
            const total = countResult.recordset[0].total;
            const documente = dataResult.recordset.map((row: any) => this.formatDocumentFromDB(row));
            
            return {
                jurnal: documente,
                total,
                pagina,
                totalPagini: Math.ceil(total / numarPerPagina)
            };
            
        } catch (error) {
            console.error('Eroare la obținerea documentelor:', error);
            throw new Error(`Eroare la obținerea documentelor: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`);
        }
    }

    /**
     * Generează numere de ordine consecutive pentru documente
     * Returnează primul număr disponibil și rezervă următoarele count numere
     */
    async generateConsecutiveOrderNumbers(count: number, tipDocument: string = 'FISE_PARTENER'): Promise<{ startNumber: number; endNumber: number; }> {
        try {
            const request = pool.request();
            
            // Obține ultimul IdDocumente folosit pentru tipul de document specificat
            const query = `
                DECLARE @LastId INT;
                
                -- Obține ultimul ID folosit
                SELECT @LastId = ISNULL(MAX(IdDocumente), 0) 
                FROM JurnalDocumenteEmise;
                
                -- Returnează următorul număr disponibil
                SELECT (@LastId + 1) as StartNumber, (@LastId + @Count) as EndNumber;
            `;
            
            const result = await request
                .input('Count', sql.Int, count)
                .query(query);
            
            if (result.recordset.length === 0) {
                throw new Error('Nu s-au putut genera numere de ordine');
            }
            
            const { StartNumber, EndNumber } = result.recordset[0];
            
            console.log(`📋 Generat interval numere ordine: ${StartNumber} - ${EndNumber} pentru tipul ${tipDocument}`);
            
            return {
                startNumber: StartNumber,
                endNumber: EndNumber
            };
            
        } catch (error) {
            console.error('Eroare la generarea numerelor de ordine:', error);
            throw new Error(`Eroare la generarea numerelor de ordine: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`);
        }
    }
}

// Export instanța serviciului
export const jurnalDocumenteEmiseCleanService = new JurnalDocumenteEmiseCleanService();
