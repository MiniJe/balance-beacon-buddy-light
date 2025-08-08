import { getDatabase } from '../config/sqlite';
import { randomUUID } from 'crypto';
import { getUTCTimestamp, getBlockchainTimestamp, generateSessionHash, calculateDurationMinutes, formatLocalTime, getRomaniaLocalTime, getUnixTimestamp, generateMultiversXHash } from '../utils/timezone.utils';

interface CreateSessionData {
    IdUtilizator: string;
    NumeUtilizator: string;
    EmailUtilizator: string;
    RolUtilizator: string;
    TipUtilizator: 'contabil' | 'utilizator' | 'admin' | 'MASTER' | 'CONTABIL';
    AdresaIP?: string;
    UserAgent?: string;
    Browser?: string;
    SistemeOperare?: string;
    Dispozitiv?: string;
    TokenSesiune: string;
}

interface SessionUpdate {
    UltimaActivitate?: Date;
    NumarActiuni?: number;
    Observatii?: string;
}

export class SessionService {
      /**
     * Înregistrează o nouă sesiune de login
     */    async startSession(sessionData: CreateSessionData): Promise<string> {
        try {
            const db = await getDatabase();
            const sessionId = randomUUID();
            
            // Pentru afișare: ora locală din România
            const romaniaLocalTime = getRomaniaLocalTime();
            
            // Pentru blockchain: Unix timestamp UTC
            const unixTimestamp = getUnixTimestamp();
            const blockchainTimestamp = getBlockchainTimestamp();
            
            console.log(`📅 Înregistrare sesiune: ${sessionData.NumeUtilizator} (${sessionData.TipUtilizator})`);
            console.log(`🇷🇴 Ora locală România: ${formatLocalTime(romaniaLocalTime)}`);
            console.log(`🌍 UTC pentru blockchain: ${blockchainTimestamp}`);
            console.log(`🔢 Unix timestamp: ${unixTimestamp}`);
            
            // Hash-uri pentru blockchain cu Unix timestamp
            const loginHash = generateMultiversXHash(sessionData.IdUtilizator, unixTimestamp, 'login');
            
            // Simplifcam pentru SQLite - nu avem toate coloanele din SQL Server
            await db.run(`
                INSERT INTO JurnalSesiuni (
                    IdSesiune, IdUtilizator, NumeUtilizator, EmailUtilizator, 
                    RolUtilizator, TipUtilizator, DataOraLogin, StatusSesiune,
                    AdresaIP, UserAgent, Dispozitiv, HashLogin,
                    UltimaActivitate, NumarActiuni, DataCreare, ModificatLa
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                sessionId,
                sessionData.IdUtilizator,
                sessionData.NumeUtilizator,
                sessionData.EmailUtilizator,
                sessionData.RolUtilizator,
                sessionData.TipUtilizator,
                romaniaLocalTime.toISOString(),
                'activa',
                sessionData.AdresaIP || null,
                sessionData.UserAgent || null,
                sessionData.Dispozitiv || null,
                loginHash,
                romaniaLocalTime.toISOString(),
                1,
                romaniaLocalTime.toISOString(),
                romaniaLocalTime.toISOString()
            ]);

            console.log(`✅ Session created for ${sessionData.NumeUtilizator} - ID: ${sessionId}`);
            return sessionId;

        } catch (error) {
            console.error('❌ Error creating session:', error);
            throw error;
        }
    }

    /**
     * Închide o sesiune și calculează durata
     */
    async endSession(sessionId: string, observatii?: string): Promise<void> {
        try {
            const db = await getDatabase();
            
            // Obține informațiile sesiunii curente
            const session = await db.get(
                'SELECT * FROM JurnalSesiuni WHERE IdSesiune = ?', 
                [sessionId]
            );

            if (!session) {
                throw new Error('Sesiunea nu a fost găsită');
            }
            
            // Pentru afișare: ora locală din România
            const romaniaLocalTime = getRomaniaLocalTime();
            
            // Pentru blockchain: Unix timestamp UTC  
            const unixTimestamp = getUnixTimestamp();
            const blockchainTimestamp = getBlockchainTimestamp();
            const logoutHash = generateMultiversXHash(session.IdUtilizator, unixTimestamp, 'logout');
            
            // Calculăm durata în minute
            const durataSesiune = calculateDurationMinutes(new Date(session.DataOraLogin), romaniaLocalTime);
            
            console.log(`📅 Logout sesiune: ${session.NumeUtilizator}`);
            console.log(`🇷🇴 Ora logout România: ${formatLocalTime(romaniaLocalTime)}`);
            console.log(`🌍 UTC pentru blockchain: ${blockchainTimestamp}`);
            console.log(`🔢 Unix timestamp: ${unixTimestamp}`);
            console.log(`⏱️ Durata sesiune: ${durataSesiune} minute`);
            
            // Actualizăm sesiunea cu valorile corecte
            await db.run(`
                UPDATE JurnalSesiuni 
                SET DataOraLogout = ?,
                    DurataSesiune = ?,
                    StatusSesiune = 'inchisa',
                    HashLogout = ?,
                    Observatii = ?,
                    ModificatLa = ?
                WHERE IdSesiune = ?
            `, [
                romaniaLocalTime.toISOString(),
                durataSesiune,
                logoutHash,
                observatii || null,
                romaniaLocalTime.toISOString(),
                sessionId
            ]);

            console.log(`✅ Session ended for ${session.NumeUtilizator} - ID: ${sessionId}`);

        } catch (error) {
            console.error('❌ Error ending session:', error);
            throw error;
        }
    }

    /**
     * Actualizează activitatea unei sesiuni
     */    
    async updateSessionActivity(sessionId: string, updates: SessionUpdate): Promise<void> {
        try {
            const db = await getDatabase();
            
            let setClause = ['ModificatLa = CURRENT_TIMESTAMP'];
            let params: any[] = [];
            
            if (updates.NumarActiuni !== undefined) {
                setClause.push('NumarActiuni = ?');
                params.push(updates.NumarActiuni);
            }

            if (updates.Observatii) {
                setClause.push('Observatii = ?');
                params.push(updates.Observatii);
            }

            // Utilizăm CURRENT_TIMESTAMP pentru ultima activitate în SQLite
            setClause.push('UltimaActivitate = CURRENT_TIMESTAMP');
            
            // Adăugăm sessionId la sfârșitul parametrilor pentru clauza WHERE
            params.push(sessionId);

            await db.run(`
                UPDATE JurnalSesiuni 
                SET ${setClause.join(', ')}
                WHERE IdSesiune = ?
            `, params);

        } catch (error) {
            console.error('❌ Error updating session activity:', error);
            throw error;
        }
    }

    /**
     * Obține sesiunea activă pentru un utilizator
     */
    async getActiveSession(userId: string): Promise<any | null> {
        try {
            const db = await getDatabase();
            
            const result = await db.get(`
                SELECT * FROM JurnalSesiuni
                WHERE IdUtilizator = ?
                AND StatusSesiune = 'activa'
                ORDER BY DataOraLogin DESC
                LIMIT 1
            `, [userId]);

            return result || null;

        } catch (error) {
            console.error('❌ Error getting active session:', error);
            throw error;
        }
    }

    /**
     * Închide toate sesiunile active pentru un utilizator
     */
    async closeAllActiveSessions(userId: string, reason: string = 'Închidere automată'): Promise<void> {
        try {
            const db = await getDatabase();
            
            const activeSessions = await db.all(`
                SELECT IdSesiune FROM JurnalSesiuni 
                WHERE IdUtilizator = ? 
                AND StatusSesiune = 'activa'
            `, [userId]);

            for (const session of activeSessions) {
                await this.endSession(session.IdSesiune, reason);
            }

        } catch (error) {
            console.error('❌ Error closing all active sessions:', error);
            throw error;
        }
    }

    /**
     * Obține statistici sesiuni pentru un utilizator
     */
    async getUserSessionStats(userId: string, days: number = 30): Promise<any> {
        try {
            const db = await getDatabase();
            const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
            
            const result = await db.get(`
                SELECT 
                    COUNT(*) as TotalSessions,
                    AVG(CAST(DurataSesiune as REAL)) as AvgDuration,
                    MAX(DurataSesiune) as MaxDuration,
                    MIN(DurataSesiune) as MinDuration,
                    SUM(NumarActiuni) as TotalActions
                FROM JurnalSesiuni 
                WHERE IdUtilizator = ? 
                AND DataOraLogin >= ?
                AND StatusSesiune = 'inchisa'
            `, [userId, startDate]);

            return result || {
                TotalSessions: 0,
                AvgDuration: 0,
                MaxDuration: 0,
                MinDuration: 0,
                TotalActions: 0
            };

        } catch (error) {
            console.error('❌ Error getting session stats:', error);
            throw error;
        }
    }
}

export const sessionService = new SessionService();
