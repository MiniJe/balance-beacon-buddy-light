import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface UpdateSummaryState {
  loading: boolean;
  available: boolean;
  behind?: number;
  currentVersion?: string;
  branch?: string;
  commit?: string;
  lastChecked?: number;
}

export function useUpdateNotification() {
  const { isMaster } = useAuth();
  const [state, setState] = useState<UpdateSummaryState>({ loading: false, available: false });

  useEffect(() => {
    if (!isMaster()) return;
    let cancelled = false;
    const run = async () => {
      try {
        setState(s => ({ ...s, loading: true }));
        const res = await fetch('/api/update/summary', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
        const data = await res.json();
        if (!cancelled && data.success) {
          const info = data.data;
            setState({
              loading: false,
              available: info.updates.updatesAvailable,
              behind: info.updates.git?.behind,
              currentVersion: info.version.backendVersion,
              branch: info.updates.git?.branch,
              commit: info.updates.git?.commit,
              lastChecked: Date.now()
            });
        }
      } catch {
        if (!cancelled) setState(s => ({ ...s, loading: false }));
      }
    };
    run();
    return () => { cancelled = true; };
  }, [isMaster]);

  return state;
}
