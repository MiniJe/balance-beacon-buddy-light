
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, TrendingUp, Clock, CheckCircle } from "lucide-react";
import { Company } from "@/types/request";
// Ensure correct paths for ui components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; 
import { Badge } from "@/components/ui/badge"; 

interface CompanySelectorProps {
  companies: Company[];
  selectedCompany: string | null;
  onCompanySelect: (companyId: string) => void;
}

export function CompanySelector({ companies, selectedCompany, onCompanySelect }: CompanySelectorProps) {
  const selectedCompanyData = companies.find(c => c.id === selectedCompany);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Building2 className="h-5 w-5 text-muted-foreground" />
        <Select value={selectedCompany || ''} onValueChange={onCompanySelect}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Selectează o companie..." />
          </SelectTrigger>
          <SelectContent>
            {companies.map((company) => (
              <SelectItem key={company.id} value={company.id}>
                <div className="flex items-center justify-between w-full">
                  <span>{company.name}</span>
                  <Badge variant="secondary" className="ml-2">
                    {company.totalRequests} cereri
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedCompanyData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {selectedCompanyData.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total cereri</p>
                  <p className="font-semibold">{selectedCompanyData.totalRequests}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <div>
                  <p className="text-sm text-muted-foreground">În așteptare</p>
                  <p className="font-semibold">{selectedCompanyData.pendingRequests}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Finalizate</p>
                  <p className="font-semibold">{selectedCompanyData.completedRequests}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Rata răspuns</p>
                  <p className="font-semibold">{selectedCompanyData.responseRate}%</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
