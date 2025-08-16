import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { Partener } from "@/types/partener";
import { partenerService } from "@/services/partener.service";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useFileUpload } from "@/hooks/useFileUpload";

// Extended interface for request functionality
interface RequestPartener extends Partener {
  selected: boolean;
  partnerCategory: "client_duc" | "client_dl" | "furnizor_duc" | "furnizor_dl"; // fallback mapat la 'client_duc' pentru cei fără flag-uri
}

interface SesiuneCereri {
  idSesiune: string;
  documenteReservate: DocumentGenerat[];
}

interface DocumentGenerat {
  idDocument: string;
  numarInregistrare: number;
  idPartener: string;
  numePartener: string;
  tipPartener: string;
  numeDocument: string;
  caleFisier: string;
  hashDocument: string;
  dimensiuneDocument: number;
  status: "reserved" | "generated" | "downloaded" | "uploaded" | "signed";
  uploadedFile?: File;
}

export const useRequestSettings = () => {
  useAuth();
  const { toast } = useToast();
  const { uploading, error: uploadError, uploadSignedDocuments } = useFileUpload();

  // Funcție pentru calcularea hash-ului SHA-256 al unui fișier în frontend
  const calculateFileHash = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  };

  // Funcție pentru validarea hash-urilor fișierelor încărcate
  const validateUploadedFiles = async (): Promise<{ isValid: boolean; errors: string[] }> => {
    const blockUnsignedFiles = true; // Activăm validarea în frontend
    const errors: string[] = [];

    if (!blockUnsignedFiles) {
      return { isValid: true, errors: [] };
    }

    console.log('🔍 FRONTEND VALIDATION: Verificare hash-uri fișiere încărcate...');

    for (const doc of documentsGenerated) {
      if (doc.status === "uploaded" && doc.uploadedFile && doc.hashDocument) {
        try {
          const uploadedFileHash = await calculateFileHash(doc.uploadedFile);
          
          console.log(`🔍 HASH VERIFICARE pentru ${doc.numePartener}:`);
          console.log(`   📄 Original generat: ${doc.hashDocument}`);
          console.log(`   ✍️  Fișier încărcat: ${uploadedFileHash}`);
          
          if (doc.hashDocument === uploadedFileHash) {
            const errorMsg = `❌ FIȘIER NESEMNAT: "${doc.uploadedFile.name}" pentru partenerul "${doc.numePartener}" are hash identic cu originalul (nu a fost semnat digital)!`;
            console.error(errorMsg);
            errors.push(errorMsg);
          } else {
            console.log(`✅ Fișier validat: ${doc.uploadedFile.name} - diferit de original (semnat corect)`);
          }
        } catch (error) {
          const errorMsg = `⚠️ Eroare la calcularea hash-ului pentru ${doc.numePartener}: ${error}`;
          console.warn(errorMsg);
          errors.push(errorMsg);
        }
      }
    }

    const isValid = errors.length === 0;
    
    if (!isValid) {
      console.error(`❌ VALIDARE EȘUATĂ: ${errors.length} fișiere nesemnate detectate`);
      setError(`BLOCARE SECURITATE: Detectate ${errors.length} fișiere PDF nesemnate. Aplicația nu poate continua!`);
    } else {
      console.log('✅ VALIDARE REUȘITĂ: Toate fișierele au fost semnate corect');
    }

    return { isValid, errors };
  };
  
  const [step, setStep] = useState(1);
  const [partnerCategory, setPartnerCategory] = useState<string>("all");
  const [partners, setPartners] = useState<RequestPartener[]>([]);
  const [sortOptions, setSortOptions] = useState({ sortBy: 'numePartener', sortOrder: 'asc' as 'asc' | 'desc' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [emailSubject, setEmailSubject] = useState<string>("Confirmare sold la {DATA-SOLD}");
  const [folderLocal, setFolderLocal] = useState<string>("C:\\CereriConfirmare");
  
  // Actualizează automat subiectul când se schimbă data
  useEffect(() => {
    if (date) {
      const dataFormatata = format(date, 'dd.MM.yyyy', { locale: ro });
      setEmailSubject(`Confirmare sold la ${dataFormatata}`);
    }
  }, [date]);
  
  // Session management
  const [currentSession, setCurrentSession] = useState<SesiuneCereri | null>(null);
  const [documentsGenerated, setDocumentsGenerated] = useState<DocumentGenerat[]>([]);
  const [processing, setProcessing] = useState(false);

  // Load partners on component mount
  useEffect(() => {
    const derivePartnerCategory = (partner: Partener): RequestPartener['partnerCategory'] => {
      if (partner.clientDUC) return 'client_duc';
      if (partner.clientDL) return 'client_dl';
      if (partner.furnizorDUC) return 'furnizor_duc';
      if (partner.furnizorDL) return 'furnizor_dl';
      return 'client_duc'; // fallback standardizat
    };
    const loadPartners = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await partenerService.getAllParteneri({
          status: 'active',
          partnerType: 'all',
          limit: 1000,
          sortBy: sortOptions.sortBy,
          sortOrder: sortOptions.sortOrder
        });
        const transformed: RequestPartener[] = response.parteneri
          .filter(p => p.partenerActiv === true)
          .map(p => ({
            ...p,
            selected: false,
            partnerCategory: derivePartnerCategory(p)
          }));
        // sortare locală stabilă (după nume) pentru consistență
        transformed.sort((a, b) => a.numePartener.localeCompare(b.numePartener, 'ro', { sensitivity: 'base' }));
        setPartners(transformed);
      } catch (error) {
        console.error('Eroare la încărcarea partenerilor:', error);
        setError(error instanceof Error ? error.message : 'Eroare la încărcarea partenerilor');
      } finally {
        setLoading(false);
      }
    };
    loadPartners();
  }, [sortOptions]);

  const selectedPartnersCount = partners.filter(p => p.selected).length;
  const filteredPartners = partners.filter(partner =>
    partner.partenerActiv === true && (partnerCategory === 'all' || partner.partnerCategory === partnerCategory)
  );
  const totalParteneri = filteredPartners.length; // conform cerinței #6
  const allDocumentsUploaded = documentsGenerated.length > 0 && 
    documentsGenerated.every(doc => doc.status === "uploaded");

  const handlePartnerSelection = (partnerId: string, checked: boolean) => {
    setPartners(partners.map(partner => 
      partner.idPartener === partnerId ? { ...partner, selected: checked } : partner
    ));
  };

  const handleSelectAll = (checked: boolean) => {
    setPartners(partners.map(partner => {
      if (partnerCategory === "all" || partner.partnerCategory === partnerCategory) {
        return { ...partner, selected: checked };
      }
      return partner;
    }));
  };

  const handleInitializeSession = async () => {
    if (!date) {
      setError("Data soldului este obligatorie");
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const selectedPartners = partners.filter(p => p.selected);
      const parteneriSelectati = selectedPartners.map(p => p.idPartener);

      // Backend-ul va extrage informațiile utilizatorului din token-ul JWT
      const sesiuneData = {
        parteneriSelectati,
        partnerCategory, // Categoria selectată în Step 1 - determină automat template-ul
        dataSold: format(date, 'yyyy-MM-dd'),
        subiectEmail: emailSubject,
        folderLocal,
        observatii: `Sesiune inițializată pentru ${selectedPartners.length} parteneri din categoria ${partnerCategory}`
      };

      const response = await fetch('/api/cereri-confirmare/initialize-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`, // Asigură-te că token-ul este trimis
        },
        body: JSON.stringify(sesiuneData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Eroare la inițializarea sesiunii');
      }

      const result = await response.json();
      
      if (result.success) {
        setCurrentSession(result.data);
        setDocumentsGenerated(result.data.documenteReservate);
        // Nu schimbăm step-ul, rămânem în Step 2 dar acum currentSession este setată
        console.log(`Sesiune inițializată cu succes: ${result.data.idSesiune}`);
      } else {
        throw new Error(result.message);
      }

    } catch (error) {
      console.error('Eroare la inițializarea sesiunii:', error);
      setError(error instanceof Error ? error.message : 'Eroare la inițializarea sesiunii');
    } finally {
      setProcessing(false);
    }
  };

  const handleGenerateDocuments = async () => {
    if (!currentSession) {
      setError("Nu există o sesiune activă");
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // ✅ STEP 3: Pregătim datele sesiunii pentru lucru în memorie (conform SESIUNE.md)
      const selectedPartners = partners.filter(p => p.selected);
      const sesiuneData = {
        parteneriSelectati: selectedPartners.map(p => p.idPartener),
        partnerCategory, // ✅ Categoria din Step 1 - determină automat template-urile
        dataSold: format(date!, 'yyyy-MM-dd'),
        subiectEmail: emailSubject,
        folderLocal,
        observatii: `STEP 3: Generare documente pentru ${selectedPartners.length} parteneri din categoria ${partnerCategory}`
      };

      const response = await fetch('/api/cereri-confirmare/generate-documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`, // Adăugat header-ul de autorizare
        },
        body: JSON.stringify({
          idSesiune: currentSession.idSesiune,
          documenteReservate: currentSession.documenteReservate,
          templateBlobContainer: 'templates',
          sesiuneData // ✅ Trimitem datele sesiunii pentru lucru în memorie
        }),
      });

      if (!response.ok) {
        throw new Error('Eroare la generarea documentelor în Step 3');
      }

      const result = await response.json();
      
      if (result.success) {
        setDocumentsGenerated(result.data.map((doc: any) => ({
          ...doc,
          status: 'generated'
        })));
        setStep(3);
        console.log(`STEP 3 finalizat: ${result.data.length} documente generate cu succes - NU s-a salvat nimic în BD încă!`);
      } else {
        throw new Error(result.message);
      }

    } catch (error) {
      console.error('Eroare la generarea documentelor în Step 3:', error);
      setError(error instanceof Error ? error.message : 'Eroare la generarea documentelor în Step 3');
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadFile = (document: DocumentGenerat) => {
    setDocumentsGenerated(documentsGenerated.map(doc => 
      doc.idDocument === document.idDocument ? { ...doc, status: "downloaded" } : doc
    ));
    console.log(`Fișierul ${document.numeDocument} a fost descărcat`);
  };

  const handleUploadFile = async (documentId: string, uploadedFile: File) => {
    if (!currentSession) {
      setError("Nu există o sesiune activă pentru upload");
      return;
    }

    try {
      // Upload real al fișierului pe server
      const uploadResult = await uploadSignedDocuments(currentSession.idSesiune, [uploadedFile]);
      
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Eroare la upload');
      }

      // Actualizează documentul în local state
      setDocumentsGenerated(documentsGenerated.map(doc => 
        doc.idDocument === documentId ? { ...doc, status: "uploaded", uploadedFile } : doc
      ));
      
      console.log(`Fișierul ${uploadedFile.name} a fost încărcat pentru documentul ${documentId}`);
      
      toast({
        title: "Fișier încărcat cu succes",
        description: `${uploadedFile.name} a fost încărcat pe server`,
        variant: "default"
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Eroare necunoscută la upload';
      setError(errorMessage);
      toast({
        title: "Eroare la upload",
        description: errorMessage,
        variant: "destructive"
      });
      console.error('Eroare la upload individual file:', error);
    }
  };

  const handleUploadBulkFiles = async (uploadedFiles: File[]) => {
    if (!currentSession) {
      setError("Nu există o sesiune activă pentru upload");
      toast({
        title: "Eroare",
        description: "Nu există o sesiune activă pentru upload",
        variant: "destructive"
      });
      return;
    }

    try {
      // 1. Upload real al fișierelor pe server
      const uploadResult = await uploadSignedDocuments(currentSession.idSesiune, uploadedFiles);
      
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Eroare la upload');
      }

      console.log(`✅ Upload completat cu succes pentru ${uploadedFiles.length} fișiere`);

      // 2. Matching local pentru UI (același algoritm ca înainte)
      const updatedDocuments = documentsGenerated.map(doc => {
        // Extract base filename from generated document (removing extension)
        const docBaseName = doc.numeDocument.replace(/\.(pdf|docx)$/i, '');
        
        // Look for a file that matches the original document pattern
        const matchedFile = uploadedFiles.find(file => {
          const fileName = file.name.toLowerCase().replace(/\.pdf$/, '');
          const docBaseNameLower = docBaseName.toLowerCase();
          const partnerName = doc.numePartener.toLowerCase();
          const docNumber = doc.numarInregistrare.toString();
          const cleanPartnerName = partnerName.replace(/[^\w]/g, ''); // Remove all non-alphanumeric
          
          // Enhanced matching strategies (ordered by priority):
          
          // 1. EXACT match with base document name (highest priority)
          if (fileName.includes(docBaseNameLower)) {
            console.log(`🎯 EXACT match: ${file.name} ↔ ${doc.numeDocument}`);
            return true;
          }
          
          // 2. Match by document number pattern "Nr{number}" (very high priority)
          if (fileName.includes(`nr${docNumber}`) || fileName.includes(`no${docNumber}`)) {
            console.log(`🔢 NUMBER match: ${file.name} ↔ Nr${docNumber}`);
            return true;
          }
          
          // 3. Match by partner name + document number combination (high priority)
          if (fileName.includes(cleanPartnerName) && fileName.includes(docNumber)) {
            console.log(`👥📄 PARTNER+NUMBER match: ${file.name} ↔ ${doc.numePartener}+${docNumber}`);
            return true;
          }
          
          // 4. Match by "CERERE_SOLD" pattern + partner name (medium priority)
          if (fileName.includes('cerere') && fileName.includes('sold') && fileName.includes(cleanPartnerName)) {
            console.log(`📋 CERERE_SOLD match: ${file.name} ↔ ${doc.numePartener}`);
            return true;
          }
          
          // 5. Partial document base name match (minimum 10 chars, medium priority)
          if (docBaseNameLower.length >= 10 && fileName.includes(docBaseNameLower.substring(0, 10))) {
            console.log(`📝 PARTIAL match: ${file.name} ↔ ${docBaseName.substring(0, 10)}...`);
            return true;
          }
          
          // 6. Partner name only (lower priority, minimum 5 chars)
          if (cleanPartnerName.length >= 5 && fileName.includes(cleanPartnerName)) {
            console.log(`👤 PARTNER match: ${file.name} ↔ ${doc.numePartener}`);
            return true;
          }
          
          // 7. Document ID match (lowest priority)
          if (fileName.includes(doc.idDocument)) {
            console.log(`🆔 ID match: ${file.name} ↔ ${doc.idDocument}`);
            return true;
          }
          
          return false;
        });
        
        if (matchedFile) {
          console.log(`✅ Fișierul ${matchedFile.name} a fost asociat cu ${doc.numePartener} (Doc: ${doc.numeDocument})`);
          return { ...doc, status: "uploaded" as const, uploadedFile: matchedFile };
        }
        
        return doc;
      });
      
      setDocumentsGenerated(updatedDocuments);
      
      const matchedCount = updatedDocuments.filter(doc => doc.status === "uploaded").length;
      const unmatchedFiles = uploadedFiles.filter(file => 
        !updatedDocuments.some(doc => doc.uploadedFile?.name === file.name)
      );
      
      console.log(`📊 REZULTAT MATCHING: ${matchedCount} din ${uploadedFiles.length} fișiere au fost asociate automat`);
      if (unmatchedFiles.length > 0) {
        console.warn(`⚠️ Fișiere neasociate: ${unmatchedFiles.map(f => f.name).join(', ')}`);
        console.log(`💡 SUGESTIE: Verificați că fișierele conțin numele partenerului sau numărul documentului în denumire`);
      }

      // Show detailed matching report
      const matchedDocs = updatedDocuments.filter(doc => doc.status === "uploaded");
      if (matchedDocs.length > 0) {
        console.log(`📋 DOCUMENTE ASOCIATE:`);
        matchedDocs.forEach(doc => {
          console.log(`   • ${doc.uploadedFile?.name} → ${doc.numePartener} (${doc.numeDocument})`);
        });
      }

      // Toast notification pentru feedback utilizator
      if (matchedCount > 0) {
        toast({
          title: "Fișiere încărcate cu succes",
          description: `${matchedCount} din ${uploadedFiles.length} fișiere au fost asociate automat și încărcate pe server.`,
          variant: matchedCount === uploadedFiles.length ? "default" : "destructive"
        });
      } else {
        toast({
          title: "Fișiere încărcate, dar neasociate",
          description: "Fișierele au fost încărcate pe server, dar nu s-au putut asocia automat cu documentele. Încercați să le încărcați individual.",
          variant: "destructive"
        });
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Eroare necunoscută la upload';
      setError(errorMessage);
      toast({
        title: "Eroare la upload",
        description: errorMessage,
        variant: "destructive"
      });
      console.error('Eroare la upload bulk files:', error);
    }
  };

  const handleFinalizeSession = async () => {
    if (!currentSession) {
      setError("Nu există o sesiune activă");
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const documenteProcesate = documentsGenerated.filter(doc => doc.status === "uploaded");
      
      if (documenteProcesate.length === 0) {
        throw new Error("Nu există documente semnate pentru procesare");
      }

      // Backend-ul va extrage informațiile utilizatorului din token-ul JWT
      const response = await fetch('/api/cereri-confirmare/finalize-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          idSesiune: currentSession.idSesiune,
          documenteGenerateFinale: documenteProcesate, // schimbat cheie conform backend
          sesiuneData: {
            partnerCategory,
            dataSold: format(date!, 'yyyy-MM-dd'),
            subiectEmail: emailSubject,
            folderLocal
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Eroare la finalizarea sesiunii');
      }

      const result = await response.json();
      
      if (result.success) {
        // Afișează mesaj de succes cu datele corecte din backend
        const documentsCount = result.data.documenteInregistrate?.length || 0;
        toast({
          title: "Succes! ✅",
          description: `Sesiune finalizată cu succes: ${documentsCount} documente înregistrate`,
          variant: "default"
        });
        
        console.log(`Sesiune finalizată cu succes: ${documentsCount} documente înregistrate`);
        
        // Redirectare automată la Dashboard după 3 secunde
  // Redirectarea a fost eliminată pentru a evita importul nefolosit de navigate
        
      } else {
        throw new Error(result.message);
      }

    } catch (error) {
      console.error('Eroare la finalizarea sesiunii:', error);
      setError(error instanceof Error ? error.message : 'Eroare la finalizarea sesiunii');
    } finally {
      setProcessing(false);
    }
  };

  const handleResetWizard = () => {
    setStep(1);
    setCurrentSession(null);
    setDocumentsGenerated([]);
    setPartners(partners.map(p => ({...p, selected: false})));
    setError(null);
  };

  // Funcție pentru navigarea la step-uri cu resetare când se revine la Step 1
  const handleStepNavigation = (targetStep: number) => {
    if (targetStep === 1 && step > 1) {
      // Resetează partenerii selectați când se revine la Step 1
      setPartners(partners.map(p => ({...p, selected: false})));
      setCurrentSession(null);
      setDocumentsGenerated([]);
      setError(null);
    }
    setStep(targetStep);
  };

  return {
    // State
    step,
    setStep,
    partnerCategory,
    setPartnerCategory,
    partners,
    filteredPartners,
    loading,
    error,
    setError,
    date,
    setDate,
    emailSubject,
    setEmailSubject,
    folderLocal,
    setFolderLocal,
    currentSession,
    documentsGenerated,
    processing,
    uploading, // Status de upload
    uploadError, // Erori de upload
    selectedPartnersCount,
    allDocumentsUploaded,
    
    // Actions
    handlePartnerSelection,
    handleSelectAll,
    handleInitializeSession,
    handleGenerateDocuments,
    handleDownloadFile,
    handleUploadFile,
    handleUploadBulkFiles,
    handleFinalizeSession,
    handleResetWizard,
    handleStepNavigation,
    validateUploadedFiles // ✅ ADĂUGAT: funcție de validare hash-uri
  ,sortOptions
  ,setSortOptions
  ,totalParteneri
  };
};
