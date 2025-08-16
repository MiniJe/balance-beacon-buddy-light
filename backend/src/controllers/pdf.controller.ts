import { Request, Response } from 'express';
import { pdfService } from '../services/pdf.service';
import { getDatabase } from '../config/sqlite';
import { ApiResponseHelper } from '../types/api.types';

class PdfController {
  /**
   * Generează și descarcă un PDF cu lista partenerilor
   */
  async downloadPartnersPdf(req: Request, res: Response): Promise<void> {
    try {
      const partners = req.body.partners || [];
      
      if (!Array.isArray(partners)) {
        const errorResponse = ApiResponseHelper.validationError(
          'Formatul datelor este invalid. Se așteaptă un array de parteneri.',
          'partners'
        );
        res.status(400).json(errorResponse);
        return;
      }
      
      console.log(`📋 Procesare cerere descărcare PDF pentru ${partners.length} parteneri`);
      
      const options = {
        title: req.body.title || 'LISTĂ PARTENERI',
        orientation: req.body.orientation || 'landscape',
        sessionInfo: req.body.sessionInfo || undefined,
      };
      
      console.log(`🧩 Obțin PDF pentru ${partners.length} parteneri cu opțiunile:`, options);
      // Îmbogățește datele partenerilor cu CUI, data trimitere, nume fișier și data răspuns
      const db = await getDatabase();
      const enriched = await Promise.all(partners.map(async (p: any) => {
        const id = p.idPartener || p.IdPartener;
        if (!id) return p;
        try {
          const part = await db.get(
            `SELECT CUIPartener as cuiPartener, NumePartener as numePartener
             FROM Parteneri WHERE IdPartener = ? LIMIT 1`,
            id
          );
          const lastEmail = await db.get(
            `SELECT DataTrimitere, DataRaspuns
             FROM JurnalEmail
             WHERE IdPartener = ? AND TipEmail = 'CONFIRMARE'
             ORDER BY datetime(DataTrimitere) DESC
             LIMIT 1`,
            id
          );
          const attach = await db.get(
            `SELECT NumeFisier, DataTrimitere as DataTrimitereCerere
             FROM JurnalCereriConfirmare
             WHERE IdPartener = ?
             ORDER BY datetime(DataTrimitere) DESC
             LIMIT 1`,
            id
          );
          return {
            ...p,
            numePartener: p.numePartener || part?.numePartener,
            cuiPartener: p.cuiPartener || part?.cuiPartener,
            dataTrimitere: p.dataTrimitere || lastEmail?.DataTrimitere || attach?.DataTrimitereCerere,
            numeFisier: p.numeFisier || attach?.NumeFisier,
            dataRaspuns: p.dataRaspuns || lastEmail?.DataRaspuns,
          };
        } catch {
          return p;
        }
      }));

      const pdfBuffer = await pdfService.generatePartnersPDF(enriched, options);
      
      // Setează headerele pentru descărcare
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=lista-parteneri-${Date.now()}.pdf`);
      
      // Trimite PDF-ul
      res.send(pdfBuffer);
      console.log('✅ PDF trimis cu succes');
    } catch (error) {
      console.error('❌ Eroare la generarea PDF:', error);
      const errorResponse = ApiResponseHelper.error(
        'Eroare la generarea PDF',
        'PDF_GENERATION_ERROR',
        error instanceof Error ? error.message : String(error)
      );
      res.status(500).json(errorResponse);
    }
  }
  
  /**
   * Endpoint pentru generarea PDF pentru print
   */
  async generatePrintPdf(req: Request, res: Response): Promise<void> {
    try {
      const { partners } = req.body;
      
      if (!Array.isArray(partners)) {
        const errorResponse = ApiResponseHelper.validationError(
          'Format invalid pentru parteneri',
          'partners'
        );
        res.status(400).json(errorResponse);
        return;
      }
      
      // Enrich la fel ca în download
      const db = await getDatabase();
      const enriched = await Promise.all(partners.map(async (p: any) => {
        const id = p.idPartener || p.IdPartener;
        if (!id) return p;
        try {
          const part = await db.get(
            `SELECT CUIPartener as cuiPartener, NumePartener as numePartener
             FROM Parteneri WHERE IdPartener = ? LIMIT 1`, id);
          const lastEmail = await db.get(
            `SELECT DataTrimitere, DataRaspuns
             FROM JurnalEmail
             WHERE IdPartener = ? AND TipEmail = 'CONFIRMARE'
             ORDER BY datetime(DataTrimitere) DESC
             LIMIT 1`, id);
          const attach = await db.get(
            `SELECT NumeFisier, DataTrimitere as DataTrimitereCerere
             FROM JurnalCereriConfirmare
             WHERE IdPartener = ?
             ORDER BY datetime(DataTrimitere) DESC
             LIMIT 1`, id);
          return {
            ...p,
            numePartener: p.numePartener || part?.numePartener,
            cuiPartener: p.cuiPartener || part?.cuiPartener,
            dataTrimitere: p.dataTrimitere || lastEmail?.DataTrimitere || attach?.DataTrimitereCerere,
            numeFisier: p.numeFisier || attach?.NumeFisier,
            dataRaspuns: p.dataRaspuns || lastEmail?.DataRaspuns,
          };
        } catch {
          return p;
        }
      }));

      // Construiește opțiunile: acceptă fie req.body.options, fie câmpuri la rădăcină
      const options = req.body.options || {
        title: req.body.title || 'Lista pentru Printare',
        orientation: req.body.orientation || 'landscape',
        sessionInfo: req.body.sessionInfo || undefined,
      };

      const pdfBuffer = await pdfService.generatePrintPDF(enriched, options);
      
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=print-parteneri-${Date.now()}.pdf`);
      
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Eroare la generarea PDF pentru print:', error);
      const errorResponse = ApiResponseHelper.error(
        'Eroare la generarea PDF pentru print',
        'PDF_PRINT_ERROR',
        error instanceof Error ? error.message : String(error)
      );
      res.status(500).json(errorResponse);
    }
  }
  
  /**
   * Endpoint pentru generarea PDF pentru email și trimiterea acestuia ca atașament
   */
  async generateEmailPdf(req: Request, res: Response): Promise<void> {
    try {
  const { partners, emailData, sessionInfo } = req.body;
      
      if (!Array.isArray(partners) || !emailData) {
        const errorResponse = ApiResponseHelper.validationError(
          'Format invalid pentru date',
          'partners,emailData'
        );
        res.status(400).json(errorResponse);
        return;
      }
      
      console.log('📧 Procesare cerere email PDF pentru', partners.length, 'parteneri');
      console.log('📧 Detalii email:', { 
        destinatar: emailData.to,
        subiect: emailData.subject,
        contineCorp: !!emailData.body 
      });
      
      // Generăm PDF-ul
      // Enrich înainte de generare
      const db = await getDatabase();
      const enriched = await Promise.all(partners.map(async (p: any) => {
        const id = p.idPartener || p.IdPartener;
        if (!id) return p;
        try {
          const part = await db.get(
            `SELECT CUIPartener as cuiPartener, NumePartener as numePartener
             FROM Parteneri WHERE IdPartener = ? LIMIT 1`, id);
          const lastEmail = await db.get(
            `SELECT DataTrimitere, DataRaspuns
             FROM JurnalEmail
             WHERE IdPartener = ? AND TipEmail = 'CONFIRMARE'
             ORDER BY datetime(DataTrimitere) DESC
             LIMIT 1`, id);
          const attach = await db.get(
            `SELECT NumeFisier, DataTrimitere as DataTrimitereCerere
             FROM JurnalCereriConfirmare
             WHERE IdPartener = ?
             ORDER BY datetime(DataTrimitere) DESC
             LIMIT 1`, id);
          return {
            ...p,
            numePartener: p.numePartener || part?.numePartener,
            cuiPartener: p.cuiPartener || part?.cuiPartener,
            dataTrimitere: p.dataTrimitere || lastEmail?.DataTrimitere || attach?.DataTrimitereCerere,
            numeFisier: p.numeFisier || attach?.NumeFisier,
            dataRaspuns: p.dataRaspuns || lastEmail?.DataRaspuns,
          };
        } catch {
          return p;
        }
      }));

      const pdfBuffer = await pdfService.generatePartnersPDF(enriched, { 
        title: emailData.subject,
        orientation: 'landscape',
        sessionInfo: sessionInfo || undefined,
      });
      const filename = emailData.attachmentName || `lista-parteneri-${Date.now()}.pdf`;
      
      // Importăm serviciul de email
      const { emailService } = await import('../services/email.service');
      
      // Trimitem email-ul cu atașamentul PDF
      const result = await emailService.sendEmailWithAttachment({
        to: emailData.to,
        subject: emailData.subject,
        text: emailData.body,
        html: emailData.body ? emailData.body.replace(/\n/g, '<br>') : undefined,
        attachments: [
          {
            filename: filename,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      });
      
      if (result.success) {
        console.log('✅ Email trimis cu succes:', result.messageId);
        const response = ApiResponseHelper.success(
          { messageId: result.messageId },
          'Email trimis cu succes'
        );
        res.json(response);
      } else {
        console.error('❌ Eroare la trimiterea email-ului:', result.error);
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('❌ Eroare la generarea/trimiterea PDF pentru email:', error);
      const errorResponse = ApiResponseHelper.error(
        'Eroare la trimiterea email-ului',
        'PDF_EMAIL_ERROR',
        error instanceof Error ? error.message : String(error)
      );
      res.status(500).json(errorResponse);
    }
  }
}

const pdfController = new PdfController();
export { pdfController };
export default pdfController;