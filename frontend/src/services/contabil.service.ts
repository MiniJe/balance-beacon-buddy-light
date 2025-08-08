export interface Contabil {
  IdContabil: string;
  NumeContabil: string;
  PrenumeContabil: string;
  EmailContabil: string;
  TelefonContabil?: string;
  DepartmentContabil?: string;
  RolContabil: string;
  StatusContabil: string;
  DatăAngajareContabil?: Date;
  DataUltimeiLogări?: Date;
  DatăCreareContabil: Date;
  ContabilCreatDe: string;
  DataActualizării?: Date;
  ActualizatDE?: string;
  SchimbareParolaLaLogare?: boolean;
  PermisiuniContabil?: {
    IdPermisiune?: string;
    PoateModificaParteneri: boolean;
    PoateAdaugaParteneri: boolean;
    PoateVedeaRapoarte: boolean;
    PoateModificaSabloane: boolean;
    PoateCreaCereri: boolean;
    PoateAdaugaUtilizatori: boolean;
    PoateModificaSetari: boolean;
  };
}

export interface CreateContabilDto {
  NumeContabil: string;
  PrenumeContabil: string;
  EmailContabil: string;
  TelefonContabil?: string;
  DepartmentContabil?: string;
  RolContabil: string;
  StatusContabil: string;
  DatăAngajareContabil?: string; // ISO string format for date
  PermisiuniAcces?: {
    PoateModificaParteneri: boolean;
    PoateAdaugaParteneri: boolean;
    PoateVedeaRapoarte: boolean;
    PoateModificaSabloane: boolean;
    PoateCreaCereri: boolean;
    PoateAdaugaUtilizatori: boolean;
    PoateModificaSetari: boolean;
  };
}

export const contabilService = {  
  getContabili: async (): Promise<Contabil[]> => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Utilizator neautentificat');
    }

    try {
      console.log('📡 Fetching contabili list from API...');
      const response = await fetch('/api/contabili', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });      if (!response.ok) {
        console.error('❌ Response not OK, status:', response.status);
        if (response.status === 401) {
          console.log('🔒 Unauthorized - removing token and redirecting');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          throw new Error('Sesiune expirată');
        }
        
        let errorData;
        try {
          errorData = await response.json();
          console.error('API Error Data:', errorData);
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          errorData = { message: 'Eroare la obținerea listei de contabili' };
        }
        throw new Error(errorData.message || 'Eroare la obținerea listei de contabili');
      }

      const data = await response.json();
      console.log('📦 API Response:', data);
      
      if (!data.success) {
        throw new Error(data.message || 'Eroare la obținerea listei de contabili');
      }
      
      if (!Array.isArray(data.data)) {
        console.error('❌ Invalid API response format:', data);
        throw new Error('Format invalid al răspunsului de la API');
      }
      
      // Validăm că fiecare contabil are un IdContabil
      data.data.forEach((contabil: any, index: number) => {
        if (!contabil.IdContabil) {
          console.error(`❌ Contabil at index ${index} is missing IdContabil:`, contabil);
        }
      });
      
      return data.data;
    } catch (error) {
      console.error('❌ Error in getContabili:', error);
      throw error;
    }
  },  createContabil: async (contabilData: CreateContabilDto): Promise<Contabil> => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Utilizator neautentificat');
    }

    try {
      console.log('📡 Creating new contabil with data:', contabilData);
      const response = await fetch('/api/contabili', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(contabilData)
      });

      console.log('📦 Create contabil status:', response.status);
      
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          throw new Error('Sesiune expirată');
        }
        
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.message || 'Eroare la crearea contabilului');
      }

      const data = await response.json();
      console.log('📦 Create contabil response:', data);
      
      if (!data.success) {
        throw new Error(data.message || 'Eroare la crearea contabilului');
      }
      
      // Validăm răspunsul
      if (!data.data || !data.data.IdContabil) {
        console.error('❌ Invalid API response:', data);
        throw new Error('Format invalid al răspunsului de la API - lipsește IdContabil');
      }
      
      return data.data;
    } catch (error) {
      console.error('❌ Error in createContabil:', error);
      throw error;
    }
  },  updateContabilStatus: async (idContabil: string, status: string): Promise<boolean> => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Utilizator neautentificat');
    }

    const response = await fetch(`/api/contabili/${idContabil}/status`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: status })
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        throw new Error('Sesiune expirată');
      }
      throw new Error('Eroare la actualizarea statusului contabilului');
    }

    const data = await response.json();
    return data.success;
  },
  updateContabilPermisiuni: async (idContabil: string, permisiuni: any): Promise<boolean> => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Utilizator neautentificat');
    }

    const response = await fetch(`/api/contabili/${idContabil}/permisiuni`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(permisiuni)
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        throw new Error('Sesiune expirată');
      }
      throw new Error('Eroare la actualizarea permisiunilor contabilului');
    }

    const data = await response.json();
    return data.success;
  },
  resetContabilPassword: async (idContabil: string): Promise<boolean> => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Utilizator neautentificat');
    }

    const response = await fetch(`/api/contabili/${idContabil}/reset-password`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        throw new Error('Sesiune expirată');
      }
      throw new Error('Eroare la resetarea parolei contabilului');
    }    const data = await response.json();
    return data.success;
  },

  updateContabil: async (idContabil: string, contabilData: CreateContabilDto): Promise<Contabil> => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Utilizator neautentificat');
    }

    const response = await fetch(`/api/contabili/${idContabil}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(contabilData)
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        throw new Error('Sesiune expirată');
      }
      throw new Error('Eroare la actualizarea contabilului');
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Eroare la actualizarea contabilului');
    }
    return data.data;
  },

  deleteContabil: async (idContabil: string): Promise<boolean> => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Utilizator neautentificat');
    }

    const response = await fetch(`/api/contabili/${idContabil}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        throw new Error('Sesiune expirată');
      }
      throw new Error('Eroare la ștergerea contabilului');
    }

    const data = await response.json();
    return data.success;
  },

  resetPassword: async (idContabil: string): Promise<boolean> => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Utilizator neautentificat');
    }

    const response = await fetch(`/api/contabili/${idContabil}/reset-password`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        throw new Error('Sesiune expirată');
      }
      throw new Error('Eroare la resetarea parolei');
    }

    const data = await response.json();
    return data.success;
  },
};
