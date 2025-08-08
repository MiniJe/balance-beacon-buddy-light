/**
 * Model pentru tabelul JurnalDocumenteEmise
 * Structura reală din baza de date
 */

export interface JurnalDocumenteEmise {
    IdDocumente: number; // INT IDENTITY - cheia primară
    DataEmiterii: string; // DATETIME2(7) - data emiterii documentului
    NumeDocument: string; // NVARCHAR(255) - numele documentului
    DataCreare: string; // DATETIME2(7) - data creării înregistrării
    HashDocument?: string | null; // NVARCHAR(128) - hash-ul documentului
}

/**
 * DTO pentru crearea unui nou document
 */
export interface CreateJurnalDocumenteEmiseDto {
    NumeDocument: string;
    hashDocument: string;
    dimensiuneDocument: number;
    idUtilizator: string;
    numeUtilizator: string;
    emailUtilizator: string;
    idSesiune?: string;
    caleFisier: string;
    observatii?: string;
}

/**
 * DTO pentru actualizarea unui document (după semnare)
 */
export interface UpdateJurnalDocumenteEmiseDto {
    statusDocument?: 'generat' | 'semnat' | 'trimis' | 'confirmat' | 'anulat';
    hashDocumentSemnat?: string;
    dimensiuneDocumentSemnat?: number;
    caleFisierSemnat?: string;
    observatii?: string;
}

/**
 * DTO pentru răspunsul API
 */
export interface JurnalDocumenteEmiseResponse {
    jurnal: JurnalDocumenteEmise[];
    HashDocument?: string; // Opțional pentru documents fără hash inițial
    total?: number;
    pagina?: number;
    totalPagini?: number;
}