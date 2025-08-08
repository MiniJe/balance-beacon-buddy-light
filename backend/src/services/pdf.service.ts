import puppeteer from 'puppeteer';

interface PdfOptions {
  title?: string;
  includeInactive?: boolean;
  includeObservations?: boolean;
  orientation?: 'portrait' | 'landscape';
}

interface EmailPdfData {
  to: string;
  subject: string;
  body: string;
  attachmentName?: string;
}

class PdfService {
  async generatePartnersPDF(partners: any[], options: PdfOptions = {}): Promise<Buffer> {
    console.log(`🚀 Generare PDF pentru ${partners.length} parteneri cu Puppeteer`);
    
    try {
      // Creează tabela HTML pentru parteneri
      const tableRows = partners.map((partner, index) => `
        <tr>
          <td style="text-align: center; padding: 8px; border: 1px solid #ddd;">${index + 1}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${partner.numePartener || 'N/A'}</td>
          <td style="text-align: center; padding: 8px; border: 1px solid #ddd;">${partner.cuiPartener || 'N/A'}</td>
          <td style="text-align: center; padding: 8px; border: 1px solid #ddd;">${partner.telefonPartener || ' '}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${partner.emailPartener || ' '}</td>
          <td style="text-align: center; padding: 8px; border: 1px solid #ddd;">${partner.clientDUC ? '●' : ''}</td>
          <td style="text-align: center; padding: 8px; border: 1px solid #ddd;">${partner.clientDL ? '●' : ''}</td>
          <td style="text-align: center; padding: 8px; border: 1px solid #ddd;">${partner.furnizorDUC ? '●' : ''}</td>
          <td style="text-align: center; padding: 8px; border: 1px solid #ddd;">${partner.furnizorDL ? '●' : ''}</td>
        </tr>
      `).join('');
      
      // Template HTML complet
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${options.title || 'Lista Parteneri'}</title>
          <style>
            @page {
              margin: 30px;
              size: ${options.orientation || 'landscape'};
            }
            body {
              font-family: Arial, sans-serif;
              font-size: 14px;
              color: #333;
              margin: 0;
              padding: 0;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
            }
            .title {
              font-size: 20px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .subtitle {
              font-size: 12px;
              margin-bottom: 20px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
              page-break-inside: auto;
            }
            thead {
              display: table-header-group;
            }
            tfoot {
              display: table-footer-group;
            }
            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
            th {
              background-color: #f2f2f2;
              font-weight: bold;
              padding: 8px 6px;
              text-align: left;
              border: 1px solid #ddd;
              font-size: 10px;
            }
            td {
              padding: 6px;
              border: 1px solid #ddd;
              font-size: 9px;
            }
            .footer {
              position: fixed;
              bottom: 0;
              width: 100%;
              text-align: center;
              font-size: 10px;
              padding: 10px 0;
            }
            @media print {
              thead {
                display: table-header-group;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">${options.title || 'LISTĂ PARTENERI'}</div>
            <div class="subtitle">Total parteneri: ${partners.length} | Generat: ${new Date().toLocaleDateString('ro-RO')}</div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th style="width: 25px; text-align: center;">Nr.</th>
                <th style="width: 180px;">NUME PARTENER</th>
                <th style="width: 60px; text-align: center;">CUI</th>
                <th style="width: 80px; text-align: center;">Telefon</th>
                <th style="width: 120px;">Email</th>
                <th style="width: 40px; text-align: center;">Client DUC</th>
                <th style="width: 40px; text-align: center;">Client DL</th>
                <th style="width: 45px; text-align: center;">Furnizor DUC</th>
                <th style="width: 45px; text-align: center;">Furnizor DL</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          
          <script>
            // Adaugă numărul paginii în footer
            function addPageNumbers() {
              var totalPages = Math.ceil(document.body.scrollHeight / 1123); // Aproximativ A4 în pixeli
              var footer = document.createElement('div');
              footer.className = 'footer';
              // footer.innerHTML = 'Pagina ' + window.pageNumber + ' din ' + totalPages;
              document.body.appendChild(footer);
            }
            window.addEventListener('load', addPageNumbers);
          </script>
        </body>
        </html>
      `;
      
      // Lansează Puppeteer
      const browser = await puppeteer.launch({
        headless: true, // Folosește modul headless standard
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      // Generează PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '30px',
          right: '30px',
          bottom: '30px',
          left: '30px'
        },
        displayHeaderFooter: true,
        headerTemplate: ' ',
        footerTemplate: `
          <div style="width: 100%; font-size: 8px; text-align: left; color: #444;">
            <div>          Legendă: DUC = DUCFARM S.R.L. | DL = DUCFARM LOGISTIC S.R.L. | * = Da | (gol) = Nu</div>
          </div>
          <div style="width: 100%; font-size: 8px; text-align: center; color: #444;">
            <div>Pagina <span class="pageNumber"></span> din <span class="totalPages"></span></div>
          </div>
        `,
        landscape: options.orientation === 'landscape'
      });
      
      await browser.close();
      console.log(`✅ PDF generat cu Puppeteer: ${pdfBuffer.length} bytes`);
      
      return Buffer.from(pdfBuffer);
    } catch (error) {
      console.error('❌ Eroare la generarea PDF:', error);
      throw error;
    }
  }
  
  async generatePrintPDF(partners: any[], options: PdfOptions = {}): Promise<Buffer> {
    return this.generatePartnersPDF(partners, { 
      ...options, 
      title: 'Lista pentru Printare',
      orientation: 'landscape'
    });
  }
  
  async generateEmailPDF(partners: any[], emailData: EmailPdfData): Promise<Buffer> {
    return this.generatePartnersPDF(partners, { 
      title: emailData.subject,
      orientation: 'landscape'
    });
  }
}

const pdfService = new PdfService();
export { pdfService, PdfService };
export default pdfService;