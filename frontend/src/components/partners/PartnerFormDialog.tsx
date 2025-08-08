import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { PartenerFormData } from '@/types/partener';
import { useAuth } from '@/contexts/AuthContext';

interface PartnerFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  editPartener: PartenerFormData | null;
  onPartenerChange: (partener: PartenerFormData) => void;
  onSave: () => void;
  editPartenerId: string | null;
  saving: boolean;
}

export const PartnerFormDialog = ({
  isOpen,
  onClose,
  editPartener,
  onPartenerChange,
  onSave,
  editPartenerId,
  saving
}: PartnerFormDialogProps) => {
  const { user, isMaster } = useAuth();

  if (!editPartener) {
    return null;
  }

  const handleDeletePartener = async () => {
    if (!editPartenerId) return;
    
    // Dialog de confirmare îmbunătățit
    const confirmed = window.confirm(
      `⚠️ ATENȚIE: Ștergere partener\n\n` +
      `Partener: ${editPartener.numePartener}\n` +
      `CUI: ${editPartener.cuiPartener}\n\n` +
      `Această acțiune va șterge DEFINITIV partenerul și toate datele asociate!\n\n` +
      `⚠️ ATENȚIE: Operațiunea nu poate fi anulată!\n\n` +
      `Pentru a continua, tastează "ȘTERGE" în câmpul de confirmare din dialog.`
    );

    if (!confirmed) return;

    // Solicită confirmare dublă
    const confirmText = prompt(
      `Pentru a confirma ștergerea definitivă a partenerului "${editPartener.numePartener}", tastează exact: ȘTERGE`
    );

    if (confirmText !== "ȘTERGE") {
      alert("Confirmare incorectă. Operațiunea a fost anulată.");
      return;
    }

    try {
      const partenerService = await import('@/services/partener.service');
      await partenerService.partenerService.deletePartener(editPartenerId);
      const { toast } = await import('sonner');
      console.log("Partenerul a fost șters cu succes");
      onClose();
      // Trigger a reload of the partners list
      window.dispatchEvent(new CustomEvent('partnerDeleted'));
    } catch (error) {
      console.error('Eroare la ștergerea partenerului:', error);
      const { toast } = await import('sonner');
      console.error(error instanceof Error ? error.message : 'Eroare la ștergerea partenerului');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editPartenerId ? "Editează partener" : "Adaugă partener nou"}
          </DialogTitle>
          <DialogDescription>
            Completează informațiile despre partenerul tău
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Informații de bază */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numePartener">Nume companie *</Label>
              <Input 
                id="numePartener" 
                value={editPartener.numePartener} 
                onChange={e => onPartenerChange({...editPartener, numePartener: e.target.value})} 
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cuiPartener">CUI *</Label>
              <Input 
                id="cuiPartener" 
                value={editPartener.cuiPartener} 
                onChange={e => onPartenerChange({...editPartener, cuiPartener: e.target.value})} 
                disabled={saving}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="onrcPartener">Nr. ONRC *</Label>
              <Input 
                id="onrcPartener" 
                value={editPartener.onrcPartener || ""} 
                onChange={e => onPartenerChange({...editPartener, onrcPartener: e.target.value})} 
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emailPartener">Email</Label>
              <Input 
                id="emailPartener" 
                type="email" 
                value={editPartener.emailPartener || ""} 
                onChange={e => onPartenerChange({...editPartener, emailPartener: e.target.value})} 
                disabled={saving}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reprezentantPartener">Reprezentant</Label>
              <Input 
                id="reprezentantPartener" 
                value={editPartener.reprezentantPartener || ""} 
                onChange={e => onPartenerChange({...editPartener, reprezentantPartener: e.target.value})} 
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefonPartener">Telefon</Label>
              <Input 
                id="telefonPartener" 
                value={editPartener.telefonPartener || ""} 
                onChange={e => onPartenerChange({...editPartener, telefonPartener: e.target.value})} 
                disabled={saving}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="adresaPartener">Adresă</Label>
            <Input 
              id="adresaPartener" 
              value={editPartener.adresaPartener || ""} 
              onChange={e => onPartenerChange({...editPartener, adresaPartener: e.target.value})} 
              disabled={saving}
            />
          </div>

          {/* Tipuri de partener */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Tipuri de partener</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label className="text-sm font-medium">DUC Farm</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="clientDUC"
                    checked={editPartener.clientDUC || false}
                    onCheckedChange={(checked) => onPartenerChange({...editPartener, clientDUC: !!checked})}
                    disabled={saving}
                  />
                  <Label htmlFor="clientDUC" className="text-sm">Client DUC</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="furnizorDUC"
                    checked={editPartener.furnizorDUC || false}
                    onCheckedChange={(checked) => onPartenerChange({...editPartener, furnizorDUC: !!checked})}
                    disabled={saving}
                  />
                  <Label htmlFor="furnizorDUC" className="text-sm">Furnizor DUC</Label>
                </div>
              </div>
              
              <div className="space-y-3">
                <Label className="text-sm font-medium">Ducfarm Land</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="clientDL"
                    checked={editPartener.clientDL || false}
                    onCheckedChange={(checked) => onPartenerChange({...editPartener, clientDL: !!checked})}
                    disabled={saving}
                  />
                  <Label htmlFor="clientDL" className="text-sm">Client DL</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="furnizorDL"
                    checked={editPartener.furnizorDL || false}
                    onCheckedChange={(checked) => onPartenerChange({...editPartener, furnizorDL: !!checked})}
                    disabled={saving}
                  />
                  <Label htmlFor="furnizorDL" className="text-sm">Furnizor DL</Label>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observatiiPartener">Observații</Label>
            <Input 
              id="observatiiPartener" 
              value={editPartener.observatiiPartener || ""} 
              onChange={e => onPartenerChange({...editPartener, observatiiPartener: e.target.value})} 
              disabled={saving}
            />
          </div>

          {/* Status partener */}
          <div className="space-y-4 pt-4 border-t">
            <Label className="text-base font-semibold">Status partener</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="statusActiv"
                    name="partenerStatus"
                    checked={editPartener.partenerActiv === true}
                    onChange={() => onPartenerChange({...editPartener, partenerActiv: true})}
                    disabled={saving}
                    className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 focus:ring-green-500"
                  />
                  <Label htmlFor="statusActiv" className="text-sm font-medium text-green-700">
                    ACTIV
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="statusInactiv"
                    name="partenerStatus"
                    checked={editPartener.partenerActiv === false}
                    onChange={() => onPartenerChange({...editPartener, partenerActiv: false})}
                    disabled={saving}
                    className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 focus:ring-red-500"
                  />
                  <Label htmlFor="statusInactiv" className="text-sm font-medium text-red-700">
                    INACTIV
                  </Label>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Partenerii inactivi nu vor apărea în listele de selecție și nu vor putea fi utilizați pentru operațiuni noi.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            {/* Butonul de ștergere în partea stângă (doar pentru editare și doar pentru MASTER) */}
            <div className="flex items-center">
              {editPartenerId && isMaster() && (
                <div className="mr-auto">
                  <Button 
                    variant="destructive" 
                    onClick={handleDeletePartener}
                    disabled={saving}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Șterge definitiv
                  </Button>
                </div>
              )}
            </div>
            
            {/* Butoanele de acțiune principale în partea dreaptă */}
            <div className="flex space-x-3 ml-6">
              <Button 
                variant="outline" 
                onClick={onClose}
                disabled={saving}
              >
                Anulează
              </Button>
              <Button 
                onClick={onSave}
                disabled={saving}
                className="min-w-[100px]"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Se salvează...
                  </>
                ) : (
                  "Salvează"
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

