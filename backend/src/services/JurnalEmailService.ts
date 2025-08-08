import { getDatabase } from '../config/sqlite';
import { 
    JurnalEmail, 
    CreateJurnalEmailRequest, 
    UpdateJurnalEmailRequest, 
    JurnalEmailFilters,
    JurnalEmailStats,
    JurnalEmailResponse
} from '../models/JurnalEmail';
import crypto from 'crypto';

export class JurnalEmailService {
    
    /**
     * Creează o nouă înregistrare în jurnalul de emailuri
     */
    async createJurnalEmail(data: CreateJurnalEmailRequest): Promise<JurnalEmailResponse> {
        try {
            const idJurnalEmail = crypto.randomUUID();
            const hashEmail = this.generateEmailHash(data);
            const db = await getDatabase();
            
            const stmt = await db.prepare(`
                INSERT INTO JurnalEmail (
                    IdJurnalEmail, IdPartener, IdSablon, EmailDestinatar, SubiectEmail, ContinutEmail,
                    TipEmail, IdLot, IdCerereConfirmare, PriorityLevel, NumeExpeditor, EmailExpeditor,
                    NumeDestinatar, TipDestinatar, EmailCC, EmailBCC, EmailReplyTo, Atasamente,
                    MaximIncercari, HashEmail, CreatDe, CreatLa
                ) VALUES (
                    ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?
                )
            `);
            
            await stmt.run(
                idJurnalEmail,
                data.IdPartener || null,
                data.IdSablon || null,
                data.EmailDestinatar,
                data.SubiectEmail,
                data.ContinutEmail || null,
                data.TipEmail,
                data.IdLot || null,
                data.IdCerereConfirmare || null,
                data.PriorityLevel || 'NORMAL',
                data.NumeExpeditor || null,
                data.EmailExpeditor || null,
                data.NumeDestinatar || null,
                data.TipDestinatar || null,
                data.EmailCC || null,
                data.EmailBCC || null,
                data.EmailReplyTo || null,
                data.Atașamente || null,
                data.MaximIncercari || 3,
                hashEmail,
                data.CreatDe,
                new Date().toISOString()
            );

            const createdRecord = await this.getJurnalEmailById(idJurnalEmail);
            
            if (!createdRecord) {
                return {
                    success: false,
                    error: 'Înregistrarea a fost creată dar nu poate fi găsită'
                };
            }
            
            return {
                success: true,
                data: createdRecord,
                message: 'Înregistrare creată cu succes în jurnalul de emailuri'
            };
        } catch (error) {
            console.error('❌ Eroare la crearea înregistrării în jurnalul de emailuri:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Eroare necunoscută'
            };
        }
    }

    /**
     * Actualizează o înregistrare din jurnalul de emailuri
     */
    async updateJurnalEmail(data: UpdateJurnalEmailRequest): Promise<JurnalEmailResponse> {
        try {
            const updateFields: string[] = [];
            const params: any[] = [];
            let paramIndex = 1;

            // Construiește dinamic query-ul de update pentru SQLite
            if (data.StatusTrimitere !== undefined) {
                updateFields.push(`StatusTrimitere = ?${paramIndex}`);
                params.push(data.StatusTrimitere);
                paramIndex++;
            }
            
            if (data.MesajEroare !== undefined) {
                updateFields.push(`MesajEroare = ?${paramIndex}`);
                params.push(data.MesajEroare);
                paramIndex++;
            }
            
            if (data.IdMessageEmail !== undefined) {
                updateFields.push(`IdMessageEmail = ?${paramIndex}`);
                params.push(data.IdMessageEmail);
                paramIndex++;
            }
            
            if (data.NumarIncercari !== undefined) {
                updateFields.push(`NumarIncercari = ?${paramIndex}`);
                params.push(data.NumarIncercari);
                paramIndex++;
            }
            
            if (data.DataUltimaIncercare !== undefined) {
                updateFields.push(`DataUltimaIncercare = ?${paramIndex}`);
                params.push(data.DataUltimaIncercare);
                paramIndex++;
            }
            
            if (data.DataUrmatoareaIncercare !== undefined) {
                updateFields.push(`DataUrmatoareaIncercare = ?${paramIndex}`);
                params.push(data.DataUrmatoareaIncercare);
                paramIndex++;
            }
            
            if (data.DataCitire !== undefined) {
                updateFields.push(`DataCitire = ?${paramIndex}`);
                params.push(data.DataCitire);
                paramIndex++;
            }
            
            if (data.DataRaspuns !== undefined) {
                updateFields.push(`DataRaspuns = ?${paramIndex}`);
                params.push(data.DataRaspuns);
                paramIndex++;
            }
            
            if (data.RaspunsEmail !== undefined) {
                updateFields.push(`RaspunsEmail = ?${paramIndex}`);
                params.push(data.RaspunsEmail);
                paramIndex++;
            }
            
            // Câmpuri blockchain
            if (data.HashEmail !== undefined) {
                updateFields.push(`HashEmail = ?${paramIndex}`);
                params.push(data.HashEmail);
                paramIndex++;
            }
            
            if (data.HashTranzactieBlockchain !== undefined) {
                updateFields.push(`HashTranzactieBlockchain = ?${paramIndex}`);
                params.push(data.HashTranzactieBlockchain);
                paramIndex++;
            }
            
            if (data.StareBlockchain !== undefined) {
                updateFields.push(`StareBlockchain = ?${paramIndex}`);
                params.push(data.StareBlockchain);
                paramIndex++;
            }
            
            if (data.TimestampBlockchain !== undefined) {
                updateFields.push(`TimestampBlockchain = ?${paramIndex}`);
                params.push(data.TimestampBlockchain);
                paramIndex++;
            }
            
            if (data.ReteaBlockchain !== undefined) {
                updateFields.push(`ReteaBlockchain = ?${paramIndex}`);
                params.push(data.ReteaBlockchain);
                paramIndex++;
            }
            
            if (data.AdresaContractBlockchain !== undefined) {
                updateFields.push(`AdresaContractBlockchain = ?${paramIndex}`);
                params.push(data.AdresaContractBlockchain);
                paramIndex++;
            }
            
            if (data.GazUtilizat !== undefined) {
                updateFields.push(`GazUtilizat = ?${paramIndex}`);
                params.push(data.GazUtilizat);
                paramIndex++;
            }
            
            if (data.CostTranzactie !== undefined) {
                updateFields.push(`CostTranzactie = ?${paramIndex}`);
                params.push(data.CostTranzactie);
                paramIndex++;
            }

            // Adaugă câmpurile de audit
            updateFields.push(`ModificatLa = ?${paramIndex}`);
            params.push(new Date().toISOString());
            paramIndex++;
            
            updateFields.push(`ModificatDe = ?${paramIndex}`);
            params.push(data.ModificatDe);
            paramIndex++;

            if (updateFields.length === 2) { // doar câmpurile de audit
                return {
                    success: false,
                    error: 'Nu au fost specificate câmpuri pentru actualizare'
                };
            }

            // Adaugă IdJurnalEmail pentru clauza WHERE
            params.push(data.IdJurnalEmail);

            const db = await getDatabase();
            const stmt = await db.prepare(`
                UPDATE JurnalEmail 
                SET ${updateFields.join(', ')}
                WHERE IdJurnalEmail = ?${paramIndex}
            `);

            await stmt.run(...params);

            const updatedRecord = await this.getJurnalEmailById(data.IdJurnalEmail);
            
            if (!updatedRecord) {
                return {
                    success: false,
                    error: 'Înregistrarea nu poate fi găsită după actualizare'
                };
            }
            
            return {
                success: true,
                data: updatedRecord,
                message: 'Înregistrare actualizată cu succes în jurnalul de emailuri'
            };
        } catch (error) {
            console.error('❌ Eroare la actualizarea înregistrării din jurnalul de emailuri:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Eroare necunoscută'
            };
        }
    }

    /**
     * Obține o înregistrare din jurnalul de emailuri după ID
     */
    async getJurnalEmailById(idJurnalEmail: string): Promise<JurnalEmail | null> {
        try {
            const db = await getDatabase();
            const result = await db.get('SELECT * FROM JurnalEmail WHERE IdJurnalEmail = ?', [idJurnalEmail]);

            return result ? result as JurnalEmail : null;
        } catch (error) {
            console.error('❌ Eroare la obținerea înregistrării din jurnalul de emailuri:', error);
            return null;
        }
    }

    /**
     * Obține înregistrări filtrate din jurnalul de emailuri
     */
    async getJurnalEmailuri(filters: JurnalEmailFilters = {}): Promise<JurnalEmailResponse> {
        try {
            const whereConditions: string[] = [];
            const params: any[] = [];

            // Construiește condițiile WHERE pentru SQLite
            if (filters.DataTrimitereStart) {
                whereConditions.push('DataTrimitere >= ?');
                params.push(filters.DataTrimitereStart);
            }

            if (filters.DataTrimitereEnd) {
                whereConditions.push('DataTrimitere <= ?');
                params.push(filters.DataTrimitereEnd);
            }

            if (filters.StatusTrimitere && filters.StatusTrimitere.length > 0) {
                const statusPlaceholders = filters.StatusTrimitere.map(() => '?').join(', ');
                whereConditions.push(`StatusTrimitere IN (${statusPlaceholders})`);
                params.push(...filters.StatusTrimitere);
            }

            if (filters.TipEmail && filters.TipEmail.length > 0) {
                const tipPlaceholders = filters.TipEmail.map(() => '?').join(', ');
                whereConditions.push(`TipEmail IN (${tipPlaceholders})`);
                params.push(...filters.TipEmail);
            }

            if (filters.IdPartener) {
                whereConditions.push('IdPartener = ?');
                params.push(filters.IdPartener);
            }

            if (filters.IdLot) {
                whereConditions.push('IdLot = ?');
                params.push(filters.IdLot);
            }

            if (filters.IdCerereConfirmare) {
                whereConditions.push('IdCerereConfirmare = ?');
                params.push(filters.IdCerereConfirmare);
            }

            if (filters.EmailDestinatar) {
                whereConditions.push('EmailDestinatar LIKE ?');
                params.push(`%${filters.EmailDestinatar}%`);
            }

            if (filters.TipDestinatar && filters.TipDestinatar.length > 0) {
                const tipDestPlaceholders = filters.TipDestinatar.map(() => '?').join(', ');
                whereConditions.push(`TipDestinatar IN (${tipDestPlaceholders})`);
                params.push(...filters.TipDestinatar);
            }

            if (filters.StareBlockchain && filters.StareBlockchain.length > 0) {
                const stareBlockchainPlaceholders = filters.StareBlockchain.map(() => '?').join(', ');
                whereConditions.push(`StareBlockchain IN (${stareBlockchainPlaceholders})`);
                params.push(...filters.StareBlockchain);
            }

            if (filters.ReteaBlockchain) {
                whereConditions.push('ReteaBlockchain = ?');
                params.push(filters.ReteaBlockchain);
            }

            if (filters.PriorityLevel && filters.PriorityLevel.length > 0) {
                const priorityPlaceholders = filters.PriorityLevel.map(() => '?').join(', ');
                whereConditions.push(`PriorityLevel IN (${priorityPlaceholders})`);
                params.push(...filters.PriorityLevel);
            }

            // Construiește clauza WHERE
            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

            // Construiește clauza ORDER BY
            const sortBy = filters.sortBy || 'CreatLa';
            const sortOrder = filters.sortOrder || 'DESC';
            const orderByClause = `ORDER BY ${sortBy} ${sortOrder}`;

            // Construiește clauza LIMIT/OFFSET pentru paginare
            const offset = filters.offset || 0;
            const limit = filters.limit || 50;
            const paginationClause = `LIMIT ${limit} OFFSET ${offset}`;

            // Query principal
            const mainQuery = `
                SELECT je.*
                FROM JurnalEmail je
                ${whereClause} 
                ${orderByClause} 
                ${paginationClause}
            `;

            console.log('🔍 DEBUG - Query SQL pentru JurnalEmail:', mainQuery);

            // Query pentru total
            const countQuery = `
                SELECT COUNT(*) as Total FROM JurnalEmail 
                ${whereClause}
            `;

            const db = await getDatabase();
            
            const [dataResult, countResult] = await Promise.all([
                db.all(mainQuery, params),
                db.get(countQuery, params.slice(0, params.length)) // folosește aceiași parametri pentru count
            ]);

            console.log('🔍 DEBUG - Rezultat query JurnalEmail:', {
                totalRecords: dataResult.length,
                firstRecord: dataResult[0] ? {
                    IdJurnalEmail: dataResult[0].IdJurnalEmail,
                    SubiectEmail: dataResult[0].SubiectEmail,
                    IdCerereConfirmare: dataResult[0].IdCerereConfirmare
                } : null
            });

            console.log('🔍 DEBUG - Primele 2 rezultate din query:', dataResult.slice(0, 2));

            const total = countResult?.Total || 0;
            const hasMore = offset + limit < total;

            return {
                success: true,
                data: dataResult as JurnalEmail[],
                pagination: {
                    total,
                    offset,
                    limit,
                    hasMore
                }
            };
        } catch (error) {
            console.error('❌ Eroare la obținerea înregistrărilor din jurnalul de emailuri:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Eroare necunoscută'
            };
        }
    }

    /**
     * Obține statistici pentru jurnalul de emailuri
     */
    async getJurnalEmailStats(filters: Omit<JurnalEmailFilters, 'offset' | 'limit' | 'sortBy' | 'sortOrder'> = {}): Promise<JurnalEmailResponse> {
        try {
            const whereConditions: string[] = [];
            const params: any[] = [];

            // Aplică aceleași filtre ca la getJurnalEmailuri (fără paginare)
            if (filters.DataTrimitereStart) {
                whereConditions.push('DataTrimitere >= ?');
                params.push(filters.DataTrimitereStart);
            }

            if (filters.DataTrimitereEnd) {
                whereConditions.push('DataTrimitere <= ?');
                params.push(filters.DataTrimitereEnd);
            }

            // Adaugă alte filtre similar cu getJurnalEmailuri...

            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

            const statsQuery = `
                SELECT 
                    COUNT(*) as totalEmailuri,
                    SUM(CASE WHEN StatusTrimitere = 'SUCCESS' THEN 1 ELSE 0 END) as emailuriTrimise,
                    SUM(CASE WHEN StatusTrimitere = 'FAILED' THEN 1 ELSE 0 END) as emailuriEsuate,
                    SUM(CASE WHEN StatusTrimitere = 'PENDING' THEN 1 ELSE 0 END) as emailuriPending,
                    SUM(CASE WHEN StatusTrimitere = 'RETRY' THEN 1 ELSE 0 END) as emailuriRetry,
                    SUM(CASE WHEN StareBlockchain = 'CONFIRMED' THEN 1 ELSE 0 END) as emailuriBlockchainConfirmate,
                    SUM(CASE WHEN StareBlockchain = 'PENDING' THEN 1 ELSE 0 END) as emailuriBlockchainPending,
                    SUM(CASE WHEN StareBlockchain = 'FAILED' THEN 1 ELSE 0 END) as emailuriBlockchainEsuate
                FROM JurnalEmail 
                ${whereClause}
            `;

            const db = await getDatabase();
            const result = await db.get(statsQuery, params);
            const stats = result as JurnalEmailStats;

            // Obține statistici pe tipuri de email
            const tipStatsQuery = `
                SELECT TipEmail, COUNT(*) as Count
                FROM JurnalEmail 
                ${whereClause}
                GROUP BY TipEmail
            `;

            const tipStatsResult = await db.all(tipStatsQuery, params);
            const statisticiTipEmail: { [key: string]: number } = {};
            tipStatsResult.forEach((row: any) => {
                statisticiTipEmail[row.TipEmail] = row.Count;
            });

            // Obține statistici pe prioritate
            const priorityStatsQuery = `
                SELECT PriorityLevel, COUNT(*) as Count
                FROM JurnalEmail 
                ${whereClause}
                GROUP BY PriorityLevel
            `;

            const priorityStatsResult = await db.all(priorityStatsQuery, params);
            const statisticiPrioritate: { [key: string]: number } = {};
            priorityStatsResult.forEach((row: any) => {
                statisticiPrioritate[row.PriorityLevel] = row.Count;
            });

            const finalStats: JurnalEmailStats = {
                ...stats,
                statisticiTipEmail: statisticiTipEmail as any,
                statisticiPrioritate: statisticiPrioritate as any
            };

            return {
                success: true,
                stats: finalStats
            };
        } catch (error) {
            console.error('❌ Eroare la obținerea statisticilor pentru jurnalul de emailuri:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Eroare necunoscută'
            };
        }
    }

    /**
     * Marchează emailurile pentru retrimitere
     */
    async markForRetry(idJurnalEmailuri: string[], modificatDe: string): Promise<JurnalEmailResponse> {
        try {
            const placeholders = idJurnalEmailuri.map(() => '?').join(', ');
            const params = [...idJurnalEmailuri, new Date().toISOString(), modificatDe];

            const db = await getDatabase();
            const stmt = await db.prepare(`
                UPDATE JurnalEmail 
                SET StatusTrimitere = 'RETRY',
                    DataUrmatoareaIncercare = datetime('now', '+5 minutes'),
                    ModificatLa = ?,
                    ModificatDe = ?
                WHERE IdJurnalEmail IN (${placeholders})
                    AND StatusTrimitere = 'FAILED'
                    AND NumarIncercari < MaximIncercari
            `);

            await stmt.run(...params);

            return {
                success: true,
                message: 'Emailurile au fost marcate pentru retrimitere'
            };
        } catch (error) {
            console.error('❌ Eroare la marcarea emailurilor pentru retrimitere:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Eroare necunoscută'
            };
        }
    }

    /**
     * Generează hash pentru email (pentru verificare integritate)
     */
    private generateEmailHash(data: CreateJurnalEmailRequest): string {
        const content = `${data.EmailDestinatar}|${data.SubiectEmail}|${data.ContinutEmail || ''}|${data.TipEmail}|${Date.now()}`;
        return crypto.createHash('sha256').update(content).digest('hex');
    }
}

// Instanță singleton
export const jurnalEmailService = new JurnalEmailService();
