import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { Partener } from "@/types/partener";
import { partenerService } from "@/services/partener.service";
import { templateService } from "@/services/template.service";
import { API_BASE_URL } from "@/config/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

// Extended interface for sold request functionality
interface SoldPartener extends Partener {
  selected: boolean;
  partnerCategory: "client_duc" | "client_dl" | "furnizor_duc" | "furnizor_dl";
  orderNumber?: number;
}

interface OrderNumberAssignment {
  idPartener: string;
  numePartener: string;
  orderNumber: number;
}

export const useSoldSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Helper function pentru informațiile utilizatorului
  const getUserInfo = () => {
    if (!user) {
      // Generăm un GUID temporar dacă nu există utilizator autentificat
      const tempId = crypto.randomUUID();
      return {
        idUtilizator: tempId,
        numeUtilizator: "Guest User",
        emailUtilizator: "guest@example.com"
      };
    }

    if (user.TipUtilizator === 'MASTER') {
      return {
        idUtilizator: user.IdUtilizatori,
        numeUtilizator: user.NumeUtilizator,
        emailUtilizator: user.EmailUtilizator
      };
    } else {
      // Pentru CONTABIL
      return {
        idUtilizator: user.IdContabil,
        numeUtilizator: `${user.NumeContabil} ${user.PrenumeContabil}`,
        emailUtilizator: user.EmailContabil
      };
    }
  };

  // State management
  const [step, setStep] = useState(1);
  const [partnerCategory, setPartnerCategory] = useState<string>("all");
  const [partners, setPartners] = useState<SoldPartener[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [emailSubject, setEmailSubject] = useState<string>("Solicitare emitere fișă partener la {DATA}");
  const [emailTemplate, setEmailTemplate] = useState<string>(''); // Va fi încărcat din baza de date
  const [templateLoaded, setTemplateLoaded] = useState<boolean>(false);
  
  // Processing states
  const [processing, setProcessing] = useState(false);
  const [orderNumbers, setOrderNumbers] = useState<OrderNumberAssignment[]>([]);

  // Actualizează automat subiectul când se schimbă data
  useEffect(() => {
    if (date) {
      const dataFormatata = format(date, 'dd.MM.yyyy', { locale: ro });
      setEmailSubject(`Solicitare emitere fișă partener la ${dataFormatata}`);
    }
  }, [date]);

  // Load partners and template on component mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Încarcă partenerii
        const response = await partenerService.getAllParteneri();
        
        if (response.parteneri) {
          const partnersWithSelection: SoldPartener[] = response.parteneri.map((partner: Partener) => ({
            ...partner,
            selected: false,
            partnerCategory: determinePartnerCategory(partner)
          }));
          
          setPartners(partnersWithSelection);
        } else {
          throw new Error("Eroare la încărcarea partenerilor");
        }

        // Încarcă template-ul din baza de date pentru categoria "fise" 
        console.log('🔍 Încărcare template pentru categoria "fise" din EmailSabloane...');
        try {
          const allTemplates = await templateService.getAllTemplates();
          const fiseTemplate = allTemplates.find(t => t.CategorieSablon === 'fise' && t.TipSablon === 'email');
          
          if (fiseTemplate && fiseTemplate.ContinutSablon) {
            setEmailTemplate(fiseTemplate.ContinutSablon);
            setTemplateLoaded(true);
            console.log('✅ Template pentru categoria "fise" încărcat din baza de date:', fiseTemplate.NumeSablon);
            console.log('📄 Conținut template încărcat:', fiseTemplate.ContinutSablon.substring(0, 200) + '...');
          } else {
            console.error('❌ Nu s-a găsit template pentru categoria "fise" în EmailSabloane!');
            setError('Nu s-a găsit șablonul pentru categoria "fise" în baza de date. Vă rugăm să creați un șablon cu categoria "Fișe".');
            setTemplateLoaded(false);
          }
        } catch (templateError) {
          console.error('❌ Eroare la încărcarea template-ului din BD:', templateError);
          setError('Eroare la încărcarea șablonului din baza de date: ' + (templateError instanceof Error ? templateError.message : 'Eroare necunoscută'));
          setTemplateLoaded(false);
        }
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Eroare necunoscută";
        setError(`Eroare la încărcarea datelor: ${errorMessage}`);
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Helper function to determine partner category
  const determinePartnerCategory = (partner: Partener): "client_duc" | "client_dl" | "furnizor_duc" | "furnizor_dl" => {
    // Determinăm categoria pe baza boolean-urilor
    if (partner.clientDUC) return "client_duc";
    if (partner.clientDL) return "client_dl";
    if (partner.furnizorDUC) return "furnizor_duc";
    if (partner.furnizorDL) return "furnizor_dl";
    
    // Default la client_dl dacă nu este setat explicit
    return "client_dl";
  };

  // Helper function to get partner type for display
  const getPartnerType = (partner: SoldPartener): string => {
    if (partner.clientDUC) return "Client DUC";
    if (partner.clientDL) return "Client DL";
    if (partner.furnizorDUC) return "Furnizor DUC";
    if (partner.furnizorDL) return "Furnizor DL";
    return "Partener";
  };

  // Computed values
  const selectedPartnersCount = partners.filter(p => p.selected).length;
  const canProceedToStep2 = selectedPartnersCount > 0;
  const canProceedToStep3 = canProceedToStep2 && date && emailSubject.trim() && emailTemplate.trim() && templateLoaded;

  // Partner selection functions
  const togglePartnerSelection = (partnerId: string) => {
    setPartners(prev => prev.map(p => 
      p.idPartener === partnerId ? { ...p, selected: !p.selected } : p
    ));
  };

  const selectAllPartners = () => {
    setPartners(prev => prev.map(p => ({ ...p, selected: true })));
  };

  const deselectAllPartners = () => {
    setPartners(prev => prev.map(p => ({ ...p, selected: false })));
  };

  const selectByCategory = (category: string) => {
    if (category === "all") {
      selectAllPartners();
      return;
    }

    setPartners(prev => prev.map(p => ({
      ...p,
      selected: p.partnerCategory === category
    })));
  };

  // Order number generation - folosește IdDocumente consecutive din JurnalDocumenteEmise
  const handleGenerateOrderNumbers = async (): Promise<void> => {
    setProcessing(true);
    setError(null);

    try {
      const selectedPartners = partners.filter(p => p.selected);
      const userInfo = getUserInfo();
      
      // Solicită numere de ordine consecutive de la backend (endpoint corect)
      const response = await fetch(`${API_BASE_URL}/jurnal-documente-emise/generate-order-numbers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          count: selectedPartners.length,
          tipDocument: 'FISE_PARTENER',
          utilizator: userInfo
        })
      });

      if (!response.ok) {
        throw new Error(`Eroare la generarea numerelor de ordine: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Eroare la generarea numerelor de ordine');
      }

      // Creează maparea între parteneri și numerele de ordine
      const assignments: OrderNumberAssignment[] = selectedPartners.map((partner, index) => ({
        idPartener: partner.idPartener,
        numePartener: partner.numePartener,
        orderNumber: data.data.startNumber + index // Numerele consecutive de la backend
      }));

      setOrderNumbers(assignments);
      
      // Actualizăm partenerii cu numerele de ordine
      setPartners(prev => prev.map(p => {
        const assignment = assignments.find(a => a.idPartener === p.idPartener);
        return assignment ? { ...p, orderNumber: assignment.orderNumber } : p;
      }));

      toast({
        title: "Numere de ordine generate",
        description: `Au fost generate ${assignments.length} numere de ordine consecutive începând cu ${data.data.startNumber}.`,
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Eroare necunoscută";
      setError(`Eroare la generarea numerelor de ordine: ${errorMessage}`);
      console.error('Error generating order numbers:', err);
    } finally {
      setProcessing(false);
    }
  };

  // Email sending function
  const handleSendEmails = async (): Promise<void> => {
    setProcessing(true);
    setError(null);

    try {
      const selectedPartners = partners.filter(p => p.selected);
      const userInfo = getUserInfo();
      
      if (!date) {
        throw new Error("Data este obligatorie");
      }

      const dataFormatata = format(date, 'dd.MM.yyyy', { locale: ro });
      const dataGenerare = format(new Date(), 'dd.MM.yyyy HH:mm', { locale: ro });

      // Trimitem email-urile prin backend-ul real
      const emailPromises = selectedPartners.map(async (partner) => {
        try {
          // Înlocuim placeholder-urile în template  
          let personalizedTemplate = emailTemplate
            .replace(/\[NUME_PARTENER\]/g, partner.numePartener)
            .replace(/\[DATA\]/g, dataFormatata)
            .replace(/\[DATA_TRIMITERE\]/g, dataGenerare) // DATA CURENTĂ a sesiunii (când se trimite email-ul)
            .replace(/\[PERIOADA\]/g, dataFormatata) // DATA SELECTATĂ de utilizator (pentru care se solicită fișa)
            .replace(/\[NUMĂR_ORDINE\]/g, partner.orderNumber?.toString() || "N/A")
            .replace(/\[CUI_PARTENER\]/g, partner.cuiPartener || "N/A")
            .replace(/\[REPREZENTANT_PARTENER\]/g, partner.reprezentantPartener || "N/A")
            .replace(/\[NUME_COMPANIE\]/g, "DUCFARM S.R.L.") // Numele real al companiei
            .replace(/\[NUME_UTILIZATOR\]/g, userInfo.numeUtilizator)
            .replace(/\[EMAIL_UTILIZATOR\]/g, userInfo.emailUtilizator)
            .replace(/\[DATA_GENERARE\]/g, dataGenerare)
            // Păstrăm și formatele vechi pentru compatibilitate
            .replace(/{NUME_PARTENER}/g, partner.numePartener)
            .replace(/{DATA}/g, dataFormatata)
            .replace(/{NUMAR_ORDINE}/g, partner.orderNumber?.toString() || "N/A")
            .replace(/{TIP_PARTENER}/g, getPartnerType(partner))
            .replace(/{NUME_UTILIZATOR}/g, userInfo.numeUtilizator)
            .replace(/{EMAIL_UTILIZATOR}/g, userInfo.emailUtilizator)
            .replace(/{DATA_GENERARE}/g, dataGenerare);

          // Înlocuim și în subject
          let personalizedSubject = emailSubject
            .replace(/\[DATA\]/g, dataFormatata)
            .replace(/\[NUME_PARTENER\]/g, partner.numePartener)
            .replace(/{DATA}/g, dataFormatata)
            .replace(/{NUME_PARTENER}/g, partner.numePartener);

          console.log(`📧 Trimitem email către ${partner.numePartener} (${partner.emailPartener})`);
          console.log(`📄 Template personalizat preview:`, personalizedTemplate.substring(0, 200) + '...');
          
          // Apel real la backend pentru trimiterea email-ului
          const response = await fetch(`${API_BASE_URL}/email/send-fise-partener`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              partnerId: partner.idPartener,
              partnerEmail: partner.emailPartener,
              partnerName: partner.numePartener,
              subject: personalizedSubject,
              htmlContent: personalizedTemplate,
              orderNumber: partner.orderNumber,
              tipDocument: 'FISE_PARTENER',
              utilizator: userInfo
            })
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
          }

          const result = await response.json();
          if (!result.success) {
            throw new Error(result.message || 'Eroare la trimiterea email-ului');
          }

          return {
            partnerId: partner.idPartener,
            partnerName: partner.numePartener,
            email: partner.emailPartener,
            success: true,
            emailId: result.data?.emailId,
            documentId: result.data?.documentId
          };
          
        } catch (error) {
          console.error(`❌ Eroare la trimiterea email-ului către ${partner.numePartener}:`, error);
          return {
            partnerId: partner.idPartener,
            partnerName: partner.numePartener,
            email: partner.emailPartener,
            success: false,
            error: error instanceof Error ? error.message : 'Eroare necunoscută'
          };
        }
      });

      const results = await Promise.all(emailPromises);
      const successCount = results.filter(r => r.success).length;
      const failedResults = results.filter(r => !r.success);

      if (failedResults.length > 0) {
        console.warn('❌ Eșecuri la trimiterea email-urilor:', failedResults);
        toast({
          title: "Email-uri trimise parțial",
          description: `Succes: ${successCount}/${selectedPartners.length}. Verificați consola pentru detalii despre erorile apărute.`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Email-uri trimise cu succes",
          description: `Au fost trimise toate cele ${successCount} email-uri către parteneri.`,
        });
      }

      // Reset după trimitere cu succes
      resetAll();
      setStep(1);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Eroare necunoscută";
      setError(`Eroare la trimiterea email-urilor: ${errorMessage}`);
      console.error('Error sending emails:', err);
    } finally {
      setProcessing(false);
    }
  };

  // Reset function
  const resetAll = () => {
    setPartners(prev => prev.map(p => ({ ...p, selected: false, orderNumber: undefined })));
    setOrderNumbers([]);
    setDate(new Date());
    setEmailSubject("Solicitare emitere fișă partener la {DATA}");
    // NU resetăm emailTemplate - păstrăm cel încărcat din baza de date
    // Template-ul va fi încărcat din nou doar la refresh/reload
    setError(null);
    setProcessing(false);
  };

  return {
    // State
    step,
    setStep,
    partnerCategory,
    setPartnerCategory,
    partners,
    loading,
    error,
    setError,
    date,
    setDate,
    emailSubject,
    setEmailSubject,
    emailTemplate,
    setEmailTemplate,
    templateLoaded,
    processing,
    orderNumbers,
    
    // Computed values
    selectedPartnersCount,
    canProceedToStep2,
    canProceedToStep3,
    
    // Functions
    togglePartnerSelection,
    selectAllPartners,
    deselectAllPartners,
    selectByCategory,
    handleGenerateOrderNumbers,
    handleSendEmails,
    resetAll,
    getUserInfo
  };
};
