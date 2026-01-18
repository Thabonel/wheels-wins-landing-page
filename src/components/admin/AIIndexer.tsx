import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

const AIIndexer: React.FC = () => {
  const [url, setUrl] = useState('');
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<string>('');

  const ingest = async () => {
    setLoading(true);
    setLog('');
    try {
      const res = await fetch('/api/v1/ai/ingest/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, slug: slug || undefined })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || 'Ingest failed');
      setLog(JSON.stringify(data, null, 2));
    } catch (e: any) {
      setLog(`Error: ${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  const rebuild = async () => {
    setLoading(true);
    setLog('');
    try {
      const res = await fetch('/api/v1/ai/ingest/rebuild', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || 'Rebuild failed');
      setLog(JSON.stringify(data, null, 2));
    } catch (e: any) {
      setLog(`Error: ${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Index Builder</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="url">Page URL</Label>
              <Input id="url" placeholder="https://wheelsandwins.com/..." value={url} onChange={(e) => setUrl(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="slug">Slug (optional)</Label>
              <Input id="slug" placeholder="my-page" value={slug} onChange={(e) => setSlug(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={ingest} disabled={loading || !url}>Ingest URL</Button>
            <Button variant="outline" onClick={rebuild} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Rebuild from Seeds
            </Button>
          </div>

          <pre className="mt-4 p-3 bg-gray-50 rounded border text-xs overflow-auto max-h-80">
{log || 'Logs will appear here...'}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
};

export default AIIndexer;

