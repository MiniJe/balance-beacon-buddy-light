import { pool as azurePool } from '../config/azure';
import * as sql from 'mssql';
import crypto from 'crypto';
import { getUTCTimestamp } from '../utils/timezone.utils';

/**
 * Serviciu pentru gestionarea globală a permisiunilor utilizatorilor
 * Pregătit pentru integrarea cu MultiversX blockchain
 */

export interface PermissionTemplate {
    id: string;
    name: string;
    description: string;
    permissions: {
        PoateModificaParteneri: boolean;
        PoateAdaugaParteneri: boolean;
        PoateVedeaRapoarte: boolean;
        PoateModificaSabloane: boolean;
        PoateCreaCereri: boolean;
        PoateAdaugaUtilizatori: boolean;
        PoateModificaSetari: boolean;
    };
}

export interface UserPermissionUpdate {
    userId: string;
    userType: 'contabil' | 'utilizator' | 'admin';
    permissions: any;
    updatedBy: string;
    reason?: string;
}

export class GlobalPermissionService {

    /**
     * Template-uri predefinite de permisiuni
     */
    private static readonly PERMISSION_TEMPLATES: PermissionTemplate[] = [
        {
            id: 'readonly',
            name: 'Doar citire',
            description: 'Poate doar vizualiza informații, fără drepturi de modificare',
            permissions: {
                PoateModificaParteneri: false,
                PoateAdaugaParteneri: false,
                PoateVedeaRapoarte: true,
                PoateModificaSabloane: false,
                PoateCreaCereri: false,
                PoateAdaugaUtilizatori: false,
                PoateModificaSetari: false
            }
        },
        {
            id: 'basic_user',
            name: 'Utilizator de bază',
            description: 'Poate crea cereri și vizualiza rapoarte',
            permissions: {
                PoateModificaParteneri: false,
                PoateAdaugaParteneri: false,
                PoateVedeaRapoarte: true,
                PoateModificaSabloane: false,
                PoateCreaCereri: true,
                PoateAdaugaUtilizatori: false,
                PoateModificaSetari: false
            }
        },
        {
            id: 'accountant',
            name: 'Contabil',
            description: 'Acces complet la parteneri și rapoarte, fără administrare',
            permissions: {
                PoateModificaParteneri: true,
                PoateAdaugaParteneri: true,
                PoateVedeaRapoarte: true,
                PoateModificaSabloane: true,
                PoateCreaCereri: true,
                PoateAdaugaUtilizatori: false,
                PoateModificaSetari: false
            }
        },
        {
            id: 'admin',
            name: 'Administrator',
            description: 'Acces complet la toate funcționalitățile',
            permissions: {
                PoateModificaParteneri: true,
                PoateAdaugaParteneri: true,
                PoateVedeaRapoarte: true,
                PoateModificaSabloane: true,
                PoateCreaCereri: true,
                PoateAdaugaUtilizatori: true,
                PoateModificaSetari: true
            }
        }
    ];

    /**
     * Obține toate template-urile de permisiuni disponibile
     */
    static getPermissionTemplates(): PermissionTemplate[] {
        return this.PERMISSION_TEMPLATES;
    }

    /**
     * Obține un template de permisiuni după ID
     */
    static getPermissionTemplate(templateId: string): PermissionTemplate | null {
        return this.PERMISSION_TEMPLATES.find(t => t.id === templateId) || null;
    }

    /**
     * Aplică un template de permisiuni unui utilizator
     */
    async applyPermissionTemplate(
        userId: string, 
        userType: 'contabil' | 'utilizator', 
        templateId: string, 
        appliedBy: string
    ): Promise<void> {
        try {
            const template = GlobalPermissionService.getPermissionTemplate(templateId);
            if (!template) {
                throw new Error(`Template de permisiuni '${templateId}' nu a fost găsit`);
            }

            await this.updateUserPermissions({
                userId,
                userType,
                permissions: template.permissions,
                updatedBy: appliedBy,
                reason: `Aplicat template: ${template.name}`
            });

            console.log(`✅ Template '${template.name}' aplicat pentru ${userType} ${userId}`);

        } catch (error) {
            console.error('❌ Error applying permission template:', error);
            throw error;
        }
    }

    /**
     * Actualizează permisiunile unui utilizator
     */
    async updateUserPermissions(update: UserPermissionUpdate): Promise<void> {
        try {
            const timestamp = getUTCTimestamp();
            const permissionsJson = JSON.stringify(update.permissions);

            if (update.userType === 'contabil') {
                await azurePool.request()
                    .input('IdContabil', sql.UniqueIdentifier, update.userId)
                    .input('PermisiuniAcces', permissionsJson)
                    .input('DataActualizarii', timestamp)
                    .input('ActualizatDE', update.updatedBy)
                    .query(`
                        UPDATE Contabili 
                        SET PermisiuniAcces = @PermisiuniAcces,
                            DataActualizării = @DataActualizarii,
                            ActualizatDE = @ActualizatDE
                        WHERE IdContabil = @IdContabil
                    `);
            } else {
                // Pentru utilizatori normali (când va fi implementată tabela Utilizatori)
                await azurePool.request()
                    .input('IdUtilizator', sql.UniqueIdentifier, update.userId)
                    .input('PermisiuniAcces', permissionsJson)
                    .input('DataActualizarii', timestamp)
                    .input('ActualizatDE', update.updatedBy)
                    .query(`
                        UPDATE Utilizatori 
                        SET PermisiuniAcces = @PermisiuniAcces,
                            DataActualizării = @DataActualizarii,
                            ActualizatDE = @ActualizatDE
                        WHERE IdUtilizator = @IdUtilizator
                    `);
            }

            // Log schimbarea pentru audit și blockchain
            await this.logPermissionChange(update, timestamp);

            console.log(`✅ Permissions updated for ${update.userType} ${update.userId}`);

        } catch (error) {
            console.error('❌ Error updating user permissions:', error);
            throw error;
        }
    }

    /**
     * Înregistrează schimbarea de permisiuni pentru audit și blockchain
     */
    private async logPermissionChange(update: UserPermissionUpdate, timestamp: Date): Promise<void> {
        try {
            const changeData = {
                userId: update.userId,
                userType: update.userType,
                permissions: update.permissions,
                updatedBy: update.updatedBy,
                timestamp: timestamp.toISOString(),
                reason: update.reason
            };

            const changeHash = crypto.createHash('sha256')
                .update(JSON.stringify(changeData))
                .digest('hex');

            // Aici se va integra cu MultiversX blockchain pentru înregistrarea hash-ului
            console.log(`🔗 Permission change hash: ${changeHash}`);
            console.log(`📝 Change logged for blockchain integration`);

        } catch (error) {
            console.error('❌ Error logging permission change:', error);
            // Nu oprește procesul dacă logging-ul eșuează
        }
    }

    /**
     * Obține permisiunile curente ale unui utilizator
     */
    async getUserPermissions(userId: string, userType: 'contabil' | 'utilizator'): Promise<any> {
        try {
            let result;

            if (userType === 'contabil') {
                result = await azurePool.request()
                    .input('IdContabil', sql.UniqueIdentifier, userId)
                    .query('SELECT PermisiuniAcces FROM Contabili WHERE IdContabil = @IdContabil');
            } else {
                result = await azurePool.request()
                    .input('IdUtilizator', sql.UniqueIdentifier, userId)
                    .query('SELECT PermisiuniAcces FROM Utilizatori WHERE IdUtilizator = @IdUtilizator');
            }

            if (result.recordset.length === 0) {
                throw new Error('Utilizatorul nu a fost găsit');
            }

            const permissionsJson = result.recordset[0].PermisiuniAcces;
            return permissionsJson ? JSON.parse(permissionsJson) : null;

        } catch (error) {
            console.error('❌ Error getting user permissions:', error);
            throw error;
        }
    }

    /**
     * Verifică dacă un utilizator are o anumită permisiune
     */
    async hasPermission(userId: string, userType: 'contabil' | 'utilizator', permissionKey: string): Promise<boolean> {
        try {
            const permissions = await this.getUserPermissions(userId, userType);
            return permissions && permissions[permissionKey] === true;

        } catch (error) {
            console.error('❌ Error checking permission:', error);
            return false;
        }
    }

    /**
     * Suspendă toate permisiunile unui utilizator (păstrând backup)
     */
    async suspendUserPermissions(userId: string, userType: 'contabil' | 'utilizator', suspendedBy: string, reason?: string): Promise<void> {
        try {
            // Obține permisiunile curente
            const currentPermissions = await this.getUserPermissions(userId, userType);
            
            // Creează un backup
            const backupData = {
                originalPermissions: currentPermissions,
                suspendedAt: getUTCTimestamp().toISOString(),
                suspendedBy,
                reason: reason || 'Suspendare utilizator'
            };

            // Resetează toate permisiunile la false
            const suspendedPermissions = {
                PoateModificaParteneri: false,
                PoateAdaugaParteneri: false,
                PoateVedeaRapoarte: false,
                PoateModificaSabloane: false,
                PoateCreaCereri: false,
                PoateAdaugaUtilizatori: false,
                PoateModificaSetari: false,
                _suspensionBackup: backupData
            };

            await this.updateUserPermissions({
                userId,
                userType,
                permissions: suspendedPermissions,
                updatedBy: suspendedBy,
                reason: `Suspendare: ${reason || 'Nedefinit'}`
            });

            console.log(`🚫 Permissions suspended for ${userType} ${userId}`);

        } catch (error) {
            console.error('❌ Error suspending user permissions:', error);
            throw error;
        }
    }

    /**
     * Restaurează permisiunile unui utilizator suspendat
     */
    async restoreUserPermissions(userId: string, userType: 'contabil' | 'utilizator', restoredBy: string): Promise<void> {
        try {
            const currentPermissions = await this.getUserPermissions(userId, userType);
            
            if (!currentPermissions || !currentPermissions._suspensionBackup) {
                throw new Error('Nu există backup de permisiuni pentru restaurare');
            }

            const originalPermissions = currentPermissions._suspensionBackup.originalPermissions;

            await this.updateUserPermissions({
                userId,
                userType,
                permissions: originalPermissions,
                updatedBy: restoredBy,
                reason: 'Restaurare din suspendare'
            });

            console.log(`✅ Permissions restored for ${userType} ${userId}`);

        } catch (error) {
            console.error('❌ Error restoring user permissions:', error);
            throw error;
        }
    }
}

export const globalPermissionService = new GlobalPermissionService();
