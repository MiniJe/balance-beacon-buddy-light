import { useState, useCallback } from 'react';

export interface JurnalEmail {
    IdJurnalEmail: string;
    IdPartener?: string;
    IdSablon?: string;  // Modificat de la number la string pentru UNIQUEIDENTIFIER
    EmailDestinatar: string;
    SubiectEmail: string;
    ContinutEmail?: string;
    TipEmail: 'CONFIRMARE' | 'REMINDER' | 'TEST' | 'GENERAL' | 'FISE_PARTENER';
    DataTrimitere: string;
    StatusTrimitere: 'PENDING' | 'SUCCESS' | 'FAILED' | 'RETRY' | 'RESPONDED';
    MesajEroare?: string;
    IdMessageEmail?: string;
    IdLot?: string;
    IdCerereConfirmare?: string;
    dataSold?: string; // Data pentru care se face cererea de confirmare (format YYYY-MM-DD)
    PriorityLevel: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
    NumeExpeditor?: string;
    EmailExpeditor?: string;
    NumeDestinatar?: string;
    TipDestinatar?: 'PARTENER' | 'CONTABIL' | 'UTILIZATOR' | 'EXTERN';
    EmailCC?: string;
    EmailBCC?: string;
    EmailReplyTo?: string;
    Atașamente?: string;
    NumarIncercari: number;
    DataUltimaIncercare?: string;
    DataUrmatoareaIncercare?: string;
    MaximIncercari: number;
    DataCitire?: string;
    DataRaspuns?: string;
    RaspunsEmail?: string;
    TipRaspuns?: 'CONFIRMED' | 'DISPUTED' | 'CORRECTIONS' | 'GENERAL_RESPONSE';
    StatusRaspuns?: 'PENDING' | 'RECEIVED' | 'PROCESSED';
    
    // Proprietăți pentru tracking
    TrackingEnabled?: boolean;
    WasOpened?: boolean;
    TotalOpens?: number;
    UniqueOpens?: number;
    FirstOpenedAt?: string;
    LastOpenedAt?: string;
    HoursToFirstOpen?: number;
    HashEmail?: string;
    HashTranzactieBlockchain?: string;
    StareBlockchain?: 'PENDING' | 'CONFIRMED' | 'FAILED';
    TimestampBlockchain?: string;
    ReteaBlockchain?: string;
    AdresaContractBlockchain?: string;
    GazUtilizat?: number;
    CostTranzactie?: number;
    CreatLa: string;
    CreatDe: string;
    ModificatLa?: string;
    ModificatDe?: string;
    EsteProgramatPentruStergere: boolean;
    DataStergere?: string;
    MotivarStergere?: string;
}

export interface JurnalEmailFilters {
    DataTrimitereStart?: string;
    DataTrimitereEnd?: string;
    StatusTrimitere?: JurnalEmail['StatusTrimitere'][];
    TipEmail?: JurnalEmail['TipEmail'][];
    IdPartener?: string;
    IdLot?: string;
    IdCerereConfirmare?: string;
    EmailDestinatar?: string;
    TipDestinatar?: JurnalEmail['TipDestinatar'][];
    StareBlockchain?: JurnalEmail['StareBlockchain'][];
    ReteaBlockchain?: string;
    PriorityLevel?: JurnalEmail['PriorityLevel'][];
    offset?: number;
    limit?: number;
    sortBy?: 'DataTrimitere' | 'StatusTrimitere' | 'PriorityLevel' | 'CreatLa';
    sortOrder?: 'ASC' | 'DESC';
}

export interface JurnalEmailStats {
    totalEmailuri: number;
    emailuriTrimise: number;
    emailuriEsuate: number;
    emailuriPending: number;
    emailuriRetry: number;
    emailuriBlockchainConfirmate: number;
    emailuriBlockchainPending: number;
    emailuriBlockchainEsuate: number;
    statisticiTipEmail: {
        [key in JurnalEmail['TipEmail']]: number;
    };
    statisticiPrioritate: {
        [key in JurnalEmail['PriorityLevel']]: number;
    };
}

export interface JurnalEmailResponse {
    success: boolean;
    data?: JurnalEmail | JurnalEmail[];
    message?: string;
    error?: string;
    stats?: JurnalEmailStats;
    pagination?: {
        total: number;
        offset: number;
        limit: number;
        hasMore: boolean;
    };
}

const API_BASE_URL = 'http://localhost:5000/api';

export const useJurnalEmail = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getJurnalEmailuri = useCallback(async (filters: JurnalEmailFilters = {}): Promise<JurnalEmailResponse> => {
        setLoading(true);
        setError(null);
        
        try {
            const queryParams = new URLSearchParams();
            const keyMap: Record<string, string> = {
                DataTrimitereStart: 'dataStart',
                DataTrimitereEnd: 'dataEnd',
                StatusTrimitere: 'status',
                TipEmail: 'tipEmail',
                IdPartener: 'idPartener',
                IdLot: 'idLot',
                IdCerereConfirmare: 'idCerere',
                EmailDestinatar: 'emailDestinatar',
                TipDestinatar: 'tipDestinatar',
                PriorityLevel: 'prioritate',
                // sortBy/sortOrder/offset/limit keep same name
            };
            
            // Adaugă filtrele ca query parameters
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    if (Array.isArray(value)) {
                        value.forEach(v => {
                            if (v !== undefined && v !== null) {
                                queryParams.append(keyMap[key] || key, v.toString());
                            }
                        });
                    } else {
                        queryParams.append(keyMap[key] || key, value.toString());
                    }
                }
            });

            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/jurnal-email?${queryParams.toString()}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result: JurnalEmailResponse = await response.json();
            return result;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Eroare la încărcarea jurnalului de emailuri';
            setError(errorMessage);
            return {
                success: false,
                error: errorMessage
            };
        } finally {
            setLoading(false);
        }
    }, []);

    const getJurnalEmailById = useCallback(async (id: string): Promise<JurnalEmailResponse> => {
        setLoading(true);
        setError(null);
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/jurnal-email/${id}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result: JurnalEmailResponse = await response.json();
            return result;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Eroare la încărcarea emailului';
            setError(errorMessage);
            return {
                success: false,
                error: errorMessage
            };
        } finally {
            setLoading(false);
        }
    }, []);

    const getJurnalEmailStats = useCallback(async (filters: Omit<JurnalEmailFilters, 'offset' | 'limit' | 'sortBy' | 'sortOrder'> = {}): Promise<JurnalEmailResponse> => {
        setLoading(true);
        setError(null);
        
        try {
            const queryParams = new URLSearchParams();
            const keyMap: Record<string, string> = {
                DataTrimitereStart: 'dataStart',
                DataTrimitereEnd: 'dataEnd',
                StatusTrimitere: 'status',
                TipEmail: 'tipEmail',
                IdPartener: 'idPartener',
                IdLot: 'idLot',
                IdCerereConfirmare: 'idCerere',
                EmailDestinatar: 'emailDestinatar',
                TipDestinatar: 'tipDestinatar',
                PriorityLevel: 'prioritate',
            };
            
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    if (Array.isArray(value)) {
                        value.forEach(v => {
                            if (v !== undefined && v !== null) {
                                queryParams.append(keyMap[key] || key, v.toString());
                            }
                        });
                    } else {
                        queryParams.append(keyMap[key] || key, value.toString());
                    }
                }
            });

            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/jurnal-email/stats?${queryParams.toString()}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result: JurnalEmailResponse = await response.json();
            return result;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Eroare la încărcarea statisticilor';
            setError(errorMessage);
            return {
                success: false,
                error: errorMessage
            };
        } finally {
            setLoading(false);
        }
    }, []);

    const updateJurnalEmail = useCallback(async (id: string, updates: Partial<JurnalEmail>): Promise<JurnalEmailResponse> => {
        setLoading(true);
        setError(null);
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/jurnal-email/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    ...updates,
                    ModificatDe: 'UTILIZATOR' // Ar trebui să vină din context-ul de autentificare
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result: JurnalEmailResponse = await response.json();
            return result;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Eroare la actualizarea emailului';
            setError(errorMessage);
            return {
                success: false,
                error: errorMessage
            };
        } finally {
            setLoading(false);
        }
    }, []);

    const markForRetry = useCallback(async (ids: string[]): Promise<JurnalEmailResponse> => {
        setLoading(true);
        setError(null);
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/jurnal-email/retry`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    ids,
                    ModificatDe: 'UTILIZATOR' // Ar trebui să vină din context-ul de autentificare
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result: JurnalEmailResponse = await response.json();
            return result;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Eroare la marcarea pentru retrimitere';
            setError(errorMessage);
            return {
                success: false,
                error: errorMessage
            };
        } finally {
            setLoading(false);
        }
    }, []);

    // Obține statistici de tracking pentru un email
    const getEmailTrackingStats = useCallback(async (idJurnalEmail: string) => {
        setLoading(true);
        setError(null);
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/email-tracking/stats/${idJurnalEmail}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Eroare la obținerea statisticilor de tracking';
            setError(errorMessage);
            return {
                success: false,
                error: errorMessage
            };
        } finally {
            setLoading(false);
        }
    }, []);

    // Obține partenerii neresponsivi
    const getUnresponsivePartners = useCallback(async (days: number = 7) => {
        setLoading(true);
        setError(null);
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/email-tracking/unresponsive-partners?days=${days}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Eroare la obținerea partenerilor neresponsivi';
            setError(errorMessage);
            return {
                success: false,
                error: errorMessage
            };
        } finally {
            setLoading(false);
        }
    }, []);

    // Trimite remindere automate
    const sendReminders = useCallback(async (days: number = 7, reminderType: 'SOFT' | 'NORMAL' | 'URGENT' = 'SOFT') => {
        setLoading(true);
        setError(null);
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/email-tracking/send-reminders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ days, reminderType }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Eroare la trimiterea reminder-elor';
            setError(errorMessage);
            return {
                success: false,
                error: errorMessage
            };
        } finally {
            setLoading(false);
        }
    }, []);

    // Generează raport de tracking
    const generateTrackingReport = useCallback(async (idLot?: string, idCerereConfirmare?: string) => {
        setLoading(true);
        setError(null);
        
        try {
            const queryParams = new URLSearchParams();
            if (idLot) queryParams.append('idLot', idLot);
            if (idCerereConfirmare) queryParams.append('idCerereConfirmare', idCerereConfirmare);
            
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/email-tracking/report?${queryParams.toString()}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Eroare la generarea raportului de tracking';
            setError(errorMessage);
            return {
                success: false,
                error: errorMessage
            };
        } finally {
            setLoading(false);
        }
    }, []);

    // Obține statistici de audit pentru fișierele PDF nesemnate
    const getAuditPDFNesemnate = useCallback(async (idSesiune?: string) => {
        setLoading(true);
        setError(null);
        
        try {
            const queryParams = new URLSearchParams();
            if (idSesiune) queryParams.append('idSesiune', idSesiune);
            
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/audit/pdf-nesemnate?${queryParams.toString()}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Eroare la obținerea auditului PDF nesemnate';
            setError(errorMessage);
            return {
                success: false,
                error: errorMessage
            };
        } finally {
            setLoading(false);
        }
    }, []);

    // Obține statistici generale despre semnăturile digitale
    const getStatisticiSemnatura = useCallback(async () => {
        setLoading(true);
        setError(null);
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/audit/statistici-semnatura`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Eroare la obținerea statisticilor de semnătură';
            setError(errorMessage);
            return {
                success: false,
                error: errorMessage
            };
        } finally {
            setLoading(false);
        }
    }, []);

    // Obține configurarea de securitate pentru blocarea fișierelor nesemnate
    const getConfigurareSecuritate = useCallback(async () => {
        setLoading(true);
        setError(null);
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/audit/configurare-securitate`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Eroare la obținerea configurării de securitate';
            setError(errorMessage);
            return {
                success: false,
                error: errorMessage
            };
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        loading,
        error,
        getJurnalEmailuri,
        getJurnalEmailById,
        getJurnalEmailStats,
        updateJurnalEmail,
        markForRetry,
        // Funcții pentru tracking
        getEmailTrackingStats,
        getUnresponsivePartners,
        sendReminders,
        generateTrackingReport,
        // Funcții pentru audit PDF și semnături digitale
        getAuditPDFNesemnate,
        getStatisticiSemnatura,
        getConfigurareSecuritate,
    };
};
