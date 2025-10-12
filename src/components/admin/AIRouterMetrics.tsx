import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, BrainCircuit, Activity } from 'lucide-react';

interface RouterMetrics {
  providers: string[];
  statuses: Record<string, string>;
  recommendations: Record<string, number>;
  executions: Record<string, number>;
  estimated_cost_usd: Record<string, number>;
  latency_ms: Record<string, { count: number; avg_ms: number; p95_ms: number }>;
  last_decisions: Array<{ provider: string; model: string; reason: string; estimated_cost_usd: number }>;
}

const AIRouterMetrics: React.FC = () => {
  const [metrics, setMetrics] = useState<RouterMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/ai/router/metrics');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMetrics(data as RouterMetrics);
    } catch (e: any) {
      setError(e?.message || 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
    const id = setInterval(loadMetrics, 15000);
    return () => clearInterval(id);
  }, []);

  const totalEstimated = metrics
    ? Object.values(metrics.estimated_cost_usd || {}).reduce((a, b) => a + (b || 0), 0)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BrainCircuit className="h-6 w-6" /> AI Router Metrics
        </h2>
        <button
          onClick={loadMetrics}
          className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-600">{error}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Status & Totals</CardTitle>
        </CardHeader>
        <CardContent>
          {!metrics ? (
            <div className="text-sm text-gray-600">Loading...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 rounded border bg-white">
                <div className="text-xs text-gray-500">Providers</div>
                <div className="text-sm">
                  {metrics.providers.map((p) => (
                    <div key={p} className="flex items-center justify-between">
                      <span>{p}</span>
                      <span className={`text-xs ${metrics.statuses[p] === 'healthy' ? 'text-green-600' : 'text-yellow-600'}`}>
                        {metrics.statuses[p]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-3 rounded border bg-white">
                <div className="text-xs text-gray-500">Recommendations / Executions</div>
                <div className="text-sm space-y-1">
                  {metrics.providers.map((p) => (
                    <div key={p} className="flex items-center justify-between">
                      <span>{p}</span>
                      <span>{metrics.recommendations[p] || 0} / {metrics.executions[p] || 0}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-3 rounded border bg-white">
                <div className="text-xs text-gray-500">Estimated Cost (USD)</div>
                <div className="text-sm space-y-1">
                  {metrics.providers.map((p) => (
                    <div key={p} className="flex items-center justify-between">
                      <span>{p}</span>
                      <span>${(metrics.estimated_cost_usd[p] || 0).toFixed(4)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between font-semibold border-t pt-1 mt-1">
                    <span>Total</span>
                    <span>${totalEstimated.toFixed(4)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4" /> Latency
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!metrics ? (
            <div className="text-sm text-gray-600">Loading...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {metrics.providers.map((p) => (
                <div key={p} className="p-3 rounded border bg-white">
                  <div className="text-sm font-medium mb-1">{p}</div>
                  <div className="text-xs text-gray-500">Count / Avg / P95 (ms)</div>
                  <div className="text-sm">
                    {(() => {
                      const s = metrics.latency_ms[p];
                      return s ? `${s.count} / ${s.avg_ms.toFixed(0)} / ${s.p95_ms.toFixed(0)}` : '0 / 0 / 0';
                    })()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Decisions</CardTitle>
        </CardHeader>
        <CardContent>
          {!metrics ? (
            <div className="text-sm text-gray-600">Loading...</div>
          ) : metrics.last_decisions?.length ? (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="text-gray-500">
                  <tr>
                    <th className="text-left p-2">Provider</th>
                    <th className="text-left p-2">Model</th>
                    <th className="text-left p-2">Reason</th>
                    <th className="text-right p-2">Est. Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.last_decisions.map((d, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="p-2">{d.provider}</td>
                      <td className="p-2">{d.model}</td>
                      <td className="p-2">{d.reason}</td>
                      <td className="p-2 text-right">${(d.estimated_cost_usd || 0).toFixed(6)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-sm text-gray-600">No decisions yet.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AIRouterMetrics;

