/**
 * Model pentru tabelul JurnalSesiuni
 * Evidența sesiunilor utilizatorilor și contabililor cu suport blockchain MultiversX
 */

export interface JurnalSesiuni {
    idSesiune: string; // UNIQUEIDENTIFIER
    idUtilizator: string; // UNIQUEIDENTIFIER
    numeUtilizator: string;
    emailUtilizator: string;
    rolUtilizator: string;
    tipUtilizator: 'utilizator' | 'contabil';
      // Informații sesiune - ORA LOCALĂ ROMÂNIA pentru afișare
    dataOraLogin: string; // Format SQL Server: 'YYYY-MM-DD HH:MM:SS' (ora României)
    dataOraLogout?: string | null; // Format SQL Server: 'YYYY-MM-DD HH:MM:SS' (ora României)
    durataSesiune?: number | null; // în secunde
    statusSesiune: 'activa' | 'inchisa' | 'expirata';
    
    // Timestamps UTC pentru blockchain MultiversX
    timeStampLogin?: number | null; // Unix timestamp în secunde (UTC)
    timeStampLogout?: number | null; // Unix timestamp în secunde (UTC)
    
    // Informații tehnice
    adresaIP?: string | null;
    userAgent?: string | null;
    browser?: string | null;
    sistemeOperare?: string | null;
    dispozitiv?: string | null; // desktop, mobile, tablet
    
    // Blockchain MultiversX fields
    hashLogin?: string | null; // SHA-256 hash pentru login (cu Unix timestamp)
    hashLogout?: string | null; // SHA-256 hash pentru logout (cu Unix timestamp)
    transactionIdLogin?: string | null; // Pentru viitoare integrare MultiversX
    transactionIdLogout?: string | null; // Pentru viitoare integrare MultiversX
    blockchainStatus?: 'pending' | 'confirmed' | 'failed' | null;
      // Securitate și auditare
    tokenSesiune?: string | null; // JWT token sau session ID
    ultimaActivitate?: string | null; // Format SQL Server: 'YYYY-MM-DD HH:MM:SS'
    numarActiuni: number; // Numărul de acțiuni în sesiune
    observatii?: string | null;
    
    // Metadata
    creatLa: string; // Format SQL Server: 'YYYY-MM-DD HH:MM:SS'
    modificatLa: string; // Format SQL Server: 'YYYY-MM-DD HH:MM:SS'
}

/**
 * DTO pentru crearea unei noi sesiuni
 */
export interface CreateJurnalSesiuniDto {
    idUtilizator: string;
    numeUtilizator: string;
    emailUtilizator: string;
    rolUtilizator: string;
    tipUtilizator?: 'utilizator' | 'contabil';
    
    // Informații tehnice opționale
    adresaIP?: string;
    userAgent?: string;
    browser?: string;
    sistemeOperare?: string;
    dispozitiv?: string;
    
    // Blockchain timestamps
    timeStampLogin?: number; // Unix timestamp pentru login
    timeStampLogout?: number; // Unix timestamp pentru logout
    hashLogin?: string;
    transactionIdLogin?: string;
    
    // Securitate
    tokenSesiune?: string;
    observatii?: string;
}

/**
 * DTO pentru actualizarea unei sesiuni (logout)
 */
export interface UpdateJurnalSesiuniDto {
    dataOraLogout?: Date;
    durataSesiune?: number;
    statusSesiune?: 'activa' | 'inchisa' | 'expirata';
    ultimaActivitate?: Date;
    numarActiuni?: number;
    
    // Blockchain logout timestamps
    timeStampLogout?: number; // Unix timestamp pentru logout
    hashLogout?: string;
    transactionIdLogout?: string;
    blockchainStatus?: 'pending' | 'confirmed' | 'failed';
    
    observatii?: string;
    modificatDe?: string;
}

/**
 * DTO pentru statistici sesiuni
 */
export interface SesiuniStatsDto {
    totalSesiuni: number;
    sesiuniActive: number;
    sesiuniInchise: number;
    sesiuniExpirate: number;
    durataMediaSesiune: number; // în secunde
    utilizatoriActivi: number;
    contabiliActivi: number;
    ultimaActivitate?: Date;
}

/**
 * DTO pentru filtrarea sesiunilor
 */
export interface JurnalSesiuniFilterDto {
    idUtilizator?: string;
    numeUtilizator?: string;
    tipUtilizator?: 'utilizator' | 'contabil';
    statusSesiune?: 'activa' | 'inchisa' | 'expirata';
    dataInceput?: Date;
    dataSfarsit?: Date;
    adresaIP?: string;
    dispozitiv?: string;
    blockchainStatus?: 'pending' | 'confirmed' | 'failed';
    page?: number;
    limit?: number;
    sortBy?: 'dataOraLogin' | 'dataOraLogout' | 'durataSesiune' | 'numeUtilizator';
    sortOrder?: 'ASC' | 'DESC';
}

/**
 * Interfață pentru informații despre dispozitiv (client-side)
 */
export interface DeviceInfo {
    userAgent: string;
    browser: string;
    sistemeOperare: string;
    dispozitiv: 'desktop' | 'mobile' | 'tablet';
    adresaIP?: string;
}
