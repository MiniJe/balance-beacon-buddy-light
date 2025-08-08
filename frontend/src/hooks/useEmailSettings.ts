import { useState, useEffect } from "react";

export interface EmailSettings {
  smtpServer: string;
  smtpPort: string;
  username: string;
  password: string;
  senderName: string;
  senderEmail: string;
  signature: string;
}

export const useEmailSettings = () => {
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    smtpServer: "",
    smtpPort: "",
    username: "",
    password: "••••••••••••",
    senderName: "Confirmări Sold",
    senderEmail: "",
    signature: "Cu stimă,\nEchipa Confirmări Sold\nTel: 0721.234.567"
  });
  const [loading, setLoading] = useState(true);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Load email settings
  const loadEmailSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Token din localStorage:', token ? 'exists' : 'missing');
      
      if (!token) {
        console.error("Nu ești autentificat. Te rog să te conectezi.");
        console.log('Redirecting to login - no token found');
        window.location.href = '/login';
        return;
      }
      
      const response = await fetch('/api/email-settings', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('API Response status:', response.status);
      
      if (response.status === 401) {
        console.error("Sesiunea a expirat. Te rog să te conectezi din nou.");
        console.log('401 Unauthorized - redirecting to login');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.settings && data.settings.length > 0) {
          const emailData = data.settings[0]; // Primul element din array
          setEmailSettings({
            smtpServer: emailData.ServerSMTP || "",
            smtpPort: emailData.PortSMTP?.toString() || "",
            username: emailData.NumeUtilizatorEmail || "",
            password: "••••••••••••", // Parola nu se afișează din motive de securitate
            senderName: emailData.NumeExpeditor || "Confirmări Sold",
            senderEmail: emailData.EmailExpeditor || "",
            signature: emailData.SemnaturaEmail || "Cu stimă,\nEchipa Confirmări Sold\nTel: 0721.234.567"
          });
          console.log("Setările de email au fost încărcate cu succes!");
        } else {
          console.warn("Nu s-au găsit setări de email în baza de date");
        }
      } else {
        const errorData = await response.json();
        console.error(`Eroare la încărcarea setărilor: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Eroare la încărcarea setărilor de email:', error);
      console.error("Eroare la conectarea cu serverul");
    } finally {
      setLoading(false);
    }
  };

  // Save email settings
  const handleSaveEmailSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error("Nu ești autentificat");
        return;
      }

      const response = await fetch('/api/email-settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ServerSMTP: emailSettings.smtpServer,
          PortSMTP: parseInt(emailSettings.smtpPort) || 587,
          NumeUtilizatorEmail: emailSettings.username,
          NumeExpeditor: emailSettings.senderName,
          EmailExpeditor: emailSettings.senderEmail,
          SemnaturaEmail: emailSettings.signature,
          UtilizeazaSSL: parseInt(emailSettings.smtpPort) === 465,
          MetodaAutentificare: 'LOGIN'
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log(data.message || "Setările de email au fost salvate cu succes!");
      } else {
        const errorData = await response.json();
        console.error(`Eroare la salvarea setărilor: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Eroare la salvarea setărilor de email:', error);
      console.error("Eroare la conectarea cu serverul");
    }
  };

  // Test email connection with current stored password
  const handleTestEmail = async () => {
    setTestingEmail(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error("Nu ești autentificat. Te rog să te conectezi.");
        return;
      }

      const response = await fetch('/api/email-settings/test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          password: emailPassword
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log("Conexiunea email funcționează perfect!");
        } else {
          console.error(`Testul conexiunii a eșuat: ${data.message}`);
        }
      } else {
        const errorData = await response.json();
        console.error(`Eroare la testarea conexiunii: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Eroare la testarea conexiunii email:', error);
      console.error("Eroare la conectarea cu serverul");
    } finally {
      setTestingEmail(false);
    }
  };

  // Test email with dynamic credentials and send test email
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

      const response = await fetch('/api/email-settings/test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          password: emailPassword,
          testEmail: testEmail
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log(data.message || "Email de test trimis cu succes!");
      } else {
        const errorData = await response.json();
        console.error(`Eroare la trimiterea email-ului de test: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Eroare la trimiterea email-ului de test:', error);
      console.error("Eroare la conectarea cu serverul");
    } finally {
      setTestingEmail(false);
    }
  };

  // Update/reset email password
  const handleUpdateEmailPassword = async () => {
    if (!emailPassword) {
      console.error("Te rog să introduci parola de email");
      return;
    }

    setUpdatingPassword(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error("Nu ești autentificat. Te rog să te conectezi.");
        return;
      }

      const response = await fetch('/api/email-settings/reset-password', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          newPassword: emailPassword
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log(data.message || "Parola a fost actualizată cu succes!");
        setEmailPassword(""); // Clear the password field
      } else {
        const errorData = await response.json();
        console.error(`Eroare la actualizarea parolei: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Eroare la actualizarea parolei de email:', error);
      console.error("Eroare la conectarea cu serverul");
    } finally {
      setUpdatingPassword(false);
    }
  };

  useEffect(() => {
    loadEmailSettings();
  }, []);

  return {
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
  };
};
