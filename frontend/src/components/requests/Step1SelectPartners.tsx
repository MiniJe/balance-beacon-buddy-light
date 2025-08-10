import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ChevronRight } from "lucide-react";

interface RequestPartener {
  idPartener: string;
  numePartener: string;
  cuiPartener: string;
  emailPartener?: string;
  selected: boolean;
  partnerCategory: "client_duc" | "client_dl" | "furnizor_duc" | "furnizor_dl";
}

interface Step1SelectPartnersProps {
  partners: RequestPartener[];
  loading: boolean;
  error: string | null;
  partnerCategory: string;
  onPartnerSelection: (partnerId: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onFilterChange: (value: string) => void;
  onNext: () => void;
}

export const Step1SelectPartners = ({
  partners,
  loading,
  error,
  partnerCategory,
  onPartnerSelection,
  onSelectAll,
  onFilterChange,
  onNext
}: Step1SelectPartnersProps) => {
  const filteredPartners = partners.filter(partner => 
    partnerCategory === "all" || partner.partnerCategory === partnerCategory
  );
  
  const selectedPartnersCount = partners.filter(p => p.selected).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>1. Selectează Partenerii</CardTitle>
        <CardDescription>
          Alege partenerii ACTIVI cărora vrei să le trimiți cererea de confirmare de sold.
          Filtrează după categorie pentru a vedea doar partenerii din categoria dorită.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="bg-destructive/15 text-destructive p-3 rounded-md text-sm">
            {error}
          </div>
        )}
        
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="selectAll" 
              checked={filteredPartners.length > 0 && filteredPartners.every(p => p.selected)}
              onCheckedChange={onSelectAll}
              disabled={loading || filteredPartners.length === 0}
            />
            <Label htmlFor="selectAll">Selectează</Label>
          </div>
          <Select value={partnerCategory} onValueChange={onFilterChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Categorie parteneri" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toate categoriile</SelectItem>
              <SelectItem value="client_duc">Client DUC</SelectItem>
              <SelectItem value="client_dl">Client DL</SelectItem>
              <SelectItem value="furnizor_duc">Furnizor DUC</SelectItem>
              <SelectItem value="furnizor_dl">Furnizor DL</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Separator />
        
        <div className="max-h-[400px] overflow-y-auto space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-muted-foreground">Se încarcă partenerii...</p>
              </div>
            </div>
          ) : filteredPartners.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {error ? 'Eroare la încărcarea partenerilor' : 'Nu există parteneri activi'}
            </p>
          ) : (
            filteredPartners.map((partner) => (
              <div key={partner.idPartener} className="flex items-center justify-between p-3 hover:bg-accent rounded border">
                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id={`partner-${partner.idPartener}`} 
                    checked={partner.selected}
                    onCheckedChange={(checked) => onPartnerSelection(partner.idPartener, checked === true)}
                  />
                  <div>
                    <Label htmlFor={`partner-${partner.idPartener}`} className="font-medium cursor-pointer">
                      {partner.numePartener}
                    </Label>
                    <p className="text-sm text-muted-foreground">CUI: {partner.cuiPartener}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    partner.partnerCategory.includes("client") 
                      ? "bg-blue-100 text-blue-800" 
                      : "bg-green-100 text-green-800"
                  }`}>
                    {partner.partnerCategory === "client_duc" ? "Client DUC" :
                     partner.partnerCategory === "client_dl" ? "Client DL" :
                     partner.partnerCategory === "furnizor_duc" ? "Furnizor DUC" :
                     "Furnizor DL"}
                  </span>
                  <span className="text-sm text-muted-foreground min-w-[150px] text-right">
                    {partner.emailPartener || 'Fără email'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
      <CardFooter className="justify-between">
        <div className="text-sm text-muted-foreground">
          Parteneri selectați: <strong className="text-foreground">{selectedPartnersCount}</strong>
        </div>
        <Button 
          onClick={onNext} 
          disabled={selectedPartnersCount === 0}
        >
          Continuă <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};
