import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// Toast removed to eliminate warnings

interface CompanySettings {
  companyName: string;
  cui: string;
  email: string;
  phone: string;
  address: string;
  logo: string;
}

export const CompanyTab = () => {
  const [companySettings, setCompanySettings] = useState<CompanySettings>({
    companyName: "Compania Mea SRL",
    cui: "RO12345678",
    email: "office@companiatamea.ro",
    phone: "0721.234.567",
    address: "Str. Exemplu nr. 1, București",
    logo: ""
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

      const response = await fetch('/api/company/settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCompanySettings(data);
      } else {
        // Nu afișăm eroare dacă nu există setări - folosim defaulturile
        console.log("Setările companiei nu au fost găsite, se folosesc valorile implicite");
      }
    } catch (error) {
      console.error('Eroare la încărcarea setărilor companiei:', error);
      // Nu afișăm toast pentru că poate să nu existe încă setările
    }
  };

  const saveCompanySettings = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error("Nu ești autentificat. Te rog să te conectezi.");
        return;
      }

      const response = await fetch('/api/company/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(companySettings)
      });

      if (response.ok) {
        console.log("Setările companiei au fost salvate cu succes!");
      } else {
        const errorData = await response.json();
        console.error(`Eroare la salvarea setărilor: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Eroare la salvarea setărilor companiei:', error);
      console.error("Eroare la conectarea cu serverul");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informații Companie</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="company-name">Nume companie</Label>
            <Input 
              id="company-name" 
              value={companySettings.companyName}
              onChange={(e) => setCompanySettings({...companySettings, companyName: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-cui">CUI</Label>
            <Input 
              id="company-cui" 
              value={companySettings.cui}
              onChange={(e) => setCompanySettings({...companySettings, cui: e.target.value})}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="company-email">Email</Label>
            <Input 
              id="company-email" 
              type="email" 
              value={companySettings.email}
              onChange={(e) => setCompanySettings({...companySettings, email: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-phone">Telefon</Label>
            <Input 
              id="company-phone" 
              value={companySettings.phone}
              onChange={(e) => setCompanySettings({...companySettings, phone: e.target.value})}
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="company-address">Adresă</Label>
          <Input 
            id="company-address" 
            value={companySettings.address}
            onChange={(e) => setCompanySettings({...companySettings, address: e.target.value})}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="company-logo">Logo (URL)</Label>
          <Input 
            id="company-logo" 
            type="url"
            placeholder="https://example.com/logo.png"
            value={companySettings.logo}
            onChange={(e) => setCompanySettings({...companySettings, logo: e.target.value})}
          />
        </div>
        
        <Button onClick={saveCompanySettings}>
          Salvează setările
        </Button>
      </CardContent>
    </Card>
  );
};

