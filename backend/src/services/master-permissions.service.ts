/**
 * Service pentru gestionarea permisiunilor în sistemul MASTER-CONTABIL
 * MASTER are acces complet și poate configura permisiunile contabililor
 * CONTABILII au acces restricționat configurabil de către MASTER
 */

import { getDatabase } from '../config/sqlite';

export interface ContabilPermissions {
    // Document Management
    PoateVedeaDocumente: boolean;
    PoateModificaDocumente: boolean;
    PoateAdaugaDocumente: boolean;
    PoateStergeDocumente: boolean;
    
    // Partner Management
    PoateVedeaParteneri: boolean;
    PoateModificaParteneri: boolean;
    PoateAdaugaParteneri: boolean;
    PoateStergeParteneri: boolean;
    
    // Financial Operations
    PoateVedeaTranzactii: boolean;
    PoateModificaTranzactii: boolean;
    PoateAdaugaTranzactii: boolean;
    PoateStergeTranzactii: boolean;
    
    // Reports
    PoateVedeaRapoarte: boolean;
    PoateExportaRapoarte: boolean;
    
    // Settings (usually restricted)
    PoateModificaSetari: boolean;
    PoateGestionaUtilizatori: boolean;
    
    // Advanced Features
    PoateAccesaJurnalActivitate: boolean;
    PoateModificaPermisiuni: boolean;
}

export const DEFAULT_CONTABIL_PERMISSIONS: ContabilPermissions = {
    // Read-only access by default
    PoateVedeaDocumente: true,
    PoateModificaDocumente: false,
    PoateAdaugaDocumente: false,
    PoateStergeDocumente: false,
    
    PoateVedeaParteneri: true,
    PoateModificaParteneri: false,
    PoateAdaugaParteneri: false,
    PoateStergeParteneri: false,
    
    PoateVedeaTranzactii: true,
    PoateModificaTranzactii: false,
    PoateAdaugaTranzactii: false,
    PoateStergeTranzactii: false,
    
    PoateVedeaRapoarte: true,
    PoateExportaRapoarte: false,
    
    // No administrative access
    PoateModificaSetari: false,
    PoateGestionaUtilizatori: false,
    
    PoateAccesaJurnalActivitate: false,
    PoateModificaPermisiuni: false,
};

export const FULL_CONTABIL_PERMISSIONS: ContabilPermissions = {
    // Full document access
    PoateVedeaDocumente: true,
    PoateModificaDocumente: true,
    PoateAdaugaDocumente: true,
    PoateStergeDocumente: true,
    
    // Full partner access
    PoateVedeaParteneri: true,
    PoateModificaParteneri: true,
    PoateAdaugaParteneri: true,
    PoateStergeParteneri: true,
    
    // Full transaction access
    PoateVedeaTranzactii: true,
    PoateModificaTranzactii: true,
    PoateAdaugaTranzactii: true,
    PoateStergeTranzactii: true,
    
    // Full reports access
    PoateVedeaRapoarte: true,
    PoateExportaRapoarte: true,
    
    // Limited administrative access (no user management or permission changes)
    PoateModificaSetari: false,
    PoateGestionaUtilizatori: false,
    
    PoateAccesaJurnalActivitate: true,
    PoateModificaPermisiuni: false,
};

/**
 * Service pentru gestionarea permisiunilor contabililor de către utilizatorii MASTER
 */
export class MasterPermissionsService {
    
    /**
     * Obține permisiunile unui contabil
     */
    static async getContabilPermissions(idContabil: string): Promise<ContabilPermissions | null> {
        try {
        const db = await getDatabase();
        const row = await db.get(`SELECT PermisiuniAcces, StatusContabil, NumeContabil FROM Contabili WHERE IdContabil = ?`, idContabil);
        if (!row) {
                console.log(`❌ MASTER-PERM: Contabil ${idContabil} not found`);
                return null;
            }
        if (row.StatusContabil !== 'Activ') {
                console.log(`❌ MASTER-PERM: Contabil ${idContabil} is inactive`);
                return null;
            }
        if (row.PermisiuniAcces) {
                try {
            return JSON.parse(row.PermisiuniAcces) as ContabilPermissions;
                } catch (error) {
                    console.error('❌ MASTER-PERM: Error parsing permissions, using defaults:', error);
                    return DEFAULT_CONTABIL_PERMISSIONS;
                }
            } else {
                return DEFAULT_CONTABIL_PERMISSIONS;
            }
            
        } catch (error) {
            console.error('❌ MASTER-PERM: Database error getting permissions:', error);
            throw error;
        }
    }
    
    /**
     * Setează permisiunile unui contabil (doar MASTER poate face asta)
     */
    static async setContabilPermissions(
        masterId: string, 
        idContabil: string, 
        permissions: ContabilPermissions
    ): Promise<{ success: boolean; message: string }> {
        try {
            // Verify MASTER role
            const isMaster = await this.verifyMasterRole(masterId);
            if (!isMaster) {
                return { success: false, message: 'Doar utilizatorii MASTER pot modifica permisiunile' };
            }
            
            // Verify contabil exists and is active
            const contabilExists = await this.verifyContabilExists(idContabil);
            if (!contabilExists) {
                return { success: false, message: 'Contabilul specificat nu există sau nu este activ' };
            }
            
            // Update permissions
            const db = await getDatabase();
            await db.run(`UPDATE Contabili SET PermisiuniAcces = ?, DataModificare = ? WHERE IdContabil = ?`, JSON.stringify(permissions), new Date().toISOString(), idContabil);
            
            console.log(`✅ MASTER-PERM: Permissions updated for contabil ${idContabil} by MASTER ${masterId}`);
            
            // Log the action
            await this.logPermissionChange(masterId, idContabil, permissions);
            
            return { success: true, message: 'Permisiunile au fost actualizate cu succes' };
            
        } catch (error) {
            console.error('❌ MASTER-PERM: Error setting permissions:', error);
            return { success: false, message: 'Eroare la actualizarea permisiunilor' };
        }
    }
    
    /**
     * Obține lista tuturor contabililor cu permisiunile lor (doar pentru MASTER)
     */
    static async getAllContabiliPermissions(masterId: string): Promise<{
        success: boolean;
        data?: Array<{
            IdContabil: string;
            NumeContabil: string;
            EmailContabil: string;
            StatusContabil: string;
            permissions: ContabilPermissions;
        }>;
        message: string;
    }> {
        try {
            // Verify MASTER role
            const isMaster = await this.verifyMasterRole(masterId);
            if (!isMaster) {
                return { success: false, message: 'Doar utilizatorii MASTER pot vedea toate permisiunile' };
            }
            
            const db = await getDatabase();
            const rows = await db.all(`SELECT IdContabil, NumeContabil, EmailContabil, StatusContabil, PermisiuniAcces FROM Contabili ORDER BY NumeContabil`);
            const contabili = rows.map((row: any) => ({
                IdContabil: row.IdContabil,
                NumeContabil: row.NumeContabil,
                EmailContabil: row.EmailContabil,
                StatusContabil: row.StatusContabil,
                permissions: row.PermisiuniAcces 
                    ? JSON.parse(row.PermisiuniAcces) 
                    : DEFAULT_CONTABIL_PERMISSIONS
            }));
            
            return { success: true, data: contabili, message: 'Success' };
            
        } catch (error) {
            console.error('❌ MASTER-PERM: Error getting all permissions:', error);
            return { success: false, message: 'Eroare la obținerea permisiunilor' };
        }
    }
    
    /**
     * Resetează permisiunile unui contabil la valorile default
     */
    static async resetContabilPermissions(
        masterId: string, 
        idContabil: string
    ): Promise<{ success: boolean; message: string }> {
        return await this.setContabilPermissions(masterId, idContabil, DEFAULT_CONTABIL_PERMISSIONS);
    }
    
    /**
     * Setează permisiuni complete pentru un contabil (fără acces administrativ)
     */
    static async grantFullContabilPermissions(
        masterId: string, 
        idContabil: string
    ): Promise<{ success: boolean; message: string }> {
        return await this.setContabilPermissions(masterId, idContabil, FULL_CONTABIL_PERMISSIONS);
    }
    
    /**
     * Verifică dacă un utilizator are rol MASTER
     */
    private static async verifyMasterRole(userId: string): Promise<boolean> {
        try {
            const db = await getDatabase();
            const row = await db.get(`SELECT RolUtilizator FROM Utilizatori WHERE IdUtilizator = ? AND StatusUtilizator = 'Activ'`, userId);
            return !!row && row.RolUtilizator === 'MASTER';
            
        } catch (error) {
            console.error('❌ MASTER-PERM: Error verifying MASTER role:', error);
            return false;
        }
    }
    
    /**
     * Verifică dacă un contabil există și este activ
     */
    private static async verifyContabilExists(idContabil: string): Promise<boolean> {
        try {
            const db = await getDatabase();
            const row = await db.get(`SELECT IdContabil FROM Contabili WHERE IdContabil = ? AND StatusContabil = 'Activ'`, idContabil);
            return !!row;
            
        } catch (error) {
            console.error('❌ MASTER-PERM: Error verifying contabil exists:', error);
            return false;
        }
    }
    
    /**
     * Înregistrează schimbarea permisiunilor în jurnal
     */
    private static async logPermissionChange(
        masterId: string, 
        idContabil: string, 
        newPermissions: ContabilPermissions
    ): Promise<void> {
        try {
            const db = await getDatabase();
            // SQLite doesn't have sys.tables; attempt insert and swallow error if table missing
            try {
                await db.run(
                    `INSERT INTO JurnalActivitate (IdUtilizator, TipActiune, DetaliiActiune, DataActiune)
                     VALUES (?, ?, ?, ?)`,
                    masterId,
                    'MODIFICARE_PERMISIUNI',
                    JSON.stringify({ contabil: idContabil, permisiuni_noi: newPermissions, timestamp: new Date().toISOString() }),
                    new Date().toISOString()
                );
            } catch (e) {
                // ignore if table absent
            }
            
        } catch (error) {
            console.error('❌ MASTER-PERM: Error logging permission change:', error);
            // Don't throw - logging is not critical
        }
    }
}

/**
 * Verifică dacă un contabil are o permisiune specifică
 */
export async function checkContabilPermission(idContabil: string, permission: keyof ContabilPermissions): Promise<boolean> {
    try {
        const permissions = await MasterPermissionsService.getContabilPermissions(idContabil);
        if (!permissions) {
            return false;
        }
        
        return permissions[permission] === true;
        
    } catch (error) {
        console.error('❌ MASTER-PERM: Error checking permission:', error);
        return false;
    }
}

/**
 * Lista tuturor permisiunilor disponibile cu descrieri
 */
export const AVAILABLE_PERMISSIONS = {
    PoateVedeaDocumente: 'Poate vizualiza documentele',
    PoateModificaDocumente: 'Poate modifica documentele existente',
    PoateAdaugaDocumente: 'Poate adăuga documente noi',
    PoateStergeDocumente: 'Poate șterge documente',
    
    PoateVedeaParteneri: 'Poate vizualiza partenerii',
    PoateModificaParteneri: 'Poate modifica datele partenerilor',
    PoateAdaugaParteneri: 'Poate adăuga parteneri noi',
    PoateStergeParteneri: 'Poate șterge parteneri',
    
    PoateVedeaTranzactii: 'Poate vizualiza tranzacțiile',
    PoateModificaTranzactii: 'Poate modifica tranzacțiile',
    PoateAdaugaTranzactii: 'Poate adăuga tranzacții noi',
    PoateStergeTranzactii: 'Poate șterge tranzacții',
    
    PoateVedeaRapoarte: 'Poate vizualiza rapoartele',
    PoateExportaRapoarte: 'Poate exporta rapoartele',
    
    PoateModificaSetari: 'Poate modifica setările aplicației',
    PoateGestionaUtilizatori: 'Poate gestiona alți utilizatori',
    
    PoateAccesaJurnalActivitate: 'Poate accesa jurnalul de activitate',
    PoateModificaPermisiuni: 'Poate modifica permisiunile altor contabili',
} as const;
