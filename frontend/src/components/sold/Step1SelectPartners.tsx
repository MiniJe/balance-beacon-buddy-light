import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Building2, Mail, ChevronRight } from "lucide-react";

interface SoldPartener {
  idPartener: string;
  numePartener: string;
  cuiPartener: string;
  emailPartener?: string;
  reprezentantPartener?: string;
  clientDUC?: boolean;
  furnizorDUC?: boolean;
  clientDL?: boolean;
  furnizorDL?: boolean;
  selected: boolean;
  partnerCategory: "client_duc" | "client_dl" | "furnizor_duc" | "furnizor_dl";
}

interface Step1SelectPartnersProps {
  partners: SoldPartener[];
  loading?: boolean;
  error?: string | null;
  partnerCategory?: string;
  onPartnerToggle: (partnerId: string) => void;
  selectedCount: number;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  onSelectByCategory?: (category: string) => void;
  onNext?: () => void;
}

export const Step1SelectPartners: React.FC<Step1SelectPartnersProps> = ({
  partners,
  loading = false,
  error = null,
  partnerCategory = 'all',
  onPartnerToggle,
  selectedCount,
  onSelectAll,
  onDeselectAll,
  onSelectByCategory,
  onNext
}) => {
  const [categoryFilter, setCategoryFilter] = useState<string>(partnerCategory || 'all');
  const filteredPartners = useMemo(() => partners.filter(p => categoryFilter === 'all' || p.partnerCategory === categoryFilter), [partners, categoryFilter]);
  const allFilteredSelected = filteredPartners.length > 0 && filteredPartners.every(p => p.selected);
  const getPartnerTypeDisplay = (partner: SoldPartener) => {
    if (partner.partnerCategory === 'client_duc') return { type: 'Client DUC', color: 'bg-blue-100 text-blue-800' };
    if (partner.partnerCategory === 'client_dl') return { type: 'Client DL', color: 'bg-green-100 text-green-800' };
    if (partner.partnerCategory === 'furnizor_duc') return { type: 'Furnizor DUC', color: 'bg-purple-100 text-purple-800' };
    if (partner.partnerCategory === 'furnizor_dl') return { type: 'Furnizor DL', color: 'bg-orange-100 text-orange-800' };
    return { type: 'Partener', color: 'bg-gray-100 text-gray-800' };
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>1. Selectează Partenerii</CardTitle>
        <CardDescription>Sunt afișați doar partenerii ACTIVI.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <div className="bg-destructive/15 text-destructive p-3 rounded-md text-sm">{error}</div>}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="selectAllSold"
              checked={allFilteredSelected}
              onCheckedChange={(checked) => { if (checked === true) onSelectAll?.(); else if (checked === false) onDeselectAll?.(); }}
              disabled={loading || filteredPartners.length === 0}
            />
            <label htmlFor="selectAllSold" className="text-sm">Selectează</label>
          </div>
          <select
            className="w-[200px] px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); onSelectByCategory?.(e.target.value); }}
          >
            <option value="all">Toate categoriile</option>
            <option value="client_duc">Client DUC</option>
            <option value="client_dl">Client DL</option>
            <option value="furnizor_duc">Furnizor DUC</option>
            <option value="furnizor_dl">Furnizor DL</option>
          </select>
        </div>
        <div className="max-h-[400px] overflow-y-auto space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8"><div className="text-center"><div className="animate-spin h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div><p className="text-muted-foreground">Se încarcă partenerii...</p></div></div>
          ) : filteredPartners.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{error ? 'Eroare la încărcarea partenerilor' : 'Nu există parteneri activi'}</p>
          ) : (
            filteredPartners.map(partner => {
              const typeInfo = getPartnerTypeDisplay(partner);
              return (
                <div key={partner.idPartener} className="flex items-center justify-between p-3 hover:bg-accent rounded border">
                  <div className="flex items-center space-x-3">
                    <Checkbox id={`sold-partner-${partner.idPartener}`} checked={partner.selected} onCheckedChange={() => onPartnerToggle(partner.idPartener)} />
                    <div>
                      <label htmlFor={`sold-partner-${partner.idPartener}`} className="font-medium cursor-pointer">{partner.numePartener}</label>
                      <p className="text-sm text-muted-foreground">CUI: {partner.cuiPartener}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${typeInfo.color}`}>{typeInfo.type}</span>
                    <span className="text-sm text-muted-foreground min-w-[150px] text-right">{partner.emailPartener || 'Fără email'}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
      <CardFooter className="justify-between">
        <div className="text-sm text-muted-foreground">Parteneri selectați: <strong className="text-foreground">{selectedCount}</strong></div>
        {onNext && (
          <Button onClick={onNext} disabled={selectedCount === 0}>Continuă <ChevronRight className="ml-2 h-4 w-4" /></Button>
        )}
      </CardFooter>
    </Card>
  );
};
// end
