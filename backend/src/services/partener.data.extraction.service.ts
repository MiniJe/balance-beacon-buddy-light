import { pool } from '../config/azure';
import { Partener } from '../models/Partener';
import { TemplateData } from '../types/TemplateData';
import sql from 'mssql';

/**
 * Alias pentru compatibilitatea cu codul existent
 */
export type PlaceholderData = TemplateData;

/**
 * Re-export TemplateData pentru ușurința importului
 */
export { TemplateData } from '../types/TemplateData';

/**
 * Interfață pentru datele utilizatorului care generează documentul
 */
export interface UtilizatorData {
    nume?: string;
    functie?: string;
    rol?: string;
    email?: string;
}

/**
 * Serviciu pentru extragerea și formatarea datelor din tabelul Parteneri
 * pentru înlocuirea placeholder-urilor în șabloanele DOCX
 */
export class PartenerDataExtractionService {

    /**
     * Extrage și formatează datele unui partener pentru înlocuirea placeholder-urilor
     */
    async extractPartenerData(
        idPartener: string,
        numarDocument: number,
        dataSold: string,
        utilizatorData: UtilizatorData,
        numarSesiune: string,
        dataEmiterii?: Date
    ): Promise<TemplateData> {
        try {
            console.log(`📋 Extragere date partener: ${idPartener}`);
            
            // 1. Obține datele partenerului din baza de date
            const partener = await this.getPartenerById(idPartener);
            
            if (!partener) {
                throw new Error(`Partenerul cu ID ${idPartener} nu a fost găsit`);
            }
            
            // 2. Formatează datele pentru placeholder-uri
            const placeholderData = this.formatPartenerDataForTemplate(
                partener,
                numarDocument,
                dataSold,
                utilizatorData,
                numarSesiune,
                dataEmiterii
            );
            
            console.log(`✅ Date partener formatate pentru: ${partener.numePartener}`);
            return placeholderData;
            
        } catch (error) {
            console.error('❌ Eroare la extragerea datelor partenerului:', error);
            throw new Error(`Nu s-au putut extrage datele partenerului: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`);
        }
    }

    /**
     * Extrage datele mai multor parteneri pentru procesare în lot
     */
    async extractMultipleParteneriData(
        parteneriIds: string[],
        numarDocumentStart: number,
        dataSold: string,
        utilizatorData: UtilizatorData,
        numarSesiune: string,
        dataEmiterii?: Date
    ): Promise<Map<string, TemplateData>> {
        try {
            console.log(`📋 Extragere date pentru ${parteneriIds.length} parteneri`);
            
            const rezultat = new Map<string, TemplateData>();
            
            // Procesează fiecare partener
            for (let i = 0; i < parteneriIds.length; i++) {
                const idPartener = parteneriIds[i];
                const numarDocument = numarDocumentStart + i;
                
                try {
                    const placeholderData = await this.extractPartenerData(
                        idPartener,
                        numarDocument,
                        dataSold,
                        utilizatorData,
                        numarSesiune,
                        dataEmiterii
                    );
                    
                    rezultat.set(idPartener, placeholderData);
                    
                } catch (error) {
                    console.error(`❌ Eroare la extragerea datelor pentru partenerul ${idPartener}:`, error);
                    // Continuă cu următorul partener în loc să oprească totul
                }
            }
            
            console.log(`✅ Date extrase pentru ${rezultat.size}/${parteneriIds.length} parteneri`);
            return rezultat;
            
        } catch (error) {
            console.error('❌ Eroare la extragerea datelor multiple:', error);
            throw new Error(`Nu s-au putut extrage datele partenerilor: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`);
        }
    }

    /**
     * Obține un partener din baza de date după ID
     */
    private async getPartenerById(idPartener: string): Promise<Partener | null> {
        try {
            const request = pool.request();
            request.input('idPartener', sql.UniqueIdentifier, idPartener);

            const result = await request.query(`
                SELECT 
                    idPartener,
                    numePartener,
                    cuiPartener,
                    onrcPartener,
                    emailPartener,
                    reprezentantPartener,
                    adresaPartener,
                    telefonPartener,
                    observatiiPartener,
                    clientDUC,
                    clientDL,
                    furnizorDUC,
                    furnizorDL,
                    partenerActiv,
                    dataCrearePartener,
                    dataModificarePartener
                FROM Parteneri 
                WHERE idPartener = @idPartener AND partenerActiv = 1
            `);

            if (result.recordset.length === 0) {
                return null;
            }

            const record = result.recordset[0];
            return {
                idPartener: record.idPartener,
                numePartener: record.numePartener || '',
                cuiPartener: record.cuiPartener || '',
                onrcPartener: record.onrcPartener || '',
                emailPartener: record.emailPartener || '',
                reprezentantPartener: record.reprezentantPartener || '',
                adresaPartener: record.adresaPartener || '',
                telefonPartener: record.telefonPartener || '',
                observatiiPartener: record.observatiiPartener || '',
                clientDUC: Boolean(record.clientDUC),
                clientDL: Boolean(record.clientDL),
                furnizorDUC: Boolean(record.furnizorDUC),
                furnizorDL: Boolean(record.furnizorDL),
                partenerActiv: Boolean(record.partenerActiv),
                dataCrearePartener: record.dataCrearePartener,
                dataModificarePartener: record.dataModificarePartener
            };
            
        } catch (error) {
            console.error('❌ Eroare la căutarea partenerului în baza de date:', error);
            throw error;
        }
    }

    /**
     * Formatează datele partenerului pentru înlocuirea placeholder-urilor
     */
    private formatPartenerDataForTemplate(
        partener: Partener,
        numarDocument: number,
        dataSold: string,
        utilizatorData: UtilizatorData,
        numarSesiune: string,
        dataEmiterii?: Date
    ): TemplateData {
        // Formatează datele pentru placeholder-uri
        const dataEmiteriiFormatata = dataEmiterii ? 
            this.formatDateRomanian(dataEmiterii) : 
            this.formatDateRomanian(new Date());
        
        const dataSoldFormatata = this.formatDateRomanian(new Date(dataSold));
        
        return {
            nrDoc: numarDocument.toString(),
            dataEmiterii: dataEmiteriiFormatata,
            companie: partener.numePartener || 'Nume necunoscut',
            cui: partener.cuiPartener || 'CUI nespecificat',
            onrc: partener.onrcPartener || 'ONRC nespecificat',
            dataSold: dataSoldFormatata
        };
    }

    /**
     * Formatează o dată în format românesc (DD.MM.YYYY)
     */
    private formatDateRomanian(date: Date): string {
        return date.toLocaleDateString('ro-RO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    /**
     * Formatează adresa partenerului pentru afișare
     */
    private formatAdresaPartener(partener: Partener): string {
        if (!partener.adresaPartener) {
            return 'Adresa nespecificată';
        }
        
        // Adresa este deja formatată în baza de date
        return partener.adresaPartener.trim();
    }

    /**
     * Formatează numărul de telefon pentru afișare
     */
    private formatTelefonPartener(telefon?: string): string {
        if (!telefon) {
            return 'Telefon nespecificat';
        }
        
        // Elimină spațiile și caracterele speciale
        const telefonCurat = telefon.replace(/[^\d+]/g, '');
        
        // Formatează telefonul românesc
        if (telefonCurat.startsWith('40')) {
            // Format internațional: +40 XXX XXX XXX
            return `+${telefonCurat.substring(0, 2)} ${telefonCurat.substring(2, 5)} ${telefonCurat.substring(5, 8)} ${telefonCurat.substring(8)}`;
        } else if (telefonCurat.startsWith('0') && telefonCurat.length === 10) {
            // Format național: 0XXX.XXX.XXX
            return `${telefonCurat.substring(0, 4)}.${telefonCurat.substring(4, 7)}.${telefonCurat.substring(7)}`;
        }
        
        // Returnează telefonul original dacă nu se poate formata
        return telefon;
    }

    /**
     * Validează că toate câmpurile obligatorii sunt prezente
     */
    validateTemplateData(data: TemplateData): { valid: boolean; missingFields: string[] } {
        const requiredFields: (keyof TemplateData)[] = [
            'nrDoc',
            'dataEmiterii',
            'companie',
            'cui',
            'dataSold'
        ];
        
        const missingFields: string[] = [];
        
        for (const field of requiredFields) {
            const value = data[field];
            if (!value || (typeof value === 'string' && value.trim() === '')) {
                missingFields.push(field as string);
            }
        }
        
        return {
            valid: missingFields.length === 0,
            missingFields
        };
    }
}

// Export instanța serviciului
export const partenerDataExtractionService = new PartenerDataExtractionService();
