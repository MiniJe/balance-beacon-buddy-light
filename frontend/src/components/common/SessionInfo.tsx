import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Clock, User, Monitor, Wifi } from 'lucide-react';
import { sesiuniService } from '@/services/sesiuni.service';
import { getUserId, getUserName, getUserEmail, getUserRole } from '@/utils/user.utils';

interface SessionInfoProps {
  showDetails?: boolean;
  className?: string;
}

export function SessionInfo({ showDetails = false, className = '' }: SessionInfoProps) {
  const { user, currentSession } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Actualizează ora curentă la fiecare secundă
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Monitorizează statusul de online/offline
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  // Obține informații despre sesiunea curentă
  useEffect(() => {
    const getSessionInfo = async () => {
      if (user) {
        const userId = getUserId(user);
        if (userId && currentSession) {
          try {
            const sessionInfo = await sesiuniService.getSesiuneActiva(userId);
            if (sessionInfo) {
              setSessionStartTime(new Date(sessionInfo.dataOraLogin));
            }
          } catch (error) {
            console.error('Eroare la obținerea informațiilor sesiunii:', error);
          }
        }
      }
    };

    getSessionInfo();
  }, [user, currentSession]);

  // Formatează data și ora
  const formatDateTime = (date: Date): string => {
    return date.toLocaleString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Formatează durata sesiunii
  const formatSessionDuration = (): string => {
    if (!sessionStartTime) return '';
    
    const now = new Date();
    const diffMs = now.getTime() - sessionStartTime.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Obține tipul de dispozitiv
  const getDeviceType = (): string => {
    const ua = navigator.userAgent;
    if (/Mobile|Android|iP(hone|od)/.test(ua)) return 'Mobile';
    if (/Tablet|iPad/.test(ua)) return 'Tablet';
    return 'Desktop';
  };

  if (!user) {
    return null;
  }

  if (!showDetails) {
    // Versiunea compactă pentru header-ul aplicației
    return (
      <div className={`flex items-center space-x-3 text-sm ${className}`}>
        <div className="flex items-center space-x-1">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{getUserName(user)}</span>
        </div>
        <div className="flex items-center space-x-1">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            {formatDateTime(currentTime)}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <Wifi className={`h-4 w-4 ${isOnline ? 'text-green-500' : 'text-red-500'}`} />
          <span className={`text-xs ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>
    );
  }

  // Versiunea detaliată pentru pagini speciale sau modal-uri
  return (
    <div className={`bg-white rounded-lg shadow-sm border p-4 ${className}`}>
      <h3 className="text-lg font-semibold mb-3 flex items-center">
        <User className="h-5 w-5 mr-2 text-blue-600" />
        Informații Sesiune
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Informații utilizator */}
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-600">Utilizator:</label>
            <p className="text-sm font-semibold">{getUserName(user)}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-600">Email:</label>
            <p className="text-sm">{getUserEmail(user)}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-600">Rol:</label>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {getUserRole(user)}
            </span>
          </div>
        </div>

        {/* Informații sesiune */}
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-600">Ora curentă:</label>
            <p className="text-sm font-mono">{formatDateTime(currentTime)}</p>
          </div>
          
          {sessionStartTime && (
            <div>
              <label className="text-sm font-medium text-gray-600">Sesiune începută la:</label>
              <p className="text-sm font-mono">{formatDateTime(sessionStartTime)}</p>
            </div>
          )}
          
          {sessionStartTime && (
            <div>
              <label className="text-sm font-medium text-gray-600">Durata sesiune:</label>
              <p className="text-sm font-medium text-green-600">{formatSessionDuration()}</p>
            </div>
          )}
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Monitor className="h-4 w-4 text-gray-500" />
              <span className="text-xs text-gray-600">{getDeviceType()}</span>
            </div>
            
            <div className="flex items-center space-x-1">
              <Wifi className={`h-4 w-4 ${isOnline ? 'text-green-500' : 'text-red-500'}`} />
              <span className={`text-xs ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Informații blockchain (dacă sunt disponibile) */}
      {currentSession && (
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-600">
              Sesiune blockchain-ready (ID: {currentSession.slice(-8)})
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
