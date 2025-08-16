import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarDays, Mail } from "lucide-react";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Step2ConfigureEmailProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  emailSubject: string;
  setEmailSubject: (subject: string) => void;
  selectedPartnersCount: number;
}

export const Step2ConfigureEmail: React.FC<Step2ConfigureEmailProps> = ({
  date,
  setDate,
  emailSubject,
  setEmailSubject,
  selectedPartnersCount,
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Configurare Email</h3>
        <p className="text-sm text-gray-600">
          Configurați data solicitării și subiectul email-ului pentru {selectedPartnersCount} parteneri selectați
        </p>
      </div>

      <div className="space-y-6">
        {/* Data solicitării */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Data Solicitării
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="date">Selectați data pentru care solicitați fișele partener</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {date ? format(date, "dd MMMM yyyy", { locale: ro }) : "Alegeți data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                      initialFocus
                      locale={ro}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>

          {/* Subiectul email-ului */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Subiect Email
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="subject">Subiectul email-ului care va fi trimis partenerilor</Label>
                <Input
                  id="subject"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Introduceți subiectul email-ului"
                  className="w-full"
                />
                <p className="text-xs text-gray-500">
                  Subiectul se actualizează automat când schimbați data
                </p>
              </div>
            </CardContent>
          </Card>
      </div>

      {/* Footer cu informații */}
      <Card className="bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-blue-800">
            <Mail className="h-4 w-4" />
            <span>
              Email-urile vor fi trimise către <strong>{selectedPartnersCount} parteneri</strong> folosind 
              template-ul configurat în pagina dedicată.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
