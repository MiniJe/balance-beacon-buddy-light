import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Separator } from "@/components/ui/separator";

interface AutoReminderStatus {
  isRunning: boolean;
  intervalId: boolean;
  uptime: string;
}

export const AutoReminderControl = () => {
  const { toast } = useToast();
  const [status, setStatus] = useState<AutoReminderStatus>({
    isRunning: false,
    intervalId: false,
    uptime: 'Inactiv'
  });
  const [loading, setLoading] = useState(false);

  // Încarcă statusul la montarea componentei
  useEffect(() => {
    loadStatus();
    
    // Reîncarcă statusul la fiecare 10 secunde
    const interval = setInterval(loadStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadStatus = async () => {
    try {
      const response = await fetch('/api/auto-reminder/status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStatus(data.data);
        }
      }
    } catch (error) {
      console.error('Eroare la încărcarea statusului:', error);
    }
  };

  const toggleService = async (enable: boolean) => {
    try {
      setLoading(true);
      const endpoint = enable ? '/api/auto-reminder/start' : '/api/auto-reminder/stop';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ 
          intervalHours: 24 // Verifică la fiecare 24 de ore
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setStatus(data.data);
        toast({
          title: "Succes",
          description: data.message,
        });
      } else {
        throw new Error(data.message || 'Eroare la controlul serviciului');
      }
    } catch (error) {
      console.error('Eroare la controlul serviciului:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut controla serviciul de auto-remindere",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const runManualCheck = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auto-reminder/check-now', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Succes",
          description: "Verificarea manuală a fost executată cu succes",
        });
        // Reîncarcă statusul după verificarea manuală
        setTimeout(loadStatus, 1000);
      } else {
        throw new Error(data.message || 'Eroare la verificarea manuală');
      }
    } catch (error) {
      console.error('Eroare la verificarea manuală:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut executa verificarea manuală",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Control Serviciu Auto-Remindere</CardTitle>
            <CardDescription>
              Controlează serviciul automat pentru trimiterea reminderelor către parteneri
            </CardDescription>
          </div>
          <Badge variant={status.isRunning ? "default" : "secondary"}>
            {status.uptime}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="service-toggle">Serviciu Auto-Remindere</Label>
            <p className="text-sm text-muted-foreground">
              {status.isRunning 
                ? "Serviciul verifică automat partenerii neresponsivi și trimite remindere"
                : "Serviciul este oprit - nu se vor trimite remindere automate"
              }
            </p>
          </div>
          <Switch
            id="service-toggle"
            checked={status.isRunning}
            onCheckedChange={toggleService}
            disabled={loading}
          />
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Status interval:</span>
            <Badge variant={status.intervalId ? "default" : "outline"}>
              {status.intervalId ? "Programat" : "Neprogramat"}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Verificare Manuală</Label>
              <p className="text-sm text-muted-foreground">
                Rulează imediat o verificare pentru parteneri neresponsivi
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={runManualCheck}
              disabled={loading}
              size="sm"
            >
              {loading ? 'Se procesează...' : 'Verifică Acum'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
