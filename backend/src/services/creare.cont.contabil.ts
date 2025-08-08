import { CreateContabilDto, ContabilResponse, PermisiuniContabil } from '../models/Contabil';
import { pool as azurePool } from '../config/azure';
import * as bcrypt from 'bcrypt';
import { emailService } from './email.service';

/**
 * Serviciu dedicat creării și gestionării conturilor de contabili
 * Separarea acestei funcționalități din serviciile de autentificare
 * permite o mai bună organizare a codului
 */
class CreareContabilService {
    /**
     * Verifică dacă un email de contabil există deja în baza de date
     */
    async checkEmailExists(EmailContabil: string): Promise<boolean> {
        try {
            const result = await azurePool.request()
                .input('EmailContabil', EmailContabil)
                .query('SELECT COUNT(*) as count FROM Contabili WHERE EmailContabil = @EmailContabil');
            
            return result.recordset[0].count > 0;
        } catch (error) {
            console.error('Eroare la verificarea email-ului:', error);
            throw error;
        }
    }

    /**
     * Generează o parolă aleatorie securizată
     */
    generatePassword(length = 10): string {
        const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+';
        let password = '';
        
        // Asigură-te că parola conține cel puțin o literă mare, o literă mică, o cifră și un caracter special
        password += charset.charAt(Math.floor(Math.random() * 26)); // O literă mare
        password += charset.charAt(26 + Math.floor(Math.random() * 26)); // O literă mică
        password += charset.charAt(52 + Math.floor(Math.random() * 10)); // O cifră
        password += charset.charAt(62 + Math.floor(Math.random() * 13)); // Un caracter special
        
        // Completează restul parolei
        for (let i = 4; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        
        // Amestecă caracterele
        return password.split('').sort(() => 0.5 - Math.random()).join('');
    }

    /**
     * Creează un contabil nou
     * Funcție separată de serviciul de autentificare pentru a respecta
     * principiul Single Responsibility
     */
    async createContabil(contabilData: CreateContabilDto): Promise<ContabilResponse> {
        const { NumeContabil, PrenumeContabil, EmailContabil, RolContabil, StatusContabil, PermisiuniAcces } = contabilData;

        try {
            // Verifică dacă email-ul există deja
            const emailExists = await this.checkEmailExists(EmailContabil);
            if (emailExists) {
                throw new Error('Email-ul este deja folosit de un alt contabil');
            }

            // Generează parolă temporară
            const password = this.generatePassword();
            const salt = await bcrypt.genSalt(10);
            const parolaHash = await bcrypt.hash(password, salt);

            const permisiuniJson = PermisiuniAcces ? JSON.stringify(PermisiuniAcces) : null;
            console.log(`Using status: ${StatusContabil}`);            
            const contabilResult = await azurePool.request()
                .input('NumeContabil', NumeContabil)
                .input('PrenumeContabil', PrenumeContabil)
                .input('EmailContabil', EmailContabil)
                .input('RolContabil', RolContabil)
                .input('StatusContabil', StatusContabil)
                .input('PermisiuniAcces', permisiuniJson)
                .input('DatăCreareContabil', new Date())
                .input('ContabilCreatDe', 'System')
                .input('ParolaHashContabil', parolaHash)
                .input('SchimbareParolaLaLogare', true)
                .query(`
                    INSERT INTO Contabili (
                        NumeContabil, PrenumeContabil, EmailContabil, RolContabil, StatusContabil,
                        PermisiuniAcces, DatăCreareContabil, ContabilCreatDe,
                        ParolaHashContabil, SchimbareParolaLaLogare
                    )
                    OUTPUT INSERTED.*
                    VALUES (
                        @NumeContabil, @PrenumeContabil, @EmailContabil, @RolContabil, @StatusContabil,
                        @PermisiuniAcces, @DatăCreareContabil, @ContabilCreatDe,
                        @ParolaHashContabil, @SchimbareParolaLaLogare
                    )
                `);
            
            const contabil = contabilResult.recordset[0];
            
            const permisiuni = PermisiuniAcces || {
                PoateModificaParteneri: false,
                PoateAdaugaParteneri: false,
                PoateVedeaRapoarte: false,
                PoateModificaSabloane: false,
                PoateCreaCereri: false,
                PoateAdaugaUtilizatori: false,
                PoateModificaSetari: false
            };
            
            // Trimite email cu datele de autentificare
            await emailService.sendEmail({
                to: EmailContabil,
                subject: 'Contul tău Balance Beacon Buddy a fost creat',
                html: `
                    <h1>Bine ai venit la Balance Beacon Buddy!</h1>
                    <p>Contul tău de contabil a fost creat cu succes. Email: ${EmailContabil}</p>
                    <p>Parolă: ${password}</p>
                    <p>La prima conectare va trebui să îți schimbi parola.</p>
                    <p>Acces aplicație: <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}">${process.env.FRONTEND_URL || 'http://localhost:3000'}</a></p>
                    <p>Mulțumim,<br>Echipa Balance Beacon Buddy</p>
                `
            });
            
            // Returnează utilizatorul creat (fără parolă)
            return {
                IdContabil: contabil.IdContabil.toString(),
                NumeContabil: contabil.NumeContabil,
                PrenumeContabil: contabil.PrenumeContabil,
                EmailContabil: contabil.EmailContabil,
                RolContabil: contabil.RolContabil,
                StatusContabil: contabil.StatusContabil,
                TelefonContabil: contabil.TelefonContabil,
                DepartmentContabil: contabil.DepartmentContabil,
                DataUltimeiLogări: contabil.DataUltimeiLogări,
                DatăCreareContabil: contabil.DatăCreareContabil,
                ContabilCreatDe: contabil.ContabilCreatDe,
                DataActualizării: contabil.DataActualizării,
                ActualizatDE: contabil.ActualizatDE,
                SchimbareParolaLaLogare: contabil.SchimbareParolaLaLogare,
                PermisiuniAcces: permisiuni
            };
        } catch (error) {
            console.error('Eroare la crearea contabilului:', error);
            throw error;
        }
    }

    /**
     * Resetează parola unui contabil și trimite noua parolă pe email
     */
    async resetPassword(idContabil: string): Promise<boolean> {
        try {
            // Verifică dacă contabilul există
            const contabilResult = await azurePool.request()
                .input('IdContabil', idContabil)
                .query('SELECT * FROM Contabili WHERE IdContabil = @IdContabil');
            
            const contabil = contabilResult.recordset[0];
            if (!contabil) {
                throw new Error('Contabilul nu a fost găsit');
            }
            
            // Generează parolă nouă
            const newPassword = this.generatePassword();
            const salt = await bcrypt.genSalt(10);
            const parolaHash = await bcrypt.hash(newPassword, salt);
            
            // Actualizează parola și setează flag-ul pentru schimbare la prima logare
            await azurePool.request()
                .input('IdContabil', idContabil)
                .input('ParolaHashContabil', parolaHash)
                .input('SchimbareParolaLaLogare', true)
                .query(`
                    UPDATE Contabili 
                    SET ParolaHashContabil = @ParolaHashContabil, 
                        SchimbareParolaLaLogare = @SchimbareParolaLaLogare,
                        DataActualizării = GETDATE()
                    WHERE IdContabil = @IdContabil
                `);
            
            // Trimite email cu noua parolă
            await emailService.sendEmail({
                to: contabil.EmailContabil,
                subject: 'Parola ta Balance Beacon Buddy a fost resetată',
                html: `
                    <h1>Resetare parolă Balance Beacon Buddy</h1>
                    <p>Parola pentru contul tău a fost resetată. Iată noua ta parolă temporară:</p>
                    <p><strong>Parolă nouă:</strong> ${newPassword}</p>
                    <p>Te rugăm să schimbi această parolă la următoarea logare.</p>
                    <p>Acces aplicație: <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}">${process.env.FRONTEND_URL || 'http://localhost:3000'}</a></p>
                    <p>Mulțumim,<br>Echipa Balance Beacon Buddy</p>
                `
            });
            
            return true;
        } catch (error) {
            console.error('Eroare la resetarea parolei contabilului:', error);
            throw error;
        }
    }
}

// Exportăm serviciul ca o instanță singleton pentru a fi folosit în alte fișiere
const creareContabilService = new CreareContabilService();
export { creareContabilService, CreareContabilService };
