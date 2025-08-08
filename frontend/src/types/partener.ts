export interface Partener {
    idPartener: string;
    numePartener: string;
    cuiPartener: string;
    onrcPartener?: string;
    emailPartener?: string;
    reprezentantPartener?: string;
    clientDUC?: boolean;
    furnizorDUC?: boolean;
    clientDL?: boolean;
    furnizorDL?: boolean;
    adresaPartener?: string;
    telefonPartener?: string;
    observatiiPartener?: string;
    partenerActiv: boolean;
    dataCrearePartener?: Date;
    dataModificarePartener?: Date;
    dataAdaugare?: string; // Adăugăm acest câmp pentru datele din dashboard
}

export interface PartenerFormData {
    numePartener: string;
    cuiPartener: string;
    onrcPartener?: string;
    emailPartener?: string;
    reprezentantPartener?: string;
    clientDUC?: boolean;
    furnizorDUC?: boolean;
    clientDL?: boolean;
    furnizorDL?: boolean;
    adresaPartener?: string;
    telefonPartener?: string;
    observatiiPartener?: string;
    partenerActiv?: boolean;
}

export interface PartenerApiResponse {
    success: boolean;
    data?: Partener[];
    message?: string;
    meta?: {
        timestamp: string;
        pagination?: {
            currentPage: number;
            totalPages: number;
            totalItems: number;
            itemsPerPage: number;
            hasNextPage: boolean;
            hasPreviousPage: boolean;
        };
    };
    error?: string;
}

export interface SinglePartenerApiResponse {
    success: boolean;
    data?: Partener;
    message?: string;
    error?: string;
}

export interface PartenerSortOptions {
    sortBy: 'numePartener' | 'cuiPartener' | 'dataCrearePartener' | 'dataModificarePartener' | 'partenerActiv';
    sortOrder: 'asc' | 'desc';
    status: 'all' | 'active' | 'inactive';
    partnerType: 'all' | 'client' | 'furnizor' | 'client-duc' | 'client-dl' | 'furnizor-duc' | 'furnizor-dl';
}

export interface PaginationInfo {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}

export interface PartenerListResponse {
    parteneri: Partener[];
    pagination: PaginationInfo;
}
