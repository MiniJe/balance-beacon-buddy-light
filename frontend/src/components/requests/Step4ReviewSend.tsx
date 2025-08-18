import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Check, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

interface DocumentGenerat {
  idDocument: string;
  numarInregistrare: number;
  idPartener: string;
  numePartener: string;
  tipPartener: string;
  numeDocument: string;
  caleFisier: string;
  hashDocument: string;
  dimensiuneDocument: number;
  status: "reserved" | "generated" | "downloaded" | "uploaded" | "signed";
  uploadedFile?: File;
}

interface Step4ReviewSendProps {
  date: Date | undefined;
  selectedPartnersCount: number;
  partnerCategory: string;
  emailSubject: string;
  documentsGenerated: DocumentGenerat[];
  onBack: () => void;
  onSend: () => Promise<void> | void;
}

export const Step4ReviewSend = ({
  date,
  selectedPartnersCount,
  partnerCategory,
  emailSubject,
  documentsGenerated,
  onBack,
  onSend
}: Step4ReviewSendProps) => {
  const navigate = useNavigate();
  const [isSending, setIsSending] = useState(false);
  const [hasSent, setHasSent] = useState(false);
  const sendingRef = useRef(false);

  const getCategoryDisplayName = (category: string) => {
    if (category === "all") return "Toate categoriile";
    return category.replace('_', ' ').toUpperCase();
  };

  const handleSend = async () => {
    if (sendingRef.current || isSending || hasSent) return;
    sendingRef.current = true;
    setIsSending(true);
    try {
      await Promise.resolve(onSend());
      setHasSent(true);
      // Redirect to Dashboard after the session completes
      navigate("/");
    } catch (err) {
      // In case of failure, allow retry
      setIsSending(false);
      console.error("Eroare la trimiterea cererilor:", err);
      sendingRef.current = false;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>4. Revizuiește și Trimite</CardTitle>
        <CardDescription>
          Verifică setările și trimite cererile de confirmare
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="border rounded-md p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Data confirmării</p>
              <p className="font-medium">{date ? format(date, 'dd MMMM yyyy', { locale: ro }) : 'Neselectat'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Parteneri selectați</p>
              <p className="font-medium">{selectedPartnersCount}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Categorie parteneri</p>
              <p className="font-medium">{getCategoryDisplayName(partnerCategory)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Subiect email</p>
              <p className="font-medium">{emailSubject}</p>
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <div>
            <p className="text-sm font-medium mb-2">Documente atașate:</p>
            <div className="max-h-[200px] overflow-y-auto space-y-1">
              {documentsGenerated.map((file) => (
                <div key={file.idDocument} className="flex items-center justify-between py-2 px-3 hover:bg-accent rounded">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{file.numeDocument}</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded font-medium ${
                    file.tipPartener.includes("client") 
                      ? "bg-blue-100 text-blue-800" 
                      : "bg-green-100 text-green-800"
                  }`}>
                    {file.tipPartener.includes("client") ? "Client" : "Furnizor"}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-accent/50 p-4 rounded-md">
            <p className="text-sm flex items-center">
              <Check className="h-4 w-4 mr-2 text-primary" />
              Toate setările sunt configurate corect
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              După trimitere, poți verifica starea cererilor în Dashboard.
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-between">
        <Button variant="outline" onClick={onBack} disabled={isSending}>
          Înapoi
        </Button>
        <Button onClick={handleSend} disabled={isSending || hasSent}>
          {isSending ? (
            <span className="inline-flex items-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Se trimit cererile...
            </span>
          ) : (
            "Trimite Cererile"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};
