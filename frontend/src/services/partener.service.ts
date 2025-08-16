import { Partener, PartenerFormData, PartenerApiResponse, SinglePartenerApiResponse, PartenerListResponse } from '../types/partener';

class PartenerService {
    private baseUrl = '/api/parteneri';

    private async makeRequest<T>(
        endpoint: string, 
        options: RequestInit = {}
    ): Promise<T> {
        const token = localStorage.getItem('token');
        
        if (!token) {
            throw new Error('Nu ești autentificat. Te rog să te conectezi.');
        }

        const url = `${this.baseUrl}${endpoint}`;
        
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...options.headers,
            },
        });

        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
            throw new Error('Sesiunea a expirat. Te rog să te conectezi din nou.');
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        return response.json();
    }    // Obține toți partenerii cu sortare, filtrare și paginare
    async getAllParteneri(options?: {
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
        status?: 'all' | 'active' | 'inactive';
        partnerType?: 'all' | 'client' | 'furnizor' | 'client-duc' | 'client-dl' | 'furnizor-duc' | 'furnizor-dl';
        page?: number;
        limit?: number;
    }): Promise<PartenerListResponse> {
        try {
            const params = new URLSearchParams();
            
            if (options?.sortBy) params.append('sortBy', options.sortBy);
            if (options?.sortOrder) params.append('sortOrder', options.sortOrder);
            if (options?.status) params.append('status', options.status);
            if (options?.partnerType) params.append('partnerType', options.partnerType);
            if (options?.page) params.append('page', options.page.toString());
            if (options?.limit) params.append('limit', options.limit.toString());
            
            const queryString = params.toString();
            const endpoint = queryString ? `/?${queryString}` : '/';
            
            const response = await this.makeRequest<PartenerApiResponse>(endpoint);
            
            if (response.success && response.data && response.meta?.pagination) {
                return {
                    parteneri: response.data,
                    pagination: response.meta.pagination
                };
            } else {
                throw new Error(response.message || 'Eroare la obținerea partenerilor');
            }
        } catch (error) {
            console.error('Eroare la încărcarea partenerilor:', error);
            throw error;
        }
    }

    // Obține parteneri după ID-uri (pentru selecție din mai multe pagini)
    async getPartnersByIds(ids: string[]): Promise<Partener[]> {
        try {
            if (ids.length === 0) {
                return [];
            }

            // Trimite ID-urile ca query string
            const params = new URLSearchParams();
            ids.forEach(id => params.append('ids', id));
            
            const response = await this.makeRequest<PartenerApiResponse>(`/by-ids?${params.toString()}`);
            
            if (response.success && Array.isArray(response.data)) {
                return response.data;
            } else {
                throw new Error(response.message || 'Eroare la obținerea partenerilor selectați');
            }
        } catch (error) {
            console.error('Eroare la obținerea partenerilor după ID-uri:', error);
            throw error;
        }
    }

    // Obține un partener după ID
    async getPartenerById(id: string): Promise<Partener> {
        try {
            const response = await this.makeRequest<SinglePartenerApiResponse>(`/${id}`);
            
            if (response.success && response.data) {
                return response.data;
            } else {
                throw new Error(response.message || 'Eroare la obținerea partenerului');
            }
        } catch (error) {
            console.error('Eroare la încărcarea partenerului:', error);
            throw error;
        }
    }

    // Creează un partener nou
    async createPartener(partenerData: PartenerFormData): Promise<Partener> {
        try {
            const response = await this.makeRequest<SinglePartenerApiResponse>('/', {
                method: 'POST',
                body: JSON.stringify(partenerData),
            });
            
            if (response.success && response.data) {
                return response.data;
            } else {
                throw new Error(response.message || 'Eroare la crearea partenerului');
            }
        } catch (error) {
            console.error('Eroare la crearea partenerului:', error);
            throw error;
        }
    }

    // Actualizează un partener
    async updatePartener(id: string, partenerData: PartenerFormData): Promise<Partener> {
        try {
            const response = await this.makeRequest<SinglePartenerApiResponse>(`/${id}`, {
                method: 'PUT',
                body: JSON.stringify(partenerData),
            });
            
            if (response.success && response.data) {
                return response.data;
            } else {
                throw new Error(response.message || 'Eroare la actualizarea partenerului');
            }
        } catch (error) {
            console.error('Eroare la actualizarea partenerului:', error);
            throw error;
        }
    }

    // Șterge un partener
    async deletePartener(id: string): Promise<void> {
        try {
            const response = await this.makeRequest<{ success: boolean; message: string }>(`/${id}`, {
                method: 'DELETE',
            });
            
            if (!response.success) {
                throw new Error(response.message || 'Eroare la ștergerea partenerului');
            }
        } catch (error) {
            console.error('Eroare la ștergerea partenerului:', error);
            throw error;
        }    }

    // Caută parteneri
    async searchParteneri(query: string, type?: 'client' | 'furnizor'): Promise<Partener[]> {
        try {
            const params = new URLSearchParams({ query });
            if (type) {
                params.append('type', type);
            }

            const response = await this.makeRequest<PartenerApiResponse>(`/search?${params.toString()}`);
            
            if (response.success && response.data) {
                return response.data;
            } else {
                throw new Error(response.message || 'Eroare la căutarea partenerilor');
            }
        } catch (error) {
            console.error('Eroare la căutarea partenerilor:', error);
            throw error;
        }
    }

    // Obține toate ID-urile partenerilor (pentru selecție din toate paginile)
    async getAllPartnerIds(options?: {
        status?: 'all' | 'active' | 'inactive';
        partnerType?: 'all' | 'client' | 'furnizor' | 'client-duc' | 'client-dl' | 'furnizor-duc' | 'furnizor-dl';
    }): Promise<string[]> {
        try {
            const params = new URLSearchParams();
            
            if (options?.status) params.append('status', options.status);
            if (options?.partnerType) params.append('partnerType', options.partnerType);
            params.append('page', '1');
            params.append('limit', '10000'); // Limită mare pentru a obține toate ID-urile
            
            const response = await this.makeRequest<PartenerApiResponse>(`/?${params.toString()}`);
            
            if (response.success && Array.isArray(response.data)) {
                return response.data.map(partener => partener.idPartener);
            } else {
                throw new Error(response.message || 'Eroare la obținerea ID-urilor partenerilor');
            }
        } catch (error) {
            console.error('Eroare la obținerea ID-urilor partenerilor:', error);
            throw error;
        }
    }

    // Determină tipul partenerului
    getPartenerType(partener: Partener): 'client' | 'furnizor' | 'ambele' | 'nedefinit' {
        const isClient = partener.clientDUC || partener.clientDL;
        const isFurnizor = partener.furnizorDUC || partener.furnizorDL;
        
        if (isClient && isFurnizor) {
            return 'ambele';
        } else if (isClient) {
            return 'client';
        } else if (isFurnizor) {
            return 'furnizor';
        } else {
            return 'nedefinit';
        }
    }

    // Formatează data pentru afișare
    formatDate(date: Date | string | undefined): string {
        if (!date) return 'N/A';
        
        const d = typeof date === 'string' ? new Date(date) : date;
        return d.toLocaleDateString('ro-RO', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    }    // Obține date pentru dashboard
    async getDashboardStats(): Promise<{
        totalPartners: number;
        respondedPartners: number;
        pendingPartners: number;
        lastRequestDate: string;
    }> {
        try {
            const response = await this.makeRequest<any>('/stats/dashboard');
            
            if (response.success && response.data) {
                return {
                    totalPartners: response.data.totalPartners || 0,
                    respondedPartners: response.data.respondedPartners || 0,
                    pendingPartners: response.data.pendingPartners || 0,
                    lastRequestDate: response.data.lastRequestDate ? this.formatDate(response.data.lastRequestDate) : 'N/A'
                };
            } else {
                throw new Error(response.message || 'Eroare la obținerea statisticilor');
            }
        } catch (error) {
            console.error('Eroare la obținerea statisticilor pentru dashboard:', error);
            // Returnăm valori implicite în caz de eroare
            return {
                totalPartners: 0,
                respondedPartners: 0,
                pendingPartners: 0,
                lastRequestDate: 'N/A'
            };
        }
    }    // Obține partenerii adăugați recent pentru dashboard
    async getRecentPartners(limit: number = 3): Promise<Partener[]> {
        try {
            const params = new URLSearchParams();
            params.append('limit', limit.toString());
            
            const response = await this.makeRequest<PartenerApiResponse>(`/recent?${params.toString()}`);
            
            if (response.success && Array.isArray(response.data)) {
                return response.data;
            } else {
                throw new Error(response.message || 'Eroare la obținerea partenerilor recenți');
            }
        } catch (error) {
            console.error('Eroare la obținerea partenerilor recenți:', error);
            return [];
        }
    }
}

export const partenerService = new PartenerService();
