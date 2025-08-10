import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ReloadIcon } from "@radix-ui/react-icons";
import { useEmailSettings } from "@/hooks/useEmailSettings";

const EmailSettings = () => {
  const {
    emailSettings,
    setEmailSettings,
    loading,
    testingEmail,
    testEmail,
    setTestEmail,
    emailPassword,
    setEmailPassword,
    updatingPassword,
    handleTestEmail,
    handleTestEmailDynamic,
    handleUpdateEmailPassword,
    handleSaveEmailSettings
  } = useEmailSettings();

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Configurare Server Email</CardTitle>
          <CardDescription>
            {loading ? "Se încarcă setările de email..." : "Configurează setările serverului SMTP pentru trimiterea emailurilor"}
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
              <Label htmlFor="smtp-port">Port SMTP</Label>
              <Input 
                id="smtp-port" 
                value={emailSettings.smtpPort}
                onChange={(e) => setEmailSettings({...emailSettings, smtpPort: e.target.value})}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Nume utilizator</Label>
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
                disabled
              />
            </div>
          </div>
          
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
            <Label htmlFor="signature">Semnătură email</Label>
            <Textarea 
              id="signature" 
              value={emailSettings.signature}
              onChange={(e) => setEmailSettings({...emailSettings, signature: e.target.value})}
              rows={4}
            />
          </div>
          
          <div className="space-y-2 pt-4">
            <Label htmlFor="test-email">Email pentru testare</Label>
            <Input 
              id="test-email" 
              type="email"
              placeholder="your@email.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email-password">Parola email curentă</Label>
              <Input 
                id="email-password" 
                type="password"
                placeholder="Parola pentru SMTP"
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={handleTestEmailDynamic}
              disabled={testingEmail || !testEmail || !emailPassword}
              className="flex-1"
            >
              {testingEmail ? (
                <>
                  <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                  Se trimite...
                </>
              ) : (
                "📧 Trimite Test Email"
              )}
            </Button>
            <Button 
              variant="secondary" 
              onClick={handleUpdateEmailPassword}
              disabled={updatingPassword || !emailPassword}
              className="flex-1"
            >
              {updatingPassword ? (
                <>
                  <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                  Se actualizează...
                </>
              ) : (
                "🔐 Resetează Parola"
              )}
            </Button>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSaveEmailSettings}>Salvează Setările</Button>
          <Button variant="outline" className="ml-2" onClick={handleTestEmail}>
            Testează Conexiunea
          </Button>
        </CardFooter>
      </Card>
    </>
  );
};

export default EmailSettings;
