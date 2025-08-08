/**
 * Serviciu pentru gestionarea sesiunilor cu suport blockchain MultiversX
 */

import { API_BASE_URL } from '../config/api';

export interface CreateSesiuneDto {
  idUtilizator: string;
  numeUtilizator: string;
  emailUtilizator: string;
  rolUtilizator: string;
  tipUtilizator?: 'utilizator' | 'contabil';
  tokenSesiune?: string;
  observatii?: string;
}

export interface SesiuneInfo {
  idSesiune: string;
  idUtilizator: string;
  numeUtilizator: string;
  emailUtilizator: string;
  rolUtilizator: string;
  tipUtilizator: string;
  dataOraLogin: string;
  dataOraLogout?: string | null;
  durataSesiune?: number | null;
  statusSesiune: 'activa' | 'inchisa' | 'expirata';
  adresaIP?: string;
  browser?: string;
  sistemeOperare?: string;
  dispozitiv?: string;
  hashLogin?: string;
  hashLogout?: string;
  blockchainStatus?: 'pending' | 'confirmed' | 'failed';
  ultimaActivitate?: string;
  numarActiuni: number;
  observatii?: string;
  creatLa: string;
  modificatLa: string;
}

export interface SesiuniStats {
  totalSesiuni: number;
  sesiuniActive: number;
  sesiuniInchise: number;
  sesiuniExpirate: number;
  durataMediaSesiune: number;
  utilizatoriActivi: number;
  contabiliActivi: number;
  ultimaActivitate?: string;
}

class SesiuniService {
  // Folosim configurația API_BASE_URL pentru a se conecta la backend pe portul corect
  private baseURL = API_BASE_URL;
  
  private currentSessionId: string | null = null;

  /**
   * Obține header-urile pentru request-uri
   */
  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  /**
   * Obține informații despre dispozitiv/browser
   */
  private getDeviceInfo() {
    const ua = navigator.userAgent;
    return {
      userAgent: ua,
      browser: this.getBrowserName(ua),
      sistemeOperare: this.getOSName(ua),
      dispozitiv: this.getDeviceType(ua)
    };
  }

  private getBrowserName(ua: string): string {
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    if (ua.includes('Opera')) return 'Opera';
    return 'Unknown';
  }

  private getOSName(ua: string): string {
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iOS')) return 'iOS';
    return 'Unknown';
  }

  private getDeviceType(ua: string): string {
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
      return 'mobile';
    }
    if (/Tablet|iPad/.test(ua)) {
      return 'tablet';
    }
    return 'desktop';
  }

  /**
   * Creează o nouă sesiune (login)
   */
  async createSesiune(data: CreateSesiuneDto): Promise<string> {
    try {
      const deviceInfo = this.getDeviceInfo();
      const requestData = {
        ...data,
        ...deviceInfo,
        tokenSesiune: localStorage.getItem('token')
      };

      const response = await fetch(`${this.baseURL}/sesiuni/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
        if (result.success) {
        this.currentSessionId = result.data.idSesiune;
        if (this.currentSessionId) {
          localStorage.setItem('currentSessionId', this.currentSessionId);
        }
        console.log('✅ Sesiune creată:', this.currentSessionId);
        return this.currentSessionId!;
      } else {
        throw new Error(result.message || 'Eroare la crearea sesiunii');
      }
    } catch (error) {
      console.error('Eroare la crearea sesiunii:', error);
      throw error;
    }
  }

  /**
   * Închide sesiunea curentă (logout)
   */
  async closeSesiune(observatii?: string): Promise<void> {
    try {
      const sessionId = this.currentSessionId || localStorage.getItem('currentSessionId') || localStorage.getItem('sessionId');
      
      if (!sessionId) {
        console.warn('Nu există sesiune activă de închis');
        return;
      }

      console.log('🔄 Closing session:', sessionId);

      const response = await fetch(`${this.baseURL}/sesiuni/${sessionId}/logout`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({ observatii })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        this.currentSessionId = null;
        localStorage.removeItem('currentSessionId');
        console.log('✅ Sesiune închisă cu succes');
      } else {
        throw new Error(result.message || 'Eroare la închiderea sesiunii');
      }
    } catch (error) {
      console.error('Eroare la închiderea sesiunii:', error);
      // Nu aruncăm eroarea pentru că logout-ul trebuie să continue
    }
  }

  /**
   * Actualizează activitatea utilizatorului
   */
  async updateActivitate(): Promise<void> {
    try {
      const sessionId = this.currentSessionId || localStorage.getItem('currentSessionId');
      
      if (!sessionId) {
        return; // Nu există sesiune activă
      }

      await fetch(`${this.baseURL}/sesiuni/${sessionId}/activitate`, {
        method: 'PUT',
        headers: this.getHeaders()
      });
    } catch (error) {
      console.error('Eroare la actualizarea activității:', error);
      // Nu aruncăm eroarea pentru că este o operație în background
    }
  }

  /**
   * Obține sesiunea activă pentru un utilizator
   */
  async getSesiuneActiva(idUtilizator: string): Promise<SesiuneInfo | null> {
    try {
      const response = await fetch(`${this.baseURL}/sesiuni/activa/${idUtilizator}`, {
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.success ? result.data : null;
    } catch (error) {
      console.error('Eroare la obținerea sesiunii active:', error);
      return null;
    }
  }

  /**
   * Obține statistici despre sesiuni
   */
  async getStatistici(): Promise<SesiuniStats | null> {
    try {
      const response = await fetch(`${this.baseURL}/sesiuni/statistici`, {
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.success ? result.data : null;
    } catch (error) {
      console.error('Eroare la obținerea statisticilor:', error);
      return null;
    }
  }

  /**
   * Obține ID-ul sesiunii curente
   */
  getCurrentSessionId(): string | null {
    return this.currentSessionId || localStorage.getItem('currentSessionId');
  }

  /**
   * Inițializează serviciul de sesiuni la încărcarea aplicației
   */
  initialize(): void {
    this.currentSessionId = localStorage.getItem('currentSessionId') || localStorage.getItem('sessionId');
    console.log('🔄 SesiuniService initialized with sessionId:', this.currentSessionId);
    
    // Actualizează activitatea la intervale regulate (5 minute)
    setInterval(() => {
      this.updateActivitate();
    }, 5 * 60 * 1000);

    // Actualizează activitatea la diverse evenimente
    ['click', 'keypress', 'scroll', 'mousemove'].forEach(event => {
      let lastUpdate = 0;
      document.addEventListener(event, () => {
        const now = Date.now();
        // Actualizează doar o dată pe minut pentru a nu face prea multe request-uri
        if (now - lastUpdate > 60000) {
          this.updateActivitate();
          lastUpdate = now;
        }
      });
    });

    // Logout automată la închiderea ferestrei/tab-ului
    window.addEventListener('beforeunload', () => {
      this.closeSesiune('Închidere browser/tab');
    });
  }
}

export const sesiuniService = new SesiuniService();
