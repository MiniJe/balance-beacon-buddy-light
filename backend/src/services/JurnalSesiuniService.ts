import { getDatabase } from '../config/sqlite';
import { 
    JurnalSesiuni, 
    CreateJurnalSesiuniDto, 
    UpdateJurnalSesiuniDto, 
    SesiuniStatsDto,
    JurnalSesiuniFilterDto 
} from '../models/JurnalSesiuni';
import crypto from 'crypto';

/**
 * Service pentru gestionarea jurnalului de sesiuni cu suport blockchain MultiversX
 */
class JurnalSesiuniService {
    
    /**
     * Generează hash SHA-256 pentru blockchain
     */
    private generateBlockchainHash(data: any): string {
        const dataString = JSON.stringify(data) + Date.now().toString();
        return crypto.createHash('sha256').update(dataString).digest('hex');
    }

    /**
     * Obține informații despre IP-ul clientului din request
     */
    private getClientIP(req: any): string | undefined {
        return req.headers['x-forwarded-for'] || 
               req.headers['x-real-ip'] || 
               req.connection?.remoteAddress || 
               req.socket?.remoteAddress ||
               req.ip;
    }

    /**
     * Parsează User-Agent pentru informații despre browser/dispozitiv
     */
    private parseUserAgent(userAgent: string): { browser: string; sistemeOperare: string; dispozitiv: string } {
        const ua = userAgent.toLowerCase();
        
        // Detectează browser-ul
        let browser = 'unknown';
        if (ua.includes('chrome')) browser = 'Chrome';
        else if (ua.includes('firefox')) browser = 'Firefox';
        else if (ua.includes('safari')) browser = 'Safari';
        else if (ua.includes('edge')) browser = 'Edge';
        else if (ua.includes('opera')) browser = 'Opera';

        // Detectează sistemul de operare
        let sistemeOperare = 'unknown';
        if (ua.includes('windows')) sistemeOperare = 'Windows';
        else if (ua.includes('mac')) sistemeOperare = 'macOS';
        else if (ua.includes('linux')) sistemeOperare = 'Linux';
        else if (ua.includes('android')) sistemeOperare = 'Android';
        else if (ua.includes('ios')) sistemeOperare = 'iOS';

        // Detectează tipul de dispozitiv
        let dispozitiv = 'desktop';
        if (ua.includes('mobile')) dispozitiv = 'mobile';
        else if (ua.includes('tablet') || ua.includes('ipad')) dispozitiv = 'tablet';

        return { browser, sistemeOperare, dispozitiv };
    }

    /**
     * Creează o nouă sesiune (login)
     */
    async createSesiune(data: CreateJurnalSesiuniDto, req?: any): Promise<string> {
        try {
            const sesiuneId = crypto.randomUUID();
            const now = new Date();
            
            // Generează hash pentru blockchain
            const hashData = {
                idUtilizator: data.idUtilizator,
                numeUtilizator: data.numeUtilizator,
                emailUtilizator: data.emailUtilizator,
                dataOraLogin: now,
                tipActiune: 'login'
            };
            const hashLogin = this.generateBlockchainHash(hashData);
            
            // Obține informații tehnice din request
            const adresaIP = req ? this.getClientIP(req) : data.adresaIP;
            const userAgent = req?.headers['user-agent'] || data.userAgent || '';
            const deviceInfo = userAgent ? this.parseUserAgent(userAgent) : {
                browser: data.browser || 'unknown',
                sistemeOperare: data.sistemeOperare || 'unknown',
                dispozitiv: data.dispozitiv || 'unknown'
            };

            const query = `
                INSERT INTO JurnalSesiuni (
                    IdSesiune, IdUtilizator, NumeUtilizator, EmailUtilizator, RolUtilizator, TipUtilizator,
                    DataOraLogin, StatusSesiune, AdresaIP, UserAgent, Browser, SistemeOperare, Dispozitiv,
                    HashLogin, BlockchainStatus, TokenSesiune, UltimaActivitate, NumarActiuni, Observatii,
                    CreatLa, ModificatLa
                ) VALUES (
                    ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?,
                    ?, ?
                )
            `;

            const db = await getDatabase();
            await db.run(query,
                sesiuneId, data.idUtilizator, data.numeUtilizator, data.emailUtilizator, data.rolUtilizator, data.tipUtilizator || 'utilizator',
                now.toISOString(), 'activa', adresaIP, userAgent, deviceInfo.browser, deviceInfo.sistemeOperare, deviceInfo.dispozitiv,
                hashLogin, 'pending', data.tokenSesiune, now.toISOString(), 0, data.observatii,
                now.toISOString(), now.toISOString()
            );

            console.log(`✅ Sesiune creată pentru utilizatorul ${data.numeUtilizator} (${sesiuneId})`);
            console.log(`🔗 Hash blockchain login: ${hashLogin}`);
            
            return sesiuneId;
        } catch (error) {
            console.error('Eroare la crearea sesiunii:', error);
            throw new Error(`Eroare la crearea sesiunii: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`);
        }
    }

    /**
     * Actualizează sesiunea (logout sau actualizare activitate)
     */
    async updateSesiune(idSesiune: string, data: UpdateJurnalSesiuniDto): Promise<void> {
        try {
            const updates: string[] = [];
            const values: any[] = [];
            const db = await getDatabase();

            if (data.dataOraLogout) {
                updates.push('DataOraLogout = ?');
                values.push(data.dataOraLogout.toISOString());
                
                // Calculează durata sesiunii
                if (data.durataSesiune === undefined) {
                    // Obține data login pentru a calcula durata
                    const loginQuery = 'SELECT DataOraLogin FROM JurnalSesiuni WHERE IdSesiune = ?';
                    const loginResult = await db.get(loginQuery, idSesiune);
                    
                    if (loginResult) {
                        const loginTime = new Date(loginResult.DataOraLogin);
                        const logoutTime = data.dataOraLogout;
                        const durataSec = Math.round((logoutTime.getTime() - loginTime.getTime()) / 1000);
                        updates.push('DurataSesiune = ?');
                        values.push(durataSec);
                    }
                }
                
                // Generează hash pentru logout
                const hashData = {
                    idSesiune: idSesiune,
                    dataOraLogout: data.dataOraLogout,
                    tipActiune: 'logout'
                };
                const hashLogout = this.generateBlockchainHash(hashData);
                updates.push('HashLogout = ?');
                values.push(hashLogout);
                
                console.log(`🔗 Hash blockchain logout: ${hashLogout}`);
            }

            if (data.durataSesiune !== undefined) {
                updates.push('DurataSesiune = ?');
                values.push(data.durataSesiune);
            }

            if (data.statusSesiune) {
                updates.push('StatusSesiune = ?');
                values.push(data.statusSesiune);
            }

            if (data.ultimaActivitate) {
                updates.push('UltimaActivitate = ?');
                values.push(data.ultimaActivitate.toISOString());
            }

            if (data.numarActiuni !== undefined) {
                updates.push('NumarActiuni = ?');
                values.push(data.numarActiuni);
            }

            if (data.blockchainStatus) {
                updates.push('BlockchainStatus = ?');
                values.push(data.blockchainStatus);
            }

            if (data.observatii) {
                updates.push('Observatii = ?');
                values.push(data.observatii);
            }

            if (updates.length > 0) {
                // Adaugă întotdeauna ModificatLa la update
                updates.push('ModificatLa = ?');
                values.push(new Date().toISOString());
                values.push(idSesiune); // Pentru clauza WHERE
                
                const query = `UPDATE JurnalSesiuni SET ${updates.join(', ')} WHERE IdSesiune = ?`;
                await db.run(query, ...values);
                console.log(`✅ Sesiune actualizată: ${idSesiune}`);
            }
        } catch (error) {
            console.error('Eroare la actualizarea sesiunii:', error);
            throw new Error(`Eroare la actualizarea sesiunii: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`);
        }
    }

    /**
     * Incrementează numărul de acțiuni pentru sesiune
     */
    async incrementActiuni(idSesiune: string): Promise<void> {
        try {
            const db = await getDatabase();
            const query = `
                UPDATE JurnalSesiuni 
                SET NumarActiuni = NumarActiuni + 1, UltimaActivitate = datetime('now') 
                WHERE IdSesiune = ?
            `;
            await db.run(query, idSesiune);
        } catch (error) {
            console.error('Eroare la incrementarea acțiunilor:', error);
            // Nu aruncăm eroare pentru că este o operație secundară
        }
    }

    /**
     * Obține sesiunea curentă pentru un utilizator
     */
    async getSesiuneActiva(idUtilizator: string): Promise<JurnalSesiuni | null> {
        try {
            const db = await getDatabase();
            const result = await db.get(`
                SELECT * FROM JurnalSesiuni 
                WHERE IdUtilizator = ? AND StatusSesiune = 'activa' 
                ORDER BY DataOraLogin DESC
                LIMIT 1
            `, [idUtilizator]);
                
            return result ? this.mapToJurnalSesiuni(result) : null;
        } catch (error) {
            console.error('Eroare la obținerea sesiunii active:', error);
            throw new Error(`Eroare la obținerea sesiunii active: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`);
        }
    }

    /**
     * Obține o sesiune după ID
     */
    async getSesiuneById(idSesiune: string): Promise<JurnalSesiuni | null> {
        try {
            const db = await getDatabase();
            const query = `
                SELECT * FROM JurnalSesiuni 
                WHERE IdSesiune = ?
            `;
            
            const row = await db.get(query, idSesiune);
            
            if (!row) {
                return null;
            }
            
            const sesiune: JurnalSesiuni = {
                idSesiune: row.IdSesiune,
                idUtilizator: row.IdUtilizator,
                numeUtilizator: row.NumeUtilizator,
                emailUtilizator: row.EmailUtilizator,
                rolUtilizator: row.RolUtilizator,
                tipUtilizator: row.TipUtilizator,
                dataOraLogin: row.DataOraLogin,
                dataOraLogout: row.DataOraLogout,
                statusSesiune: row.StatusSesiune,
                adresaIP: row.AdresaIP,
                userAgent: row.UserAgent,
                browser: row.Browser,
                sistemeOperare: row.SistemeOperare,
                dispozitiv: row.Dispozitiv,
                hashLogin: row.HashLogin,
                hashLogout: row.HashLogout,
                blockchainStatus: row.BlockchainStatus,
                transactionIdLogin: row.TransactionIdLogin,
                transactionIdLogout: row.TransactionIdLogout,
                tokenSesiune: row.TokenSesiune,
                ultimaActivitate: row.UltimaActivitate,
                numarActiuni: row.NumarActiuni,
                observatii: row.Observatii,
                creatLa: row.CreatLa,
                modificatLa: row.ModificatLa
            };
            
            return sesiune;
            
        } catch (error) {
            console.error('Eroare la obținerea sesiunii:', error);
            throw new Error(`Eroare la obținerea sesiunii: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`);
        }
    }

    /**
     * Obține lista sesiunilor cu filtrare
     */
    async getSesiuni(filter: JurnalSesiuniFilterDto = {}): Promise<{ sesiuni: JurnalSesiuni[]; total: number }> {
        try {
            const conditions: string[] = [];
            const values: any[] = [];
            const db = await getDatabase();
            
            if (filter.idUtilizator) {
                conditions.push('IdUtilizator = ?');
                values.push(filter.idUtilizator);
            }
            
            if (filter.numeUtilizator) {
                conditions.push('NumeUtilizator LIKE ?');
                values.push(`%${filter.numeUtilizator}%`);
            }
            
            if (filter.tipUtilizator) {
                conditions.push('TipUtilizator = ?');
                values.push(filter.tipUtilizator);
            }
            
            if (filter.statusSesiune) {
                conditions.push('StatusSesiune = ?');
                values.push(filter.statusSesiune);
            }
            
            if (filter.dataInceput) {
                conditions.push('DataOraLogin >= ?');
                values.push(filter.dataInceput.toISOString());
            }
            
            if (filter.dataSfarsit) {
                conditions.push('DataOraLogin <= ?');
                values.push(filter.dataSfarsit.toISOString());
            }
            
            if (filter.adresaIP) {
                conditions.push('AdresaIP = ?');
                values.push(filter.adresaIP);
            }
            
            if (filter.dispozitiv) {
                conditions.push('Dispozitiv = ?');
                values.push(filter.dispozitiv);
            }
            
            if (filter.blockchainStatus) {
                conditions.push('BlockchainStatus = ?');
                values.push(filter.blockchainStatus);
            }

            const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
            const sortBy = filter.sortBy || 'DataOraLogin';
            const sortOrder = filter.sortOrder || 'DESC';
            const page = filter.page || 1;
            const limit = filter.limit || 50;
            const offset = (page - 1) * limit;

            // Query pentru total
            const countQuery = `SELECT COUNT(*) as total FROM JurnalSesiuni ${whereClause}`;
            const countResult = await db.get(countQuery, ...values);
            const total = countResult.total;

            // Query pentru date
            const dataQuery = `
                SELECT * FROM JurnalSesiuni ${whereClause}
                ORDER BY ${sortBy} ${sortOrder}
                LIMIT ? OFFSET ?
            `;
            const dataResult = await db.all(dataQuery, ...values, limit, offset);

            const sesiuni = dataResult.map(record => this.mapToJurnalSesiuni(record));
            
            return { sesiuni, total };
        } catch (error) {
            console.error('Eroare la obținerea sesiunilor:', error);
            throw new Error(`Eroare la obținerea sesiunilor: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`);
        }
    }

    /**
     * Obține statistici despre sesiuni
     */
    async getStatistici(): Promise<SesiuniStatsDto> {
        try {
            const db = await getDatabase();
            const query = `
                SELECT 
                    COUNT(*) as totalSesiuni,
                    SUM(CASE WHEN StatusSesiune = 'activa' THEN 1 ELSE 0 END) as sesiuniActive,
                    SUM(CASE WHEN StatusSesiune = 'inchisa' THEN 1 ELSE 0 END) as sesiuniInchise,
                    SUM(CASE WHEN StatusSesiune = 'expirata' THEN 1 ELSE 0 END) as sesiuniExpirate,
                    AVG(COALESCE(DurataSesiune, 0)) as durataMediaSesiune,
                    COUNT(DISTINCT CASE WHEN StatusSesiune = 'activa' AND TipUtilizator = 'utilizator' THEN IdUtilizator END) as utilizatoriActivi,
                    COUNT(DISTINCT CASE WHEN StatusSesiune = 'activa' AND TipUtilizator = 'contabil' THEN IdUtilizator END) as contabiliActivi,
                    MAX(UltimaActivitate) as ultimaActivitate
                FROM JurnalSesiuni
            `;
            
            const stats = await db.get(query);
            
            return {
                totalSesiuni: stats.totalSesiuni || 0,
                sesiuniActive: stats.sesiuniActive || 0,
                sesiuniInchise: stats.sesiuniInchise || 0,
                sesiuniExpirate: stats.sesiuniExpirate || 0,
                durataMediaSesiune: Math.round(stats.durataMediaSesiune || 0),
                utilizatoriActivi: stats.utilizatoriActivi || 0,
                contabiliActivi: stats.contabiliActivi || 0,
                ultimaActivitate: stats.ultimaActivitate ? new Date(stats.ultimaActivitate) : undefined
            };
        } catch (error) {
            console.error('Eroare la obținerea statisticilor:', error);
            throw new Error(`Eroare la obținerea statisticilor: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`);
        }
    }

    /**
     * Închide sesiunile expirate (rulează periodic)
     */
    async closeExpiredSessions(timeoutMinutes: number = 30): Promise<number> {
        try {
            const db = await getDatabase();
            const timeoutDate = new Date();
            timeoutDate.setMinutes(timeoutDate.getMinutes() - timeoutMinutes);
            
            const query = `
                UPDATE JurnalSesiuni 
                SET StatusSesiune = 'expirata', DataOraLogout = datetime('now')
                WHERE StatusSesiune = 'activa' 
                AND UltimaActivitate < ?
            `;
            
            const result = await db.run(query, timeoutDate.toISOString());
                
            const affectedRows = result.changes || 0;
            if (affectedRows > 0) {
                console.log(`🕒 ${affectedRows} sesiuni expirate închise`);
            }
            
            return affectedRows;
        } catch (error) {
            console.error('Eroare la închiderea sesiunilor expirate:', error);
            return 0;
        }
    }    /**
     * Mapează rezultatul SQL la modelul JurnalSesiuni
     */
    private mapToJurnalSesiuni(record: any): JurnalSesiuni {
        // Funcție pentru formatarea datelor SQL în formatul cerut de model (string)
        const formatSQLDate = (date: Date | string | null): string | null => {
            if (!date) return null;
            const d = new Date(date);
            return d.toISOString().slice(0, 19).replace('T', ' ');
        };

        return {
            idSesiune: record.IdSesiune,
            idUtilizator: record.IdUtilizator,
            numeUtilizator: record.NumeUtilizator,
            emailUtilizator: record.EmailUtilizator,
            rolUtilizator: record.RolUtilizator,
            tipUtilizator: record.TipUtilizator,
            dataOraLogin: formatSQLDate(record.DataOraLogin) as string,
            dataOraLogout: record.DataOraLogout ? formatSQLDate(record.DataOraLogout) : null,
            durataSesiune: record.DurataSesiune,
            statusSesiune: record.StatusSesiune,
            adresaIP: record.AdresaIP,
            userAgent: record.UserAgent,
            browser: record.Browser,
            sistemeOperare: record.SistemeOperare,
            dispozitiv: record.Dispozitiv,
            hashLogin: record.HashLogin,
            hashLogout: record.HashLogout,
            transactionIdLogin: record.TransactionIdLogin,
            transactionIdLogout: record.TransactionIdLogout,
            blockchainStatus: record.BlockchainStatus,
            tokenSesiune: record.TokenSesiune,
            ultimaActivitate: record.UltimaActivitate ? formatSQLDate(record.UltimaActivitate) : null,
            numarActiuni: record.NumarActiuni,
            observatii: record.Observatii,
            creatLa: formatSQLDate(record.CreatLa) as string,
            modificatLa: formatSQLDate(record.ModificatLa) as string
        };
    }
}

export default new JurnalSesiuniService();
