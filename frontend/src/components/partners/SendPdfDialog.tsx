import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Mail, Plus, X } from 'lucide-react';
// Toast removed to eliminate warnings

interface SendPdfDialogProps {
  open: boolean;
  onClose: () => void;
  selectedPartnersCount: number;
  onSendEmail: (emailData: EmailData) => Promise<void>;
}

export interface EmailData {
  emails: string[];
  subject: string;
  message: string;
}

export const SendPdfDialog = ({ 
  open, 
  onClose, 
  selectedPartnersCount,
  onSendEmail 
}: SendPdfDialogProps) => {
  const [emails, setEmails] = useState<string[]>(['']);
  const [subject, setSubject] = useState('Lista parteneri selectați');
  const [message, setMessage] = useState(`Bună ziua,

Vă trimit în anexă lista cu partenerii selectați din sistemul CRM.

Cu stimă,
Echipa Balance Beacon Buddy`);
  const [isLoading, setIsLoading] = useState(false);

  const handleAddEmail = () => {
    setEmails([...emails, '']);
  };

  const handleRemoveEmail = (index: number) => {
    if (emails.length > 1) {
      setEmails(emails.filter((_, i) => i !== index));
    }
  };

  const handleEmailChange = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
  };

  const validateEmails = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validEmails = emails.filter(email => email.trim() && emailRegex.test(email.trim()));
    
    if (validEmails.length === 0) {
      console.error('Vă rugăm să introduceți cel puțin o adresă de email validă');
      return false;
    }

    const invalidEmails = emails.filter(email => email.trim() && !emailRegex.test(email.trim()));
    if (invalidEmails.length > 0) {
      console.error('Unele adrese de email nu sunt valide');
      return false;
    }

    return true;
  };

  const handleSend = async () => {
    if (!validateEmails()) return;
    
    if (!subject.trim()) {
      console.error('Vă rugăm să introduceți un subiect pentru email');
      return;
    }

    setIsLoading(true);
    try {
      const validEmails = emails.filter(email => email.trim());
      
      await onSendEmail({
        emails: validEmails,
        subject: subject.trim(),
        message: message.trim()
      });

      console.log(`Email trimis cu succes către ${validEmails.length} destinatar${validEmails.length > 1 ? 'i' : ''}`);
      onClose();
    } catch (error) {
      console.error('Eroare la trimiterea email-ului:', error);
      console.error('Eroare la trimiterea email-ului');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Trimite PDF prin email
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-800">
              Se vor trimite informațiile pentru <strong>{selectedPartnersCount}</strong> partner{selectedPartnersCount > 1 ? 'i' : ''} selectat{selectedPartnersCount > 1 ? 'i' : ''}.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="emails">Adrese de email</Label>
            {emails.map((email, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={email}
                  onChange={(e) => handleEmailChange(index, e.target.value)}
                  placeholder="exemplu@email.com"
                  type="email"
                  className="flex-1"
                />
                {emails.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveEmail(index)}
                    className="px-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddEmail}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adaugă altă adresă de email
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subiect</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subiectul email-ului"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Mesaj</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Mesajul email-ului"
              rows={6}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Anulează
          </Button>
          <Button onClick={handleSend} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Se trimite...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Trimite email
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

