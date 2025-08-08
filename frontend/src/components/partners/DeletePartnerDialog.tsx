import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';

interface DeletePartnerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  partnerName: string;
  partnerCui: string;
  loading?: boolean;
}

export const DeletePartnerDialog = ({
  isOpen,
  onClose,
  onConfirm,
  partnerName,
  partnerCui,
  loading = false
}: DeletePartnerDialogProps) => {
  const [confirmationText, setConfirmationText] = useState('');
  const expectedText = 'ȘTERGE';

  const handleConfirm = () => {
    if (confirmationText === expectedText) {
      onConfirm();
      setConfirmationText('');
    }
  };

  const handleClose = () => {
    setConfirmationText('');
    onClose();
  };

  const isConfirmationValid = confirmationText === expectedText;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Confirmare ștergere partener
          </DialogTitle>
          <DialogDescription className="space-y-2">
            <p className="font-medium">
              Această acțiune va șterge DEFINITIV partenerul și toate datele asociate!
            </p>
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">
                <strong>Partener:</strong> {partnerName}
              </p>
              <p className="text-sm text-red-800">
                <strong>CUI:</strong> {partnerCui}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              ⚠️ <strong>ATENȚIE:</strong> Operațiunea nu poate fi anulată!
            </p>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="confirmText" className="text-sm font-medium">
              Pentru a confirma ștergerea, tastează exact: <code className="bg-gray-100 px-1 py-0.5 rounded text-red-600 font-mono">{expectedText}</code>
            </Label>
            <Input
              id="confirmText"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder={`Tastează "${expectedText}" pentru a confirma`}
              disabled={loading}
              className={confirmationText && !isConfirmationValid ? 'border-red-300 focus:ring-red-500' : ''}
            />
            {confirmationText && !isConfirmationValid && (
              <p className="text-sm text-red-600">
                Textul introdus nu corespunde. Tastează exact "{expectedText}".
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={loading}
          >
            Anulează
          </Button>
          <Button 
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isConfirmationValid || loading}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? 'Se șterge...' : 'Șterge definitiv'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
