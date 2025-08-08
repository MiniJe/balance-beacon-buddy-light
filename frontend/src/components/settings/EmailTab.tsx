import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
// Toast removed to eliminate warnings
import { ReloadIcon } from "@radix-ui/react-icons";

interface EmailSettings {
  smtpServer: string;
  smtpPort: string;
  username: string;
  password: string;
  senderName: string;
  senderEmail: string;
  signature: string;
}

export const EmailTab = () => {
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    smtpServer: "",
    smtpPort: "",
    username: "",
    password: "",
    senderName: "Confirmări Sold",
    senderEmail: "",
    signature: "Cu stimă,\nEchipa Confirmări Sold\nTel: 0721.234.567"
  });
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    loadEmailSettings();
  }, []);

  const loadEmailSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error("Nu ești autentificat. Te rog să te conectezi.");
        return;
      }

      const response = await fetch('/api/email/settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setEmailSettings(data);
      } else {
        console.error("Eroare la încărcarea setărilor email");
      }
    } catch (error) {
      console.error('Eroare la încărcarea setărilor email:', error);
      console.error("Eroare la conectarea cu serverul");
    }
  };

  const saveEmailSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error("Nu ești autentificat. Te rog să te conectezi.");
        return;
      }

      const response = await fetch('/api/email/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailSettings)
      });

      if (response.ok) {
        console.log("Setările email au fost salvate cu succes!");
      } else {
        const errorData = await response.json();
        console.error(`Eroare la salvarea setărilor: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Eroare la salvarea setărilor email:', error);
      console.error("Eroare la conectarea cu serverul");
    }
  };

  const handleTestEmailConnection = async () => {
    setTestingEmail(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error("Nu ești autentificat. Te rog să te conectezi.");
        return;
      }

      const response = await fetch('/api/email/test-connection', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailSettings)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log("Conexiunea email funcționează perfect!");
        } else {
          console.error(`Eroare la testarea conexiunii: ${data.message}`);
        }
      } else {
        const errorData = await response.json();
        console.error(`Eroare la testarea email-ului: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Eroare la testarea email-ului:', error);
      console.error("Eroare la conectarea cu serverul");
    } finally {
      setTestingEmail(false);
    }
  };

  const handleTestEmailDynamic = async () => {
    if (!testEmail || !emailPassword) {
      console.error("Te rog să introduci adresa de email și parola pentru test");
      return;
    }

    // Validare format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmail)) {
      console.error("Formatul email-ului nu este valid");
      return;
    }

    setTestingEmail(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error("Nu ești autentificat. Te rog să te conectezi.");
        return;
      }

      const response = await fetch('/api/email/send-test-dynamic', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          testEmail: testEmail,
          password: emailPassword
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log("Email-ul de test a fost trimis cu succes!");
        } else {
          console.error(`Eroare la trimiterea email-ului: ${data.message}`);
        }
      } else {
        const errorData = await response.json();
        console.error(`Eroare la trimiterea email-ului: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Eroare la trimiterea email-ului:', error);
      console.error("Eroare la conectarea cu serverul");
    } finally {
      setTestingEmail(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!emailPassword) {
      console.error("Te rog să introduci parola");
      return;
    }

    setUpdatingPassword(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error("Nu ești autentificat. Te rog să te conectezi.");
        return;
      }

      const response = await fetch('/api/email/update-password', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          password: emailPassword
        })
      });

      if (response.ok) {
        console.log("Parola a fost actualizată cu succes!");
        setEmailPassword("");
        loadEmailSettings(); // Reîncarcă setările pentru a reflecta modificările
      } else {
        const errorData = await response.json();
        console.error(`Eroare la actualizarea parolei: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Eroare la actualizarea parolei:', error);
      console.error("Eroare la conectarea cu serverul");
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurații Email</CardTitle>
        <CardDescription>
          Configurează setările pentru trimiterea email-urilor
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="smtp-server">Server SMTP</Label>
            <Input 
              id="smtp-server" 
              value={emailSettings.smtpServer}
              onChange={(e) => setEmailSettings({...emailSettings, smtpServer: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtp-port">Port</Label>
            <Input 
              id="smtp-port" 
              value={emailSettings.smtpPort}
              onChange={(e) => setEmailSettings({...emailSettings, smtpPort: e.target.value})}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="username">Numele utilizatorului</Label>
            <Input 
              id="username" 
              value={emailSettings.username}
              onChange={(e) => setEmailSettings({...emailSettings, username: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Parolă</Label>
            <Input 
              id="password" 
              type="password" 
              value={emailSettings.password}
              onChange={(e) => setEmailSettings({...emailSettings, password: e.target.value})}
            />
          </div>
        </div>
        
        <Separator />
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="sender-name">Nume expeditor</Label>
            <Input 
              id="sender-name" 
              value={emailSettings.senderName}
              onChange={(e) => setEmailSettings({...emailSettings, senderName: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sender-email">Email expeditor</Label>
            <Input 
              id="sender-email" 
              type="email" 
              value={emailSettings.senderEmail}
              onChange={(e) => setEmailSettings({...emailSettings, senderEmail: e.target.value})}
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="signature">Semnătură</Label>
          <textarea 
            id="signature" 
            className="w-full min-h-[100px] px-3 py-2 border border-input bg-background rounded-md text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={emailSettings.signature}
            onChange={(e) => setEmailSettings({...emailSettings, signature: e.target.value})}
          />
        </div>
        
        <div className="flex gap-2">
          <Button onClick={saveEmailSettings}>
            Salvează setările
          </Button>
          <Button 
            variant="outline" 
            onClick={handleTestEmailConnection}
            disabled={testingEmail}
          >
            {testingEmail && <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />}
            Testează conexiunea
          </Button>
        </div>
        
        <Separator />
        
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Test Email Dinamic</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="test-email">Email de test</Label>
              <Input 
                id="test-email" 
                type="email"
                placeholder="test@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-password">Parolă email</Label>
              <Input 
                id="email-password" 
                type="password"
                placeholder="Parola pentru email"
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleTestEmailDynamic} disabled={testingEmail}>
              {testingEmail && <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />}
              Trimite email de test
            </Button>
            <Button variant="outline" onClick={handleUpdatePassword} disabled={updatingPassword}>
              {updatingPassword && <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />}
              Actualizează parola
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

