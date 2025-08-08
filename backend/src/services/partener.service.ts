import { getDatabase } from '../config/sqlite';
import { Partener } from '../models/Partener';

export class PartenerService {
    
    // Obține toți partenerii cu sortare, filtrare și paginare
    async getAllParteneri(
        sortBy: string = 'NumePartener', 
        sortOrder: string = 'asc', 
        status: string = 'all', 
        partnerType: string = 'all',
        page: number = 1,
        limit: number = 50
    ): Promise<{ parteneri: Partener[], totalCount: number }> {
        try {
            const db = await getDatabase();
            
            // Calculează offset pentru paginare
            const offset = (page - 1) * limit;

            // Construiește clauza WHERE bazată pe filtre
            const conditions: string[] = [];

            // Filtrare după status (activ/inactiv)
            if (status === 'active') {
                conditions.push('PartenerActiv = 1');
            } else if (status === 'inactive') {
                conditions.push('PartenerActiv = 0');
            }

            // Filtrare după tipul de partener
            if (partnerType === 'client-duc') {
                conditions.push('ClientDUC = 1');
            } else if (partnerType === 'client-dl') {
                conditions.push('ClientDL = 1');
            } else if (partnerType === 'furnizor-duc') {
                conditions.push('FurnizorDUC = 1');
            } else if (partnerType === 'furnizor-dl') {
                conditions.push('FurnizorDL = 1');
            } else if (partnerType === 'client') {
                conditions.push('(ClientDUC = 1 OR ClientDL = 1)');
            } else if (partnerType === 'furnizor') {
                conditions.push('(FurnizorDUC = 1 OR FurnizorDL = 1)');
            }

            const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

            // Validează și construiește clauza ORDER BY
            const validSortFields = [
                'NumePartener', 
                'CUIPartener', 
                'DataCrearePartener', 
                'DataModificarePartener',
                'PartenerActiv'
            ];
            
            const finalSortBy = validSortFields.includes(sortBy) ? sortBy : 'NumePartener';
            const finalSortOrder = ['asc', 'desc'].includes(sortOrder.toLowerCase()) ? sortOrder.toUpperCase() : 'ASC';
            
            let orderByClause = `ORDER BY ${finalSortBy} ${finalSortOrder}`;
            
            // Pentru sortare alfabetică, adaugă o sortare secundară
            if (finalSortBy !== 'NumePartener') {
                orderByClause += ', NumePartener ASC';
            }

            // Obține numărul total de parteneri pentru paginare
            const countResult = await db.get(`
                SELECT COUNT(*) as total
                FROM Parteneri 
                ${whereClause}
            `);

            const totalCount = countResult?.total || 0;

            // Obține partenerii pentru pagina curentă
            const parteneriResult = await db.all(`
                SELECT 
                    IdPartener as idPartener,
                    NumePartener as numePartener,
                    CUIPartener as cuiPartener,
                    ONRCPartener as onrcPartener,
                    EmailPartener as emailPartener,
                    ReprezentantPartener as reprezentantPartener,
                    ClientDUC as clientDUC,
                    FurnizorDUC as furnizorDUC,
                    ClientDL as clientDL,
                    FurnizorDL as furnizorDL,
                    AdresaPartener as adresaPartener,
                    TelefonPartener as telefonPartener,
                    ObservatiiPartener as observatiiPartener,
                    PartenerActiv as partenerActiv,
                    DataCrearePartener as dataCrearePartener,
                    DataModificarePartener as dataModificarePartener
                FROM Parteneri 
                ${whereClause}
                ${orderByClause}
                LIMIT ? OFFSET ?
            `, [limit, offset]);

            // Convertește valorile boolean
            const parteneri: Partener[] = parteneriResult.map(p => ({
                ...p,
                clientDUC: Boolean(p.clientDUC),
                furnizorDUC: Boolean(p.furnizorDUC),
                clientDL: Boolean(p.clientDL),
                furnizorDL: Boolean(p.furnizorDL),
                partenerActiv: Boolean(p.partenerActiv)
            }));

            return { parteneri, totalCount };

        } catch (error) {
            console.error('Eroare la obținerea partenerilor:', error);
            throw error;
        }
    }

    // Obține un partener după ID
    async getPartenerById(id: string): Promise<Partener | null> {
        try {
            const db = await getDatabase();
            
            const result = await db.get(`
                SELECT 
                    IdPartener as idPartener,
                    NumePartener as numePartener,
                    CUIPartener as cuiPartener,
                    ONRCPartener as onrcPartener,
                    EmailPartener as emailPartener,
                    ReprezentantPartener as reprezentantPartener,
                    ClientDUC as clientDUC,
                    FurnizorDUC as furnizorDUC,
                    ClientDL as clientDL,
                    FurnizorDL as furnizorDL,
                    AdresaPartener as adresaPartener,
                    TelefonPartener as telefonPartener,
                    ObservatiiPartener as observatiiPartener,
                    PartenerActiv as partenerActiv,
                    DataCrearePartener as dataCrearePartener,
                    DataModificarePartener as dataModificarePartener
                FROM Parteneri 
                WHERE IdPartener = ?
            `, [id]);

            if (!result) return null;

            return {
                ...result,
                clientDUC: Boolean(result.clientDUC),
                furnizorDUC: Boolean(result.furnizorDUC),
                clientDL: Boolean(result.clientDL),
                furnizorDL: Boolean(result.furnizorDL),
                partenerActiv: Boolean(result.partenerActiv)
            };

        } catch (error) {
            console.error('Eroare la obținerea partenerului:', error);
            throw error;
        }
    }

    // Caută parteneri după nume, CUI sau email
    async searchParteneri(query: string, type?: string): Promise<Partener[]> {
        try {
            const db = await getDatabase();
            
            let whereClause = `WHERE PartenerActiv = 1 AND (
                NumePartener LIKE ? OR 
                CUIPartener LIKE ? OR 
                EmailPartener LIKE ?
            )`;
            
            const searchTerm = `%${query}%`;
            let params = [searchTerm, searchTerm, searchTerm];
            
            // Filtrare după tip de partener dacă este specificat
            if (type === 'client') {
                whereClause += ' AND (ClientDUC = 1 OR ClientDL = 1)';
            } else if (type === 'furnizor') {
                whereClause += ' AND (FurnizorDUC = 1 OR FurnizorDL = 1)';
            }

            const result = await db.all(`
                SELECT 
                    IdPartener as idPartener,
                    NumePartener as numePartener,
                    CUIPartener as cuiPartener,
                    ONRCPartener as onrcPartener,
                    EmailPartener as emailPartener,
                    ReprezentantPartener as reprezentantPartener,
                    ClientDUC as clientDUC,
                    FurnizorDUC as furnizorDUC,
                    ClientDL as clientDL,
                    FurnizorDL as furnizorDL,
                    AdresaPartener as adresaPartener,
                    TelefonPartener as telefonPartener,
                    ObservatiiPartener as observatiiPartener,
                    PartenerActiv as partenerActiv,
                    DataCrearePartener as dataCrearePartener,
                    DataModificarePartener as dataModificarePartener
                FROM Parteneri 
                ${whereClause}
                ORDER BY NumePartener
            `, params);

            return result.map(p => ({
                ...p,
                clientDUC: Boolean(p.clientDUC),
                furnizorDUC: Boolean(p.furnizorDUC),
                clientDL: Boolean(p.clientDL),
                furnizorDL: Boolean(p.furnizorDL),
                partenerActiv: Boolean(p.partenerActiv)
            }));

        } catch (error) {
            console.error('Eroare la căutarea partenerilor:', error);
            throw error;
        }
    }

    // Obține parteneri după ID-uri
    async getPartenersByIds(ids: string[]): Promise<Partener[]> {
        try {
            const db = await getDatabase();
            
            if (ids.length === 0) return [];
            
            const placeholders = ids.map(() => '?').join(', ');
            
            const result = await db.all(`
                SELECT 
                    IdPartener as idPartener,
                    NumePartener as numePartener,
                    CUIPartener as cuiPartener,
                    ONRCPartener as onrcPartener,
                    EmailPartener as emailPartener,
                    ReprezentantPartener as reprezentantPartener,
                    ClientDUC as clientDUC,
                    FurnizorDUC as furnizorDUC,
                    ClientDL as clientDL,
                    FurnizorDL as furnizorDL,
                    AdresaPartener as adresaPartener,
                    TelefonPartener as telefonPartener,
                    ObservatiiPartener as observatiiPartener,
                    PartenerActiv as partenerActiv,
                    DataCrearePartener as dataCrearePartener,
                    DataModificarePartener as dataModificarePartener
                FROM Parteneri 
                WHERE IdPartener IN (${placeholders})
                ORDER BY NumePartener ASC
            `, ids);

            return result.map(p => ({
                ...p,
                clientDUC: Boolean(p.clientDUC),
                furnizorDUC: Boolean(p.furnizorDUC),
                clientDL: Boolean(p.clientDL),
                furnizorDL: Boolean(p.furnizorDL),
                partenerActiv: Boolean(p.partenerActiv)
            }));

        } catch (error) {
            console.error('Eroare la obținerea partenerilor după ID-uri:', error);
            throw error;
        }
    }

    // Obține statistici pentru dashboard
    async getDashboardStats(): Promise<{
        totalPartners: number;
        respondedPartners: number;
        pendingPartners: number;
        lastRequestDate: Date | null;
    }> {
        try {
            const db = await getDatabase();
            
            // Obținem numărul total de parteneri
            const totalResult = await db.get(`
                SELECT COUNT(*) as total 
                FROM Parteneri
            `);
            
            // Obținem ultimii parteneri adăugați pentru a determina ultima dată
            const recentResult = await db.get(`
                SELECT DataCrearePartener as lastDate
                FROM Parteneri 
                ORDER BY DataCrearePartener DESC
                LIMIT 1
            `);
            
            return {
                totalPartners: totalResult?.total || 0,
                respondedPartners: 0, // Va fi implementat când vom avea tabelul de cereri
                pendingPartners: 0,   // Va fi implementat când vom avea tabelul de cereri
                lastRequestDate: recentResult?.lastDate ? new Date(recentResult.lastDate) : null
            };
            
        } catch (error) {
            console.error('Eroare la obținerea statisticilor pentru dashboard:', error);
            throw error;
        }
    }

    // Obține partenerii adăugați recent
    async getRecentParteneri(limit: number = 3): Promise<Partener[]> {
        try {
            const db = await getDatabase();
            
            const result = await db.all(`
                SELECT 
                    IdPartener as idPartener,
                    NumePartener as numePartener,
                    CUIPartener as cuiPartener,
                    ONRCPartener as onrcPartener,
                    EmailPartener as emailPartener,
                    ReprezentantPartener as reprezentantPartener,
                    ClientDUC as clientDUC,
                    FurnizorDUC as furnizorDUC,
                    ClientDL as clientDL,
                    FurnizorDL as furnizorDL,
                    AdresaPartener as adresaPartener,
                    TelefonPartener as telefonPartener,
                    ObservatiiPartener as observatiiPartener,
                    PartenerActiv as partenerActiv,
                    DataCrearePartener as dataCrearePartener,
                    DataModificarePartener as dataModificarePartener
                FROM Parteneri 
                ORDER BY DataCrearePartener DESC
                LIMIT ?
            `, [limit]);
            
            return result.map(p => ({
                ...p,
                clientDUC: Boolean(p.clientDUC),
                furnizorDUC: Boolean(p.furnizorDUC),
                clientDL: Boolean(p.clientDL),
                furnizorDL: Boolean(p.furnizorDL),
                partenerActiv: Boolean(p.partenerActiv)
            }));
            
        } catch (error) {
            console.error('Eroare la obținerea partenerilor recenți:', error);
            throw error;
        }
    }

    // Creează un partener nou
    async createPartener(partenerData: Partial<Partener>): Promise<Partener> {
        try {
            const db = await getDatabase();
            
            const query = `
                INSERT INTO Parteneri (
                    NumePartener, CUIPartener, ONRCPartener, EmailPartener, 
                    ReprezentantPartener, ClientDUC, FurnizorDUC, ClientDL, FurnizorDL,
                    AdresaPartener, TelefonPartener, ObservatiiPartener, PartenerActiv,
                    DataCrearePartener, DataModificarePartener
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'))
            `;
            
            const result = await db.run(query, [
                partenerData.numePartener,
                partenerData.cuiPartener,
                partenerData.onrcPartener || null,
                partenerData.emailPartener || null,
                partenerData.reprezentantPartener || null,
                partenerData.clientDUC ? 1 : 0,
                partenerData.furnizorDUC ? 1 : 0,
                partenerData.clientDL ? 1 : 0,
                partenerData.furnizorDL ? 1 : 0,
                partenerData.adresaPartener || null,
                partenerData.telefonPartener || null,
                partenerData.observatiiPartener || null,
                partenerData.partenerActiv !== false ? 1 : 0
            ]);

            // Obține partenerul creat
            if (!result.lastID) {
                throw new Error('Nu s-a putut obține ID-ul partenerului creat');
            }
            const newPartener = await this.getPartenerById(result.lastID.toString());
            if (!newPartener) {
                throw new Error('Partenerul nu a putut fi creat');
            }
            return newPartener;
        } catch (error) {
            console.error('Eroare la crearea partenerului:', error);
            throw error;
        }
    }

    // Actualizează un partener existent
    async updatePartener(id: string, partenerData: Partial<Partener>): Promise<Partener | null> {
        try {
            const db = await getDatabase();
            
            // Verifică dacă partenerul există
            const existingPartener = await this.getPartenerById(id);
            if (!existingPartener) {
                return null;
            }

            const query = `
                UPDATE Parteneri 
                SET NumePartener = ?, CUIPartener = ?, ONRCPartener = ?, EmailPartener = ?, 
                    ReprezentantPartener = ?, ClientDUC = ?, FurnizorDUC = ?, ClientDL = ?, FurnizorDL = ?,
                    AdresaPartener = ?, TelefonPartener = ?, ObservatiiPartener = ?, PartenerActiv = ?,
                    DataModificarePartener = datetime('now', 'localtime')
                WHERE IdPartener = ?
            `;
            
            await db.run(query, [
                partenerData.numePartener !== undefined ? partenerData.numePartener : existingPartener.numePartener,
                partenerData.cuiPartener !== undefined ? partenerData.cuiPartener : existingPartener.cuiPartener,
                partenerData.onrcPartener !== undefined ? partenerData.onrcPartener : existingPartener.onrcPartener,
                partenerData.emailPartener !== undefined ? partenerData.emailPartener : existingPartener.emailPartener,
                partenerData.reprezentantPartener !== undefined ? partenerData.reprezentantPartener : existingPartener.reprezentantPartener,
                partenerData.clientDUC !== undefined ? (partenerData.clientDUC ? 1 : 0) : (existingPartener.clientDUC ? 1 : 0),
                partenerData.furnizorDUC !== undefined ? (partenerData.furnizorDUC ? 1 : 0) : (existingPartener.furnizorDUC ? 1 : 0),
                partenerData.clientDL !== undefined ? (partenerData.clientDL ? 1 : 0) : (existingPartener.clientDL ? 1 : 0),
                partenerData.furnizorDL !== undefined ? (partenerData.furnizorDL ? 1 : 0) : (existingPartener.furnizorDL ? 1 : 0),
                partenerData.adresaPartener !== undefined ? partenerData.adresaPartener : existingPartener.adresaPartener,
                partenerData.telefonPartener !== undefined ? partenerData.telefonPartener : existingPartener.telefonPartener,
                partenerData.observatiiPartener !== undefined ? partenerData.observatiiPartener : existingPartener.observatiiPartener,
                partenerData.partenerActiv !== undefined ? (partenerData.partenerActiv ? 1 : 0) : (existingPartener.partenerActiv ? 1 : 0),
                id
            ]);

            // Returnează partenerul actualizat
            return await this.getPartenerById(id);
        } catch (error) {
            console.error('Eroare la actualizarea partenerului:', error);
            throw error;
        }
    }

    // Șterge un partener (dezactivează în loc de ștergere completă)
    async deletePartener(id: string): Promise<boolean> {
        try {
            const db = await getDatabase();
            
            // Verifică dacă partenerul există
            const existingPartener = await this.getPartenerById(id);
            if (!existingPartener) {
                return false;
            }

            // Dezactivează partenerul în loc să-l șteargă complet
            const query = `
                UPDATE Parteneri 
                SET PartenerActiv = 0, DataModificarePartener = datetime('now', 'localtime')
                WHERE IdPartener = ?
            `;
            
            const result = await db.run(query, [id]);
            return (result.changes ?? 0) > 0;
        } catch (error) {
            console.error('Eroare la ștergerea partenerului:', error);
            throw error;
        }
    }
}

const partenerService = new PartenerService();
export default partenerService;
