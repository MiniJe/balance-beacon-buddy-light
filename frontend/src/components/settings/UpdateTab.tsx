import { useState, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { CheckCircledIcon, ExclamationTriangleIcon, ReloadIcon } from '@radix-ui/react-icons';

interface VersionState {
  loading: boolean;
  versionInfo?: any;
  updateCheck?: any;
  applying?: boolean;
  lastApply?: {
    success: boolean;
    log?: string;
    rollback?: boolean;
    health?: { ok: boolean; status?: number; error?: string };
    backupDir?: string;
  };
}

export const UpdateTab = () => {
  const [state, setState] = useState<VersionState>({ loading: false });
  const { toast } = useToast();
  const resultRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll la rezultatul ultimei aplicări
  useEffect(() => {
    if (state.lastApply && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [state.lastApply]);

  const authHeader = () => ({ 'Authorization': `Bearer ${localStorage.getItem('token')}` });

  const loadVersion = async () => {
    try {
      setState(s => ({ ...s, loading: true }));
      const res = await fetch('/api/update/version', { headers: authHeader() });
      const data = await res.json();
      if (data.success) setState(s => ({ ...s, versionInfo: data.data }));
    } catch (e) {
      toast({ title: 'Eroare', description: 'Nu s-a putut încărca versiunea', variant: 'destructive' });
    } finally { setState(s => ({ ...s, loading: false })); }
  };

  const checkUpdates = async () => {
    try {
      setState(s => ({ ...s, loading: true }));
      const res = await fetch('/api/update/check', { method: 'POST', headers: { ...authHeader(), 'Content-Type': 'application/json' } });
      const data = await res.json();
      if (data.success) {
        setState(s => ({ ...s, updateCheck: data.data }));
        toast({ title: 'Verificare completă', description: data.data.updatesAvailable ? 'Există actualizări disponibile' : 'Nu sunt actualizări' });
      }
    } catch (e) {
      toast({ title: 'Eroare', description: 'Nu s-a putut verifica update-ul', variant: 'destructive' });
    } finally { setState(s => ({ ...s, loading: false })); }
  };

  const applyUpdate = async () => {
    try {
      setState(s => ({ ...s, applying: true }));
      const res = await fetch('/api/update/apply', { method: 'POST', headers: { ...authHeader(), 'Content-Type': 'application/json' } });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Actualizare aplicată', description: 'Repornește serverul dacă e necesar.' });
  setState(s => ({ ...s, lastApply: data.data }));
      } else {
        toast({ title: 'Eroare', description: data.data?.log || 'Aplicare eșuată', variant: 'destructive' });
  setState(s => ({ ...s, lastApply: data.data }));
      }
    } catch (e:any) {
      toast({ title: 'Eroare', description: e.message, variant: 'destructive' });
    } finally { setState(s => ({ ...s, applying: false })); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actualizare Aplicație</CardTitle>
        <CardDescription>Verifică și aplică actualizări (doar MASTER)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadVersion} disabled={state.loading}>Încarcă versiune</Button>
          <Button onClick={checkUpdates} disabled={state.loading}>Verifică update</Button>
          <Button onClick={applyUpdate} disabled={state.applying || state.loading} className="relative">
            {state.applying && <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />}
            Aplică update
          </Button>
        </div>
        <Separator />
        <div className="text-sm space-y-2 font-mono">
          {state.versionInfo && (
            <div>
              <div>Backend: {state.versionInfo.backendVersion}</div>
              {state.versionInfo.rootVersion && <div>Root: {state.versionInfo.rootVersion}</div>}
              {state.versionInfo.git && (
                <div className="opacity-80 text-xs">Git: {state.versionInfo.git.branch}@{state.versionInfo.git.commit} {state.versionInfo.git.dirty ? '(dirty)' : ''}</div>
              )}
              <div>SelfUpdate: {state.versionInfo.selfUpdateEnabled ? 'ON' : 'OFF'}</div>
            </div>
          )}
          {state.updateCheck && (
            <div>
              <div>updatesAvailable: {state.updateCheck.updatesAvailable ? 'DA' : 'NU'}</div>
              {state.updateCheck.git && (
                <div>behind: {state.updateCheck.git.behind || 0} ahead: {state.updateCheck.git.ahead || 0}</div>
              )}
              {state.updateCheck.reason && <div>motiv: {state.updateCheck.reason}</div>}
            </div>
          )}
          {state.lastApply && (
            <div ref={resultRef} className="rounded border p-3 space-y-2 bg-muted/30">
              <div className="flex flex-wrap items-center gap-2 text-xs font-sans">
                <StatusBadge
                  label={state.lastApply.success ? 'SUCCES' : 'EȘEC'}
                  variant={state.lastApply.success ? 'success' : 'error'}
                  icon={state.lastApply.success ? <CheckCircledIcon className="h-3 w-3" /> : <ExclamationTriangleIcon className="h-3 w-3" />}
                />
                {state.lastApply.rollback && (
                  <StatusBadge label="ROLLBACK" variant="warn" icon={<ExclamationTriangleIcon className="h-3 w-3" />} />
                )}
                {state.lastApply.health && (
                  <StatusBadge
                    label={state.lastApply.health.ok ? `Health OK ${state.lastApply.health.status || ''}` : `Health FAIL ${state.lastApply.health.status || ''}`}
                    variant={state.lastApply.health.ok ? 'success' : 'error'}
                    icon={state.lastApply.health.ok ? <CheckCircledIcon className="h-3 w-3" /> : <ExclamationTriangleIcon className="h-3 w-3" />}
                  />
                )}
                {state.lastApply.backupDir && (
                  <StatusBadge label={`Backup: ${shortenPath(state.lastApply.backupDir)}`} variant="neutral" />
                )}
              </div>
              {state.lastApply.log && (
                <details className="group" open={!state.lastApply.success}>
                  <summary className="cursor-pointer text-xs font-semibold select-none flex items-center gap-1">
                    <span>Log execuție</span>
                  </summary>
                  <pre className="mt-1 whitespace-pre-wrap text-xs max-h-56 overflow-auto bg-background/60 p-2 rounded border">
{state.lastApply.log}
                  </pre>
                </details>
              )}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        Pentru aplicare automată setează ALLOW_SELF_UPDATE=true în mediul serverului. Operația rulează git pull + npm install + build.
      </CardFooter>
    </Card>
  );
};

// Componentă internă pentru badge-uri de status
const StatusBadge = ({ label, variant, icon }: { label: string; variant: 'success' | 'error' | 'warn' | 'neutral'; icon?: React.ReactNode }) => {
  const base = 'inline-flex items-center gap-1 rounded px-2 py-0.5 border text-[10px] tracking-wide';
  const variants: Record<string, string> = {
    success: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/40 dark:text-emerald-300',
    error: 'bg-red-500/10 text-red-700 border-red-500/40 dark:text-red-300',
    warn: 'bg-amber-500/10 text-amber-700 border-amber-500/40 dark:text-amber-300',
    neutral: 'bg-slate-500/10 text-slate-700 border-slate-500/40 dark:text-slate-300'
  };
  return <span className={`${base} ${variants[variant]}`}>{icon}{label}</span>;
};

// Helper pentru scurtarea path-urilor lungi
function shortenPath(p?: string, max = 40) {
  if (!p) return '';
  if (p.length <= max) return p;
  const start = p.slice(0, Math.floor(max/2)-2);
  const end = p.slice(-Math.floor(max/2));
  return `${start}…${end}`;
}

export default UpdateTab;
