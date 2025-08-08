import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Partener, PartenerSortOptions } from '@/types/partener';
import { partenerService } from '@/services/partener.service';

export const usePartnersManagement = () => {
  const [parteneri, setParteneri] = useState<Partener[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPartnerIds, setSelectedPartnerIds] = useState<Set<string>>(new Set());
  
  // Stările pentru sortare și filtrare
  const [sortOptions, setSortOptions] = useState<PartenerSortOptions>({
    sortBy: 'numePartener',
    sortOrder: 'asc',
    status: 'active', // implicit arată doar partenerii activi
    partnerType: 'all'
  });

  // Funcția de încărcare a partenerilor (fără paginare - încarcă toți)
  const loadParteneri = useCallback(async (showSuccessToast = false) => {
    try {
      setLoading(true);
      const response = await partenerService.getAllParteneri({
        ...sortOptions,
        // Eliminăm paginarea - backend va returna toți partenerii
        page: 1,
        limit: 1000 // Limită mare pentru a încărca toți partenerii
      });
      setParteneri(response.parteneri);
      
      if (showSuccessToast) {
        // Toast dezactivat temporar pentru a elimina warning-urile React
        // setTimeout(() => {
        //   toast.success(`${response.parteneri.length} parteneri găsiți`);
        // }, 0);
        console.log(`✅ ${response.parteneri.length} parteneri găsiți`);
      }
    } catch (error) {
      console.error('Eroare la încărcarea partenerilor:', error);
      // Toast dezactivat temporar pentru a elimina warning-urile React
      // setTimeout(() => {
      //   toast.error('Eroare la încărcarea partenerilor');
      // }, 0);
    } finally {
      setLoading(false);
    }
  }, [sortOptions]);

  useEffect(() => {
    loadParteneri();
  }, [loadParteneri]);

  // Filtrarea partenerilor după termenul de căutare
  const filteredParteneri = parteneri.filter((partener: Partener) => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      partener.numePartener?.toLowerCase().includes(searchLower) ||
      partener.cuiPartener?.toLowerCase().includes(searchLower) ||
      partener.emailPartener?.toLowerCase().includes(searchLower) ||
      partener.reprezentantPartener?.toLowerCase().includes(searchLower)
    );
  });

  // Funcții pentru sortare și filtrare
  const handleSortChange = useCallback((newSortOptions: Partial<PartenerSortOptions>) => {
    setSortOptions(prev => ({ ...prev, ...newSortOptions }));
  }, []);

  const resetFilters = useCallback(() => {
    setSortOptions({
      sortBy: 'numePartener',
      sortOrder: 'asc',
      status: 'active',
      partnerType: 'all'
    });
    setSearchTerm("");
  }, []);

  // Funcții pentru selecția partenerilor
  const handleSelectPartener = useCallback((id: string) => {
    setSelectedPartnerIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback((selectAll: boolean) => {
    if (selectAll) {
      const allIds = new Set(filteredParteneri.map(p => p.idPartener));
      setSelectedPartnerIds(allIds);
    } else {
      setSelectedPartnerIds(new Set());
    }
  }, [filteredParteneri]);

  const clearSelection = useCallback(() => {
    setSelectedPartnerIds(new Set());
  }, []);

  // Funcții pentru actualizare
  const refreshParteneri = useCallback(() => {
    loadParteneri(true);
  }, [loadParteneri]);

  const handlePartenerCreated = useCallback(() => {
    refreshParteneri();
    clearSelection();
  }, [refreshParteneri, clearSelection]);

  const handlePartenerUpdated = useCallback(() => {
    refreshParteneri();
  }, [refreshParteneri]);

  const handlePartenerDeleted = useCallback(() => {
    refreshParteneri();
    clearSelection();
  }, [refreshParteneri, clearSelection]);

  // Funcții pentru export
  const exportParteneri = useCallback(async (format: 'csv' | 'excel' | 'pdf') => {
    try {
      const selectedIds = Array.from(selectedPartnerIds);
      if (selectedIds.length === 0) {
        setTimeout(() => {
          toast.error('Selectează cel puțin un partener pentru export');
        }, 0);
        return;
      }

      // TODO: Implementează logica de export
      setTimeout(() => {
        toast.success(`Export ${format.toUpperCase()} în curs de dezvoltare`);
      }, 0);
    } catch (error) {
      console.error('Eroare la export:', error);
      setTimeout(() => {
        toast.error('Eroare la exportul partenerilor');
      }, 0);
    }
  }, [selectedPartnerIds]);

  const isPartenerSelected = useCallback((id: string) => {
    return selectedPartnerIds.has(id);
  }, [selectedPartnerIds]);

  const allVisible = filteredParteneri.length > 0 && 
    filteredParteneri.every(p => selectedPartnerIds.has(p.idPartener));

  const someSelected = selectedPartnerIds.size > 0 && !allVisible;

  return {
    // Stări
    parteneri: filteredParteneri,
    loading,
    searchTerm,
    setSearchTerm,
    selectedPartnerIds,
    sortOptions,
    
    // Funcții pentru sortare și filtrare
    handleSortChange,
    resetFilters,
    
    // Funcții pentru selecție
    handleSelectPartener,
    handleSelectAll,
    clearSelection,
    isPartenerSelected,
    allVisible,
    someSelected,
    
    // Funcții pentru actualizare
    refreshParteneri,
    handlePartenerCreated,
    handlePartenerUpdated,
    handlePartenerDeleted,
    
    // Funcții pentru export
    exportParteneri,
    
    // Stări computate
    selectedCount: selectedPartnerIds.size,
    hasParteneri: filteredParteneri.length > 0,
    isSearching: searchTerm.length > 0,
    isEmpty: !loading && filteredParteneri.length === 0,
    
    // Metadate
    totalParteneri: filteredParteneri.length,
    currentPageParteneri: filteredParteneri.length
  };
};