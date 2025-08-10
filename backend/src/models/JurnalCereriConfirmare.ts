/**
 * Model pentru tabelul JurnalCereriConfirmare
 * Structura reală din baza de date
 */

export interface JurnalCereriConfirmare {
    IdJurnal: string; // UNIQUEIDENTIFIER - cheia primară
    IdPartener: string; // UNIQUEIDENTIFIER - legătură cu tabelul Parteneri
    IdSetariCompanie?: string | null; // UNIQUEIDENTIFIER - setări companie
    DataCerere: string; // DATETIME2(7) - data cererii
    NumeFisier?: string | null; // NVARCHAR(255) - numele fișierului
    URLFisier?: string | null; // NVARCHAR(500) - URL-ul fișierului
    Stare: string; // NVARCHAR(50) - starea cererii (default: 'in_asteptare')
    LotId?: string | null; // UNIQUEIDENTIFIER - ID lot
    CreatDe?: string | null; // UNIQUEIDENTIFIER - cine a creat
    TrimisDe?: string | null; // UNIQUEIDENTIFIER - cine a trimis
    DataTrimitere?: string | null; // DATETIME2(7) - data trimiterii
    URLFisierSemnat?: string | null; // NVARCHAR(500) - URL fișier semnat
    DataIncarcareSemnatura?: string | null; // DATETIME2(7) - data încărcării semnăturii
    Observatii?: string | null; // NVARCHAR(1000) - observații
    HashDocument?: string | null; // NVARCHAR(128) - hash document
    // Coloanele blockchain au fost eliminate din varianta light
}

/**
 * DTO pentru crearea unei noi cereri de confirmare
 */
export interface CreateJurnalCereriConfirmareDto {
    IdPartener: string; // UNIQUEIDENTIFIER - ID partener
    IdSetariCompanie?: string; // UNIQUEIDENTIFIER - ID setări companie (opțional)
    NumeFisier?: string; // NVARCHAR(255) - numele fișierului
    URLFisier?: string; // NVARCHAR(500) - URL-ul fișierului
    Stare?: string; // NVARCHAR(50) - starea (default: 'in_asteptare')
    LotId?: string; // UNIQUEIDENTIFIER - ID lot (opțional)
    CreatDe?: string; // UNIQUEIDENTIFIER - cine a creat
    TrimisDe?: string; // UNIQUEIDENTIFIER - cine a trimis
    DataTrimitere?: string; // DATETIME2(7) - data trimiterii
    URLFisierSemnat?: string; // NVARCHAR(500) - URL fișier semnat
    DataIncarcareSemnatura?: string; // DATETIME2(7) - data încărcării semnăturii
    Observatii?: string; // NVARCHAR(1000) - observații
    HashDocument?: string; // NVARCHAR(128) - hash document
    // Coloanele blockchain au fost eliminate din varianta light
}

/**
 * DTO pentru actualizarea unei cereri
 */
export interface UpdateJurnalCereriConfirmareDto {
    Stare?: string;
    DataTrimitere?: string;
    URLFisierSemnat?: string;
    DataIncarcareSemnatura?: string;
    Observatii?: string;
    HashDocument?: string;
    // Coloanele blockchain au fost eliminate din varianta light
}

/**
 * DTO pentru răspunsul API
 */
export interface JurnalCereriConfirmareResponse {
    jurnal: JurnalCereriConfirmare[];
    total: number;
    pagina: number;
    totalPagini: number;
}

/**
 * DTO pentru statistici cereri
 */
export interface StatisticiCereriConfirmare {
    totalCereri: number;
    cereriTrimise: number;
    cereriConfirmate: number;
    cereriRefuzate: number;
    cereriExpirate: number;
    rataDeSucces: number; // procent
    timpMediuRaspuns: number; // în ore
}
