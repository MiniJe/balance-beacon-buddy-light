import { useState } from "react";
import { toast } from "sonner";

export interface NotificationSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  weeklyReports: boolean;
  monthlyReports: boolean;
}

export const useNotificationSettings = () => {
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    smsNotifications: false,
    weeklyReports: true,
    monthlyReports: true
  });
  const [loading, setLoading] = useState(false);

  // Save notification settings
  const handleSaveNotificationSettings = () => {
    // Aici va fi implementată logica de salvare a setărilor de notificări
    toast.success("Preferințele de notificări au fost actualizate!");
  };

  // Încarcă setările de notificări
  const loadNotificationSettings = async () => {
    setLoading(true);
    try {
      // Implementare pentru încărcarea setărilor de notificări din API
      // De adăugat când va fi disponibil endpoint-ul
      setLoading(false);
    } catch (error) {
      console.error('Eroare la încărcarea setărilor de notificări:', error);
      toast.error("Eroare la încărcarea setărilor de notificări");
      setLoading(false);
    }
  };

  return {
    notificationSettings,
    setNotificationSettings,
    loading,
    handleSaveNotificationSettings,
    loadNotificationSettings
  };
};
