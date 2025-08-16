import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Send, 
  Mail, 
  Calendar, 
  Hash, 
  Building2, 
  Eye,
  Clock,
  Users,
  FileText
} from "lucide-react";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { useState } from "react";

interface Partner {
  idPartener: string;
  numePartener: string;
  cuiPartener: string;
  emailPartener?: string;
  clientDUC?: boolean;
  clientDL?: boolean;
  furnizorDUC?: boolean;
  furnizorDL?: boolean;
  orderNumber?: number;
}

interface OrderNumberAssignment {
  idPartener: string;
  numePartener: string;
  orderNumber: number;
}

interface Step3ReviewSendProps {
  partners: Partner[];
  date: Date | undefined;
  emailSubject: string;
  emailTemplate: string;
  orderNumbers: OrderNumberAssignment[];
  onSendEmails: () => Promise<void>;
  processing: boolean;
  userInfo?: { idUtilizator: string; numeUtilizator: string; emailUtilizator: string };
}

export const Step3ReviewSend: React.FC<Step3ReviewSendProps> = ({
  partners,
  date,
  emailSubject,
  emailTemplate,
  orderNumbers,
  onSendEmails,
  processing,
  userInfo,
}) => {
  const [previewPartner, setPreviewPartner] = useState<Partner | null>(null);

  // Helper pentru obținerea badge-ului de tip partener
  const getPartnerTypeBadge = (partner: Partner) => {
    if (partner.clientDUC) return <Badge variant="default" className="text-xs">Client DUC</Badge>;
    if (partner.clientDL) return <Badge variant="secondary" className="text-xs">Client DL</Badge>;
    if (partner.furnizorDUC) return <Badge variant="outline" className="text-xs">Furnizor DUC</Badge>;
    if (partner.furnizorDL) return <Badge variant="destructive" className="text-xs">Furnizor DL</Badge>;
    return <Badge variant="default" className="text-xs">Partener</Badge>;
  };

  // Helper pentru obținerea tipului partener ca string
  const getPartnerTypeString = (partner: Partner): string => {
    if (partner.clientDUC) return "Client DUC";
    if (partner.clientDL) return "Client DL";
    if (partner.furnizorDUC) return "Furnizor DUC";
    if (partner.furnizorDL) return "Furnizor DL";
    return "Partener";
  };

  // Funcție pentru previzualizarea email-ului personalizat
  const getPersonalizedTemplate = (partner: Partner) => {
    const dataFormatata = date ? format(date, 'dd.MM.yyyy', { locale: ro }) : "31.07.2025";
    const dataGenerare = format(new Date(), 'dd.MM.yyyy HH:mm', { locale: ro });
    const orderAssignment = orderNumbers.find(o => o.idPartener === partner.idPartener);
    const numeUtilizator = userInfo?.numeUtilizator || 'Utilizator';
    const emailUtilizator = userInfo?.emailUtilizator || 'user@example.com';

    let personalizedTemplate = emailTemplate
      .replace(/{NUME_PARTENER}/g, partner.numePartener)
      .replace(/{DATA}/g, dataFormatata)
      .replace(/{NUMAR_ORDINE}/g, orderAssignment?.orderNumber.toString() || partner.orderNumber?.toString() || "N/A")
      .replace(/{TIP_PARTENER}/g, getPartnerTypeString(partner))
      .replace(/{NUME_UTILIZATOR}/g, numeUtilizator)
      .replace(/{EMAIL_UTILIZATOR}/g, emailUtilizator)
      .replace(/{DATA_GENERARE}/g, dataGenerare);

    return personalizedTemplate;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Revizuire și Trimitere</h3>
        <p className="text-sm text-gray-600">
          Verificați configurația și trimiteți solicitările către partenerii selectați
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sumarizare configurație */}
        <div className="space-y-4">
          {/* Informații generale */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Configurație Solicitare
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">Data solicitării:</span>
                <span className="font-medium">
                  {date ? format(date, 'dd MMMM yyyy', { locale: ro }) : "Nu este setată"}
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">Subiect email:</span>
                <span className="font-medium">{emailSubject}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">Parteneri selectați:</span>
                <span className="font-medium text-blue-600">{partners.length}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Hash className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">Numere de ordine:</span>
                <span className="font-medium text-green-600">
                  {orderNumbers.length > 0 ? "Generate" : "În curs de generare"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Lista parteneri cu numere de ordine */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Parteneri și Numere de Ordine</CardTitle>
              <CardDescription className="text-xs">
                Lista finală cu numerele de ordine atribuite
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {partners.map((partner) => {
                    const orderAssignment = orderNumbers.find(o => o.idPartener === partner.idPartener);
                    return (
                      <div
                        key={partner.idPartener}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => setPreviewPartner(partner)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Building2 className="h-3 w-3 text-gray-400" />
                            <span className="text-sm font-medium truncate">
                              {partner.numePartener}
                            </span>
                            {getPartnerTypeBadge(partner)}
                          </div>
                          <div className="text-xs text-gray-500">
                            CUI: {partner.cuiPartener}
                            {partner.emailPartener && ` • ${partner.emailPartener}`}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            #{orderAssignment?.orderNumber || partner.orderNumber || "?"}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewPartner(partner);
                            }}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Previzualizare email */}
        <div className="space-y-4">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Previzualizare Email
                {previewPartner && (
                  <Badge variant="secondary" className="text-xs ml-2">
                    {previewPartner.numePartener}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs">
                {previewPartner ? 
                  "Email personalizat pentru partenerul selectat" : 
                  "Selectați un partener pentru previzualizare"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {previewPartner ? (
                <div className="space-y-4">
                  {/* Subiect */}
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-600 mb-1">Subiect:</div>
                    <div className="text-sm font-medium">{emailSubject}</div>
                  </div>
                  
                  {/* Conținut HTML */}
                  <div className="border rounded-lg">
                    <div 
                      className="p-4 prose prose-sm max-w-none overflow-auto max-h-96"
                      dangerouslySetInnerHTML={{ 
                        __html: getPersonalizedTemplate(previewPartner) 
                      }}
                    />
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    Previzualizare pentru: <strong>{previewPartner.numePartener}</strong>
                    <br />
                    Număr ordine: <strong>
                      #{orderNumbers.find(o => o.idPartener === previewPartner.idPartener)?.orderNumber || 
                        previewPartner.orderNumber || "?"}
                    </strong>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-96 text-gray-500">
                  <div className="text-center">
                    <Eye className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Selectați un partener pentru previzualizarea email-ului</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Acțiuni finale */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 mb-1">Gata pentru trimitere</h4>
              <p className="text-sm text-gray-600">
                Veți trimite <strong>{partners.length}</strong> email-uri către partenerii selectați.
                Numerele de ordine au fost generate și email-urile sunt personalizate.
              </p>
            </div>
            
            <Button
              onClick={onSendEmails}
              disabled={processing}
              className="bg-green-600 hover:bg-green-700 min-w-[140px]"
            >
              {processing ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Se trimite...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Trimite Solicitări
                </>
              )}
            </Button>
          </div>
          
          {processing && (
            <div className="mt-4">
              <div className="bg-white p-3 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <Clock className="h-4 w-4 animate-spin" />
                  <span>Se trimit email-urile către parteneri...</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{width: '45%'}}></div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
