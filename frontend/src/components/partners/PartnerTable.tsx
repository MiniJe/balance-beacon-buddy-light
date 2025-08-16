import { Edit, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Partener, PartenerSortOptions } from '@/types/partener';

interface PartnerTableProps {
  parteneri: Partener[];
  loading: boolean;
  searchTerm: string;
  sortOptions?: PartenerSortOptions;
  selectedPartnerIds: Set<string>;
  onSortChange: (field: PartenerSortOptions['sortBy']) => void;
  getSortIcon: (field: string) => React.ReactNode;
  onEditPartener: (partener: Partener) => void;
  onTogglePartnerSelection: (partnerId: string) => void;
  onToggleCurrentPageSelection: () => void;
  onDeselectAllPartners: () => void;
}

export const PartnerTable = ({
  parteneri,
  loading,
  searchTerm,
  selectedPartnerIds,
  onSortChange,
  getSortIcon,
  onEditPartener,
  onTogglePartnerSelection,
  onToggleCurrentPageSelection,
  onDeselectAllPartners
}: PartnerTableProps) => {
  const getPartenerTypeDisplay = (partener: Partener) => {
    const types = [];
    
    if (partener.clientDUC) types.push({ text: "Client DUC", color: "bg-blue-100 text-blue-800" });
    if (partener.clientDL) types.push({ text: "Client DL", color: "bg-cyan-100 text-cyan-800" });
    if (partener.furnizorDUC) types.push({ text: "Furnizor DUC", color: "bg-green-100 text-green-800" });
    if (partener.furnizorDL) types.push({ text: "Furnizor DL", color: "bg-emerald-100 text-emerald-800" });
    
    if (types.length === 0) {
      return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-800">Nedefinit</span>;
    }
    
    return (
      <div className="flex flex-wrap gap-1">
        {types.map((type, index) => (
          <span key={index} className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${type.color}`}>
            {type.text}
          </span>
        ))}
      </div>
    );
  };

  // Calculate selection state for header checkbox
  const allSelected = parteneri.length > 0 && parteneri.every(p => selectedPartnerIds.has(p.idPartener));
  const someSelected = parteneri.some(p => selectedPartnerIds.has(p.idPartener));
  const handleHeaderCheckboxChange = () => {
    console.log('Header checkbox clicked, allSelected:', allSelected);
    if (allSelected) {
      onDeselectAllPartners();
    } else {
      onToggleCurrentPageSelection();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Se încarcă partenerii...</span>
      </div>
    );
  }

  return (
    <div className="max-h-[600px] overflow-y-auto border rounded-md">
      <Table>
        <TableHeader className="sticky top-0 bg-background z-10">
          <TableRow>
          <TableHead className="w-12">
            <Checkbox
              checked={allSelected}
              onCheckedChange={handleHeaderCheckboxChange}
              className={someSelected && !allSelected ? "data-[state=checked]:bg-blue-600" : ""}
              style={someSelected && !allSelected ? { backgroundColor: '#2563eb', opacity: 0.5 } : {}}
            />
          </TableHead>
          <TableHead>
            <Button
              variant="ghost"
              className="h-auto p-0 font-medium hover:bg-transparent"
              onClick={() => onSortChange('numePartener')}
            >
              Nume {getSortIcon('numePartener')}
            </Button>
          </TableHead>
          <TableHead>Email</TableHead>
          <TableHead>
            <Button
              variant="ghost"
              className="h-auto p-0 font-medium hover:bg-transparent"
              onClick={() => onSortChange('cuiPartener')}
            >
              CUI {getSortIcon('cuiPartener')}
            </Button>
          </TableHead>
          <TableHead>Tip Partener</TableHead>
          <TableHead>
            <Button
              variant="ghost"
              className="h-auto p-0 font-medium hover:bg-transparent"
              onClick={() => onSortChange('partenerActiv')}
            >
              Status {getSortIcon('partenerActiv')}
            </Button>
          </TableHead>
          <TableHead>Acțiuni</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {parteneri.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
              {searchTerm ? "Nu s-au găsit parteneri care să corespundă căutării" : "Nu există parteneri înregistrați"}
            </TableCell>
          </TableRow>
        ) : (
          parteneri.map((partener) => (
            <TableRow key={partener.idPartener}>
              <TableCell>
                <Checkbox
                  checked={selectedPartnerIds.has(partener.idPartener)}
                  onCheckedChange={() => {
                    console.log('Individual checkbox clicked for partner:', partener.idPartener);
                    onTogglePartnerSelection(partener.idPartener);
                  }}
                />
              </TableCell>
              <TableCell className="font-medium">{partener.numePartener}</TableCell>
              <TableCell>{partener.emailPartener || "N/A"}</TableCell>
              <TableCell>{partener.cuiPartener}</TableCell>
              <TableCell>{getPartenerTypeDisplay(partener)}</TableCell>
              <TableCell>
                {partener.partenerActiv ? (
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800">
                    Activ
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-800">
                    Inactiv
                  </span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onEditPartener(partener)}
                    title="Editează partener"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
    </div>
  );
};
