import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class PdfService {
  /**
   * Descarcă PDF cu lista de parteneri
   * @param partners Lista de parteneri
   * @param title Titlul documentului
   * @param orientation Orientarea paginii ('portrait' | 'landscape')
   */
  async downloadPartnersPdf(partners: any[], title?: string, orientation?: 'portrait' | 'landscape'): Promise<void> {
    try {
      const response = await axios.post(
        `${API_URL}/pdf/download`,
        { partners, title, orientation },
        {
          responseType: 'blob',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      // Creează un URL pentru descărcare
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      // Creează un element <a> invizibil și declanșează descărcarea
      const link = document.createElement('a');
      link.href = url;
      link.download = `lista-parteneri-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      // Curăță
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (error) {
      console.error('Eroare la descărcarea PDF:', error);
      throw error;
    }
  }
  
  /**
   * Generează PDF pentru print
   */
  async generatePrintPdf(partners: any[], options?: any): Promise<Blob> {
    const response = await axios.post(
      `${API_URL}/pdf/print`,
      { partners, options },
      {
        responseType: 'blob',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    );
    
    return new Blob([response.data], { type: 'application/pdf' });
  }
  
  /**
   * Generează PDF pentru email
   */
  async generateEmailPdf(partners: any[], emailData: any): Promise<Blob> {
    const response = await axios.post(
      `${API_URL}/pdf/email`,
      { partners, emailData },
      {
        responseType: 'blob',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    );
    
    return new Blob([response.data], { type: 'application/pdf' });
  }
}

export const pdfService = new PdfService();