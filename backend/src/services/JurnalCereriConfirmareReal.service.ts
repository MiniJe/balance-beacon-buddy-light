import { Request, Response } from 'express';
import { getDatabase } from '../config/sqlite';
import crypto from 'crypto';
import { 
    JurnalCereriConfirmare, 
    CreateJurnalCereriConfirmareDto, 
    UpdateJurnalCereriConfirmareDto,
    JurnalCereriConfirmareResponse,
    StatisticiCereriConfirmare,
    FilterJurnalCereriConfirmareDto
} from '../models/JurnalCereriConfirmare.Real';

/**
 * Serviciu pentru gestionarea jurnalului cererilor de confirmare
 * Oferă funcționalități pentru evidența detaliată a cererilor trimise către parteneri
 * Structura reală din baza de date cu naming camelCase
 */
export class JurnalCereriConfirmareRealService {
    
    /**
     * Generează hash SHA-256 pentru cerere
     */
    private generateRequestHash(data: any): string {
        const content = JSON.stringify(data);
        return crypto.createHash('sha256').update(content).digest('hex');
    }

    /**
     * Generează timestamp UTC
     */
    private generateTimestamp(): number {
        return Math.floor(Date.now() / 1000);
    }

    /**
     * Formatează datele din DB la format TypeScript
     */
    private formatCerereFromDB(dbRow: any): JurnalCereriConfirmare {
        return {
            IdJurnal: dbRow.IdJurnal,
            IdPartener: dbRow.IdPartener,
            IdSetariCompanie: dbRow.IdSetariCompanie,
            DataCerere: dbRow.DataCerere?.toISOString?.() || dbRow.DataCerere,
            NumeFisier: dbRow.NumeFisier,
            URLFisier: dbRow.URLFisier,
            Stare: dbRow.Stare,
            LotId: dbRow.LotId,
            CreatDe: dbRow.CreatDe,
            TrimisDe: dbRow.TrimisDe,
            DataTrimitere: dbRow.DataTrimitere?.toISOString?.() || dbRow.DataTrimitere,
            URLFisierSemnat: dbRow.URLFisierSemnat,
            DataIncarcareSemnatura: dbRow.DataIncarcareSemnatura?.toISOString?.() || dbRow.DataIncarcareSemnatura,
            Observatii: dbRow.Observatii,
            HashDocument: dbRow.HashDocument,
            HashTranzactieBlockchain: dbRow.HashTranzactieBlockchain,
            StareBlockchain: dbRow.StareBlockchain,
            TimestampBlockchain: dbRow.TimestampBlockchain,
            ReteaBlockchain: dbRow.ReteaBlockchain
        };
    }

    /**
     * Creează o nouă cerere de confirmare în jurnal
     */
    async createCerereConfirmare(cerereData: CreateJurnalCereriConfirmareDto): Promise<JurnalCereriConfirmare> {
        try {
            const db = await getDatabase();
            
            const stmt = await db.prepare(`
                INSERT INTO JurnalCereriConfirmare (
                    IdPartener, IdSetariCompanie, DataCerere, NumeFisier, URLFisier,
                    Stare, LotId, CreatDe, TrimisDe, DataTrimitere,
                    URLFisierSemnat, DataIncarcareSemnatura, Observatii, HashDocument,
                    HashTranzactieBlockchain, StareBlockchain, TimestampBlockchain, ReteaBlockchain
                )
                VALUES (
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?, ?
                )
            `);
            
            const result = await stmt.run(
                cerereData.IdPartener,
                cerereData.IdSetariCompanie || null,
                new Date().toISOString(),
                cerereData.NumeFisier || null,
                cerereData.URLFisier || null,
                cerereData.Stare || 'in_asteptare',
                cerereData.LotId || null,
                cerereData.CreatDe || null,
                cerereData.TrimisDe || null,
                cerereData.DataTrimitere || null,
                cerereData.URLFisierSemnat || null,
                cerereData.DataIncarcareSemnatura || null,
                cerereData.Observatii || null,
                cerereData.HashDocument || null,
                cerereData.HashTranzactieBlockchain || null,
                cerereData.StareBlockchain || null,
                cerereData.TimestampBlockchain ? new Date(cerereData.TimestampBlockchain).toISOString() : null,
                cerereData.ReteaBlockchain || null
            );
            
            // Obține înregistrarea inserată
            const insertedRecord = await db.get('SELECT * FROM JurnalCereriConfirmare WHERE IdJurnal = ?', result.lastID);
            
            if (!insertedRecord) {
                throw new Error('Cererea nu a putut fi creată');
            }
            
            // Convertim datele SQL la format TypeScript
            const cerere = this.formatCerereFromDB(insertedRecord);
            
            console.log(`✅ Cerere de confirmare creată cu succes: ${cerere.IdJurnal} pentru partenerul ${cerere.IdPartener}`);
            return cerere;
            
        } catch (error) {
            console.error('Eroare la crearea cererii de confirmare:', error);
            throw new Error(`Eroare la crearea cererii de confirmare: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`);
        }
    }

    /**
     * Actualizează statusul unei cereri de confirmare
     */
    async updateCerereConfirmare(idCerere: number, updateData: UpdateJurnalCereriConfirmareDto): Promise<JurnalCereriConfirmare> {
        try {
            const db = await getDatabase();
            
            // Construim query-ul UPDATE dinamic
            const setClauses: string[] = [];
            const values: any[] = [];
            
            if (updateData.Stare) {
                setClauses.push('Stare = ?');
                values.push(updateData.Stare);
            }

            if (updateData.DataTrimitere) {
                setClauses.push('DataTrimitere = ?');
                values.push(updateData.DataTrimitere);
            }

            if (updateData.URLFisierSemnat) {
                setClauses.push('URLFisierSemnat = ?');
                values.push(updateData.URLFisierSemnat);
            }

            if (updateData.DataIncarcareSemnatura) {
                setClauses.push('DataIncarcareSemnatura = ?');
                values.push(updateData.DataIncarcareSemnatura);
            }

            if (updateData.Observatii !== undefined) {
                setClauses.push('Observatii = ?');
                values.push(updateData.Observatii);
            }

            if (updateData.HashDocument !== undefined) {
                setClauses.push('HashDocument = ?');
                values.push(updateData.HashDocument);
            }

            if (updateData.HashTranzactieBlockchain !== undefined) {
                setClauses.push('HashTranzactieBlockchain = ?');
                values.push(updateData.HashTranzactieBlockchain);
            }

            if (updateData.StareBlockchain !== undefined) {
                setClauses.push('StareBlockchain = ?');
                values.push(updateData.StareBlockchain);
            }

            if (updateData.TimestampBlockchain !== undefined) {
                setClauses.push('TimestampBlockchain = ?');
                values.push(updateData.TimestampBlockchain);
            }

            if (updateData.ReteaBlockchain !== undefined) {
                setClauses.push('ReteaBlockchain = ?');
                values.push(updateData.ReteaBlockchain);
            }

            if (setClauses.length === 0) {
                throw new Error('Nu au fost furnizate date pentru actualizare');
            }
            
            // Adaugă ID-ul cererii la sfârșitul valorilor
            values.push(idCerere);
            
            const query = `
                UPDATE JurnalCereriConfirmare 
                SET ${setClauses.join(', ')}
                WHERE IdJurnal = ?
            `;
            
            const result = await db.run(query, ...values);
            
            if (result.changes === 0) {
                throw new Error('Cererea nu a fost găsită sau nu a putut fi actualizată');
            }
            
            // Obține înregistrarea actualizată
            const updatedRecord = await db.get('SELECT * FROM JurnalCereriConfirmare WHERE IdJurnal = ?', idCerere);
            const cerere = this.formatCerereFromDB(updatedRecord);
            
            console.log(`Cerere de confirmare actualizată cu succes: ${cerere.IdJurnal}`);
            return cerere;
            
        } catch (error) {
            console.error('Eroare la actualizarea cererii de confirmare:', error);
            throw new Error(`Eroare la actualizarea cererii de confirmare: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`);
        }
    }

    /**
     * Obține o cerere după ID
     */
    async getCerereById(idCerere: number): Promise<JurnalCereriConfirmare | null> {
        try {
            const db = await getDatabase();
            
            const cerere = await db.get('SELECT * FROM JurnalCereriConfirmare WHERE IdJurnal = ?', idCerere);
            
            if (!cerere) {
                return null;
            }

            return this.formatCerereFromDB(cerere);        } catch (error) {
            console.error('Eroare la căutarea cererii de confirmare:', error);
            throw new Error(`Eroare la căutarea cererii de confirmare: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`);
        }
    }

    /**
     * Obține cereri cu filtrare și paginare
     */
    async getCereri(
        filtru: FilterJurnalCereriConfirmareDto = {},
        pagina: number = 1,
        numarPerPagina: number = 50
    ): Promise<JurnalCereriConfirmareResponse> {
        try {
            const db = await getDatabase();
            const offset = (pagina - 1) * numarPerPagina;
            
            // Construim WHERE clauses și parametri
            const whereClauses: string[] = [];
            const params: any[] = [];
            
            if (filtru.IdPartener) {
                whereClauses.push('IdPartener = ?');
                params.push(filtru.IdPartener);
            }

            if (filtru.IdSetariCompanie) {
                whereClauses.push('IdSetariCompanie = ?');
                params.push(filtru.IdSetariCompanie);
            }

            if (filtru.LotId) {
                whereClauses.push('LotId = ?');
                params.push(filtru.LotId);
            }

            if (filtru.Stare) {
                whereClauses.push('Stare = ?');
                params.push(filtru.Stare);
            }

            if (filtru.CreatDe) {
                whereClauses.push('CreatDe = ?');
                params.push(filtru.CreatDe);
            }

            if (filtru.TrimisDe) {
                whereClauses.push('TrimisDe = ?');
                params.push(filtru.TrimisDe);
            }
            
            if (filtru.dataInceput) {
                whereClauses.push('DataTrimitere >= ?');
                params.push(filtru.dataInceput);
            }
            
            if (filtru.dataSfarsit) {
                whereClauses.push('DataTrimitere <= ?');
                params.push(filtru.dataSfarsit);
            }
            
            if (filtru.HashDocument) {
                whereClauses.push('HashDocument = ?');
                params.push(filtru.HashDocument);
            }
            
            if (filtru.StareBlockchain) {
                whereClauses.push('StareBlockchain = ?');
                params.push(filtru.StareBlockchain);
            }
            
            const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
            
            // Query pentru total
            const countQuery = `
                SELECT COUNT(*) as total
                FROM JurnalCereriConfirmare
                ${whereClause}
            `;
            
            // Query pentru date cu paginare
            const dataQuery = `
                SELECT *
                FROM JurnalCereriConfirmare
                ${whereClause}
                ORDER BY DataTrimitere DESC
                LIMIT ? OFFSET ?
            `;
            
            // Parametrii pentru query-ul cu paginare
            const dataParams = [...params, numarPerPagina, offset];
            
            // Executăm ambele query-uri
            const [countResult, jurnal] = await Promise.all([
                db.get(countQuery, params),
                db.all(dataQuery, dataParams)
            ]);
            
            const total = countResult?.total || 0;
            const jurnalFormatat = jurnal.map((row: any) => this.formatCerereFromDB(row));
            
            return {
                jurnal: jurnalFormatat,
                total,
                pagina,
                totalPagini: Math.ceil(total / numarPerPagina)
            };
            
        } catch (error) {
            console.error('Eroare la obținerea cererilor de confirmare:', error);
            throw new Error(`Eroare la obținerea cererilor de confirmare: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`);
        }
    }

    /**
     * Obține statistici despre cererile de confirmare
     */
    async getStatisticiCereri(filtru: FilterJurnalCereriConfirmareDto = {}): Promise<StatisticiCereriConfirmare> {
        try {
            const db = await getDatabase();
            
            // Construim WHERE clauses și parametri pentru filtre
            const whereClauses: string[] = [];
            const params: any[] = [];
            
            if (filtru.CreatDe) {
                whereClauses.push('CreatDe = ?');
                params.push(filtru.CreatDe);
            }
            
            if (filtru.dataInceput) {
                whereClauses.push('DataTrimitere >= ?');
                params.push(filtru.dataInceput);
            }
            
            if (filtru.dataSfarsit) {
                whereClauses.push('DataTrimitere <= ?');
                params.push(filtru.dataSfarsit);
            }
            
            const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
            
            const query = `
                SELECT 
                    COUNT(*) as totalCereri,
                    SUM(CASE WHEN Stare = 'trimisa' THEN 1 ELSE 0 END) as cereriTrimise,
                    SUM(CASE WHEN Stare = 'confirmata' THEN 1 ELSE 0 END) as cereriConfirmate,
                    SUM(CASE WHEN Stare = 'refuzata' THEN 1 ELSE 0 END) as cereriRefuzate,
                    SUM(CASE WHEN Stare = 'expirata' THEN 1 ELSE 0 END) as cereriExpirate,
                    AVG(CASE 
                        WHEN DataIncarcareSemnatura IS NOT NULL 
                        THEN CAST((julianday(DataIncarcareSemnatura) - julianday(DataTrimitere)) * 24 AS INTEGER)
                        ELSE NULL 
                    END) as timpMediuRaspuns
                FROM JurnalCereriConfirmare
                ${whereClause}
            `;
            
            const stats = await db.get(query, params);
            
            if (!stats) {
                return {
                    totalCereri: 0,
                    cereriTrimise: 0,
                    cereriConfirmate: 0,
                    cereriRefuzate: 0,
                    cereriExpirate: 0,
                    cereriAnulate: 0,
                    rataSucces: 0,
                    timpMediuRaspuns: 0
                };
            }

            const cereriAnulate = stats.totalCereri - stats.cereriTrimise - stats.cereriConfirmate - stats.cereriRefuzate - stats.cereriExpirate;
            const rataSucces = stats.cereriTrimise > 0 ? (stats.cereriConfirmate / stats.cereriTrimise) * 100 : 0;

            return {
                totalCereri: stats.totalCereri || 0,
                cereriTrimise: stats.cereriTrimise || 0,
                cereriConfirmate: stats.cereriConfirmate || 0,
                cereriRefuzate: stats.cereriRefuzate || 0,
                cereriExpirate: stats.cereriExpirate || 0,
                cereriAnulate: Math.max(0, cereriAnulate),
                rataSucces: Math.round(rataSucces * 100) / 100,
                timpMediuRaspuns: Math.round((stats.timpMediuRaspuns || 0) * 100) / 100
            };
            
        } catch (error) {
            console.error('Eroare la obținerea statisticilor cererilor de confirmare:', error);
            throw new Error(`Eroare la obținerea statisticilor: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`);
        }
    }

    /**
     * Șterge o cerere de confirmare
     */
    async deleteCerere(idCerere: number): Promise<boolean> {
        try {
            const db = await getDatabase();
            
            const query = `
                DELETE FROM JurnalCereriConfirmare 
                WHERE IdJurnal = ?
            `;
            
            const result = await db.run(query, [idCerere]);
            
            console.log(`Cerere de confirmare ștearsă: ${idCerere}`);
            return result.changes ? result.changes > 0 : false;
            
        } catch (error) {
            console.error('Eroare la ștergerea cererii de confirmare:', error);
            throw new Error(`Eroare la ștergerea cererii de confirmare: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`);
        }
    }
}

// Export instanța serviciului
export const jurnalCereriConfirmareRealService = new JurnalCereriConfirmareRealService();
