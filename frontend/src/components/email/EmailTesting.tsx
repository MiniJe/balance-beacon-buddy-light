import React, { useState } from 'react';
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { Mail, Send, CheckCircle, AlertCircle, Clock } from "lucide-react";
// Toast removed to eliminate warnings

interface EmailTestResult {
  success: boolean;
  message: string;
  timestamp: string;
}

const EmailTesting = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<EmailTestResult[]>([]);
  const [emailForm, setEmailForm] = useState({
    to: '',
    subject: 'Test Email - Sistema CRM DUCFARM',
    message: 'Acesta este un email de test trimis din sistema CRM pentru a verifica funcționalitatea serviciului de email.'
  });

  const handleSendTestEmail = async () => {
    if (!emailForm.to.trim()) {
      console.error('Vă rugăm să introduceți o adresă de email.');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || 'MASTER_KEY'}`
        },
        body: JSON.stringify({
          to: emailForm.to,
          subject: emailForm.subject,
          text: emailForm.message,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Test Email - Sistema CRM DUCFARM</h2>
              <p>${emailForm.message.replace(/\n/g, '<br>')}</p>
              <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
              <p style="color: #6b7280; font-size: 12px;">
                Trimis la: ${new Date().toLocaleString('ro-RO')}<br>
                Sistem: CRM DUCFARM S.R.L. / DUCFARM LOGISTIC S.R.L.
              </p>
            </div>
          `
        })
      });

      const result = await response.json();
      
      const testResult: EmailTestResult = {
        success: result.success,
        message: result.success 
          ? `Email trimis cu succes către ${emailForm.to}` 
          : `Eroare: ${result.message}`,
        timestamp: new Date().toLocaleString('ro-RO')
      };

      setTestResults(prev => [testResult, ...prev]);

      if (result.success) {
        console.log('Email trimis cu succes!');
      } else {
        console.error('Eroare la trimiterea email-ului');
      }

    } catch (error) {
      const testResult: EmailTestResult = {
        success: false,
        message: `Eroare de conexiune: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`,
        timestamp: new Date().toLocaleString('ro-RO')
      };

      setTestResults(prev => [testResult, ...prev]);
      console.error('Eroare de conexiune');
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
    console.info('Rezultatele au fost șterse');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Mail className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">Testare Serviciu Email</h1>
          <p className="text-gray-600">Testează funcționalitatea serviciului de email al sistemului CRM</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Trimite Email de Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email-to">Destinatar *</Label>
            <Input
              id="email-to"
              type="email"
              placeholder="exemplu@email.com"
              value={emailForm.to}
              onChange={(e) => setEmailForm(prev => ({ ...prev, to: e.target.value }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email-subject">Subiect</Label>
            <Input
              id="email-subject"
              value={emailForm.subject}
              onChange={(e) => setEmailForm(prev => ({ ...prev, subject: e.target.value }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email-message">Mesaj</Label>
            <Textarea
              id="email-message"
              rows={4}
              value={emailForm.message}
              onChange={(e) => setEmailForm(prev => ({ ...prev, message: e.target.value }))}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleSendTestEmail} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Se trimite...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Trimite Email
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Rezultate Teste</CardTitle>
              <Button variant="outline" size="sm" onClick={clearResults}>
                Șterge Toate
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {testResults.map((result, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {result.success ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        )}
                        <Badge variant={result.success ? "default" : "destructive"}>
                          {result.success ? "Succes" : "Eroare"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700 mb-1">
                        {result.message}
                      </p>
                      <p className="text-xs text-gray-500">
                        {result.timestamp}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EmailTesting;

