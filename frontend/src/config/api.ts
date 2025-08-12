// Configurația pentru API

const isDevelopment = import.meta.env.DEV || window.location.hostname === 'localhost';

export const API_BASE_URL = isDevelopment
  ? 'http://localhost:5000/api'
  : 'https://your-production-api.com/api';  // Înlocuiți cu domeniul real de producție

export const API_ENDPOINTS = {
  // Auth
  AUTH: '/auth-unified',
  
  // Templates  
  TEMPLATES: '/templates',
  TEMPLATE_VARIABLES: '/templates/variables',
  TEMPLATE_PREVIEW: '/templates/preview',
  
  // Email
  EMAIL: '/email',
  EMAIL_SETTINGS: '/email-settings',
  EMAIL_TRACKING: '/email-tracking',
  EMAIL_MONITOR: '/email-monitor',
  
  // Partners
  PARTNERS: '/parteneri',
  
  // Reports
  PDF: '/pdf',
  
  // Database
  DATABASE: '/database',
  
  // Storage
  STORAGE: '/storage',
  
  // Backup
  BACKUP: '/backup',
  
  // Sessions
  SESSIONS: '/sesiuni',
  
  // Permissions
  PERMISSIONS: '/permissions',
  
  // Journal
  JOURNAL_EMAIL: '/jurnal-email',
  JOURNAL_DOCUMENTS: '/jurnal-documente-emise',
  JOURNAL_REQUEST: '/jurnal-cereri-confirmare',
  
  // Confirmation requests
  CONFIRMATION_REQUESTS: '/cereri-confirmare',
  
  // Auto reminders
  AUTO_REMINDER: '/auto-reminder'
};

// Configurație pentru request-uri
export const REQUEST_CONFIG = {
  timeout: 30000, // 30 secunde
  retries: 3,
  retryDelay: 1000 // 1 secundă
};

// Headers comune
export const getAuthHeaders = (token?: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      headers['Authorization'] = `Bearer ${storedToken}`;
    }
  }
  
  return headers;
};

// Helper pentru construirea URL-urilor
export const buildApiUrl = (endpoint: string, params?: Record<string, any>) => {
  let url = `${API_BASE_URL}${endpoint}`;
  
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }
  
  return url;
};
