import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Building2, Mail, CheckCircle2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

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
  onPartnerToggle: (partnerId: string) => void;
  selectedCount: number;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  onSelectByCategory?: (category: string) => void;
}

export const Step1SelectPartners: React.FC<Step1SelectPartnersProps> = ({
  partners,
  onPartnerToggle,
  selectedCount,
  onSelectAll,
  onDeselectAll,
  onSelectByCategory,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Filtrăm partenerii pe baza termenului de căutare și categoriei
  const filteredPartners = partners.filter((partner) => {
    const matchesSearch = 
      partner.numePartener.toLowerCase().includes(searchTerm.toLowerCase()) ||
      partner.cuiPartener.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (partner.emailPartener && partner.emailPartener.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = 
      categoryFilter === "all" || 
      partner.partnerCategory === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const getPartnerTypeDisplay = (partner: SoldPartener) => {
    if (partner.clientDUC) return { type: "Client DUC", color: "bg-blue-100 text-blue-800" };
    if (partner.clientDL) return { type: "Client DL", color: "bg-green-100 text-green-800" };
    if (partner.furnizorDUC) return { type: "Furnizor DUC", color: "bg-purple-100 text-purple-800" };
    if (partner.furnizorDL) return { type: "Furnizor DL", color: "bg-orange-100 text-orange-800" };
    return { type: "Partener", color: "bg-gray-100 text-gray-800" };
  };

  return (
    <div className="space-y-6">
      {/* Header cu statistici */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Selectare Parteneri</h3>
          <p className="text-sm text-gray-600">
            Alegeți partenerii căror le veți trimite solicitarea pentru fișele partener
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="px-3 py-1">
            <Users className="h-3 w-3 mr-1" />
            {selectedCount} selectați
          </Badge>
        </div>
      </div>

      {/* Controale de selecție */}
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Acțiuni Rapide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Butoane de selecție */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onSelectAll}
              className="text-xs"
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Selectează Toți
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onDeselectAll}
              className="text-xs"
            >
              Deselectează Toți
            </Button>
          </div>

          {/* Filtre */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Căutare</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Căutați după nume, CUI sau email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Categorie</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">Toate categoriile</option>
                <option value="client_duc">Clienți DUC</option>
                <option value="client_dl">Clienți DL</option>
                <option value="furnizor_duc">Furnizori DUC</option>
                <option value="furnizor_dl">Furnizori DL</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista parteneri */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredPartners.length === 0 ? (
          <Card className="p-6 text-center">
            <div className="text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nu au fost găsiți parteneri care să corespundă criteriilor de căutare.</p>
            </div>
          </Card>
        ) : (
          filteredPartners.map((partner) => {
            const typeInfo = getPartnerTypeDisplay(partner);
            return (
              <Card
                key={partner.idPartener}
                className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                  partner.selected ? "ring-2 ring-blue-500 bg-blue-50" : ""
                }`}
                onClick={() => onPartnerToggle(partner.idPartener)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <Checkbox
                      checked={partner.selected}
                      onChange={() => onPartnerToggle(partner.idPartener)}
                      className="mt-1"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900 truncate">
                          {partner.numePartener}
                        </h4>
                        <Badge className={`text-xs ${typeInfo.color}`}>
                          {typeInfo.type}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-600 space-x-4">
                        <div className="flex items-center">
                          <Building2 className="h-3 w-3 mr-1" />
                          CUI: {partner.cuiPartener}
                        </div>
                        {partner.emailPartener && (
                          <div className="flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            {partner.emailPartener}
                          </div>
                        )}
                      </div>
                      
                      {partner.reprezentantPartener && (
                        <div className="text-sm text-gray-500 mt-1">
                          Reprezentant: {partner.reprezentantPartener}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Footer cu statistici */}
      {filteredPartners.length > 0 && (
        <div className="text-center text-sm text-gray-600 pt-4 border-t">
          Se afișează {filteredPartners.length} din {partners.length} parteneri
          {selectedCount > 0 && (
            <span className="font-medium text-blue-600 ml-2">
              • {selectedCount} selectați
            </span>
          )}
        </div>
      )}
    </div>
  );
};
