import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ReloadIcon, ResetIcon, UploadIcon, TrashIcon } from "@radix-ui/react-icons";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
// Toast removed to eliminate warnings

const CompanySettings = () => {
  const {
    companySettings,
    setCompanySettings,
    loading,
    saving,
    uploadingLogo,
    error,
    validationErrors,
    fileInputRef,
    handleSaveCompanySettings,
    resetCompanySettings,
    triggerFileInput,
    handleFileChange,
    deleteLogo
  } = useCompanySettings();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informații Companie</CardTitle>
        <CardDescription>
          {loading ? "Se încarcă..." : "Actualizează informațiile companiei tale"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        )}
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="company-name" className={validationErrors.companyName ? "text-destructive" : ""}>
              Nume companie {validationErrors.companyName && "*"}
            </Label>
            <Input 
              id="company-name" 
              value={companySettings.companyName}
              onChange={(e) => setCompanySettings({...companySettings, companyName: e.target.value})}
              disabled={loading}
              className={validationErrors.companyName ? "border-destructive" : ""}
            />
            {validationErrors.companyName && (
              <p className="text-sm text-destructive">{validationErrors.companyName}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-cui" className={validationErrors.cui ? "text-destructive" : ""}>
              CUI {validationErrors.cui && "*"}
            </Label>
            <Input 
              id="company-cui" 
              value={companySettings.cui}
              onChange={(e) => setCompanySettings({...companySettings, cui: e.target.value})}
              disabled={loading}
              className={validationErrors.cui ? "border-destructive" : ""}
            />
            {validationErrors.cui && (
              <p className="text-sm text-destructive">{validationErrors.cui}</p>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="company-email" className={validationErrors.email ? "text-destructive" : ""}>
              Email {validationErrors.email && "*"}
            </Label>
            <Input 
              id="company-email" 
              type="email" 
              value={companySettings.email}
              onChange={(e) => setCompanySettings({...companySettings, email: e.target.value})}
              disabled={loading}
              className={validationErrors.email ? "border-destructive" : ""}
            />
            {validationErrors.email && (
              <p className="text-sm text-destructive">{validationErrors.email}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-phone">Telefon</Label>
            <Input 
              id="company-phone" 
              value={companySettings.phone}
              onChange={(e) => setCompanySettings({...companySettings, phone: e.target.value})}
              disabled={loading}
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="company-address">Adresă</Label>
          <Input 
            id="company-address" 
            value={companySettings.address}
            onChange={(e) => setCompanySettings({...companySettings, address: e.target.value})}
            disabled={loading}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="company-onrc">ONRC</Label>
            <Input 
              id="company-onrc" 
              value={companySettings.onrc}
              onChange={(e) => setCompanySettings({...companySettings, onrc: e.target.value})}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-banca">Bancă</Label>
            <Input 
              id="company-banca" 
              value={companySettings.banca}
              onChange={(e) => setCompanySettings({...companySettings, banca: e.target.value})}
              disabled={loading}
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="company-cont-bancar">Cont Bancar</Label>
          <Input 
            id="company-cont-bancar" 
            value={companySettings.contBancar}
            onChange={(e) => setCompanySettings({...companySettings, contBancar: e.target.value})}
            disabled={loading}
          />
        </div>
          <div className="space-y-2">
          <Label htmlFor="company-logo" className={validationErrors.logo ? "text-destructive" : ""}>
            Logo {validationErrors.logo && "*"}
          </Label>
          
          <div className="flex space-x-2">
            <Input 
              id="company-logo" 
              value={companySettings.logo}
              onChange={(e) => setCompanySettings({...companySettings, logo: e.target.value})}
              placeholder="https://example.com/logo.png"
              disabled={loading || uploadingLogo}
              className={validationErrors.logo ? "border-destructive" : ""}
            />
            
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
              disabled={loading || saving || uploadingLogo}
            />
            
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={triggerFileInput}
              disabled={loading || saving || uploadingLogo}
              title="Încarcă logo în Azure Blob Storage"
            >
              {uploadingLogo ? <ReloadIcon className="h-4 w-4 animate-spin" /> : <UploadIcon className="h-4 w-4" />}
            </Button>
            
            {companySettings.logo && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={deleteLogo}
                disabled={loading || saving || uploadingLogo || !companySettings.logo}
                title="Șterge logo"
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            )}
          </div>
            {validationErrors.logo && (
            <p className="text-sm text-destructive">{validationErrors.logo}</p>
          )}
          
          {companySettings.logo && (
            <div className="mt-2 p-2 border rounded-md flex justify-center">
              <img 
                src={companySettings.logo} 
                alt="Logo companie" 
                className="max-h-24 object-contain"
                onLoad={() => {
                  console.log("Logo încărcat cu succes:", companySettings.logo);
                  console.log("Logo URL original:", companySettings.originalLogoUrl);
                }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  console.error("Eroare la încărcarea logo-ului:", target.src);
                  console.error("Logo URL în state:", companySettings.logo);
                  console.error("Original Logo URL în state:", companySettings.originalLogoUrl);
                  
                  // Încearcă să reîncarci direct de la URL-ul original dacă există
                  if (companySettings.originalLogoUrl && companySettings.originalLogoUrl !== target.src) {
                    console.log("Încercăm URL-ul original:", companySettings.originalLogoUrl);
                    target.src = companySettings.originalLogoUrl;
                    return;
                  }
                  
                  // Dacă tot nu merge, arată un placeholder
                  target.src = 'https://placehold.co/200x100?text=Logo+Invalid';
                  // Adaugă un mesaj de eroare
                  console.error("Nu s-a putut încărca logo-ul. Verificați adresa URL sau încărcați din nou.");
                }}
              />
            </div>
          )}
          
          <p className="text-sm text-muted-foreground mt-1">
            Pentru o calitate optimă, încărcați un logo în format PNG sau JPG cu fundal transparent. Folosiți butonul de încărcare pentru a salva logo-ul în Azure Blob Storage.
            {companySettings.cui.trim() === "" && (
              <span className="text-destructive block mt-1">
                *Trebuie să adăugați CUI-ul companiei înainte de a încărca un logo.
              </span>
            )}
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={resetCompanySettings} 
          disabled={loading || saving}
        >
          <ResetIcon className="mr-2 h-4 w-4" />
          Resetează
        </Button>
        <Button 
          onClick={handleSaveCompanySettings} 
          disabled={loading || saving}
        >
          {saving ? (
            <>
              <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
              Se salvează...
            </>
          ) : (
            "Salvează Modificările"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default CompanySettings;
