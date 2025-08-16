import { getDatabase } from '../config/sqlite'; // SQLite only (Azure removed)
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
            const db = await getDatabase();
            const row = await db.get(`SELECT * FROM JurnalDocumenteEmise WHERE IdDocumente = ?`, idDocument);
            if (!row) return null;
            return this.formatDocumentFromDB(row);
        } catch (error) {
            console.error('Eroare la căutarea documentului (SQLite):', error);
            throw new Error(`Eroare la căutarea documentului: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`);
        }
    }

    /**
     * Obține toate documentele cu paginare
     */
    async getDocuments(pagina: number = 1, numarPerPagina: number = 50): Promise<JurnalDocumenteEmiseResponse> {
        try {
            const db = await getDatabase();
            const offset = (pagina - 1) * numarPerPagina;
            const countRow = await db.get(`SELECT COUNT(*) as total FROM JurnalDocumenteEmise`);
            const rows = await db.all(
                `SELECT * FROM JurnalDocumenteEmise ORDER BY IdDocumente DESC LIMIT ? OFFSET ?`,
                numarPerPagina,
                offset
            );
            const documente = rows.map(r => this.formatDocumentFromDB(r));
            const total = countRow?.total || 0;
            return { jurnal: documente, total, pagina, totalPagini: Math.ceil(total / numarPerPagina) };
        } catch (error) {
            console.error('Eroare la obținerea documentelor (SQLite):', error);
            throw new Error(`Eroare la obținerea documentelor: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`);
        }
    }

    /**
     * Șterge un document
     */
    async deleteDocument(idDocument: number): Promise<boolean> {
        try {
            const db = await getDatabase();
            const result = await db.run(`DELETE FROM JurnalDocumenteEmise WHERE IdDocumente = ?`, idDocument);
            console.log(`Document șters: ${idDocument}`);
            return (result as any)?.changes > 0;
        } catch (error) {
            console.error('Eroare la ștergerea documentului (SQLite):', error);
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
        _statusDocument?: string,
        idUtilizator?: string,
        dataStart?: string,
        dataEnd?: string
    ): Promise<JurnalDocumenteEmiseResponse> {
        try {
            const db = await getDatabase();
            const offset = (pagina - 1) * numarPerPagina;
            const where: string[] = [];
            const params: any[] = [];
            if (idUtilizator) { where.push('idUtilizator = ?'); params.push(idUtilizator); }
            if (dataStart) { where.push('DataCreare >= ?'); params.push(dataStart); }
            if (dataEnd) { where.push('DataCreare <= ?'); params.push(dataEnd); }
            const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
            const countRow = await db.get(`SELECT COUNT(*) as total FROM JurnalDocumenteEmise ${whereClause}`, ...params);
            const rows = await db.all(
                `SELECT * FROM JurnalDocumenteEmise ${whereClause} ORDER BY IdDocumente DESC LIMIT ? OFFSET ?`,
                ...params,
                numarPerPagina,
                offset
            );
            const total = countRow?.total || 0;
            const documente = rows.map(r => this.formatDocumentFromDB(r));
            return { jurnal: documente, total, pagina, totalPagini: Math.ceil(total / numarPerPagina) };
        } catch (error) {
            console.error('Eroare la obținerea documentelor (SQLite filtrate):', error);
            throw new Error(`Eroare la obținerea documentelor: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`);
        }
    }

    /**
     * Generează numere de ordine consecutive pentru documente
     * Returnează primul număr disponibil și rezervă următoarele count numere
     */
    async generateConsecutiveOrderNumbers(count: number, tipDocument: string = 'FISE_PARTENER'): Promise<{ startNumber: number; endNumber: number; }> {
        try {
            if (count <= 0) throw new Error('count trebuie > 0');
            const db = await getDatabase();
            // În SQLite folosim o tranzacție pentru a evita condiții de cursă la alocare
            await db.exec('BEGIN IMMEDIATE TRANSACTION');
            try {
                const row = await db.get(`SELECT COALESCE(MAX(IdDocumente), 0) as lastId FROM JurnalDocumenteEmise`);
                const lastId = row?.lastId || 0;
                const startNumber = lastId + 1;
                const endNumber = lastId + count;
                // Nu inserăm placeholdere acum (rezervare logică). Dacă se dorește rezervare strictă, trebuie inserate rânduri stub.
                await db.exec('COMMIT');
                console.log(`📋 (SQLite) Generat interval numere ordine: ${startNumber} - ${endNumber} pentru tipul ${tipDocument}`);
                return { startNumber, endNumber };
            } catch (inner) {
                await db.exec('ROLLBACK');
                throw inner;
            }
        } catch (error) {
            console.error('Eroare la generarea numerelor de ordine (SQLite):', error);
            throw new Error(`Eroare la generarea numerelor de ordine: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`);
        }
    }
}

// Export instanța serviciului
export const jurnalDocumenteEmiseCleanService = new JurnalDocumenteEmiseCleanService();
