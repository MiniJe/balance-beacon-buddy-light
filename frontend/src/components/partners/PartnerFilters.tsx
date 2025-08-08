import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PartenerSortOptions } from '@/types/partener';

interface PartnerFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  sortOptions: PartenerSortOptions;
  onStatusChange: (status: PartenerSortOptions['status']) => void;
  onPartnerTypeChange: (partnerType: PartenerSortOptions['partnerType']) => void;
  onSortChange: (field: PartenerSortOptions['sortBy']) => void;
  getSortIcon: (field: string) => React.ReactNode;
  onRefresh: () => void;
  loading: boolean;
}

export const PartnerFilters = ({
  searchTerm,
  onSearchChange,
  sortOptions,
  onStatusChange,
  onPartnerTypeChange,
  onSortChange,
  getSortIcon,
  onRefresh,
  loading
}: PartnerFiltersProps) => {
  return (
    <div className="space-y-4">
      {/* Prima linie - Căutare și control rapid */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Caută după nume, email sau CUI..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            disabled={loading}
          />
        </div>
        <Button 
          variant="outline" 
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reîncarcă"}
        </Button>
      </div>

      {/* A doua linie - Filtre și sortare */}
      <div className="flex items-center space-x-2 flex-wrap gap-2">
        {/* Status Filter */}
        <Select 
          value={sortOptions.status} 
          onValueChange={onStatusChange}
          disabled={loading}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toți</SelectItem>
            <SelectItem value="active">Activi</SelectItem>
            <SelectItem value="inactive">Inactivi</SelectItem>
          </SelectContent>
        </Select>

        {/* Partner Type Filter */}
        <Select 
          value={sortOptions.partnerType} 
          onValueChange={onPartnerTypeChange}
          disabled={loading}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Tip partener" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toți tipurile</SelectItem>
            <SelectItem value="client">Clienți</SelectItem>
            <SelectItem value="furnizor">Furnizori</SelectItem>
            <SelectItem value="client-duc">Client DUC</SelectItem>
            <SelectItem value="client-dl">Client DL</SelectItem>
            <SelectItem value="furnizor-duc">Furnizor DUC</SelectItem>
            <SelectItem value="furnizor-dl">Furnizor DL</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort Options */}
        <div className="flex items-center space-x-1 border rounded-md px-2 py-1">
          <span className="text-sm text-muted-foreground">Sortare:</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSortChange('numePartener')}
            className="h-8 px-2"
          >
            Nume {getSortIcon('numePartener')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSortChange('dataCrearePartener')}
            className="h-8 px-2"
          >
            Data {getSortIcon('dataCrearePartener')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSortChange('partenerActiv')}
            className="h-8 px-2"
          >
            Status {getSortIcon('partenerActiv')}
          </Button>
        </div>
      </div>
    </div>
  );
};
