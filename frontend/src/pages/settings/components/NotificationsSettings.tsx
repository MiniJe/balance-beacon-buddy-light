import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useNotificationSettings } from "@/hooks/useNotificationSettings";

const NotificationsSettings = () => {
  const {
    notificationSettings,
    setNotificationSettings,
    loading,
    handleSaveNotificationSettings
  } = useNotificationSettings();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferințe Notificări</CardTitle>
        <CardDescription>
          {loading ? "Se încarcă..." : "Configurează modul în care primești notificări și rapoarte"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Notificări generale</h3>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-notifications">Notificări prin email</Label>
              <p className="text-sm text-muted-foreground">
                Primește notificări importante prin email
              </p>
            </div>
            <Switch 
              id="email-notifications"
              checked={notificationSettings.emailNotifications}
              onCheckedChange={(checked) => 
                setNotificationSettings({
                  ...notificationSettings,
                  emailNotifications: checked
                })
              }
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sms-notifications">Notificări prin SMS</Label>
              <p className="text-sm text-muted-foreground">
                Primește notificări prin SMS pentru evenimente urgente
              </p>
            </div>
            <Switch 
              id="sms-notifications"
              checked={notificationSettings.smsNotifications}
              onCheckedChange={(checked) => 
                setNotificationSettings({
                  ...notificationSettings,
                  smsNotifications: checked
                })
              }
            />
          </div>
        </div>
        
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Rapoarte periodice</h3>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="weekly-reports">Rapoarte săptămânale</Label>
              <p className="text-sm text-muted-foreground">
                Primește un sumar săptămânal cu activitatea în platformă
              </p>
            </div>
            <Switch 
              id="weekly-reports"
              checked={notificationSettings.weeklyReports}
              onCheckedChange={(checked) => 
                setNotificationSettings({
                  ...notificationSettings,
                  weeklyReports: checked
                })
              }
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="monthly-reports">Rapoarte lunare</Label>
              <p className="text-sm text-muted-foreground">
                Primește un raport detaliat lunar cu toate activitățile
              </p>
            </div>
            <Switch 
              id="monthly-reports"
              checked={notificationSettings.monthlyReports}
              onCheckedChange={(checked) => 
                setNotificationSettings({
                  ...notificationSettings,
                  monthlyReports: checked
                })
              }
            />
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSaveNotificationSettings}>Salvează Preferințele</Button>
      </CardFooter>
    </Card>
  );
};

export default NotificationsSettings;
