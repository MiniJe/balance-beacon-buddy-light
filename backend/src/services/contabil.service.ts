import { Contabil, ContabilLoginDto, ContabilResponse, PermisiuniContabil, ResetareParolaContabilDto, SchimbareParolaContabilDto, CreateContabilDto } from '../models/Contabil';
import { pool as azurePool } from '../config/azure';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import * as sql from 'mssql';
import { emailService } from '../services/email.service';
import { sessionService } from '../services/session.service';
import { getUTCTimestamp } from '../utils/timezone.utils';
import { creareContabilService } from './creare.cont.contabil';

class ContabilService {

    /**
     * Verifică dacă un email de contabil există deja în baza de date
     * @deprecated Folosește metoda din creareContabilService
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
     * Creează un contabil nou
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
            
            await emailService.sendEmail({
                to: EmailContabil,
                subject: 'Contul tău Balance Beacon Buddy a fost creat',
                html: `
                    <h1>Bine ai venit la Balance Beacon Buddy!</h1>
                    <p>Contul tău de contabil a fost creat cu succes. Email: ${EmailContabil}</p>
                    <p>Parolă: ${password}</p>
                    <p>La prima conectare va trebui să îți schimbi parola.</p>
                `            });
            
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
     * Obține lista tuturor contabililor (activi și inactivi)
     */
    async getAllContabili(): Promise<ContabilResponse[]> {
        try {
            console.log('👥 Service: Getting all contabili');              const result =  await azurePool.request()
                .query(`
                    SELECT IdContabil, NumeContabil, PrenumeContabil, EmailContabil, 
                           RolContabil, StatusContabil, TelefonContabil, DepartmentContabil,
                           DataUltimeiLogări, DatăCreareContabil, ContabilCreatDe, DataActualizării, 
                           ActualizatDE, SchimbareParolaLaLogare, PermisiuniAcces
                    FROM Contabili 
                    WHERE StatusContabil != 'Șters'
                    ORDER BY NumeContabil, PrenumeContabil
                `);

            console.log(`📋 Found ${result.recordset.length} contabili records`);
            
            return result.recordset.map(contabil => {
                let permisiuni: PermisiuniContabil;
                try {
                    const permisiuniJson = contabil.PermisiuniAcces;
                    if (permisiuniJson) {
                        const parsedPermissions = JSON.parse(permisiuniJson);
                        permisiuni = {
                            IdPermisiune: undefined,
                            PoateModificaParteneri: parsedPermissions.PoateModificaParteneri || false,
                            PoateAdaugaParteneri: parsedPermissions.PoateAdaugaParteneri || false,
                            PoateVedeaRapoarte: parsedPermissions.PoateVedeaRapoarte || false,
                            PoateModificaSabloane: parsedPermissions.PoateModificaSabloane || false,
                            PoateCreaCereri: parsedPermissions.PoateCreaCereri || false,
                            PoateAdaugaUtilizatori: parsedPermissions.PoateAdaugaUtilizatori || false,
                            PoateModificaSetari: parsedPermissions.PoateModificaSetari || false
                        };
                    } else {
                        permisiuni = {
                            IdPermisiune: undefined,
                            PoateModificaParteneri: false,
                            PoateAdaugaParteneri: false,
                            PoateVedeaRapoarte: false,
                            PoateModificaSabloane: false,
                            PoateCreaCereri: false,
                            PoateAdaugaUtilizatori: false,
                            PoateModificaSetari: false
                        };
                    }
                } catch (parseError) {
                    console.error('Eroare la parsarea permisiunilor:', parseError);
                    permisiuni = {
                        IdPermisiune: undefined,
                        PoateModificaParteneri: false,
                        PoateAdaugaParteneri: false,
                        PoateVedeaRapoarte: false,
                        PoateModificaSabloane: false,
                        PoateCreaCereri: false,
                        PoateAdaugaUtilizatori: false,
                        PoateModificaSetari: false
                    };
                }

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
                    PermisiuniAcces: permisiuni,
                    PermisiuniContabil: permisiuni  // Adăugăm și pentru compatibilitate cu frontend
                };
            });
        } catch (error) {
            console.error('Eroare la obținerea contabililor:', error);
            throw error;
        }
    }

    /**
     * Obține un contabil după ID
     */
    async getContabilById(idContabil: string): Promise<ContabilResponse | null> {
        try {
            const result = await azurePool.request()
                .input('IdContabil', sql.UniqueIdentifier, idContabil)
                .query('SELECT * FROM Contabili WHERE IdContabil = @IdContabil');

            if (result.recordset.length === 0) {
                return null;
            }

            const contabil = result.recordset[0];
            
            let permisiuni: PermisiuniContabil;
            try {
                const permisiuniJson = contabil.PermisiuniAcces;
                if (permisiuniJson) {
                    const parsedPermissions = JSON.parse(permisiuniJson);
                    permisiuni = {
                        IdPermisiune: undefined,
                        PoateModificaParteneri: parsedPermissions.PoateModificaParteneri || false,
                        PoateAdaugaParteneri: parsedPermissions.PoateAdaugaParteneri || false,
                        PoateVedeaRapoarte: parsedPermissions.PoateVedeaRapoarte || false,
                        PoateModificaSabloane: parsedPermissions.PoateModificaSabloane || false,
                        PoateCreaCereri: parsedPermissions.PoateCreaCereri || false,
                        PoateAdaugaUtilizatori: parsedPermissions.PoateAdaugaUtilizatori || false,
                        PoateModificaSetari: parsedPermissions.PoateModificaSetari || false
                    };
                } else {
                    permisiuni = {
                        IdPermisiune: undefined,
                        PoateModificaParteneri: false,
                        PoateAdaugaParteneri: false,
                        PoateVedeaRapoarte: false,
                        PoateModificaSabloane: false,
                        PoateCreaCereri: false,
                        PoateAdaugaUtilizatori: false,
                        PoateModificaSetari: false
                    };
                }
            } catch (parseError) {
                console.error('Eroare la parsarea permisiunilor:', parseError);
                permisiuni = {
                    IdPermisiune: undefined,
                    PoateModificaParteneri: false,
                    PoateAdaugaParteneri: false,
                    PoateVedeaRapoarte: false,
                    PoateModificaSabloane: false,
                    PoateCreaCereri: false,
                    PoateAdaugaUtilizatori: false,
                    PoateModificaSetari: false
                };
            }            return {
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
                PermisiuniAcces: permisiuni,
                PermisiuniContabil: permisiuni  // Adăugăm și pentru compatibilitate cu frontend
            };
        } catch (error) {
            console.error('Eroare la obținerea contabilului după ID:', error);
            throw error;
        }
    }

    /**
     * Actualizează datele unui contabil
     */
    async updateContabil(idContabil: string, updates: Partial<Contabil>): Promise<ContabilResponse> {
        try {
            // Check if contabil exists and is active
            const existsResult = await azurePool.request()
                .input('IdContabil', sql.UniqueIdentifier, idContabil)
                .query('SELECT IdContabil FROM Contabili WHERE IdContabil = @IdContabil AND StatusContabil = \'Activ\'');

            if (existsResult.recordset.length === 0) {
                throw new Error('Contabilul nu a fost găsit sau nu este activ');
            }            // Build dynamic update query
            const updateFields: string[] = [];
            const request = azurePool.request().input('IdContabil', sql.UniqueIdentifier, idContabil);

            Object.entries(updates).forEach(([key, value], index) => {
                if (value !== undefined && key !== 'IdContabil') {
                    const paramName = `param${index}`;
                    updateFields.push(`${key} = @${paramName}`);
                    
                    if (key === 'PermisiuniAcces' && typeof value === 'object') {
                        request.input(paramName, JSON.stringify(value));
                    } else {
                        request.input(paramName, value);
                    }
                }
            });

            if (updateFields.length === 0) {
                throw new Error('Nu există câmpuri de actualizat');
            }

            // Add update metadata
            request.input('DataActualizarii', new Date());
            request.input('ActualizatDE', 'System');
            updateFields.push('DataActualizării = @DataActualizarii');
            updateFields.push('ActualizatDE = @ActualizatDE');

            const updateQuery = `
                UPDATE Contabili 
                SET ${updateFields.join(', ')}
                OUTPUT INSERTED.*
                WHERE IdContabil = @IdContabil
            `;

            const result = await request.query(updateQuery);
            
            if (result.recordset.length === 0) {
                throw new Error('Actualizarea a eșuat');
            }

            const contabil = result.recordset[0];
            
            let permisiuni: PermisiuniContabil;
            try {
                const permisiuniJson = contabil.PermisiuniAcces;
                if (permisiuniJson) {
                    const parsedPermissions = JSON.parse(permisiuniJson);
                    permisiuni = {
                        IdPermisiune: undefined,
                        PoateModificaParteneri: parsedPermissions.PoateModificaParteneri || false,
                        PoateAdaugaParteneri: parsedPermissions.PoateAdaugaParteneri || false,
                        PoateVedeaRapoarte: parsedPermissions.PoateVedeaRapoarte || false,
                        PoateModificaSabloane: parsedPermissions.PoateModificaSabloane || false,
                        PoateCreaCereri: parsedPermissions.PoateCreaCereri || false,
                        PoateAdaugaUtilizatori: parsedPermissions.PoateAdaugaUtilizatori || false,
                        PoateModificaSetari: parsedPermissions.PoateModificaSetari || false
                    };
                } else {
                    permisiuni = {
                        IdPermisiune: undefined,
                        PoateModificaParteneri: false,
                        PoateAdaugaParteneri: false,
                        PoateVedeaRapoarte: false,
                        PoateModificaSabloane: false,
                        PoateCreaCereri: false,
                        PoateAdaugaUtilizatori: false,
                        PoateModificaSetari: false
                    };
                }
            } catch (parseError) {
                console.error('Eroare la parsarea permisiunilor:', parseError);
                permisiuni = {
                    IdPermisiune: undefined,
                    PoateModificaParteneri: false,
                    PoateAdaugaParteneri: false,
                    PoateVedeaRapoarte: false,
                    PoateModificaSabloane: false,
                    PoateCreaCereri: false,
                    PoateAdaugaUtilizatori: false,
                    PoateModificaSetari: false
                };
            }

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
            console.error('Eroare la actualizarea contabilului:', error);
            throw error;
        }
    }

    /**
     * Resetează parola unui contabil
     */
    async resetPassword(data: ResetareParolaContabilDto): Promise<void> {
        const { IdContabil } = data;

        try {
            // Verifică dacă contabilul există
            const contabil = await this.getContabilById(IdContabil);
            if (!contabil) {
                throw new Error('Contabilul nu a fost găsit');
            }

            // Generează parolă nouă
            const newPassword = this.generatePassword();
            const salt = await bcrypt.genSalt(10);
            const parolaHash = await bcrypt.hash(newPassword, salt);
            
            const contabilResult = await azurePool.request()
                .input('IdContabil', sql.UniqueIdentifier, IdContabil)
                .input('ParolaHashContabil', parolaHash)
                .input('SchimbareParolaLaLogare', true)
                .input('DataActualizarii', new Date())
                .input('ActualizatDE', 'System')
                .query(`
                    UPDATE Contabili 
                    SET ParolaHashContabil = @ParolaHashContabil, 
                        SchimbareParolaLaLogare = @SchimbareParolaLaLogare,
                        DataActualizării = @DataActualizarii,
                        ActualizatDE = @ActualizatDE
                    WHERE IdContabil = @IdContabil
                `);

            // Trimite email cu noua parolă
            await emailService.sendEmail({
                to: contabil.EmailContabil,
                subject: 'Parolă resetată - Balance Beacon Buddy',
                html: `
                    <h1>Parola ta a fost resetată</h1>
                    <p>Parola nouă: ${newPassword}</p>
                    <p>La următoarea conectare va trebui să îți schimbi parola.</p>
                `
            });
        } catch (error) {
            console.error('Eroare la resetarea parolei:', error);
            throw error;
        }
    }

    /**
     * Șterge un contabil
     */
    async deleteContabil(idContabil: string): Promise<boolean> {
        try {
            console.log('🗑️ Deleting contabil with ID:', idContabil);
            
            // Verifică dacă contabilul există
            const existsResult = await azurePool.request()
                .input('IdContabil', sql.UniqueIdentifier, idContabil)
                .query('SELECT IdContabil FROM Contabili WHERE IdContabil = @IdContabil');

            if (existsResult.recordset.length === 0) {
                throw new Error('Contabilul nu există');
            }

            // Șterge contabilul (soft delete prin status)
            const deleteResult = await azurePool.request()
                .input('IdContabil', sql.UniqueIdentifier, idContabil)
                .input('StatusContabil', 'Șters')
                .input('DataActualizarii', new Date())
                .input('ActualizatDE', 'System')
                .query(`
                    UPDATE Contabili 
                    SET StatusContabil = @StatusContabil,
                        DataActualizării = @DataActualizarii,
                        ActualizatDE = @ActualizatDE
                    WHERE IdContabil = @IdContabil
                `);

            console.log('✅ Contabil marked as deleted successfully');
            return deleteResult.rowsAffected[0] > 0;
        } catch (error) {
            console.error('💥 Error deleting contabil:', error);
            throw error;
        }
    }

    /**
     * Schimbă parola unui contabil
     */
    async changePassword(changeData: SchimbareParolaContabilDto): Promise<void> {
        const { IdContabil, ParolaVeche, ParolaNoua } = changeData;

        try {
            // Verifică dacă contabilul există
            const result = await azurePool.request()
                .input('IdContabil', sql.UniqueIdentifier, IdContabil)
                .query('SELECT * FROM Contabili WHERE IdContabil = @IdContabil AND StatusContabil = \'Activ\'');

            const contabil = result.recordset[0];
            if (!contabil) {
                throw new Error('Contabilul nu a fost găsit');
            }

            // Verifică parola veche
            const validPassword = await bcrypt.compare(ParolaVeche, contabil.ParolaHashContabil);
            if (!validPassword) {
                throw new Error('Parola veche este incorectă');
            }

            // Hash-uiește parola nouă
            const salt = await bcrypt.genSalt(10);
            const parolaHash = await bcrypt.hash(ParolaNoua, salt);
            
            await azurePool.request()
                .input('IdContabil', sql.UniqueIdentifier, IdContabil)
                .input('ParolaHashContabil', parolaHash)
                .input('SchimbareParolaLaLogare', false)
                .input('DataActualizarii', new Date())
                .input('ActualizatDE', 'System')
                .query(`
                    UPDATE Contabili 
                    SET ParolaHashContabil = @ParolaHashContabil, 
                        SchimbareParolaLaLogare = @SchimbareParolaLaLogare,
                        DataActualizării = @DataActualizarii,
                        ActualizatDE = @ActualizatDE
                    WHERE IdContabil = @IdContabil
                `);
        } catch (error) {
            console.error('Eroare la schimbarea parolei:', error);
            throw error;
        }
    }    /**
     * Generează o parolă aleatoare
     */
    private generatePassword(): string {
        const length = 12;
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        return password;
    }

}

export { ContabilService };
export const contabilService = new ContabilService();