/**
 * Model simplificat pentru tabelul JurnalDocumenteEmise - DOAR pentru numerotare secvențială
 * Scopul: Rezervarea numerelor de înregistrare pentru documente
 */

/**
 * Interfața pentru JurnalDocumenteEmise (structura reală din baza de date)
 */
export interface JurnalDocumenteEmise {
    IdDocumente: number; // PK auto-increment (IDENTITY) - numărul de înregistrare
    DataEmiterii: string; // DATETIME2 cu default getutcdate()
    NumeDocument: string; // NVARCHAR(255) NOT NULL - numele temporar al documentului
    DataCreare: string; // DATETIME2 cu default getutcdate()
    HashDocument?: string; // NVARCHAR(128) NULL - hash temporar (opțional)
}

/**
 * DTO pentru rezervarea unui număr de înregistrare
 */
export interface CreateJurnalDocumenteEmiseDto {
    NumeDocument: string; // Numele temporar/placeholder pentru document
    HashDocument?: string; // Hash temporar (opțional)
}

/**
 * DTO pentru actualizarea hash-ului final (dacă este necesar)
 */
export interface UpdateJurnalDocumenteEmiseDto {
    NumeDocument?: string;
    HashDocument?: string;
}
