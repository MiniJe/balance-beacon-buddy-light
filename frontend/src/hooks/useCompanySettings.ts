import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

export interface CompanySettings {
  companyName: string;
  cui: string;
  email: string;
  phone: string;
  address: string;
  logo: string;
  originalLogoUrl?: string; // URL original pentru Azure Blob Storage
  onrc: string;
  contBancar: string;
  banca: string;
}

// Default company settings
export const defaultCompanySettings: CompanySettings = {
  companyName: "",
  cui: "",
  email: "",
  phone: "",
  address: "",
  logo: "",
  originalLogoUrl: "",
  onrc: "",
  contBancar: "",
  banca: ""
};

export const useCompanySettings = () => {
  const [companySettings, setCompanySettings] = useState<CompanySettings>(defaultCompanySettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validează setările companiei
  const validateCompanySettings = (): boolean => {
    const errors: {[key: string]: string} = {};
    
    if (!companySettings.companyName.trim()) {
      errors.companyName = "Numele companiei este obligatoriu";
    }
    
    if (!companySettings.cui.trim()) {
      errors.cui = "CUI-ul companiei este obligatoriu";
    }
      if (companySettings.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companySettings.email)) {
      errors.email = "Adresa de email nu este validă";
    }
    
    // Validare mai flexibilă pentru logo - acceptă URL-uri HTTP/HTTPS și căi relative
    if (companySettings.logo && !/^((http|https):\/\/[^ "]+|\/[^ "]+)$/.test(companySettings.logo)) {
      errors.logo = "URL-ul logo-ului nu este valid";
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  // Încarcă informațiile companiei din Azure SQL (tabelul SetariCompanie)
  const loadCompanySettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        const errorMsg = "Nu ești autentificat. Te rog să te conectezi.";
        setError(errorMsg);
        toast.error(errorMsg);
        window.location.href = '/login';
        return;
      }

      const response = await fetch('/api/database/company-settings', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        const errorMsg = "Sesiunea a expirat. Te rog să te conectezi din nou.";
        setError(errorMsg);
        toast.error(errorMsg);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return;
      }

      if (!response.ok) {
        let errorMessage = `Server error: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // În cazul în care răspunsul nu este JSON valid
          console.error("Răspunsul nu este în format JSON:", e);
        }
        throw new Error(errorMessage);
      }      const data = await response.json();
      if (data.success && data.data && data.data.settings) {
        // Asigură-te că toate câmpurile au valori implicite dacă sunt null sau undefined
        const settingsToUse = {
          companyName: data.data.settings.NumeCompanie || "",
          cui: data.data.settings.CUICompanie || "",
          email: data.data.settings.EmailCompanie || "",
          phone: data.data.settings.TelefonCompanie || "",
          address: data.data.settings.AdresaCompanie || "",
          logo: "", // Nu mai folosim LogoCompanie, logo-ul va fi generat din CaleLogoCompanie
          originalLogoUrl: data.data.settings.CaleLogoCompanie || "",
          onrc: data.data.settings.ONRCCompanie || "",
          contBancar: data.data.settings.ContBancarCompanie || "",
          banca: data.data.settings.BancaCompanie || ""
        };
        
        console.log("Date primite de la server:", data.data.settings);
        console.log("Setări procesate:", settingsToUse);        // Salvăm originalBlobUrl pentru utilizare la ștergere dacă există
        if (data.data.settings.CaleLogoCompanie && 
            typeof data.data.settings.CaleLogoCompanie === 'string' && 
            (data.data.settings.CaleLogoCompanie.startsWith('http://') || data.data.settings.CaleLogoCompanie.startsWith('https://'))) {
          
          localStorage.setItem('originalLogoUrl', data.data.settings.CaleLogoCompanie);
          
          // Generăm URL-ul proxy pentru logo dacă există CaleLogoCompanie
          try {
            const proxyResponse = await fetch('/api/storage/generate-proxy-url', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                blobUrl: data.data.settings.CaleLogoCompanie
              })
            });
            
            if (proxyResponse.ok) {
              const proxyData = await proxyResponse.json();
              if (proxyData.success && proxyData.url) {
                // Actualizăm logo-ul cu URL-ul proxy
                settingsToUse.logo = proxyData.url;
              }
            }
          } catch (proxyError) {
            console.warn("Nu s-a putut genera URL-ul proxy pentru logo:", proxyError);
          }
        } else if (data.data.settings.CaleLogoCompanie) {
          console.log("CaleLogoCompanie nu este un URL valid:", data.data.settings.CaleLogoCompanie);
        }
        
        setCompanySettings(settingsToUse);
        console.log("Setările companiei au fost încărcate cu succes");
      } else {
        // Dacă nu există setări, păstrăm valorile implicite
        console.log("Nu există setări pentru companie sau a fost creat un tabel nou");        if (data.data && data.data.settings) {
          setCompanySettings({
            companyName: data.data.settings.NumeCompanie || "",
            cui: data.data.settings.CUICompanie || "",
            email: data.data.settings.EmailCompanie || "",
            phone: data.data.settings.TelefonCompanie || "",
            address: data.data.settings.AdresaCompanie || "",
            logo: "", // Nu mai folosim LogoCompanie, logo-ul va fi generat din CaleLogoCompanie
            originalLogoUrl: data.data.settings.CaleLogoCompanie || "",
            onrc: data.data.settings.ONRCCompanie || "",
            contBancar: data.data.settings.ContBancarCompanie || "",
            banca: data.data.settings.BancaCompanie || ""
          });
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Eroare necunoscută';
      console.error('Eroare la încărcarea informațiilor companiei:', error);
      setError(errorMsg);
      toast.error(`Eroare la încărcarea informațiilor companiei: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };
  // Save company settings to Azure SQL (tabelul SetariCompanie)
  const handleSaveCompanySettings = async () => {
    // Validează datele înainte de a le trimite
    if (!validateCompanySettings()) {
      const firstError = Object.values(validationErrors)[0];
      toast.error(firstError);
      return;
    }
      setSaving(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        const errorMsg = "Nu ești autentificat. Te rog să te conectezi.";
        setError(errorMsg);
        toast.error(errorMsg);
        return;
      }
        // Verifică și afișează ce se trimite la server
      const dataToSend = {
        NumeCompanie: companySettings.companyName,
        CUICompanie: companySettings.cui,
        EmailCompanie: companySettings.email,
        TelefonCompanie: companySettings.phone,
        AdresaCompanie: companySettings.address,
        CaleLogoCompanie: companySettings.originalLogoUrl || localStorage.getItem('originalLogoUrl') || "",
        ONRCCompanie: companySettings.onrc,
        ContBancarCompanie: companySettings.contBancar,
        BancaCompanie: companySettings.banca
      };
      
      console.log("Salvare setări companie:", dataToSend);
      
      const response = await fetch('/api/database/company-settings', {        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSend)
      });

      if (response.status === 401) {
        const errorMsg = "Sesiunea a expirat. Te rog să te conectezi din nou.";
        setError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        toast.success("Informațiile companiei au fost actualizate!");
      } else {
        throw new Error(data.message || "Eroare la salvarea informațiilor companiei");
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Eroare necunoscută';
      console.error('Eroare la salvarea informațiilor companiei:', error);
      setError(errorMsg);
      toast.error(`Eroare la salvarea informațiilor companiei: ${errorMsg}`);
    } finally {
      setSaving(false);
    }
  };

  // Resetează setările companiei la valorile implicite
  const resetCompanySettings = () => {
    setCompanySettings(defaultCompanySettings);
    setValidationErrors({});
    toast.info("Setările companiei au fost resetate la valorile implicite (nicio modificare nu a fost salvată)");
  };

  // Încarcă setările la primul render
  useEffect(() => {
    loadCompanySettings();
  }, []);
  // Încarcă logo-ul companiei în Azure Blob Storage
  const uploadLogo = async (file: File) => {
    setUploadingLogo(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        const errorMsg = "Nu ești autentificat. Te rog să te conectezi.";
        setError(errorMsg);
        toast.error(errorMsg);
        return;
      }
      
      // Verifică dacă fișierul este o imagine
      if (!file.type.startsWith('image/')) {
        toast.error("Te rog să selectezi o imagine");
        return;
      }
      
      // Verifică dimensiunea fișierului (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Fișierul este prea mare. Dimensiunea maximă este de 5MB");
        return;
      }
      
      // Asigură-te că CUI-ul există înainte de încărcare
      if (!companySettings.cui || companySettings.cui.trim() === '') {
        toast.error("CUI-ul companiei este obligatoriu pentru a încărca un logo");
        return;
      }
      
      // Crează un FormData pentru a trimite fișierul
      const formData = new FormData();
      formData.append('logo', file);
      formData.append('companyId', companySettings.cui); // Folosim CUI-ul ca identificator
      
      const response = await fetch('/api/storage/upload-company-logo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (response.status === 401) {
        const errorMsg = "Sesiunea a expirat. Te rog să te conectezi din nou.";
        setError(errorMsg);
        toast.error(errorMsg);
        return;
      }
      
      if (!response.ok) {
        let errorMessage = `Server error: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          console.error("Răspunsul nu este în format JSON:", e);
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      
      if (data.success && data.url) {
        // Obține URL-ul proxy pentru blob
        const proxyResponse = await fetch('/api/storage/generate-proxy-url', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            blobUrl: data.url
          })
        });
        
        if (!proxyResponse.ok) {
          let errorMessage = 'Eroare la generarea URL-ului proxy pentru logo';
          try {
            const errorData = await proxyResponse.json();
            errorMessage = errorData.message || errorMessage;
          } catch (e) {
            console.error("Răspunsul nu este în format JSON:", e);
          }
          throw new Error(errorMessage);
        }
        
        const proxyData = await proxyResponse.json();
          if (proxyData.success && proxyData.url) {
          // Adaugă un timestamp pentru a preveni caching-ul (dar nu în query parameter)
          const proxyUrl = proxyData.url;
          const cacheBuster = `t=${new Date().getTime()}`;
          const finalProxyUrl = proxyUrl.includes('?') 
            ? `${proxyUrl}&${cacheBuster}` 
            : `${proxyUrl}?${cacheBuster}`;
            
          // Actualizează URL-ul logo-ului în state cu URL-ul proxy
          setCompanySettings({
            ...companySettings,
            logo: finalProxyUrl,
            originalLogoUrl: data.url
          });
          
          // Salvăm originalBlobUrl pentru utilizare la ștergere
          localStorage.setItem('originalLogoUrl', data.url);
          
          toast.success("Logo-ul a fost încărcat cu succes");
        } else {
          throw new Error(proxyData.message || "Eroare la generarea URL-ului proxy pentru logo");
        }
      } else {
        throw new Error(data.message || "Eroare la încărcarea logo-ului");
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Eroare necunoscută';
      console.error('Eroare la încărcarea logo-ului:', error);
      setError(errorMsg);
      toast.error(`Eroare la încărcarea logo-ului: ${errorMsg}`);
    } finally {
      setUploadingLogo(false);
    }
  };
  // Șterge logo-ul companiei din Azure Blob Storage
  const deleteLogo = async () => {
    if (!companySettings.logo) return;
    
    setUploadingLogo(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        const errorMsg = "Nu ești autentificat. Te rog să te conectezi.";
        setError(errorMsg);
        toast.error(errorMsg);
        return;
      }
      
      // Obține URL-ul original din localStorage
      const originalBlobUrl = localStorage.getItem('originalLogoUrl');
      
      // Dacă nu avem URL-ul original și URL-ul curent nu este de la Azure Blob Storage,
      // doar actualizăm state-ul
      if (!originalBlobUrl && !companySettings.logo.includes('blob.core.windows.net') && !companySettings.logo.includes('/api/storage/blob/')) {
        setCompanySettings({
          ...companySettings,
          logo: ""
        });
        return;
      }
      
      // Elimină query parameters din URL (cum ar fi timestamp-ul pentru cache busting)
      const cleanedLogoUrl = companySettings.logo.split('?')[0];
      
      const response = await fetch('/api/storage/delete-blob', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          blobUrl: originalBlobUrl || cleanedLogoUrl
        })
      });
      
      if (response.status === 401) {
        const errorMsg = "Sesiunea a expirat. Te rog să te conectezi din nou.";
        setError(errorMsg);
        toast.error(errorMsg);
        return;
      }
      
      const data = await response.json();
        // Indiferent de rezultat, actualizăm state-ul și ștergem URL-ul original
      setCompanySettings({
        ...companySettings,
        logo: "",
        originalLogoUrl: ""
      });
      localStorage.removeItem('originalLogoUrl');
      
      if (data.success) {
        toast.success("Logo-ul a fost șters cu succes");
      } else {
        // Chiar dacă ștergerea eșuează, noi setăm logo-ul ca gol în UI
        console.warn("Eroare la ștergerea logo-ului din blob storage:", data.message);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Eroare necunoscută';
      console.error('Eroare la ștergerea logo-ului:', error);
      setError(errorMsg);
      toast.error(`Eroare la ștergerea logo-ului: ${errorMsg}`);
        // Chiar dacă apare o eroare, actualizăm state-ul
      setCompanySettings({
        ...companySettings,
        logo: "",
        originalLogoUrl: ""
      });
    } finally {
      setUploadingLogo(false);
    }
  };
  
  // Deschide selectorul de fișiere
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Handler pentru schimbarea fișierului
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      uploadLogo(files[0]);
    }
  };

  return {
    companySettings,
    setCompanySettings,
    loading,
    saving,
    error,
    validationErrors,
    handleSaveCompanySettings,
    loadCompanySettings,
    resetCompanySettings,
    validateCompanySettings,
    fileInputRef,
    uploadingLogo,
    setUploadingLogo,
    uploadLogo,
    deleteLogo,
    handleFileChange,
    triggerFileInput
  };
};
