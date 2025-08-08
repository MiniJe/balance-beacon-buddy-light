import React from 'react';
import { Loader2, Shield, User, Mail, Phone, Building, Briefcase, Calendar } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { CreateContabilDto } from '@/services/contabil.service';

interface ContabilFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  formData: CreateContabilDto;
  onFormDataChange: (data: CreateContabilDto) => void;
  onSave: () => void;
  isEditing: boolean;
  saving: boolean;
}

export const ContabilFormDialog: React.FC<ContabilFormDialogProps> = ({
  isOpen,
  onClose,
  formData,
  onFormDataChange,
  onSave,
  isEditing,
  saving
}) => {
  const handleInputChange = (field: keyof CreateContabilDto, value: string) => {
    onFormDataChange({
      ...formData,
      [field]: value
    });
  };

  const handlePermissionChange = (permission: string, checked: boolean) => {
    onFormDataChange({
      ...formData,
      PermisiuniAcces: {
        ...formData.PermisiuniAcces!,
        [permission]: checked
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <User className="w-5 h-5 mr-2" />
            {isEditing ? "Editează contabil" : "Adaugă contabil nou"}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Modifică informațiile contabilului selectat" 
              : "Completează informațiile pentru noul contabil"
            }
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informații personale */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900 flex items-center">
              <User className="w-4 h-4 mr-2" />
              Informații personale
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nume">Nume *</Label>
                <Input
                  id="nume"
                  value={formData.NumeContabil}
                  onChange={(e) => handleInputChange('NumeContabil', e.target.value)}
                  disabled={saving}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prenume">Prenume *</Label>
                <Input
                  id="prenume"
                  value={formData.PrenumeContabil}
                  onChange={(e) => handleInputChange('PrenumeContabil', e.target.value)}
                  disabled={saving}
                  required
                />
              </div>
            </div>
          </div>

          {/* Informații de contact */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900 flex items-center">
              <Mail className="w-4 h-4 mr-2" />
              Informații de contact
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.EmailContabil}
                  onChange={(e) => handleInputChange('EmailContabil', e.target.value)}
                  disabled={saving}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefon">Telefon</Label>
                <Input
                  id="telefon"
                  value={formData.TelefonContabil || ''}
                  onChange={(e) => handleInputChange('TelefonContabil', e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>
          </div>

          {/* Informații profesionale */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900 flex items-center">
              <Building className="w-4 h-4 mr-2" />
              Informații profesionale
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="departament">Departament</Label>
                <Input
                  id="departament"
                  value={formData.DepartmentContabil || ''}
                  onChange={(e) => handleInputChange('DepartmentContabil', e.target.value)}
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data-angajare">Data angajării</Label>
                <Input
                  id="data-angajare"
                  type="date"
                  value={formData.DatăAngajareContabil || ''}
                  onChange={(e) => handleInputChange('DatăAngajareContabil', e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>
          </div>

          {/* Rol și status */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900 flex items-center">
              <Briefcase className="w-4 h-4 mr-2" />
              Rol și status
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rol">Rol *</Label>
                <select
                  id="rol"
                  value={formData.RolContabil}
                  onChange={(e) => handleInputChange('RolContabil', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={saving}
                  required
                >
                  <option value="CONTABIL">Contabil</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMINISTRATOR">Administrator</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <select
                  id="status"
                  value={formData.StatusContabil}
                  onChange={(e) => handleInputChange('StatusContabil', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={saving}
                  required
                >
                  <option value="Activ">Activ</option>
                  <option value="Inactiv">Inactiv</option>
                  <option value="Suspendat">Suspendat</option>
                  <option value="În Concediu">În Concediu</option>
                </select>
              </div>
            </div>
          </div>

          {/* Permisiuni */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900 flex items-center">
              <Shield className="w-4 h-4 mr-2" />
              Permisiuni de acces
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="perm-modifica-parteneri"
                  checked={formData.PermisiuniAcces?.PoateModificaParteneri || false}
                  onCheckedChange={(checked) => handlePermissionChange('PoateModificaParteneri', !!checked)}
                  disabled={saving}
                />
                <Label htmlFor="perm-modifica-parteneri" className="text-sm">
                  Modifică parteneri
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="perm-adauga-parteneri"
                  checked={formData.PermisiuniAcces?.PoateAdaugaParteneri || false}
                  onCheckedChange={(checked) => handlePermissionChange('PoateAdaugaParteneri', !!checked)}
                  disabled={saving}
                />
                <Label htmlFor="perm-adauga-parteneri" className="text-sm">
                  Adaugă parteneri
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="perm-vedea-rapoarte"
                  checked={formData.PermisiuniAcces?.PoateVedeaRapoarte || false}
                  onCheckedChange={(checked) => handlePermissionChange('PoateVedeaRapoarte', !!checked)}
                  disabled={saving}
                />
                <Label htmlFor="perm-vedea-rapoarte" className="text-sm">
                  Vizualizează rapoarte
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="perm-modifica-sabloane"
                  checked={formData.PermisiuniAcces?.PoateModificaSabloane || false}
                  onCheckedChange={(checked) => handlePermissionChange('PoateModificaSabloane', !!checked)}
                  disabled={saving}
                />
                <Label htmlFor="perm-modifica-sabloane" className="text-sm">
                  Modifică șabloane
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="perm-crea-cereri"
                  checked={formData.PermisiuniAcces?.PoateCreaCereri || false}
                  onCheckedChange={(checked) => handlePermissionChange('PoateCreaCereri', !!checked)}
                  disabled={saving}
                />
                <Label htmlFor="perm-crea-cereri" className="text-sm">
                  Creează cereri
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="perm-adauga-utilizatori"
                  checked={formData.PermisiuniAcces?.PoateAdaugaUtilizatori || false}
                  onCheckedChange={(checked) => handlePermissionChange('PoateAdaugaUtilizatori', !!checked)}
                  disabled={saving}
                />
                <Label htmlFor="perm-adauga-utilizatori" className="text-sm">
                  Adaugă utilizatori
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="perm-modifica-setari"
                  checked={formData.PermisiuniAcces?.PoateModificaSetari || false}
                  onCheckedChange={(checked) => handlePermissionChange('PoateModificaSetari', !!checked)}
                  disabled={saving}
                />
                <Label htmlFor="perm-modifica-setari" className="text-sm">
                  Modifică setări
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Anulează
            </Button>
            <Button
              type="submit"
              disabled={saving}
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? "Salvează modificările" : "Adaugă contabil"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
