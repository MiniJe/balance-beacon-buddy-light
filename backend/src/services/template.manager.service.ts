import { StorageService } from './storage.service';
import { Partener } from '../models/Partener';
import { templatesContainerName } from '../config/azure';

/**
 * Tipuri de template disponibile
 */
export type TipTemplate = 'client_duc' | 'client_dl' | 'furnizor_duc' | 'furnizor_dl';

/**
 * Interfață pentru configurația template-urilor
 */
interface TemplateConfig {
    readonly tipTemplate: TipTemplate;
    readonly numeTemplate: string;
    readonly containerAzure: string;
    readonly descriere: string;
}

/**
 * Cache pentru template-uri descărcate
 */
interface TemplateCacheEntry {
    buffer: Buffer;
    dataDescarcare: Date;
    dimensiune: number;
    hash: string;
}

/**
 * Manager pentru template-urile DOCX din Azure Blob Storage
 * Implementează cache-ing, validare și gestionarea optimizată a template-urilor
 */
export class TemplateManagerService {
    
    private storageService = new StorageService();
    private templateCache = new Map<string, TemplateCacheEntry>();
    private readonly CACHE_EXPIRY_HOURS = 24; // Template-urile expiră după 24 ore
    
    /**
     * Configurația template-urilor disponibile
     * Actualizat cu numele reale din Azure Blob Storage
     */
    private readonly templateConfigs: TemplateConfig[] = [
        {
            tipTemplate: 'client_duc',
            numeTemplate: 'templates/document_template_clienți-duc.docx',
            containerAzure: templatesContainerName,
            descriere: 'Template pentru clienți persoane juridice DUC'
        },
        {
            tipTemplate: 'client_dl',
            numeTemplate: 'templates/document_template_clienți-dl.docx',
            containerAzure: templatesContainerName,
            descriere: 'Template pentru clienți persoane juridice DL'
        },
        {
            tipTemplate: 'furnizor_duc',
            numeTemplate: 'templates/document_template_furnizori-duc.docx',
            containerAzure: templatesContainerName,
            descriere: 'Template pentru furnizori persoane juridice DUC'
        },
        {
            tipTemplate: 'furnizor_dl',
            numeTemplate: 'templates/document_template_furnizori-dl.docx',
            containerAzure: templatesContainerName,
            descriere: 'Template pentru furnizori persoane juridice DL'
        }
    ];

    /**
     * Determină tipul de template pe baza caracteristicilor partenerului
     */
    determineTipTemplate(partener: Partener): TipTemplate {
        // Prioritizăm DUC peste DL
        if (partener.clientDUC) return 'client_duc';
        if (partener.furnizorDUC) return 'furnizor_duc';
        if (partener.clientDL) return 'client_dl';
        if (partener.furnizorDL) return 'furnizor_dl';
        
        // Default: client DUC
        console.warn(`Partenerul ${partener.numePartener} nu are tip specificat, folosesc client_duc ca default`);
        return 'client_duc';
    }

    /**
     * Obține configurația pentru un tip de template
     */
    private getTemplateConfig(tipTemplate: TipTemplate): TemplateConfig {
        const config = this.templateConfigs.find(c => c.tipTemplate === tipTemplate);
        if (!config) {
            throw new Error(`Configurația pentru template-ul ${tipTemplate} nu a fost găsită`);
        }
        return config;
    }

    /**
     * Verifică dacă un template din cache este încă valid
     */
    private isCacheValid(cacheEntry: TemplateCacheEntry): boolean {
        const acum = new Date();
        const diferentaOre = (acum.getTime() - cacheEntry.dataDescarcare.getTime()) / (1000 * 60 * 60);
        return diferentaOre < this.CACHE_EXPIRY_HOURS;
    }

    /**
     * Generează cheia cache pentru un template
     */
    private getCacheKey(tipTemplate: TipTemplate): string {
        return `template_${tipTemplate}`;
    }

    /**
     * Calculează hash SHA-256 pentru un buffer
     */
    private calculateHash(buffer: Buffer): string {
        const crypto = require('crypto');
        return crypto.createHash('sha256').update(buffer).digest('hex');
    }

    /**
     * Descarcă un template din Azure Blob Storage
     */
    private async downloadTemplate(config: TemplateConfig): Promise<Buffer> {
        try {
            console.log(`📥 Descărcare template: ${config.numeTemplate} din containerul ${config.containerAzure}`);
            
            const buffer = await this.storageService.downloadFile(
                config.containerAzure, 
                config.numeTemplate
            );
            
            console.log(`✅ Template descărcat cu succes: ${config.numeTemplate} (${buffer.length} bytes)`);
            return buffer;
            
        } catch (error) {
            console.error(`❌ Eroare la descărcarea template-ului ${config.numeTemplate}:`, error);
            throw new Error(`Nu s-a putut descărca template-ul ${config.numeTemplate} din containerul ${config.containerAzure}. Verificați că fișierul există.`);
        }
    }

    /**
     * Obține un template (cu cache)
     */
    async getTemplate(tipTemplate: TipTemplate): Promise<Buffer> {
        const cacheKey = this.getCacheKey(tipTemplate);
        const cacheEntry = this.templateCache.get(cacheKey);
        
        // Verifică cache-ul
        if (cacheEntry && this.isCacheValid(cacheEntry)) {
            console.log(`💾 Template găsit în cache: ${tipTemplate}`);
            return cacheEntry.buffer;
        }
        
        // Descarcă template-ul
        const config = this.getTemplateConfig(tipTemplate);
        const buffer = await this.downloadTemplate(config);
        
        // Adaugă în cache
        const newCacheEntry: TemplateCacheEntry = {
            buffer,
            dataDescarcare: new Date(),
            dimensiune: buffer.length,
            hash: this.calculateHash(buffer)
        };
        
        this.templateCache.set(cacheKey, newCacheEntry);
        console.log(`💾 Template adăugat în cache: ${tipTemplate}`);
        
        return buffer;
    }

    /**
     * Pre-încarcă toate template-urile în cache
     */
    async preloadAllTemplates(): Promise<void> {
        console.log('🚀 Pre-încărcare template-uri...');
        
        const downloadPromises = this.templateConfigs.map(async (config) => {
            try {
                await this.getTemplate(config.tipTemplate);
                console.log(`✅ Template pre-încărcat: ${config.tipTemplate}`);
            } catch (error) {
                console.error(`❌ Eroare la pre-încărcarea template-ului ${config.tipTemplate}:`, error);
            }
        });
        
        await Promise.all(downloadPromises);
        console.log('🎉 Pre-încărcare template-uri completă');
    }

    /**
     * Obține template-urile necesare pentru o listă de parteneri
     */
    async getTemplatesForPartners(parteneri: Partener[]): Promise<Map<TipTemplate, Buffer>> {
        // Identifică tipurile de template necesare
        const tipuriNecesare = new Set<TipTemplate>();
        
        parteneri.forEach(partener => {
            const tipTemplate = this.determineTipTemplate(partener);
            tipuriNecesare.add(tipTemplate);
        });
        
        console.log(`📋 Template-uri necesare: ${Array.from(tipuriNecesare).join(', ')}`);
        
        // Descarcă template-urile necesare
        const templateMap = new Map<TipTemplate, Buffer>();
        
        for (const tipTemplate of tipuriNecesare) {
            try {
                const buffer = await this.getTemplate(tipTemplate);
                templateMap.set(tipTemplate, buffer);
            } catch (error) {
                console.error(`❌ Eroare la descărcarea template-ului ${tipTemplate}:`, error);
                throw error;
            }
        }
        
        return templateMap;
    }

    /**
     * Curăță cache-ul (șterge template-urile expirate)
     */
    cleanCache(): void {
        let cleaned = 0;
        
        for (const [key, entry] of this.templateCache.entries()) {
            if (!this.isCacheValid(entry)) {
                this.templateCache.delete(key);
                cleaned++;
            }
        }
        
        console.log(`🧹 Cache curățat: ${cleaned} template-uri expirate eliminate`);
    }

    /**
     * Obține statistici despre cache
     */
    getCacheStats(): { total: number; valide: number; expirate: number; dimensiuneTotal: number } {
        let valide = 0;
        let expirate = 0;
        let dimensiuneTotal = 0;
        
        for (const entry of this.templateCache.values()) {
            if (this.isCacheValid(entry)) {
                valide++;
            } else {
                expirate++;
            }
            dimensiuneTotal += entry.dimensiune;
        }
        
        return {
            total: this.templateCache.size,
            valide,
            expirate,
            dimensiuneTotal
        };
    }

    /**
     * Validează că toate template-urile configurate există în Azure Blob Storage
     */
    async validateAllTemplates(): Promise<{ valide: TipTemplate[]; invalide: TipTemplate[] }> {
        console.log('🔍 Validare template-uri...');
        
        const valide: TipTemplate[] = [];
        const invalide: TipTemplate[] = [];
        
        for (const config of this.templateConfigs) {
            try {
                await this.getTemplate(config.tipTemplate);
                valide.push(config.tipTemplate);
                console.log(`✅ Template valid: ${config.tipTemplate}`);
            } catch (error) {
                invalide.push(config.tipTemplate);
                console.error(`❌ Template invalid: ${config.tipTemplate}`, error);
            }
        }
        
        console.log(`📊 Validare completă: ${valide.length} valide, ${invalide.length} invalide`);
        
        return { valide, invalide };
    }

    /**
     * Obține informații despre toate template-urile configurate
     */
    getTemplateConfigs(): TemplateConfig[] {
        return [...this.templateConfigs];
    }
}

// Export instanța serviciului
export const templateManagerService = new TemplateManagerService();
