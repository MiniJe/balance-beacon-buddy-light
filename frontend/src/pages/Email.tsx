import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, RefreshCw } from 'lucide-react';

interface EmailItem {
  messageId: string;
  from: string;
  to: string[];
  subject: string;
  text: string;
  html?: string;
  date: string | Date;
  inReplyTo?: string;
  references?: string[];
}

export default function EmailPage() {
  const [items, setItems] = useState<EmailItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<EmailItem | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/email-monitor/list?days=7&limit=50', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const json = await res.json();
      if (!res.ok || json?.success === false) throw new Error(json?.error || 'Request failed');
      setItems(json.data || []);
      if (!selected && (json.data || []).length) setSelected(json.data[0]);
    } catch (e: any) {
      setError(e?.message || 'Eroare la încărcare');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold flex items-center gap-2"><Mail className="h-5 w-5"/>Inbox (read-only)</h1>
        <Button onClick={load} disabled={loading}>
          <RefreshCw className={"h-4 w-4 mr-2 " + (loading ? 'animate-spin' : '')}/> Reîncarcă
        </Button>
      </div>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1 overflow-hidden">
          <CardHeader>
            <CardTitle>Mesaje</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y max-h-[70vh] overflow-auto">
              {items.map((it) => (
                <li key={it.messageId} className={`p-3 cursor-pointer hover:bg-accent ${selected?.messageId === it.messageId ? 'bg-accent' : ''}`} onClick={() => setSelected(it)}>
                  <div className="text-sm font-medium truncate">{it.subject || '(fără subiect)'}</div>
                  <div className="text-xs text-muted-foreground truncate">{it.from}</div>
                  <div className="text-xs text-muted-foreground">{new Date(it.date).toLocaleString()}</div>
                </li>
              ))}
              {(!items || items.length === 0) && (
                <li className="p-3 text-sm text-muted-foreground">Nu sunt mesaje în intervalul selectat.</li>
              )}
            </ul>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Previzualizare</CardTitle>
          </CardHeader>
          <CardContent>
            {!selected ? (
              <div className="text-sm text-muted-foreground">Selectează un mesaj pentru a vedea conținutul.</div>
            ) : (
              <div className="space-y-3">
                <div>
                  <div className="text-lg font-semibold">{selected.subject || '(fără subiect)'}</div>
                  <div className="text-sm text-muted-foreground">De la: {selected.from}</div>
                  <div className="text-sm text-muted-foreground">Data: {new Date(selected.date).toLocaleString()}</div>
                </div>
                {selected.html ? (
                  <iframe title="email-html" className="w-full h-[60vh] border rounded" srcDoc={selected.html} />
                ) : (
                  <pre className="whitespace-pre-wrap text-sm bg-muted p-3 rounded max-h-[60vh] overflow-auto">{selected.text || '(fără conținut)'}</pre>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
