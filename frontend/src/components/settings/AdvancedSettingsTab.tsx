import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useNotificationSettings } from "@/hooks/useNotificationSettings";

interface GlobalAdvancedSettings {
  // Setări pentru remindere automate
  autoReminderEnabled: boolean;
  daysBeforeReminder: number;
  reminderIntervalDays: number;
  maxReminders: number;
  urgentThresholdDays: number;
  
  // Setări pentru tracking și monitoring
  trackOpens: boolean;
  enableTrackingInReminders: boolean;
  ccSelf: boolean;
  
  // Setări pentru fișe parteneri
  enablePartnerTracking: boolean;
  defaultPartnerReminders: boolean;
  partnerReminderInterval: number;
}

export const AdvancedSettingsTab = () => {
  const { toast } = useToast();
  
  // Setări pentru notificări (din hook-ul existent)
  const {
    notificationSettings,
    setNotificationSettings,
    loading: notificationLoading,
    handleSaveNotificationSettings
  } = useNotificationSettings();

  // Setări avansate pentru remindere
  const [advancedSettings, setAdvancedSettings] = useState<GlobalAdvancedSettings>({
    autoReminderEnabled: false,
    daysBeforeReminder: 7,
    reminderIntervalDays: 3,
    maxReminders: 2,
    urgentThresholdDays: 14,
    trackOpens: true,
    enableTrackingInReminders: true,
    ccSelf: true,
    enablePartnerTracking: true,
    defaultPartnerReminders: false,
    partnerReminderInterval: 5
  });
  
  const [advancedLoading, setAdvancedLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAdvancedSettings();
  }, []);

  const loadAdvancedSettings = async () => {
    try {
      setAdvancedLoading(true);
      const response = await fetch('/api/reminders/settings', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.settings) {
          setAdvancedSettings(prevSettings => ({
            ...prevSettings,
            ...data.settings,
            enablePartnerTracking: data.settings.trackOpens ?? true,
            defaultPartnerReminders: data.settings.autoReminderEnabled ?? false,
            partnerReminderInterval: data.settings.reminderIntervalDays ?? 5
          }));
        }
      }
    } catch (error) {
      console.error('Eroare la încărcarea setărilor avansate:', error);
    } finally {
      setAdvancedLoading(false);
    }
  };

  const saveAdvancedSettings = async () => {
    try {
      setSaving(true);
      
      const backendSettings = {
        autoReminderEnabled: advancedSettings.autoReminderEnabled,
        daysBeforeReminder: advancedSettings.daysBeforeReminder,
        reminderIntervalDays: advancedSettings.reminderIntervalDays,
        maxReminders: advancedSettings.maxReminders,
        urgentThresholdDays: advancedSettings.urgentThresholdDays,
        trackOpens: advancedSettings.trackOpens,
        enableTrackingInReminders: advancedSettings.enableTrackingInReminders,
        ccSelf: advancedSettings.ccSelf
      };
      
      const response = await fetch('/api/reminders/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(backendSettings),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        toast({
          title: "Succes",
          description: "Setările avansate au fost salvate cu succes",
        });
      } else {
        throw new Error(data.message || 'Nu s-au putut salva setările');
      }
    } catch (error) {
      console.error('Eroare la salvarea setărilor:', error);
      toast({
        title: "Eroare",
        description: "Nu s-au putut salva setările avansate",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const resetAdvancedSettings = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/reminders/settings/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        toast({
          title: "Succes",
          description: "Setările au fost resetate la valorile implicite",
        });
        await loadAdvancedSettings();
      } else {
        throw new Error(data.message || 'Nu s-au putut reseta setările');
      }
    } catch (error) {
      console.error('Eroare la resetarea setărilor:', error);
      toast({
        title: "Eroare",
        description: "Nu s-au putut reseta setările",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateAdvancedSetting = (key: keyof GlobalAdvancedSettings, value: any) => {
    setAdvancedSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <Tabs defaultValue="notifications" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="notifications">Notificări</TabsTrigger>
        <TabsTrigger value="advanced">Setări Avansate</TabsTrigger>
      </TabsList>
      
      <TabsContent value="notifications" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Preferințe Notificări</CardTitle>
            <CardDescription>
              {notificationLoading ? "Se încarcă..." : "Configurează modul în care primești notificări și rapoarte"}
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
      </TabsContent>

      <TabsContent value="advanced" className="space-y-4">
        {advancedLoading ? (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-center">
                <div className="text-muted-foreground">Se încarcă setările avansate...</div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Setări Remindere Automate */}
            <Card>
              <CardHeader>
                <CardTitle>Remindere Automate</CardTitle>
                <CardDescription>
                  Configurează sistemul automat de remindere pentru cereri de confirmare și fișe parteneri
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Toggle principal pentru remindere */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="auto-reminders">Activează Remindere Automate</Label>
                      <p className="text-xs text-muted-foreground">
                        Activează trimiterea automată de remindere către partenerii neresponsivi
                      </p>
                    </div>
                    <Switch
                      id="auto-reminders"
                      checked={advancedSettings.autoReminderEnabled}
                      onCheckedChange={(checked) => updateAdvancedSetting('autoReminderEnabled', checked)}
                    />
                  </div>
                </div>

                <Separator />

                {/* Setări pentru remindere */}
                <div className={`space-y-6 ${!advancedSettings.autoReminderEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="reminder-days">Zile până la prima reamintire</Label>
                      <Input 
                        id="reminder-days" 
                        type="number" 
                        value={advancedSettings.daysBeforeReminder}
                        onChange={(e) => updateAdvancedSetting('daysBeforeReminder', parseInt(e.target.value) || 7)}
                        min="1"
                        max="30"
                      />
                      <p className="text-xs text-muted-foreground">
                        Numărul de zile după care se va trimite automat prima reamintire.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="reminder-interval">Interval între remindere (zile)</Label>
                      <Input 
                        id="reminder-interval" 
                        type="number" 
                        value={advancedSettings.reminderIntervalDays}
                        onChange={(e) => updateAdvancedSetting('reminderIntervalDays', parseInt(e.target.value) || 3)}
                        min="1"
                        max="14"
                      />
                      <p className="text-xs text-muted-foreground">
                        Câte zile să treacă între remindere consecutive.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="max-reminders">Număr maxim de reamintiri</Label>
                      <Select 
                        value={advancedSettings.maxReminders.toString()}
                        onValueChange={(value) => updateAdvancedSetting('maxReminders', parseInt(value))}
                      >
                        <SelectTrigger id="max-reminders">
                          <SelectValue placeholder="Selectează" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Fără reamintiri</SelectItem>
                          <SelectItem value="1">1 reamintire</SelectItem>
                          <SelectItem value="2">2 reamintiri</SelectItem>
                          <SelectItem value="3">3 reamintiri</SelectItem>
                          <SelectItem value="5">5 reamintiri</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Numărul maxim de reamintiri care vor fi trimise pentru o cerere fără răspuns.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="urgent-threshold">Pragul de urgență (zile)</Label>
                      <Input 
                        id="urgent-threshold" 
                        type="number" 
                        value={advancedSettings.urgentThresholdDays}
                        onChange={(e) => updateAdvancedSetting('urgentThresholdDays', parseInt(e.target.value) || 14)}
                        min="7"
                        max="30"
                      />
                      <p className="text-xs text-muted-foreground">
                        Zilele după care reminderele devin urgente și primesc prioritate mare.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Setări Tracking și Monitoring */}
            <Card>
              <CardHeader>
                <CardTitle>Tracking și Monitoring</CardTitle>
                <CardDescription>
                  Configurează urmărirea deschiderilor de email și opțiunile de monitoring
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="track-opens" 
                      checked={advancedSettings.trackOpens}
                      onCheckedChange={(checked) => updateAdvancedSetting('trackOpens', checked)}
                    />
                    <Label htmlFor="track-opens">Urmărește deschiderile de email</Label>
                  </div>
                  <p className="text-xs text-muted-foreground ml-6">
                    Activează urmărirea când partenerii deschid email-urile primite.
                  </p>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="track-in-reminders" 
                      checked={advancedSettings.enableTrackingInReminders}
                      onCheckedChange={(checked) => updateAdvancedSetting('enableTrackingInReminders', checked)}
                    />
                    <Label htmlFor="track-in-reminders">Urmărește deschiderile în remindere</Label>
                  </div>
                  <p className="text-xs text-muted-foreground ml-6">
                    Include urmărirea deschiderilor și în emailurile de reamintire.
                  </p>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="cc-self" 
                      checked={advancedSettings.ccSelf}
                      onCheckedChange={(checked) => updateAdvancedSetting('ccSelf', checked)}
                    />
                    <Label htmlFor="cc-self">Copie către mine</Label>
                  </div>
                  <p className="text-xs text-muted-foreground ml-6">
                    Primește o copie a tuturor emailurilor trimise automat.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Setări Fișe Parteneri */}
            <Card>
              <CardHeader>
                <CardTitle>Fișe Parteneri</CardTitle>
                <CardDescription>
                  Configurează comportamentul pentru sesiunile de solicitare fișe parteneri
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="partner-tracking" 
                      checked={advancedSettings.enablePartnerTracking}
                      onCheckedChange={(checked) => updateAdvancedSetting('enablePartnerTracking', checked)}
                    />
                    <Label htmlFor="partner-tracking">Activează tracking pentru fișe parteneri</Label>
                  </div>
                  <p className="text-xs text-muted-foreground ml-6">
                    Urmărește când partenerii deschid fișele trimise prin email.
                  </p>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="partner-reminders" 
                      checked={advancedSettings.defaultPartnerReminders}
                      onCheckedChange={(checked) => updateAdvancedSetting('defaultPartnerReminders', checked)}
                    />
                    <Label htmlFor="partner-reminders">Remindere automate pentru fișe parteneri</Label>
                  </div>
                  <p className="text-xs text-muted-foreground ml-6">
                    Trimite automat remindere dacă partenerii nu confirmă primirea fișelor.
                  </p>

                  {advancedSettings.defaultPartnerReminders && (
                    <div className="ml-6 space-y-2">
                      <Label htmlFor="partner-interval">Interval reminder fișe (zile)</Label>
                      <Input 
                        id="partner-interval" 
                        type="number" 
                        value={advancedSettings.partnerReminderInterval}
                        onChange={(e) => updateAdvancedSetting('partnerReminderInterval', parseInt(e.target.value) || 5)}
                        min="1"
                        max="14"
                        className="w-32"
                      />
                      <p className="text-xs text-muted-foreground">
                        Zilele după care se trimite reminder pentru fișele necitate.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Acțiuni */}
            <div className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={resetAdvancedSettings}
                disabled={saving}
              >
                Resetează la Implicite
              </Button>
              
              <Button 
                onClick={saveAdvancedSettings}
                disabled={saving}
              >
                {saving ? 'Se salvează...' : 'Salvează Setările'}
              </Button>
            </div>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
};
