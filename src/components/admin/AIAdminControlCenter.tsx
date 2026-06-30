import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BrainCircuit, AlertTriangle, CheckCircle2, XCircle, Zap, RefreshCw,
  DollarSign, Activity, FileText, ChevronDown, ChevronUp, Send,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------
// Types matching backend schema
// ---------------------------------------------------------------

interface Provider {
  id: string; provider_key: string; family: string; display_name: string;
  enabled: boolean; base_url?: string; data_region?: string;
  secret_ref: string; created_at: string; updated_at: string;
}

interface ModelSlot {
  id: string; slot_key: string; display_name: string; provider_key: string;
  model_id: string; secret_ref: string; enabled: boolean;
  capabilities: string[]; context_window: number;
  input_cost_per_1m: number; output_cost_per_1m: number;
  created_at: string; updated_at: string;
}

interface TaskRoute {
  id: string; task_key: string; display_name: string; primary_slot: string;
  fallback_slots: string[]; required_capabilities: string[];
  output_format: string; max_tokens: number; temperature: number;
  enabled: boolean; risk_level: string; created_at: string; updated_at: string;
}

interface Overview {
  providers_enabled: number; providers_total: number;
  models_enabled: number; models_total: number;
  routes_enabled: number; routes_total: number;
  warnings: string[]; timestamp: string;
}

interface UsageEvent {
  id: string; provider_key?: string; model_slot?: string; task_key?: string;
  user_id?: string; prompt_tokens: number; completion_tokens: number;
  latency_ms: number; cost_estimate: number; fallback_used: boolean; created_at: string;
}

interface UsageSummary {
  total_cost: number; by_provider: Record<string, number>;
  by_task: Record<string, number>; by_model: Record<string, number>;
  events_count: number;
}

interface Budget {
  id: string; monthly_budget_cap: number; is_active: boolean;
  created_at: string; updated_at: string;
}

interface AuditEntry {
  id: string; admin_user_id: string; action: string; entity_type: string;
  entity_key: string; old_values?: any; new_values?: any;
  change_note?: string; created_at: string;
}

interface OrchestratorStatus {
  initialized: boolean; strategy: string; total_providers: number;
  healthy_providers: number; providers: Array<{
    name: string; status: string; capabilities: string[];
    circuit_breaker: boolean;
  }>;
}

interface TestResult {
  provider: string; model: string; response_text: string;
  latency_ms: number; prompt_tokens: number; completion_tokens: number;
  cost_estimate: number; fallback_used: boolean; warnings: string[];
}

// ---------------------------------------------------------------
// API helper
// ---------------------------------------------------------------

const API = "/api/v1/admin/ai-control";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || res.statusText);
  }
  return res.json();
}

// ---------------------------------------------------------------
// Status badge helper
// ---------------------------------------------------------------

function StatusBadge({ enabled }: { enabled: boolean }) {
  return enabled
    ? <Badge variant="default" className="bg-green-600">Enabled</Badge>
    : <Badge variant="secondary" className="text-muted-foreground">Disabled</Badge>;
}

function RiskBadge({ risk }: { risk: string }) {
  const colors: Record<string, string> = {
    low: "bg-blue-600", medium: "bg-amber-600", high: "bg-red-600",
  };
  return <Badge className={colors[risk] || "bg-gray-500"}>{risk}</Badge>;
}

function CapBadge({ cap }: { cap: string }) {
  return <Badge variant="outline" className="text-xs mr-1">{cap}</Badge>;
}

// ---------------------------------------------------------------
// Modal editor (reused for provider/model/route editing)
// ---------------------------------------------------------------

function EditModal({
  open, setOpen, title, onSave, children,
}: {
  open: boolean; setOpen: (o: boolean) => void; title: string;
  onSave: () => void; children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">{children}</div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={onSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------

function Section({ title, icon: Icon, action, children }: {
  title: string; icon: React.ElementType; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Icon className="h-5 w-5" /> {title}
        </CardTitle>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------
// Main component
// ---------------------------------------------------------------

export default function AIAdminControlCenter() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [models, setModels] = useState<ModelSlot[]>([]);
  const [routes, setRoutes] = useState<TaskRoute[]>([]);
  const [usage, setUsage] = useState<UsageEvent[]>([]);
  const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [orchStatus, setOrchStatus] = useState<OrchestratorStatus | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testPromptText, setTestPromptText] = useState("Hello! What can you help me with?");
  const [testTask, setTestTask] = useState("admin_test");
  const [testRunning, setTestRunning] = useState(false);
  const [testExpanded, setTestExpanded] = useState(false);

  // Modal state
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [editingModel, setEditingModel] = useState<ModelSlot | null>(null);
  const [editingRoute, setEditingRoute] = useState<TaskRoute | null>(null);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [changeNote, setChangeNote] = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, pr, mo, ro, us, bu, au, os] = await Promise.all([
        fetchJson<Overview>(`${API}/overview`),
        fetchJson<Provider[]>(`${API}/providers`),
        fetchJson<ModelSlot[]>(`${API}/models`),
        fetchJson<TaskRoute[]>(`${API}/routes`),
        fetchJson<UsageEvent[]>(`${API}/usage?limit=50`),
        fetchJson<Budget>(`${API}/budget`).catch(() => null),
        fetchJson<AuditEntry[]>(`${API}/audit?limit=20`).catch(() => []),
        fetchJson<OrchestratorStatus>(`${API}/orchestrator-status`).catch(() => null),
      ]);
      setOverview(ov); setProviders(pr); setModels(mo); setRoutes(ro);
      setUsage(us); setBudget(bu); setAudit(au); setOrchStatus(os);

      const usm = await fetchJson<UsageSummary>(`${API}/usage/summary`).catch(() => null);
      setUsageSummary(usm);
    } catch (e: any) {
      toast.error(`Failed to load: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Save helpers
  const saveProvider = async () => {
    if (!editingProvider) return;
    try {
      const body: any = { ...editingProvider, change_note: changeNote };
      await fetchJson(`${API}/providers/${editingProvider.provider_key}`, {
        method: "PUT", body: JSON.stringify(body),
      });
      toast.success("Provider updated"); setEditingProvider(null); fetchAll();
    } catch (e: any) { toast.error(e.message); }
  };

  const saveModel = async () => {
    if (!editingModel) return;
    try {
      const body: any = { ...editingModel, change_note: changeNote };
      await fetchJson(`${API}/models/${editingModel.slot_key}`, {
        method: "PUT", body: JSON.stringify(body),
      });
      toast.success("Model updated"); setEditingModel(null); fetchAll();
    } catch (e: any) { toast.error(e.message); }
  };

  const saveRoute = async () => {
    if (!editingRoute) return;
    try {
      const body: any = { ...editingRoute, change_note: changeNote };
      await fetchJson(`${API}/routes/${editingRoute.task_key}`, {
        method: "PUT", body: JSON.stringify(body),
      });
      toast.success("Route updated"); setEditingRoute(null); fetchAll();
    } catch (e: any) { toast.error(e.message); }
  };

  const saveBudgetAction = async () => {
    if (!editingBudget) return;
    try {
      const body = { monthly_budget_cap: editingBudget.monthly_budget_cap, is_active: editingBudget.is_active, change_note: changeNote };
      await fetchJson(`${API}/budget`, { method: "PUT", body: JSON.stringify(body) });
      toast.success("Budget updated"); setEditingBudget(null); fetchAll();
    } catch (e: any) { toast.error(e.message); }
  };

  const runTest = async () => {
    setTestRunning(true);
    setTestResult(null);
    try {
      const res = await fetchJson<TestResult>(`${API}/test-prompt`, {
        method: "POST", body: JSON.stringify({ task_key: testTask, prompt: testPromptText }),
      });
      setTestResult(res);
      setTestExpanded(true);
    } catch (e: any) { toast.error(e.message); }
    finally { setTestRunning(false); }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BrainCircuit className="h-7 w-7" /> AI Control Center
        </h1>
        <Button variant="outline" size="sm" onClick={fetchAll}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh All
        </Button>
      </div>

      {/* Overview stats */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold">{overview.providers_enabled}/{overview.providers_total}</div>
            <div className="text-sm text-muted-foreground">Providers</div>
          </CardContent></Card>
          <Card><CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold">{overview.models_enabled}/{overview.models_total}</div>
            <div className="text-sm text-muted-foreground">Models</div>
          </CardContent></Card>
          <Card><CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold">{overview.routes_enabled}/{overview.routes_total}</div>
            <div className="text-sm text-muted-foreground">Routes</div>
          </CardContent></Card>
          <Card><CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold">{orchStatus?.healthy_providers ?? 0}/{orchStatus?.total_providers ?? 0}</div>
            <div className="text-sm text-muted-foreground">Healthy Providers</div>
          </CardContent></Card>
        </div>
      )}

      {/* Warnings */}
      {overview && overview.warnings.length > 0 && (
        <Card className="border-amber-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 font-semibold text-amber-600 mb-2">
              <AlertTriangle className="h-5 w-5" /> Configuration Warnings
            </div>
            <ul className="list-disc pl-6 space-y-1 text-sm">{overview.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
          </CardContent>
        </Card>
      )}

      {/* Detail tabs */}
      <Tabs defaultValue="providers">
        <TabsList className="flex-wrap gap-1">
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="models">Model Slots</TabsTrigger>
          <TabsTrigger value="routes">Task Routes</TabsTrigger>
          <TabsTrigger value="test">Test Prompt</TabsTrigger>
          <TabsTrigger value="usage">Usage & Budget</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        {/* Providers */}
        <TabsContent value="providers" className="mt-4">
          <Section title="AI Providers" icon={Activity}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead><TableHead>Key</TableHead><TableHead>Family</TableHead>
                  <TableHead>Status</TableHead><TableHead>Secret Ref</TableHead><TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.display_name}</TableCell>
                    <TableCell><code className="text-xs bg-muted px-1 rounded">{p.provider_key}</code></TableCell>
                    <TableCell><Badge variant="outline">{p.family}</Badge></TableCell>
                    <TableCell><StatusBadge enabled={p.enabled} /></TableCell>
                    <TableCell><code className="text-xs">{p.secret_ref}</code></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => { setEditingProvider({ ...p }); setChangeNote(""); }}>
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Section>
        </TabsContent>

        {/* Model Slots */}
        <TabsContent value="models" className="mt-4">
          <Section title="Model Slots" icon={BrainCircuit}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Slot</TableHead><TableHead>Display</TableHead><TableHead>Provider</TableHead>
                  <TableHead>Model ID</TableHead><TableHead>Status</TableHead>
                  <TableHead>Capabilities</TableHead><TableHead>Cost/1M</TableHead><TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {models.map(m => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium"><code className="text-xs bg-muted px-1 rounded">{m.slot_key}</code></TableCell>
                    <TableCell>{m.display_name}</TableCell>
                    <TableCell><Badge variant="outline">{m.provider_key}</Badge></TableCell>
                    <TableCell className="text-xs">{m.model_id}</TableCell>
                    <TableCell><StatusBadge enabled={m.enabled} /></TableCell>
                    <TableCell><div className="flex flex-wrap gap-1">{m.capabilities.map(c => <CapBadge key={c} cap={c} />)}</div></TableCell>
                    <TableCell className="text-xs">${m.input_cost_per_1m} / ${m.output_cost_per_1m}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => { setEditingModel({ ...m }); setChangeNote(""); }}>
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Section>
        </TabsContent>

        {/* Task Routes */}
        <TabsContent value="routes" className="mt-4">
          <Section title="Task Routes" icon={Zap}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead><TableHead>Primary Slot</TableHead><TableHead>Fallbacks</TableHead>
                  <TableHead>Risk</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {routes.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.display_name}<br /><code className="text-xs text-muted-foreground">{r.task_key}</code></TableCell>
                    <TableCell><code className="text-xs">{r.primary_slot}</code></TableCell>
                    <TableCell className="text-xs">{r.fallback_slots.join(", ") || "—"}</TableCell>
                    <TableCell><RiskBadge risk={r.risk_level} /></TableCell>
                    <TableCell><StatusBadge enabled={r.enabled} /></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => { setEditingRoute({ ...r }); setChangeNote(""); }}>
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Section>
        </TabsContent>

        {/* Test Prompt */}
        <TabsContent value="test" className="mt-4 space-y-4">
          <Section title="Test Prompt" icon={Send}>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label>Task</Label>
                  <Select value={testTask} onValueChange={setTestTask}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {routes.filter(r => r.enabled).map(r => (
                        <SelectItem key={r.task_key} value={r.task_key}>{r.display_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label>Prompt</Label>
                  <Input value={testPromptText} onChange={e => setTestPromptText(e.target.value)} />
                </div>
              </div>
              <Button onClick={runTest} disabled={testRunning}>
                {testRunning ? <><RefreshCw className="h-4 w-4 mr-1 animate-spin" /> Running...</> : <><Send className="h-4 w-4 mr-1" /> Run Test</>}
              </Button>
            </div>
          </Section>

          {testResult && (
            <Card>
              <CardHeader className="cursor-pointer pb-2" onClick={() => setTestExpanded(!testExpanded)}>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {testResult.provider === "error" ? <XCircle className="h-5 w-5 text-red-500" /> : <CheckCircle2 className="h-5 w-5 text-green-500" />}
                    {testResult.provider} / {testResult.model}
                  </CardTitle>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{testResult.latency_ms}ms</span>
                    <span>{testResult.prompt_tokens}+{testResult.completion_tokens} tokens</span>
                    <span>${testResult.cost_estimate.toFixed(6)}</span>
                    {testExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>
                {testResult.warnings.length > 0 && (
                  <div className="flex items-center gap-1 text-amber-600 text-sm mt-1">
                    <AlertTriangle className="h-4 w-4" /> {testResult.warnings.join("; ")}
                  </div>
                )}
              </CardHeader>
              {testExpanded && (
                <CardContent>
                  <ScrollArea className="max-h-64">
                    <pre className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">{testResult.response_text}</pre>
                  </ScrollArea>
                </CardContent>
              )}
            </Card>
          )}
        </TabsContent>

        {/* Usage & Budget */}
        <TabsContent value="usage" className="mt-4 space-y-4">
          {budget && (
            <Section title="Budget" icon={DollarSign} action={
              <Button variant="outline" size="sm" onClick={() => { setEditingBudget({ ...budget }); setChangeNote(""); }}>
                Edit Budget
              </Button>
            }>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">${budget.monthly_budget_cap}</div>
                  <div className="text-xs text-muted-foreground">Monthly Cap</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{budget.is_active ? <Badge className="bg-green-600">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</div>
                  <div className="text-xs text-muted-foreground">Enforcement</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">${usageSummary?.total_cost.toFixed(2) ?? "0.00"}</div>
                  <div className="text-xs text-muted-foreground">Month Spend</div>
                </div>
              </div>
            </Section>
          )}

          {usageSummary && (
            <Section title="Usage Breakdown" icon={Activity}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-medium mb-2 text-sm">By Provider</h4>
                  <div className="space-y-1">
                    {Object.entries(usageSummary.by_provider).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-sm"><span>{k}</span><span className="font-mono">${v.toFixed(4)}</span></div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2 text-sm">By Task</h4>
                  <div className="space-y-1">
                    {Object.entries(usageSummary.by_task).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-sm"><span>{k}</span><span className="font-mono">${v.toFixed(4)}</span></div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2 text-sm">By Model</h4>
                  <div className="space-y-1">
                    {Object.entries(usageSummary.by_model).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-sm"><span>{k}</span><span className="font-mono">${v.toFixed(4)}</span></div>
                    ))}
                  </div>
                </div>
              </div>
            </Section>
          )}

          <Section title="Recent Events" icon={FileText}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead><TableHead>Task</TableHead><TableHead>Provider</TableHead>
                  <TableHead>Tokens</TableHead><TableHead>Latency</TableHead><TableHead>Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usage.slice(0, 20).map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="text-xs">{new Date(u.created_at).toLocaleTimeString()}</TableCell>
                    <TableCell className="text-xs">{u.task_key || "—"}</TableCell>
                    <TableCell className="text-xs">{u.provider_key || "—"}</TableCell>
                    <TableCell className="text-xs">{u.prompt_tokens}+{u.completion_tokens}</TableCell>
                    <TableCell className="text-xs">{u.latency_ms}ms</TableCell>
                    <TableCell className="text-xs font-mono">${u.cost_estimate.toFixed(6)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Section>
        </TabsContent>

        {/* Audit Log */}
        <TabsContent value="audit" className="mt-4">
          <Section title="Audit Log" icon={FileText}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead><TableHead>Action</TableHead><TableHead>Entity</TableHead><TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audit.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="text-xs">{new Date(a.created_at).toLocaleString()}</TableCell>
                    <TableCell><Badge variant="outline">{a.action}</Badge></TableCell>
                    <TableCell className="text-xs">{a.entity_type}/{a.entity_key}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{a.change_note || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Section>
        </TabsContent>
      </Tabs>

      {/* Edit Modals */}
      <EditModal open={!!editingProvider} setOpen={() => setEditingProvider(null)}
                 title={`Edit Provider: ${editingProvider?.provider_key}`} onSave={saveProvider}>
        {editingProvider && <>
          <div><Label>Display Name</Label><Input value={editingProvider.display_name} onChange={e => setEditingProvider({ ...editingProvider, display_name: e.target.value })} /></div>
          <div className="flex gap-4">
            <div className="flex-1"><Label>Family</Label><Select value={editingProvider.family} onValueChange={v => setEditingProvider({ ...editingProvider, family: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                <SelectItem value="anthropic">Anthropic</SelectItem><SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="deepseek">DeepSeek</SelectItem><SelectItem value="gemini">Gemini</SelectItem>
              </SelectContent></Select></div>
            <div className="flex items-end pb-1"><Label className="mr-2">Enabled</Label><Switch checked={editingProvider.enabled} onCheckedChange={v => setEditingProvider({ ...editingProvider, enabled: v })} /></div>
          </div>
          <div><Label>Secret Ref</Label><Input value={editingProvider.secret_ref} onChange={e => setEditingProvider({ ...editingProvider, secret_ref: e.target.value })} /></div>
          <div><Label>Base URL</Label><Input value={editingProvider.base_url || ""} onChange={e => setEditingProvider({ ...editingProvider, base_url: e.target.value || undefined })} /></div>
          <div><Label>Change Note</Label><Input value={changeNote} onChange={e => setChangeNote(e.target.value)} placeholder="Why this change?" /></div>
        </>}
      </EditModal>

      <EditModal open={!!editingModel} setOpen={() => setEditingModel(null)}
                 title={`Edit Model: ${editingModel?.slot_key}`} onSave={saveModel}>
        {editingModel && <>
          <div><Label>Display Name</Label><Input value={editingModel.display_name} onChange={e => setEditingModel({ ...editingModel, display_name: e.target.value })} /></div>
          <div className="flex gap-4">
            <div className="flex-1"><Label>Provider</Label><Select value={editingModel.provider_key} onValueChange={v => setEditingModel({ ...editingModel, provider_key: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{providers.map(p => <SelectItem key={p.provider_key} value={p.provider_key}>{p.display_name}</SelectItem>)}</SelectContent></Select></div>
            <div className="flex items-end pb-1"><Label className="mr-2">Enabled</Label><Switch checked={editingModel.enabled} onCheckedChange={v => setEditingModel({ ...editingModel, enabled: v })} /></div>
          </div>
          <div><Label>Model ID</Label><Input value={editingModel.model_id} onChange={e => setEditingModel({ ...editingModel, model_id: e.target.value })} /></div>
          <div><Label>Secret Ref</Label><Input value={editingModel.secret_ref} onChange={e => setEditingModel({ ...editingModel, secret_ref: e.target.value })} /></div>
          <div className="flex gap-4">
            <div className="flex-1"><Label>Input $/1M</Label><Input type="number" step="0.01" value={editingModel.input_cost_per_1m} onChange={e => setEditingModel({ ...editingModel, input_cost_per_1m: parseFloat(e.target.value) || 0 })} /></div>
            <div className="flex-1"><Label>Output $/1M</Label><Input type="number" step="0.01" value={editingModel.output_cost_per_1m} onChange={e => setEditingModel({ ...editingModel, output_cost_per_1m: parseFloat(e.target.value) || 0 })} /></div>
          </div>
          <div><Label>Context Window</Label><Input type="number" value={editingModel.context_window} onChange={e => setEditingModel({ ...editingModel, context_window: parseInt(e.target.value) || 0 })} /></div>
          <div><Label>Capabilities (comma separated)</Label><Input value={editingModel.capabilities.join(", ")} onChange={e => setEditingModel({ ...editingModel, capabilities: e.target.value.split(",").map(c => c.trim()).filter(Boolean) })} /></div>
          <div><Label>Change Note</Label><Input value={changeNote} onChange={e => setChangeNote(e.target.value)} placeholder="Why this change?" /></div>
        </>}
      </EditModal>

      <EditModal open={!!editingRoute} setOpen={() => setEditingRoute(null)}
                 title={`Edit Route: ${editingRoute?.task_key}`} onSave={saveRoute}>
        {editingRoute && <>
          <div><Label>Display Name</Label><Input value={editingRoute.display_name} onChange={e => setEditingRoute({ ...editingRoute, display_name: e.target.value })} /></div>
          <div className="flex gap-4">
            <div className="flex-1"><Label>Primary Slot</Label><Select value={editingRoute.primary_slot} onValueChange={v => setEditingRoute({ ...editingRoute, primary_slot: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{models.map(m => <SelectItem key={m.slot_key} value={m.slot_key}>{m.slot_key}</SelectItem>)}</SelectContent></Select></div>
            <div className="flex items-end pb-1"><Label className="mr-2">Enabled</Label><Switch checked={editingRoute.enabled} onCheckedChange={v => setEditingRoute({ ...editingRoute, enabled: v })} /></div>
          </div>
          <div className="flex gap-4">
            <div className="flex-1"><Label>Max Tokens</Label><Input type="number" value={editingRoute.max_tokens} onChange={e => setEditingRoute({ ...editingRoute, max_tokens: parseInt(e.target.value) || 0 })} /></div>
            <div className="flex-1"><Label>Temperature</Label><Input type="number" step="0.1" value={editingRoute.temperature} onChange={e => setEditingRoute({ ...editingRoute, temperature: parseFloat(e.target.value) || 0 })} /></div>
          </div>
          <div className="flex gap-4">
            <div className="flex-1"><Label>Risk Level</Label><Select value={editingRoute.risk_level} onValueChange={v => setEditingRoute({ ...editingRoute, risk_level: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                <SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem>
              </SelectContent></Select></div>
            <div className="flex-1"><Label>Output Format</Label><Select value={editingRoute.output_format} onValueChange={v => setEditingRoute({ ...editingRoute, output_format: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="text">Text</SelectItem><SelectItem value="json">JSON</SelectItem></SelectContent></Select></div>
          </div>
          <div><Label>Fallback Slots (comma separated)</Label><Input value={editingRoute.fallback_slots.join(", ")} onChange={e => setEditingRoute({ ...editingRoute, fallback_slots: e.target.value.split(",").map(c => c.trim()).filter(Boolean) })} /></div>
          <div><Label>Required Capabilities (comma separated)</Label><Input value={editingRoute.required_capabilities.join(", ")} onChange={e => setEditingRoute({ ...editingRoute, required_capabilities: e.target.value.split(",").map(c => c.trim()).filter(Boolean) })} /></div>
          <div><Label>Change Note</Label><Input value={changeNote} onChange={e => setChangeNote(e.target.value)} placeholder="Why this change?" /></div>
        </>}
      </EditModal>

      <EditModal open={!!editingBudget} setOpen={() => setEditingBudget(null)}
                 title="Edit Budget" onSave={saveBudgetAction}>
        {editingBudget && <>
          <div className="flex items-center gap-4"><Label>Active</Label><Switch checked={editingBudget.is_active} onCheckedChange={v => setEditingBudget({ ...editingBudget, is_active: v })} /></div>
          <div><Label>Monthly Cap ($)</Label><Input type="number" step="1" value={editingBudget.monthly_budget_cap} onChange={e => setEditingBudget({ ...editingBudget, monthly_budget_cap: parseFloat(e.target.value) || 0 })} /></div>
          <div><Label>Change Note</Label><Input value={changeNote} onChange={e => setChangeNote(e.target.value)} placeholder="Why this change?" /></div>
        </>}
      </EditModal>
    </div>
  );
}
