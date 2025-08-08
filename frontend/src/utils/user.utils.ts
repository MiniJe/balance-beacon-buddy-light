import { UnifiedUser } from '@/services/auth.unified.service';

// Helper functions pentru a accesa proprietățile utilizatorului în mod sigur
export const getUserId = (user: UnifiedUser): string => {
  return user.TipUtilizator === 'MASTER' ? user.IdUtilizatori : user.IdContabil;
};

export const getUserName = (user: UnifiedUser): string => {
  return user.TipUtilizator === 'MASTER' 
    ? user.NumeUtilizator 
    : `${user.NumeContabil} ${user.PrenumeContabil}`;
};

export const getUserEmail = (user: UnifiedUser): string => {
  return user.TipUtilizator === 'MASTER' ? user.EmailUtilizator : user.EmailContabil;
};

export const getUserRole = (user: UnifiedUser): string => {
  return user.TipUtilizator === 'MASTER' ? user.RolUtilizator : 'CONTABIL';
};

export const isMasterUser = (user: UnifiedUser): boolean => {
  return user.TipUtilizator === 'MASTER';
};

export const isContabilUser = (user: UnifiedUser): boolean => {
  return user.TipUtilizator === 'CONTABIL';
};
