import React from "react";
// Toast removed to eliminate warnings
import { Plus, ArrowUpDown, ArrowUp, ArrowDown, FileDown, Printer, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Partener, PartenerFormData } from "@/types/partener";
import { usePartnersManagement } from "@/hooks/usePartnersManagement";
import { PartnerFilters } from "@/components/partners/PartnerFilters";
import { PartnerTable } from "@/components/partners/PartnerTable";
import { PartnerFormDialog } from "@/components/partners/PartnerFormDialog";

import { SendPdfDialog } from "@/components/partners/SendPdfDialog";
import type { EmailData } from "@/components/partners/SendPdfDialog";
import { useState } from "react";

const Partners = () => {
  // State pentru dialog
  const [editPartener, setEditPartener] = useState<PartenerFormData | null>(null);
  const [editPartenerId, setEditPartenerId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendPdfDialogOpen, setSendPdfDialogOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  // Custom hook pentru managementul partenerilor
  const {
    parteneri,
    loading,
    searchTerm,
    sortOptions,
    selectedPartnerIds,
    setSearchTerm,
    handleSortChange,
    handleSelectPartener,
    handleSelectAll,
    allVisible,
    refreshParteneri,
    selectedCount,
    totalParteneri
  } = usePartnersManagement();

  // Funcția pentru a afișa iconița de sortare
  const getSortIcon = (field: string) => {
    if (sortOptions.sortBy !== field) return <ArrowUpDown className="h-4 w-4" />;
    return sortOptions.sortOrder === 'asc' ? 
      <ArrowUp className="h-4 w-4" /> : 
      <ArrowDown className="h-4 w-4" />;
  };

  // Funcții pentru actualizarea listei locale (simplificat fără paginare)
  const updatePartenerInList = (_updatedPartener: Partener) => {
    // Nu e nevoie de actualizare locală - refreshParteneri va reîncărca toată lista
    refreshParteneri();
  };

  // Ștergerea locală nu este necesară; folosim refreshParteneri

  const getSelectedPartners = async (): Promise<Partener[]> => {
    // Filtrează partenerii selectați din lista curentă
    return parteneri.filter(p => selectedPartnerIds.has(p.idPartener));
  };

  // Funcții simplificate pentru gestionarea selecției
  const handleStatusChange = (status: 'all' | 'active' | 'inactive') => {
    handleSortChange({ status });
  };

  const handlePartnerTypeChange = (partnerType: string) => {
    handleSortChange({ partnerType: partnerType as any });
  };

  // Wrapper pentru sortChange care primește doar field
  const handleFieldSortChange = (field: any) => {
    const newOrder = sortOptions.sortBy === field && sortOptions.sortOrder === 'asc' ? 'desc' : 'asc';
    handleSortChange({ sortBy: field, sortOrder: newOrder });
  };

  // selection helpers are inlined where needed
  const handleEditPartener = (partener: Partener) => {
    setEditPartener({
      numePartener: partener.numePartener,
      cuiPartener: partener.cuiPartener,
      onrcPartener: partener.onrcPartener || "",
      emailPartener: partener.emailPartener || "",
      reprezentantPartener: partener.reprezentantPartener || "",
      clientDUC: partener.clientDUC || false,
      furnizorDUC: partener.furnizorDUC || false,
      clientDL: partener.clientDL || false,
      furnizorDL: partener.furnizorDL || false,
      adresaPartener: partener.adresaPartener || "",
      telefonPartener: partener.telefonPartener || "",
      observatiiPartener: partener.observatiiPartener || "",
      partenerActiv: partener.partenerActiv
    });
    setEditPartenerId(partener.idPartener);
    setDialogOpen(true);
  };

  // Handler pentru adăugarea unui partener
  const handleAddPartener = () => {
    setEditPartener({
      numePartener: "",
      cuiPartener: "",
      onrcPartener: "",
      emailPartener: "",
      reprezentantPartener: "",
      clientDUC: false,
      furnizorDUC: false,
      clientDL: false,
      furnizorDL: false,
      adresaPartener: "",
      telefonPartener: "",
      observatiiPartener: "",
      partenerActiv: true
    });
    setEditPartenerId(null);
    setDialogOpen(true);
  };

  // Handler pentru salvarea unui partener
  const handleSavePartener = async () => {
    if (!editPartener) return;

    // Validări de bază
    if (!editPartener.numePartener.trim()) {
      console.warn("Numele partenerului este obligatoriu");
      return;
    }
    
    if (!editPartener.cuiPartener.trim()) {
      console.warn("CUI-ul partenerului este obligatoriu");
      return;
    }

    if (!editPartener.onrcPartener?.trim()) {
      console.warn("Nr. ONRC este obligatoriu");
      return;
    }

    setSaving(true);
    try {
      const partenerService = await import('@/services/partener.service');
      
      if (editPartenerId) {
        // Actualizare partener existent
        const updatedPartener = await partenerService.partenerService.updatePartener(editPartenerId, editPartener);
        updatePartenerInList(updatedPartener);
        console.log("Partenerul a fost actualizat cu succes");
      } else {
        // Creeare partener nou
        await partenerService.partenerService.createPartener(editPartener);
        // Reîncarcă lista pentru a obține paginarea corectă
        await refreshParteneri();
        console.log("Partenerul a fost creat cu succes");
      }
      
      setDialogOpen(false);
      setEditPartener(null);
      setEditPartenerId(null);
    } catch (error) {
      console.error('Eroare la salvarea partenerului:', error);
      console.warn(error instanceof Error ? error.message : 'Eroare la salvarea partenerului');
    } finally {
      setSaving(false);
    }
  };

  // Handler pentru închiderea dialogului
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditPartener(null);
    setEditPartenerId(null);
    setSaving(false);
  };

  // Handler pentru schimbarea valorii partenerului în formular
  const handlePartenerChange = (partener: PartenerFormData) => {
    setEditPartener(partener);
  };

  // Handler pentru refresh
  const handleRefresh = () => {
    refreshParteneri();
  };
  // Event listener pentru ștergerea unui partener
  React.useEffect(() => {
    const handlePartnerDeleted = () => {
      refreshParteneri();
    };

    window.addEventListener('partnerDeleted', handlePartnerDeleted);
    return () => {
      window.removeEventListener('partnerDeleted', handlePartnerDeleted);
    };
  }, [refreshParteneri]);  // PDF Functions
  const handleDownloadPdf = async () => {
    const selectedPartners = await getSelectedPartners();
    if (selectedPartners.length === 0) {
      console.warn('Vă rugăm să selectați cel puțin un partener');
      return;
    }

    console.log('🚀 Generare PDF pentru', selectedPartners.length, 'parteneri');
    console.log('🔍 API_URL:', import.meta.env.VITE_API_URL || 'http://localhost:5000/api');
    
    setPdfLoading(true);
    try {      // Folosim endpoint-ul real pentru descărcare
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${baseUrl}/api/pdf/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ partners: selectedPartners })
      });
      
      if (!response.ok) {
        throw new Error(`Eroare HTTP: ${response.status}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `lista-parteneri-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      console.log(`PDF descărcat cu succes cu ${selectedPartners.length} parteneri`);    } catch (error: any) {
      console.error('Eroare la descărcarea PDF:', error);
      console.error(`Eroare la descărcarea PDF-ului: ${error.message || error}`);
    } finally {
      setPdfLoading(false);
    }
  };
  const handlePrintPdf = async () => {
    const selectedPartners = await getSelectedPartners();
    if (selectedPartners.length === 0) {
      console.warn('Vă rugăm să selectați cel puțin un partener');
      return;
    }

    setPdfLoading(true);
    try {
      console.log('🖨️ Generare PDF pentru printare cu', selectedPartners.length, 'parteneri');
        // Folosim endpoint-ul de testare pentru printare
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${baseUrl}/api/pdf/print`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          partners: selectedPartners,
          title: 'Lista pentru Printare',
          orientation: 'landscape'
        })
      });
      
      if (!response.ok) {
        throw new Error(`Eroare HTTP: ${response.status}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Deschide într-o fereastră nouă pentru printare
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 1000); // Așteaptă ca PDF-ul să se încarce complet
        };
      }
      
      console.log(`PDF pregătit pentru printare cu ${selectedPartners.length} parteneri`);    } catch (error: any) {
      console.error('Eroare la printarea PDF:', error);
      console.error(`Eroare la printarea PDF-ului: ${error.message || error}`);
    } finally {
      setPdfLoading(false);
    }  };
  
  const handleEmailPdf = async (emailData: EmailData) => {
    const selectedPartners = await getSelectedPartners();
    
    if (selectedPartners.length === 0) {
      console.warn('Vă rugăm să selectați cel puțin un partener');
      return;
    }
    
    try {
      console.log('📧 Trimitere PDF prin email pentru', selectedPartners.length, 'parteneri');
      setPdfLoading(true);
        // Folosim endpoint-ul real pentru trimiterea emailului cu PDF atașat
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${baseUrl}/api/pdf/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          partners: selectedPartners,
          emailData: {
            to: emailData.emails[0], // Folosim primul email ca destinatar principal
            cc: emailData.emails.slice(1), // Restul email-urilor ca CC
            subject: emailData.subject || 'Lista Parteneri',
            body: emailData.message || 'Vă transmitem atașat lista de parteneri solicitată.',
            attachmentName: `lista-parteneri-${Date.now()}.pdf`
          }
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Eroare HTTP: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`Email trimis cu succes către ${emailData.emails.join(', ')}`);
      } else {
        throw new Error(result.message || 'Eroare la trimiterea email-ului');
      }
    } catch (error: any) {
      console.error('Eroare la generarea PDF pentru email:', error);
      console.error(`Eroare la trimiterea email-ului: ${error.message || error}`);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleOpenEmailDialog = async () => {
    const selectedPartners = await getSelectedPartners();
    if (selectedPartners.length === 0) {
      console.warn('Vă rugăm să selectați cel puțin un partener');
      return;
    }
    setSendPdfDialogOpen(true);
  };

  // Debug logs
  console.log('Partners.tsx Debug:', {
    selectedPartnerIds,
    selectedPartnerIdsSize: selectedPartnerIds.size,
    selectedPartnerIdsArray: Array.from(selectedPartnerIds),
    parteneri: parteneri?.length || 0
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Parteneri</h1>
        <div className="flex items-center space-x-2">
          {/* Selection controls - fără paginare */}
          {selectedCount > 0 && (
            <div className="flex items-center space-x-1 text-xs">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSelectAll(true)}
                className="h-7 px-2"
              >
                Selectează tot ({totalParteneri})
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSelectAll(false)}
                className="h-7 px-2"
              >
                Deselectează tot
              </Button>
            </div>
          )}
          {/* Debug info */}
          <span className="text-xs text-gray-500">
            Selectați: {selectedPartnerIds.size} din {totalParteneri}
          </span>
          {selectedPartnerIds.size > 0 && (
            <>
              <Button
                variant="outline"
                onClick={handleDownloadPdf}
                disabled={pdfLoading}
                size="sm"
              >
                <FileDown className="mr-2 h-4 w-4" />
                Descarcă PDF ({selectedPartnerIds.size})
              </Button>
              <Button
                variant="outline"
                onClick={handlePrintPdf}
                disabled={pdfLoading}
                size="sm"
              >
                <Printer className="mr-2 h-4 w-4" />
                Printează
              </Button>
              <Button
                variant="outline"
                onClick={handleOpenEmailDialog}
                disabled={pdfLoading}
                size="sm"
              >
                <Mail className="mr-2 h-4 w-4" />
                Trimite Email
              </Button>
            </>
          )}
          <Button onClick={handleAddPartener} disabled={loading}>
            <Plus className="mr-2 h-4 w-4" /> Adaugă Partener
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <PartnerFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        sortOptions={sortOptions}
        onStatusChange={handleStatusChange}
        onPartnerTypeChange={handlePartnerTypeChange}
        onSortChange={handleFieldSortChange}
        getSortIcon={getSortIcon}
        onRefresh={handleRefresh}
        loading={loading}
      />

      {/* Partners Table Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lista parteneri</CardTitle>
              <CardDescription>
                {loading ? "Se încarcă partenerii..." : 
                 searchTerm ? `${parteneri.length} parteneri găsiți din ${totalParteneri} total` :
                 `${totalParteneri} parteneri în total`
                }
              </CardDescription>
            </div>
            {!loading && parteneri.length > 0 && (
              <div className="text-sm text-muted-foreground">
                <p>Export disponibil: {totalParteneri} {totalParteneri === 1 ? 'partener' : 'parteneri'}</p>
                <p className="text-xs">
                  {sortOptions.status === 'active' ? 'Doar activi' : 
                   sortOptions.status === 'inactive' ? 'Doar inactivi' : 
                   'Include activi și inactivi'}
                  {sortOptions.partnerType !== 'all' && (
                    ` • ${
                      sortOptions.partnerType === 'client' ? 'Clienți' :
                      sortOptions.partnerType === 'furnizor' ? 'Furnizori' :
                      sortOptions.partnerType === 'client-duc' ? 'Clienți DUC' :
                      sortOptions.partnerType === 'client-dl' ? 'Clienți DL' :
                      sortOptions.partnerType === 'furnizor-duc' ? 'Furnizori DUC' :
                      sortOptions.partnerType === 'furnizor-dl' ? 'Furnizori DL' : ''
                    }`
                  )}
                </p>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>          <PartnerTable
            parteneri={parteneri}
            loading={loading}
            searchTerm={searchTerm}
            sortOptions={sortOptions}
            selectedPartnerIds={selectedPartnerIds}
            onSortChange={handleFieldSortChange}
            getSortIcon={getSortIcon}
            onEditPartener={handleEditPartener}
            onTogglePartnerSelection={handleSelectPartener}
            onToggleCurrentPageSelection={() => handleSelectAll(!allVisible)}
            onDeselectAllPartners={() => handleSelectAll(false)}
          />
        </CardContent>
        
        {/* Card-ul va avea scroll intern pentru parteneri */}
      </Card>
      
      {/* Partner Form Dialog */}
      <PartnerFormDialog
        isOpen={dialogOpen}
        onClose={handleCloseDialog}
        editPartener={editPartener}
        onPartenerChange={handlePartenerChange}
        onSave={handleSavePartener}
        editPartenerId={editPartenerId}
        saving={saving}
      />

      {/* Send PDF Dialog */}
      <SendPdfDialog
        open={sendPdfDialogOpen}
        onClose={() => setSendPdfDialogOpen(false)}
        selectedPartnersCount={selectedPartnerIds.size}
        onSendEmail={handleEmailPdf}
      />
    </div>
  );
};

export default Partners;