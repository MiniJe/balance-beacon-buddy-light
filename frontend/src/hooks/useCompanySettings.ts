import { useState, useEffect, useRef } from "react";

export interface CompanySettings {
  companyName: string;
  cui: string;
  email: string;
  phone: string;
  address: string;
  logo: string;
  originalLogoUrl?: string;
  onrc: string;
  contBancar: string;
  banca: string;
}

const defaultCompanySettings: CompanySettings = {
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

  const validateCompanySettings = (): boolean => {
    const errors: {[key: string]: string} = {};
    if (!companySettings.companyName.trim()) errors.companyName = "Numele companiei este obligatoriu";
    if (!companySettings.cui.trim()) errors.cui = "CUI-ul companiei este obligatoriu";
    if (companySettings.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companySettings.email)) errors.email = "Adresa de email nu este validă";
    // Eliminat: validare URL logo (logo local gestionat de server)
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const loadCompanySettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        const errorMsg = "Nu ești autentificat. Te rog să te conectezi.";
        setError(errorMsg);
        window.location.href = '/login';
        return;
      }

      const response = await fetch('/api/company-settings', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        const errorMsg = "Sesiunea a expirat. Te rog să te conectezi din nou.";
        setError(errorMsg);
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
          console.error("Răspunsul nu este în format JSON:", e);
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      if (data.success && data.data && data.data.settings) {
        const settingsToUse = {
          companyName: data.data.settings.NumeCompanie || "",
          cui: data.data.settings.CUICompanie || "",
          email: data.data.settings.EmailCompanie || "",
          phone: data.data.settings.TelefonCompanie || "",
          address: data.data.settings.AdresaCompanie || "",
          logo: "",
          originalLogoUrl: data.data.settings.CaleLogoCompanie || "",
          onrc: data.data.settings.ONRCCompanie || "",
          contBancar: data.data.settings.ContBancarCompanie || "",
          banca: data.data.settings.BancaCompanie || ""
        };
        
        console.log("Date primite de la server:", data.data.settings);
        console.log("Setări procesate:", settingsToUse);

        // Pentru logo local, verificăm dacă există CaleLogoCompanie și o folosim direct
        if (data.data.settings.CaleLogoCompanie && 
            typeof data.data.settings.CaleLogoCompanie === 'string' && 
            data.data.settings.CaleLogoCompanie.trim() !== '') {
          
          // Pentru storage local, construim URL-ul complet pentru accesare
          const logoUrl = `/api/storage/local/${data.data.settings.CaleLogoCompanie}`;
          settingsToUse.logo = logoUrl;
          localStorage.setItem('originalLogoPath', data.data.settings.CaleLogoCompanie);
        }
        
        setCompanySettings(settingsToUse);
        console.log("Setările companiei au fost încărcate cu succes");
      } else {
        console.log("Nu există setări pentru companie sau a fost creat un tabel nou");
        if (data.data && data.data.settings) {
          setCompanySettings({
            companyName: data.data.settings.NumeCompanie || "",
            cui: data.data.settings.CUICompanie || "",
            email: data.data.settings.EmailCompanie || "",
            phone: data.data.settings.TelefonCompanie || "",
            address: data.data.settings.AdresaCompanie || "",
            logo: "",
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
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCompanySettings = async () => {
    if (!validateCompanySettings()) {
      const firstError = Object.values(validationErrors)[0];
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        const errorMsg = "Nu ești autentificat. Te rog să te conectezi.";
        setError(errorMsg);
        return;
      }

      const dataToSend = {
        NumeCompanie: companySettings.companyName,
        CUICompanie: companySettings.cui,
        EmailCompanie: companySettings.email,
        TelefonCompanie: companySettings.phone,
        AdresaCompanie: companySettings.address,
        CaleLogoCompanie: companySettings.originalLogoUrl || localStorage.getItem('originalLogoPath') || "",
        ONRCCompanie: companySettings.onrc,
        ContBancarCompanie: companySettings.contBancar,
        BancaCompanie: companySettings.banca
      };
      
      console.log("Salvare setări companie:", dataToSend);
      
      const response = await fetch('/api/company-settings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSend)
      });

      if (response.status === 401) {
        const errorMsg = "Sesiunea a expirat. Te rog să te conectezi din nou.";
        setError(errorMsg);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // Success - no toast notification
      } else {
        throw new Error(data.message || "Eroare la salvarea informațiilor companiei");
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Eroare necunoscută';
      console.error('Eroare la salvarea informațiilor companiei:', error);
      setError(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const resetCompanySettings = () => {
    setCompanySettings(defaultCompanySettings);
    setValidationErrors({});
  };

  useEffect(() => {
    loadCompanySettings();
  }, []);

  const uploadLogo = async (file: File) => {
    setUploadingLogo(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        const errorMsg = "Nu ești autentificat. Te rog să te conectezi.";
        setError(errorMsg);
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        setError("Te rog să selectezi o imagine");
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        setError("Fișierul este prea mare. Dimensiunea maximă este de 5MB");
        return;
      }
      
      if (!companySettings.cui || companySettings.cui.trim() === '') {
        setError("CUI-ul companiei este obligatoriu pentru a încărca un logo");
        return;
      }
      
      const formData = new FormData();
      formData.append('logo', file);
      formData.append('companyId', companySettings.cui);
      
      const response = await fetch('/api/storage/local/upload-company-logo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (response.status === 401) {
        const errorMsg = "Sesiunea a expirat. Te rog să te conectezi din nou.";
        setError(errorMsg);
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
      if (data.success && data.data && data.data.url) {
        const cacheBuster = `t=${Date.now()}`;
        const finalUrl = data.data.url.includes('?') ? `${data.data.url}&${cacheBuster}` : `${data.data.url}?${cacheBuster}`;
        // Dacă vin settings actualizate în răspuns le folosim
        if (data.data.settings) {
          const s = data.data.settings;
          setCompanySettings({
            companyName: s.NumeCompanie || companySettings.companyName,
            cui: s.CUICompanie || companySettings.cui,
            email: s.EmailCompanie || companySettings.email,
            phone: s.TelefonCompanie || companySettings.phone,
            address: s.AdresaCompanie || companySettings.address,
            logo: finalUrl,
            originalLogoUrl: s.CaleLogoCompanie || data.data.relativePath || data.data.url,
            onrc: s.ONRCCompanie || companySettings.onrc,
            contBancar: s.ContBancarCompanie || companySettings.contBancar,
            banca: s.BancaCompanie || companySettings.banca
          });
        } else {
          setCompanySettings({
            ...companySettings,
            logo: finalUrl,
            originalLogoUrl: data.data.relativePath || data.data.url
          });
        }
        localStorage.setItem('originalLogoPath', data.data.relativePath || data.data.url);
        console.log('Logo încărcat cu succes:', data.data.url);
      } else {
        throw new Error(data.message || 'Eroare la încărcarea logo-ului');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Eroare necunoscută';
      console.error('Eroare la încărcarea logo-ului:', error);
      setError(errorMsg);
    } finally {
      setUploadingLogo(false);
    }
  };

  const deleteLogo = async () => {
    if (!companySettings.logo) return;
    
    setUploadingLogo(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        const errorMsg = "Nu ești autentificat. Te rog să te conectezi.";
        setError(errorMsg);
        return;
      }
      
      if (!companySettings.cui || companySettings.cui.trim() === '') {
        setCompanySettings({
          ...companySettings,
          logo: ""
        });
        localStorage.removeItem('originalLogoPath');
        return;
      }
      
      const response = await fetch('/api/storage/local/delete-company-logo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          companyId: companySettings.cui
        })
      });
      
      if (response.status === 401) {
        const errorMsg = "Sesiunea a expirat. Te rog să te conectezi din nou.";
        setError(errorMsg);
        return;
      }
      
      const data = await response.json();
      
      setCompanySettings({
        ...companySettings,
        logo: "",
        originalLogoUrl: ""
      });
      localStorage.removeItem('originalLogoPath');
      
      if (data.success) {
        // Success - no toast notification
      } else {
        console.warn("Eroare la ștergerea logo-ului din storage local:", data.message);
        // Logo eliminated from interface - no toast notification
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Eroare necunoscută';
      console.error('Eroare la ștergerea logo-ului:', error);
      setError(errorMsg);
      setCompanySettings({
        ...companySettings,
        logo: "",
        originalLogoUrl: ""
      });
    } finally {
      setUploadingLogo(false);
    }
  };
  
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
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
