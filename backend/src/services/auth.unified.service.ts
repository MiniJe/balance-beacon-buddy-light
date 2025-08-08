import { getDatabase } from '../config/sqlite';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { sessionService } from './session.service';

/**
 * Serviciu unificat de autentificare pentru toți utilizatorii
 * RESCRIS COMPLET pentru debugging și funcționalitate îmbunătățită
 */
class AuthUnifiedService {

    /**
     * Autentifică un utilizator (MASTER sau CONTABIL)
     * @param loginData Date de autentificare (email și parolă)
     * @param ipAddress Adresa IP a clientului
     * @param userAgent User agent-ul clientului
     * @returns Datele utilizatorului, token-ul JWT și ID-ul sesiunii
     */
    async login(loginData: any, ipAddress: string, userAgent: string): Promise<any> {
        const startTime = Date.now();
        console.log('\n� === ÎNCEPE PROCESUL DE AUTENTIFICARE ===');
        console.log('�🔐 LOGIN: Serviciu autentificare apelat cu:', { 
            loginData: { ...loginData, password: '***' }, 
            ipAddress, 
            userAgent: userAgent?.substring(0, 50) + '...'
        });
        
        // Extrage email și parolă din request
        const email = loginData.username || loginData.email || loginData.EmailUtilizator || loginData.EmailContabil;
        const password = loginData.password || loginData.Parola;

        console.log('🔐 LOGIN: Date procesate:');
        console.log('  📧 Email:', email);
        console.log('  🔑 Password length:', password?.length);

        // Validare input
        if (!email || !password) {
            console.log('❌ LOGIN: Email și parola sunt obligatorii');
            throw new Error('Email și parola sunt obligatorii');
        }

        if (typeof email !== 'string' || typeof password !== 'string') {
            console.log('❌ LOGIN: Email și parola trebuie să fie string-uri');
            throw new Error('Format invalid pentru email sau parolă');
        }

        let db: any = null;

        try {
            console.log('📂 LOGIN: Conectare la baza de date SQLite...');
            db = await getDatabase();
            console.log('✅ LOGIN: Conectat la baza de date SQLite cu succes');
            
            // PASUL 1: Verifică în ce tabel există emailul
            console.log('\n🔍 PASUL 1: Verificare existență email în tabele...');
            
            const userEmailCheck = await db.get(
                'SELECT COUNT(*) as count FROM Utilizatori WHERE LOWER(EmailUtilizator) = LOWER(?)', 
                [email]
            );
            console.log('👥 Utilizatori - count:', userEmailCheck?.count || 0);
            
            const contabilEmailCheck = await db.get(
                'SELECT COUNT(*) as count FROM Contabili WHERE LOWER(EmailContabil) = LOWER(?)', 
                [email]
            );
            console.log('👤 Contabili - count:', contabilEmailCheck?.count || 0);
            
            const existsInUtilizatori = (userEmailCheck?.count || 0) > 0;
            const existsInContabili = (contabilEmailCheck?.count || 0) > 0;
            
            console.log('📊 Rezultat verificare:');
            console.log('  existsInUtilizatori:', existsInUtilizatori);
            console.log('  existsInContabili:', existsInContabili);

            // Atenție dacă emailul există în ambele tabele
            if (existsInUtilizatori && existsInContabili) {
                console.warn(`⚠️ ATENȚIE: Email-ul ${email} există în ambele tabele!`);
                // În acest caz, prioritate MASTER (Utilizatori)
            }

            // PASUL 2: Încearcă autentificarea în funcție de tabel
            if (existsInUtilizatori) {
                console.log('\n🔑 PASUL 2A: Autentificare ca MASTER (Utilizatori)...');
                return await this.loginMaster(db, email, password, ipAddress, userAgent);
            } 
            else if (existsInContabili) {
                console.log('\n🔑 PASUL 2B: Autentificare ca CONTABIL...');
                return await this.loginContabil(db, email, password, ipAddress, userAgent);
            } 
            else {
                console.log('❌ LOGIN: Email-ul nu există în niciun tabel');
                throw new Error('Credențiale invalide');
            }

        } catch (error) {
            console.error('\n💥 EROARE LA AUTENTIFICARE:');
            console.error('  Message:', error instanceof Error ? error.message : 'Eroare necunoscută');
            console.error('  Stack:', error instanceof Error ? error.stack : 'N/A');
            console.error('  Time elapsed:', `${Date.now() - startTime}ms`);
            throw error;
        } finally {
            console.log(`\n⏱️ Total timp autentificare: ${Date.now() - startTime}ms`);
            console.log('🏁 === SFÂRȘITUL PROCESULUI DE AUTENTIFICARE ===\n');
        }
    }

    /**
     * Autentificare specifică pentru utilizatori MASTER
     */
    private async loginMaster(db: any, email: string, password: string, ipAddress: string, userAgent: string) {
        console.log('👥 MASTER LOGIN: Căutare utilizator activ...');
        
        const utilizator = await db.get(
            'SELECT * FROM Utilizatori WHERE LOWER(EmailUtilizator) = LOWER(?) AND UtilizatorActiv = 1',
            [email]
        );

        console.log('👥 MASTER LOGIN: Rezultat căutare:', utilizator ? 'GĂSIT' : 'NU GĂSIT');
        
        if (!utilizator) {
            console.log('❌ MASTER LOGIN: Utilizator negăsit sau inactiv');
            throw new Error('Credențiale invalide');
        }

        console.log('👥 MASTER LOGIN: Detalii utilizator găsit:');
        console.log('  ID:', utilizator.IdUtilizatori);
        console.log('  Nume:', utilizator.NumeUtilizator);
        console.log('  Email:', utilizator.EmailUtilizator);
        console.log('  Rol:', utilizator.RolUtilizator);
        console.log('  Activ:', utilizator.UtilizatorActiv);
        console.log('  ParolaHash length:', utilizator.ParolaHash?.length);

        // Verifică parola
        console.log('🔐 MASTER LOGIN: Verificare parolă...');
        console.log('  Password input length:', password.length);
        console.log('  Hash din DB length:', utilizator.ParolaHash?.length);
        console.log('  Hash din DB start:', utilizator.ParolaHash?.substring(0, 10));
        
        const validPassword = await bcrypt.compare(password, utilizator.ParolaHash);
        console.log('🔐 MASTER LOGIN: Rezultat verificare parolă:', validPassword ? '✅ VALIDĂ' : '❌ INVALIDĂ');

        if (!validPassword) {
            console.log('❌ MASTER LOGIN: Parolă invalidă');
            throw new Error('Credențiale invalide');
        }

        // Generează token JWT
        console.log('🎫 MASTER LOGIN: Generare token JWT...');
        const tokenPayload = {
            IdUtilizatori: utilizator.IdUtilizatori,
            NumeUtilizator: utilizator.NumeUtilizator,
            EmailUtilizator: utilizator.EmailUtilizator,
            RolUtilizator: utilizator.RolUtilizator,
            TipUtilizator: 'MASTER'
        };
        
        const token = jwt.sign(
            tokenPayload,
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );
        console.log('🎫 MASTER LOGIN: Token generat cu succes');

        // Actualizează data ultimei logări
        console.log('📅 MASTER LOGIN: Actualizare dată ultimă logare...');
        await db.run(
            'UPDATE Utilizatori SET DataModificareUtilizator = datetime("now") WHERE IdUtilizatori = ?',
            [utilizator.IdUtilizatori]
        );
        console.log('📅 MASTER LOGIN: Dată actualizată cu succes');

        // Creează sesiune (cu try-catch pentru a nu bloca autentificarea)
        let sessionId: string | null = null;
        try {
            console.log('📱 MASTER LOGIN: Creare sesiune...');
            sessionId = await sessionService.startSession({
                IdUtilizator: utilizator.IdUtilizatori,
                NumeUtilizator: utilizator.NumeUtilizator,
                EmailUtilizator: utilizator.EmailUtilizator,
                RolUtilizator: utilizator.RolUtilizator,
                TipUtilizator: 'MASTER',
                AdresaIP: ipAddress,
                UserAgent: userAgent,
                Browser: this.extractBrowser(userAgent),
                SistemeOperare: this.extractOS(userAgent),
                Dispozitiv: this.extractDevice(userAgent),
                TokenSesiune: token
            });
            console.log('📱 MASTER LOGIN: Sesiune creată cu ID:', sessionId);
        } catch (sessionError) {
            console.warn('⚠️ MASTER LOGIN: Eroare la crearea sesiunii (se continuă):', sessionError);
        }

        // Construiește răspunsul
        const userResponse = {
            IdUtilizatori: utilizator.IdUtilizatori,
            NumeUtilizator: utilizator.NumeUtilizator,
            EmailUtilizator: utilizator.EmailUtilizator,
            RolUtilizator: utilizator.RolUtilizator,
            TipUtilizator: 'MASTER'
        };

        console.log('✅ MASTER LOGIN: Autentificare reușită!');
        return {
            user: userResponse,
            token,
            sessionId
        };
    }

    /**
     * Autentificare specifică pentru CONTABILI
     */
    private async loginContabil(db: any, email: string, password: string, ipAddress: string, userAgent: string) {
        console.log('👤 CONTABIL LOGIN: Căutare contabil activ...');
        
        const contabil = await db.get(
            'SELECT * FROM Contabili WHERE LOWER(EmailContabil) = LOWER(?) AND StatusContabil = ?',
            [email, 'Activ']
        );

        console.log('👤 CONTABIL LOGIN: Rezultat căutare:', contabil ? 'GĂSIT' : 'NU GĂSIT');

        if (!contabil) {
            console.log('❌ CONTABIL LOGIN: Contabil negăsit sau inactiv');
            throw new Error('Credențiale invalide');
        }

        console.log('👤 CONTABIL LOGIN: Detalii contabil găsit:');
        console.log('  ID:', contabil.IdContabil);
        console.log('  Nume:', contabil.NumeContabil, contabil.PrenumeContabil);
        console.log('  Email:', contabil.EmailContabil);
        console.log('  Rol:', contabil.RolContabil);
        console.log('  Status:', contabil.StatusContabil);
        console.log('  ParolaHashContabil length:', contabil.ParolaHashContabil?.length);

        // Verifică parola
        console.log('🔐 CONTABIL LOGIN: Verificare parolă...');
        console.log('  Password input length:', password.length);
        console.log('  Hash din DB length:', contabil.ParolaHashContabil?.length);
        console.log('  Hash din DB start:', contabil.ParolaHashContabil?.substring(0, 10));

        const validPassword = await bcrypt.compare(password, contabil.ParolaHashContabil);
        console.log('🔐 CONTABIL LOGIN: Rezultat verificare parolă:', validPassword ? '✅ VALIDĂ' : '❌ INVALIDĂ');

        if (!validPassword) {
            console.log('❌ CONTABIL LOGIN: Parolă invalidă');
            throw new Error('Credențiale invalide');
        }

        // Actualizează data ultimei logări
        console.log('📅 CONTABIL LOGIN: Actualizare dată ultimă logare...');
        await db.run(
            'UPDATE Contabili SET DataUltimeiLogări = datetime("now") WHERE IdContabil = ?',
            [contabil.IdContabil]
        );

        // Parsează permisiunile
        let permisiuni = {};
        try {
            if (contabil.PermisiuniAcces) {
                permisiuni = JSON.parse(contabil.PermisiuniAcces);
                console.log('👤 CONTABIL LOGIN: Permisiuni parsate cu succes');
            }
        } catch (parseError) {
            console.error('⚠️ CONTABIL LOGIN: Eroare la parsarea permisiunilor:', parseError);
        }

        // Generează token JWT
        console.log('🎫 CONTABIL LOGIN: Generare token JWT...');
        const tokenPayload = {
            IdContabil: contabil.IdContabil,
            id: contabil.IdContabil,
            email: contabil.EmailContabil,
            EmailContabil: contabil.EmailContabil,
            NumeContabil: contabil.NumeContabil,
            PrenumeContabil: contabil.PrenumeContabil,
            role: contabil.RolContabil,
            RolContabil: contabil.RolContabil,
            TipUtilizator: 'CONTABIL',
            userType: 'contabil'
        };

        const token = jwt.sign(
            tokenPayload,
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );
        console.log('🎫 CONTABIL LOGIN: Token generat cu succes');

        // Creează sesiune (cu try-catch pentru a nu bloca autentificarea)
        let sessionId: string | null = null;
        try {
            console.log('📱 CONTABIL LOGIN: Creare sesiune...');
            sessionId = await sessionService.startSession({
                IdUtilizator: contabil.IdContabil,
                NumeUtilizator: `${contabil.NumeContabil} ${contabil.PrenumeContabil}`,
                EmailUtilizator: contabil.EmailContabil,
                RolUtilizator: contabil.RolContabil,
                TipUtilizator: 'CONTABIL',
                AdresaIP: ipAddress,
                UserAgent: userAgent,
                Browser: this.extractBrowser(userAgent),
                SistemeOperare: this.extractOS(userAgent),
                Dispozitiv: this.extractDevice(userAgent),
                TokenSesiune: token
            });
            console.log('📱 CONTABIL LOGIN: Sesiune creată cu ID:', sessionId);
        } catch (sessionError) {
            console.warn('⚠️ CONTABIL LOGIN: Eroare la crearea sesiunii (se continuă):', sessionError);
        }

        // Construiește răspunsul
        const userResponse = {
            IdContabil: contabil.IdContabil.toString(),
            NumeContabil: contabil.NumeContabil,
            PrenumeContabil: contabil.PrenumeContabil,
            EmailContabil: contabil.EmailContabil,
            RolContabil: contabil.RolContabil,
            StatusContabil: contabil.StatusContabil,
            SchimbareParolaLaLogare: contabil.SchimbareParolaLaLogare,
            PermisiuniAcces: permisiuni,
            TipUtilizator: 'CONTABIL'
        };

        console.log('✅ CONTABIL LOGIN: Autentificare reușită!');
        return { 
            user: userResponse, 
            token, 
            sessionId 
        };
    }

    /**
     * Obține un utilizator după ID
     */
    async getUser(userId: string): Promise<any> {
        console.log('👤 GET USER: Căutare utilizator cu ID:', userId);
        
        try {
            const db = await getDatabase();
            
            // Încercăm să obținem un utilizator MASTER
            console.log('👥 GET USER: Căutare în tabelul Utilizatori...');
            const utilizator = await db.get(
                'SELECT * FROM Utilizatori WHERE IdUtilizatori = ?',
                [userId]
            );

            if (utilizator) {
                console.log('✅ GET USER: Utilizator MASTER găsit:', utilizator.NumeUtilizator);
                return {
                    ...utilizator,
                    TipUtilizator: 'MASTER'
                };
            }

            // Dacă nu am găsit un utilizator MASTER, căutăm un CONTABIL
            console.log('👤 GET USER: Căutare în tabelul Contabili...');
            const contabil = await db.get(
                'SELECT * FROM Contabili WHERE IdContabil = ?',
                [userId]
            );

            if (contabil) {
                console.log('✅ GET USER: Contabil găsit:', contabil.NumeContabil, contabil.PrenumeContabil);
                return {
                    ...contabil,
                    TipUtilizator: 'CONTABIL'
                };
            }

            console.log('❌ GET USER: Utilizatorul nu a fost găsit');
            return null;
        } catch (error) {
            console.error('💥 GET USER: Eroare la obținerea utilizatorului:', error);
            throw error;
        }
    }

    // Funcții utilitare pentru a extrage informații din user agent (cu tipare corecte)
    private extractBrowser(userAgent: string): string | undefined {
        if (!userAgent) return undefined;
        
        // Implementează logica de extragere a browser-ului
        if (userAgent.includes('Chrome')) return 'Chrome';
        if (userAgent.includes('Firefox')) return 'Firefox';
        if (userAgent.includes('Safari')) return 'Safari';
        if (userAgent.includes('Edge')) return 'Edge';
        if (userAgent.includes('MSIE') || userAgent.includes('Trident/')) return 'Internet Explorer';
        
        return 'Other';
    }

    private extractOS(userAgent: string): string | undefined {
        if (!userAgent) return undefined;
        
        // Implementează logica de extragere a sistemului de operare
        if (userAgent.includes('Windows')) return 'Windows';
        if (userAgent.includes('Mac OS')) return 'macOS';
        if (userAgent.includes('Linux')) return 'Linux';
        if (userAgent.includes('Android')) return 'Android';
        if (userAgent.includes('iOS')) return 'iOS';
        
        return 'Other';
    }

    private extractDevice(userAgent: string): string | undefined {
        if (!userAgent) return undefined;
        
        // Implementează logica de extragere a dispozitivului
        if (userAgent.includes('Mobile')) return 'mobile';
        if (userAgent.includes('Tablet')) return 'tablet';
        
        return 'desktop';
    }
}

// Exportăm o instanță a serviciului
const authUnifiedService = new AuthUnifiedService();
export default authUnifiedService;
export { AuthUnifiedService };
