import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

interface ReminderSettings {
  autoReminderEnabled: boolean;
  daysBeforeReminder: number;
  reminderIntervalDays: number;
  maxReminders: number;
  ccSelf: boolean;
  trackOpens: boolean;
  enableTrackingInReminders: boolean;
}

export const AdvancedSettings = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<ReminderSettings>({
    autoReminderEnabled: false,
    daysBeforeReminder: 7,
    reminderIntervalDays: 3,
    maxReminders: 2,
    ccSelf: true,
    trackOpens: true,
    enableTrackingInReminders: true,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Încarcă setările la montarea componentei
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/reminders/settings', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSettings(data.settings);
        }
      }
    } catch (error) {
      console.error('Eroare la încărcarea setărilor:', error);
      toast({
        title: "Eroare",
        description: "Nu s-au putut încărca setările avansate",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/reminders/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(settings),
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Succes",
          description: "Setările avansate au fost salvate cu succes",
        });
      } else {
        throw new Error(data.message || 'Eroare la salvarea setărilor');
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

  const updateSetting = (key: keyof ReminderSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-muted-foreground">Se încarcă setările...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Setări Avansate</CardTitle>
        <CardDescription>
          Configurează opțiuni avansate pentru cererile de confirmare și remindere automate
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Toggle pentru activarea reminderelor automate */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-reminders">Remindere Automate</Label>
              <p className="text-xs text-muted-foreground">
                Activează trimiterea automată de remindere către partenerii neresponsivi
              </p>
            </div>
            <Switch
              id="auto-reminders"
              checked={settings.autoReminderEnabled}
              onCheckedChange={(checked) => updateSetting('autoReminderEnabled', checked)}
            />
          </div>
        </div>

        <Separator />

        {/* Setări disponibile doar dacă reminderele sunt active */}
        <div className={`space-y-6 ${!settings.autoReminderEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="space-y-2">
            <Label htmlFor="reminder-days">Zile până la trimiterea unei reamintiri</Label>
            <Input 
              id="reminder-days" 
              type="number" 
              value={settings.daysBeforeReminder}
              onChange={(e) => updateSetting('daysBeforeReminder', parseInt(e.target.value) || 7)}
              min="1"
              max="30"
            />
            <p className="text-xs text-muted-foreground">
              Numărul de zile după care se va trimite automat o reamintire dacă nu s-a primit răspuns.
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="reminder-interval">Interval între remindere (zile)</Label>
            <Input 
              id="reminder-interval" 
              type="number" 
              value={settings.reminderIntervalDays}
              onChange={(e) => updateSetting('reminderIntervalDays', parseInt(e.target.value) || 3)}
              min="1"
              max="14"
            />
            <p className="text-xs text-muted-foreground">
              Câte zile să treacă între remindere consecutive.
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="cc-self" 
                checked={settings.ccSelf}
                onCheckedChange={(checked) => updateSetting('ccSelf', checked)}
              />
              <Label htmlFor="cc-self">Trimite o copie către adresa proprie de email</Label>
            </div>
            <p className="text-xs text-muted-foreground ml-6">
              Vei primi o copie a fiecărui email trimis către parteneri.
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="track-opens" 
                checked={settings.trackOpens}
                onCheckedChange={(checked) => updateSetting('trackOpens', checked)}
              />
              <Label htmlFor="track-opens">Urmărește deschiderile emailurilor</Label>
            </div>
            <p className="text-xs text-muted-foreground ml-6">
              Vei vedea când un partener a deschis emailul trimis.
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="track-in-reminders" 
                checked={settings.enableTrackingInReminders}
                onCheckedChange={(checked) => updateSetting('enableTrackingInReminders', checked)}
              />
              <Label htmlFor="track-in-reminders">Urmărește deschiderile în remindere</Label>
            </div>
            <p className="text-xs text-muted-foreground ml-6">
              Include urmărirea deschiderilor și în emailurile de reamintire.
            </p>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <Label htmlFor="max-reminders">Număr maxim de reamintiri</Label>
            <Select 
              value={settings.maxReminders.toString()}
              onValueChange={(value) => updateSetting('maxReminders', parseInt(value))}
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
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={saveSettings}
          disabled={saving}
          className="w-full"
        >
          {saving ? 'Se salvează...' : 'Salvează Setările'}
        </Button>
      </CardFooter>
    </Card>
  );
};
