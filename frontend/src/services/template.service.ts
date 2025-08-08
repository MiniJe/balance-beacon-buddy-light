import { API_BASE_URL } from '../config/api';

export interface EmailTemplate {
  IdSablon: string;
  NumeSablon: string;
  ContinutSablon: string;
  TipSablon: 'email' | 'pdf';
  CategorieSablon: 'client' | 'furnizor' | 'general' | 'reminder' | 'fise';
  Activ: boolean;
  CreatLa: string;
  CreatDe: string;
  ModificatLa?: string;
  ModificatDe?: string;
}

export interface TemplateVariable {
  IdVariabila: string;
  NumeVariabila: string;
  DescriereVariabila: string;
  ValoareDefault?: string;
  TipVariabila: 'text' | 'number' | 'date' | 'currency';
  Obligatorie: boolean;
}

export interface TemplateProcessData {
  numePartener?: string;
  cuiPartener?: string;
  data?: string;
  numeCompanie?: string;
  dataTrimitere?: string;
  perioada?: string;
  observatii?: string;
  adresaPartener?: string;
  telefonPartener?: string;
  emailPartener?: string;
}

class TemplateService {
  private getAuthHeader() {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Obține toate șabloanele
   */
  async getAllTemplates(): Promise<EmailTemplate[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/templates`, {
        method: 'GET',
        headers: this.getAuthHeader()
      });

      if (!response.ok) {
        throw new Error(`Eroare HTTP: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Eroare la obținerea șabloanelor');
      }

      return data.data;
    } catch (error) {
      console.error('❌ Eroare la obținerea șabloanelor:', error);
      throw error;
    }
  }

  /**
   * Obține un șablon după ID
   */
  async getTemplateById(idSablon: string): Promise<EmailTemplate> {
    try {
      const response = await fetch(`${API_BASE_URL}/templates/${idSablon}`, {
        method: 'GET',
        headers: this.getAuthHeader()
      });

      if (!response.ok) {
        throw new Error(`Eroare HTTP: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Eroare la obținerea șablonului');
      }

      return data.data;
    } catch (error) {
      console.error('❌ Eroare la obținerea șablonului:', error);
      throw error;
    }
  }

  /**
   * Creează un șablon nou
   */
  async createTemplate(template: Partial<EmailTemplate>): Promise<string> {
    try {
      const response = await fetch(`${API_BASE_URL}/templates`, {
        method: 'POST',
        headers: this.getAuthHeader(),
        body: JSON.stringify(template)
      });

      if (!response.ok) {
        throw new Error(`Eroare HTTP: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Eroare la crearea șablonului');
      }

      return data.data.IdSablon;
    } catch (error) {
      console.error('❌ Eroare la crearea șablonului:', error);
      throw error;
    }
  }

  /**
   * Actualizează un șablon
   */
  async updateTemplate(idSablon: string, template: Partial<EmailTemplate>): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/templates/${idSablon}`, {
        method: 'PUT',
        headers: this.getAuthHeader(),
        body: JSON.stringify(template)
      });

      if (!response.ok) {
        throw new Error(`Eroare HTTP: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Eroare la actualizarea șablonului');
      }
    } catch (error) {
      console.error('❌ Eroare la actualizarea șablonului:', error);
      throw error;
    }
  }

  /**
   * Șterge un șablon
   */
  async deleteTemplate(idSablon: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/templates/${idSablon}`, {
        method: 'DELETE',
        headers: this.getAuthHeader()
      });

      if (!response.ok) {
        throw new Error(`Eroare HTTP: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Eroare la ștergerea șablonului');
      }
    } catch (error) {
      console.error('❌ Eroare la ștergerea șablonului:', error);
      throw error;
    }
  }

  /**
   * Obține variabilele disponibile
   */
  async getTemplateVariables(): Promise<TemplateVariable[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/templates/variables`, {
        method: 'GET',
        headers: this.getAuthHeader()
      });

      if (!response.ok) {
        throw new Error(`Eroare HTTP: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Eroare la obținerea variabilelor');
      }

      return data.data;
    } catch (error) {
      console.error('❌ Eroare la obținerea variabilelor:', error);
      throw error;
    }
  }

  /**
   * Obține șabloane după categorie
   */
  async getTemplatesByCategory(category: string): Promise<EmailTemplate[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/templates/category/${category}`, {
        method: 'GET',
        headers: this.getAuthHeader()
      });

      if (!response.ok) {
        throw new Error(`Eroare HTTP: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Eroare la obținerea șabloanelor după categorie');
      }

      return data.data;
    } catch (error) {
      console.error('❌ Eroare la obținerea șabloanelor după categorie:', error);
      throw error;
    }
  }

  /**
   * Procesează un șablon cu date specifice
   */
  async processTemplate(idSablon: string, partnerData: TemplateProcessData): Promise<string> {
    try {
      const response = await fetch(`${API_BASE_URL}/templates/${idSablon}/process`, {
        method: 'POST',
        headers: this.getAuthHeader(),
        body: JSON.stringify(partnerData)
      });

      if (!response.ok) {
        throw new Error(`Eroare HTTP: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Eroare la procesarea șablonului');
      }

      return data.data.processedContent;
    } catch (error) {
      console.error('❌ Eroare la procesarea șablonului:', error);
      throw error;
    }
  }

  /**
   * Preview pentru un șablon cu date de test
   */
  async previewTemplate(content: string, partnerData?: Partial<TemplateProcessData>): Promise<string> {
    try {
      const response = await fetch(`${API_BASE_URL}/templates/preview`, {
        method: 'POST',
        headers: this.getAuthHeader(),
        body: JSON.stringify({
          content,
          partnerData: partnerData || {}
        })
      });

      if (!response.ok) {
        throw new Error(`Eroare HTTP: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Eroare la generarea preview-ului');
      }

      return data.data;
    } catch (error) {
      console.error('❌ Eroare la generarea preview-ului:', error);
      throw error;
    }
  }
}

export const templateService = new TemplateService();
