import axios from 'axios';
import { sesiuniService } from './sesiuni.service';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface UnifiedLoginCredentials {
    email: string;
    password: string;
}

export interface MasterUser {
    IdUtilizatori: string;
    NumeUtilizator: string;
    EmailUtilizator: string;
    RolUtilizator: string;
    TipUtilizator: 'MASTER';
}

export interface ContabilUser {
    IdContabil: string;
    NumeContabil: string;
    PrenumeContabil: string;
    EmailContabil: string;
    RolContabil: string;
    StatusContabil: string;
    TipUtilizator: 'CONTABIL';
    SchimbareParolaLaLogare?: boolean;
    PermisiuniAcces?: any;
}

export type UnifiedUser = MasterUser | ContabilUser;

export interface UnifiedLoginResponse {
    user: UnifiedUser;
    token: string;
    sessionId: string;
    message: string;
}

/**
 * Serviciu unificat de autentificare care permite autentificarea atât pentru utilizatori MASTER
 * cât și pentru CONTABILI, folosind noua rută API unificată.
 */
export const authUnifiedService = {
    /**
     * Autentifică un utilizator, fie MASTER, fie CONTABIL
     * @param credentials Credențialele de autentificare (email și parolă)
     * @returns Răspunsul de autentificare cu utilizatorul, token-ul și ID-ul sesiunii
     */    async login(credentials: UnifiedLoginCredentials): Promise<UnifiedLoginResponse> {
        try {
            const response = await axios.post(`${API_URL}/api/auth-unified/login`, credentials);
            
            // Adaptare pentru noul format API standardizat
            const apiResponse = response.data;
            
            if (!apiResponse.success) {
                throw new Error(apiResponse.message || 'Autentificare eșuată');
            }
            
            const { user, token, sessionId } = apiResponse.data;
            
            if (token) {
                // Stocăm datele utilizatorului și token-ul în localStorage
                localStorage.setItem('user', JSON.stringify(user));
                localStorage.setItem('token', token);
                localStorage.setItem('sessionId', sessionId);
                localStorage.setItem('currentSessionId', sessionId); // Pentru sesiuni.service.ts
                
                // Notificăm sesiuni.service.ts despre noua sesiune
                (sesiuniService as any).currentSessionId = sessionId;
                
                // Dacă utilizatorul este un contabil, stocăm și permisiunile
                if (user.TipUtilizator === 'CONTABIL' && user.PermisiuniAcces) {
                    localStorage.setItem('permisiuni', JSON.stringify(user.PermisiuniAcces));
                }
                
                console.log('Login successful - saved user data to localStorage');
            }
            
            return {
                user,
                token,
                sessionId,
                message: apiResponse.message
            };
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    },
    
    /**
     * Deconectează utilizatorul curent
     */
    logout(): void {
        localStorage.removeItem('user');
        localStorage.removeItem('permisiuni');
        localStorage.removeItem('token');
        localStorage.removeItem('sessionId');
        localStorage.removeItem('currentSessionId');
        
        // Resetăm și sesiuni.service.ts
        (sesiuniService as any).currentSessionId = null;
    },
    
    /**
     * Obține utilizatorul curent autentificat
     * @returns Utilizatorul curent sau null dacă nu există utilizator autentificat
     */
    getCurrentUser(): UnifiedUser | null {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            return JSON.parse(userStr);
        }
        return null;
    },
    
    /**
     * Obține token-ul JWT curent
     * @returns Token-ul JWT sau null dacă nu există
     */
    getToken(): string | null {
        return localStorage.getItem('token');
    },
    
    /**
     * Verifică dacă utilizatorul este autentificat
     * @returns true dacă utilizatorul este autentificat, altfel false
     */
    isAuthenticated(): boolean {
        return !!this.getToken();
    },
    
    /**
     * Verifică dacă utilizatorul curent este un contabil
     * @returns true dacă utilizatorul este un contabil, altfel false
     */
    isContabil(): boolean {
        const user = this.getCurrentUser();
        return user?.TipUtilizator === 'CONTABIL';
    },
    
    /**
     * Verifică dacă utilizatorul curent este un utilizator MASTER
     * @returns true dacă utilizatorul este un utilizator MASTER, altfel false
     */
    isMaster(): boolean {
        const user = this.getCurrentUser();
        return user?.TipUtilizator === 'MASTER';
    },
    
    /**
     * Verifică dacă utilizatorul curent trebuie să-și schimbe parola
     * @returns true dacă utilizatorul trebuie să-și schimbe parola, altfel false
     */
    needsPasswordChange(): boolean {
        const user = this.getCurrentUser();
        if (user?.TipUtilizator === 'CONTABIL') {
            return !!(user as ContabilUser).SchimbareParolaLaLogare;
        }
        return false;
    },
    
    /**
     * Obține permisiunile utilizatorului curent
     * @returns Permisiunile utilizatorului sau null dacă nu există
     */
    getPermisiuni(): any | null {
        // Încercăm să obținem permisiunile din user
        const user = this.getCurrentUser();
        if (user?.TipUtilizator === 'CONTABIL' && (user as ContabilUser).PermisiuniAcces) {
            return (user as ContabilUser).PermisiuniAcces;
        }
        
        // Dacă nu sunt în user, încercăm să le obținem din localStorage
        const permisiuniStr = localStorage.getItem('permisiuni');
        if (permisiuniStr) {
            return JSON.parse(permisiuniStr);
        }
        
        return null;
    },
    
    /**
     * Obține profilul utilizatorului curent de la server
     * @returns Profilul utilizatorului
     */
    async getProfile(): Promise<UnifiedUser> {
        const response = await axios.get(`${API_URL}/api/auth-unified/profile`, {
            headers: { Authorization: `Bearer ${this.getToken()}` }
        });
        
        // Actualizăm datele utilizatorului în localStorage
        localStorage.setItem('user', JSON.stringify(response.data));
        
        // Dacă utilizatorul este un contabil, actualizăm și permisiunile
        if (response.data.TipUtilizator === 'CONTABIL' && response.data.PermisiuniAcces) {
            localStorage.setItem('permisiuni', JSON.stringify(response.data.PermisiuniAcces));
        }
        
        return response.data;
    }
};

export default authUnifiedService;
