/**
 * Tipuri pentru standardizarea răspunsurilor API
 */

export interface PaginationInfo {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}

export interface ApiResponseMeta {
    timestamp: string;
    requestId?: string;
    pagination?: PaginationInfo;
    version?: string;
}

/**
 * Format standardizat pentru toate răspunsurile API
 * @template T Tipul datelor returnate
 */
export interface ApiResponse<T = any> {
    /** Indică dacă operația a fost reușită */
    success: boolean;
    
    /** Datele returnate (doar pentru răspunsuri de succes) */
    data?: T;
    
    /** Mesajul pentru utilizator */
    message: string;
    
    /** Detalii despre eroare (doar pentru răspunsuri de eroare) */
    error?: {
        code?: string;
        details?: string;
        field?: string;
        stack?: string; // Doar în development
    };
    
    /** Metadate suplimentare */
    meta?: ApiResponseMeta;
}

/**
 * Tipuri specifice pentru răspunsuri comune
 */

// Răspuns pentru autentificare
export interface LoginApiResponse extends ApiResponse<{
    user: any;
    token: string;
    sessionId: string;
}> {}

// Răspuns pentru liste cu paginare
export interface PaginatedApiResponse<T> extends ApiResponse<T[]> {
    meta: ApiResponseMeta & {
        pagination: PaginationInfo;
    };
}

// Răspuns pentru operații CRUD
// export interface CrudApiResponse<T> extends ApiResponse<T> {}

// Răspuns pentru operații simple (success/failure)
// export interface SimpleApiResponse extends ApiResponse<null> {}

/**
 * Helper functions pentru crearea răspunsurilor standardizate
 */
export class ApiResponseHelper {
    
    /**
     * Creează un răspuns de succes
     */
    static success<T>(data: T, message: string = 'Operație reușită'): ApiResponse<T> {
        return {
            success: true,
            data,
            message,
            meta: {
                timestamp: new Date().toISOString()
            }
        };
    }
    
    /**
     * Creează un răspuns de succes cu paginare
     */
    static successWithPagination<T>(
        data: T[], 
        pagination: PaginationInfo, 
        message: string = 'Operație reușită'
    ): PaginatedApiResponse<T> {
        return {
            success: true,
            data,
            message,
            meta: {
                timestamp: new Date().toISOString(),
                pagination
            }
        };
    }
    
    /**
     * Creează un răspuns de eroare
     */
    static error(
        message: string = 'A apărut o eroare',
        errorCode?: string,
        errorDetails?: string,
        field?: string,
        includeStack: boolean = false
    ): ApiResponse<null> {
        const error: any = {};
        
        if (errorCode) error.code = errorCode;
        if (errorDetails) error.details = errorDetails;
        if (field) error.field = field;
        if (includeStack && process.env.NODE_ENV === 'development') {
            error.stack = new Error().stack;
        }
        
        return {
            success: false,
            message,
            error: Object.keys(error).length > 0 ? error : undefined,
            meta: {
                timestamp: new Date().toISOString()
            }
        };
    }
    
    /**
     * Creează un răspuns pentru validare eșuată
     */
    static validationError(field: string, message: string): ApiResponse<null> {
        return {
            success: false,
            message: `Eroare de validare: ${message}`,
            error: {
                code: 'VALIDATION_ERROR',
                field,
                details: message
            },
            meta: {
                timestamp: new Date().toISOString()
            }
        };
    }
    
    /**
     * Creează un răspuns pentru autentificare eșuată
     */
    static authError(message: string = 'Credențiale invalide'): ApiResponse<null> {
        return {
            success: false,
            message,
            error: {
                code: 'AUTH_ERROR'
            },
            meta: {
                timestamp: new Date().toISOString()
            }
        };
    }
    
    /**
     * Creează un răspuns pentru acces interzis
     */
    static forbiddenError(message: string = 'Nu aveți permisiunea de a accesa această resursă'): ApiResponse<null> {
        return {
            success: false,
            message,
            error: {
                code: 'FORBIDDEN_ERROR'
            },
            meta: {
                timestamp: new Date().toISOString()
            }
        };
    }
    
    /**
     * Creează un răspuns pentru resursă negăsită
     */
    static notFoundError(resource: string = 'Resursa'): ApiResponse<null> {
        return {
            success: false,
            message: `${resource} nu a fost găsită`,
            error: {
                code: 'NOT_FOUND_ERROR'
            },
            meta: {
                timestamp: new Date().toISOString()
            }
        };
    }
}
