import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Upload, X, Image } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CompanySettings {
  IdCompanie?: string;
  NumeCompanie: string;
  CUICompanie?: string;
  ONRCCompanie?: string;
  AdresaCompanie?: string;
  EmailCompanie?: string;
  TelefonCompanie?: string;
  ContBancarCompanie?: string;
  BancaCompanie?: string;
  CaleLogoCompanie?: string;
  DataCreareCompanie?: string;
  DataModificareCompanie?: string;
}

export const CompanyTab = () => {
  const [companySettings, setCompanySettings] = useState<CompanySettings>({
    NumeCompanie: "",
    CUICompanie: "",
    ONRCCompanie: "",
    AdresaCompanie: "",
    EmailCompanie: "",
    TelefonCompanie: "",
    ContBancarCompanie: "",
    BancaCompanie: "",
    CaleLogoCompanie: ""
  });

  useEffect(() => {
    loadCompanySettings();
  }, []);

  const loadCompanySettings = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error("Nu ești autentificat. Te rog să te conectezi.");
        return;
      }

      console.log("🔄 Încărcare setări companie...");
      
      const response = await fetch('/api/company-settings', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log("📊 Răspuns server:", result);
        
        // Verifică dacă răspunsul are structura așteptată
        if (result.success && result.data && result.data.settings) {
          const settings = result.data.settings;
          console.log("✅ Setări companie încărcate:", settings);
          setCompanySettings(settings);
        } else if (result.data) {
          // Fallback pentru format direct
          console.log("✅ Setări companie încărcate (format direct):", result.data);
          setCompanySettings(result.data);
        } else {
          console.log("⚠️ Nu s-au găsit setări companiei în răspuns");
        }
      } else {
        console.log("⚠️ Setările companiei nu au fost găsite, se folosesc valorile implicite");
        console.log("Status:", response.status, response.statusText);
      }
    } catch (error) {
      console.error('❌ Eroare la încărcarea setărilor companiei:', error);
    }
  };

  const saveCompanySettings = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error("Nu ești autentificat. Te rog să te conectezi.");
        return;
      }

      console.log("💾 Salvare setări companie...", companySettings);

      const response = await fetch('/api/company-settings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(companySettings)
      });

      if (response.ok) {
        const result = await response.json();
        console.log("✅ Răspuns salvare:", result);
        console.log("✅ Setările companiei au fost salvate cu succes!");
        
        // Reîncarcă datele pentru a sincroniza cu baza de date
        await loadCompanySettings();
      } else {
        const errorData = await response.json().catch(() => null);
        console.error("❌ Eroare la salvarea setărilor companiei:", {
          status: response.status,
          statusText: response.statusText,
          data: errorData
        });
      }
    } catch (error) {
      console.error('❌ Eroare la salvarea setărilor companiei:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informații Companie</CardTitle>
        <CardDescription>
          Actualizează informațiile companiei tale
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="company-name">Nume companie</Label>
            <Input 
              id="company-name" 
              value={companySettings.NumeCompanie || ""}
              onChange={(e) => setCompanySettings({...companySettings, NumeCompanie: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-cui">CUI</Label>
            <Input 
              id="company-cui" 
              value={companySettings.CUICompanie || ""}
              onChange={(e) => setCompanySettings({...companySettings, CUICompanie: e.target.value})}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="company-onrc">ONRC</Label>
            <Input 
              id="company-onrc" 
              value={companySettings.ONRCCompanie || ""}
              onChange={(e) => setCompanySettings({...companySettings, ONRCCompanie: e.target.value})}
              placeholder="J40/123/2020"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-email">Email</Label>
            <Input 
              id="company-email" 
              type="email" 
              value={companySettings.EmailCompanie || ""}
              onChange={(e) => setCompanySettings({...companySettings, EmailCompanie: e.target.value})}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="company-phone">Telefon</Label>
            <Input 
              id="company-phone" 
              value={companySettings.TelefonCompanie || ""}
              onChange={(e) => setCompanySettings({...companySettings, TelefonCompanie: e.target.value})}
            />
          </div>
          <div className="space-y-2">
          <Label htmlFor="company-address">Adresă</Label>
          <Input 
            id="company-address" 
            value={companySettings.AdresaCompanie || ""}
            onChange={(e) => setCompanySettings({...companySettings, AdresaCompanie: e.target.value})}
          />
        </div>
        </div>
        
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
            <Label htmlFor="company-bank">Bancă</Label>
            <Input 
              id="company-bank" 
              value={companySettings.BancaCompanie || ""}
              onChange={(e) => setCompanySettings({...companySettings, BancaCompanie: e.target.value})}
              placeholder="Banca Transilvania"
            />
          </div>
        <div className="space-y-2">
          <Label htmlFor="company-bank-account">Cont bancar</Label>
          <Input 
            id="company-bank-account" 
            value={companySettings.ContBancarCompanie || ""}
            onChange={(e) => setCompanySettings({...companySettings, ContBancarCompanie: e.target.value})}
            placeholder="RO49AAAA1B31007593840000"
          />
        </div>
      </div>

        <div className="space-y-2">
          <Label htmlFor="company-logo">Logo (URL)</Label>
          <Input 
            id="company-logo" 
            type="url"
            placeholder="https://example.com/logo.png"
            value={companySettings.CaleLogoCompanie || ""}
            onChange={(e) => setCompanySettings({...companySettings, CaleLogoCompanie: e.target.value})}
          />
        </div>
        
        <Button onClick={saveCompanySettings}>
          Salvează setările
        </Button>
      </CardContent>
    </Card>
  );
};
