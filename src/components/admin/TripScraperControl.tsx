import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import {
  Globe,
  Play,
  Pause,
  RefreshCw,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Search,
  Settings,
  Database,
  Plus,
  Edit,
  Trash2,
  Eye,
  Brain
} from 'lucide-react';

interface TripScraperControlProps {
  onTemplatesScraped?: () => void;
}

const TripScraperControl: React.FC<TripScraperControlProps> = ({ onTemplatesScraped }) => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [aiConfig, setAiConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  // New source form
  const [newSource, setNewSource] = useState({
    name: '',
    url: '',
    source_type: 'scraper',
    selectors: {},
    rate_limit: 60
  });

  // AI Configuration
  const [aiSettings, setAiSettings] = useState({
    temperature: 0.7,
    max_tokens: 2000,
    is_active: true
  });

  useEffect(() => {
    loadData();
    const interval = setInterval(loadJobs, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    await Promise.all([
      loadJobs(),
      loadSources(),
      loadResults(),
      loadAiConfig()
    ]);
    setLoading(false);
  };

  const loadJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('trip_scraper_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Error loading jobs:', error);
    }
  };

  const loadSources = async () => {
    try {
      const { data, error } = await supabase
        .from('trip_scraper_sources')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSources(data || []);
    } catch (error) {
      console.error('Error loading sources:', error);
    }
  };

  const loadResults = async () => {
    try {
      const { data, error } = await supabase
        .from('trip_scraper_results')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setResults(data || []);
    } catch (error) {
      console.error('Error loading results:', error);
    }
  };

  const loadAiConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('scraper_ai_config')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setAiConfig(data);
        setAiSettings({
          temperature: data.temperature || 0.7,
          max_tokens: data.max_tokens || 2000,
          is_active: data.is_active
        });
      }
    } catch (error) {
      console.error('Error loading AI config:', error);
    }
  };

  const startScraping = async () => {
    try {
      setIsProcessing(true);
      const activeSources = sources.filter(s => s.is_active);
      
      if (activeSources.length === 0) {
        toast({
          title: 'No Active Sources',
          description: 'Please enable at least one source before scraping',
          variant: 'destructive'
        });
        return;
      }

      const session = await supabase.auth.getSession();
      const response = await fetch('/api/v1/scraper/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.data.session?.access_token}`
        },
        body: JSON.stringify({
          source_ids: activeSources.map(s => s.id),
          ai_enhancement: aiSettings.is_active
        })
      });

      if (!response.ok) throw new Error('Failed to start scraping');

      const result = await response.json();
      toast({
        title: 'Scraping Started',
        description: `Started scraping from ${activeSources.length} source(s)`,
      });

      // Reload jobs to show new ones
      await loadJobs();
    } catch (error) {
      console.error('Error starting scraping:', error);
      toast({
        title: 'Error',
        description: 'Failed to start scraping',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const addSource = async () => {
    try {
      const { error } = await supabase
        .from('trip_scraper_sources')
        .insert([newSource]);

      if (error) throw error;

      toast({
        title: 'Source Added',
        description: `${newSource.name} has been added successfully`,
      });

      setNewSource({
        name: '',
        url: '',
        source_type: 'scraper',
        selectors: {},
        rate_limit: 60
      });

      await loadSources();
    } catch (error) {
      console.error('Error adding source:', error);
      toast({
        title: 'Error',
        description: 'Failed to add source',
        variant: 'destructive'
      });
    }
  };

  const toggleSource = async (sourceId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('trip_scraper_sources')
        .update({ is_active: isActive })
        .eq('id', sourceId);

      if (error) throw error;
      await loadSources();
    } catch (error) {
      console.error('Error updating source:', error);
    }
  };

  const deleteSource = async (sourceId: string) => {
    try {
      const { error } = await supabase
        .from('trip_scraper_sources')
        .delete()
        .eq('id', sourceId);

      if (error) throw error;
      
      toast({
        title: 'Source Deleted',
        description: 'The source has been removed',
      });
      
      await loadSources();
    } catch (error) {
      console.error('Error deleting source:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete source',
        variant: 'destructive'
      });
    }
  };

  const updateAiConfig = async () => {
    try {
      const { error } = await supabase
        .from('scraper_ai_config')
        .update({
          temperature: aiSettings.temperature,
          max_tokens: aiSettings.max_tokens,
          is_active: aiSettings.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', aiConfig?.id);

      if (error) throw error;

      toast({
        title: 'AI Config Updated',
        description: 'AI enhancement settings have been saved',
      });
    } catch (error) {
      console.error('Error updating AI config:', error);
      toast({
        title: 'Error',
        description: 'Failed to update AI configuration',
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100' },
      running: { icon: RefreshCw, color: 'text-blue-600', bg: 'bg-blue-100' },
      completed: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
      failed: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' }
    };

    const { icon: Icon, color, bg } = config[status as keyof typeof config] || config.pending;
    return (
      <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${bg} ${color} text-sm`}>
        <Icon className={`h-3 w-3 ${status === 'running' ? 'animate-spin' : ''}`} />
        <span className="capitalize">{status}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="jobs" className="space-y-4">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="jobs">Jobs</TabsTrigger>
        <TabsTrigger value="sources">Sources</TabsTrigger>
        <TabsTrigger value="results">Results</TabsTrigger>
        <TabsTrigger value="ai">AI Config</TabsTrigger>
        <TabsTrigger value="add">Add Source</TabsTrigger>
      </TabsList>

      {/* Jobs Tab */}
      <TabsContent value="jobs" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Scraping Jobs
              </span>
              <Button onClick={startScraping} disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start Scraping
                  </>
                )}
              </Button>
            </CardTitle>
            <CardDescription>
              Monitor and manage scraping operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {jobs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Database className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No scraping jobs yet</p>
                <p className="text-sm">Click "Start Scraping" to begin</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Templates</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>{getStatusBadge(job.status)}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {job.source_url ? new URL(job.source_url).hostname : 'Multiple'}
                      </TableCell>
                      <TableCell>{job.region || 'Global'}</TableCell>
                      <TableCell>
                        {job.templates_created > 0 ? (
                          <Badge>{job.templates_created}</Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {job.started_at 
                          ? new Date(job.started_at).toLocaleTimeString()
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {job.started_at && job.completed_at ? (
                          `${Math.round((new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 1000)}s`
                        ) : job.status === 'running' ? (
                          <span className="text-blue-600">Running...</span>
                        ) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Sources Tab */}
      <TabsContent value="sources" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Scraping Sources</CardTitle>
            <CardDescription>
              Manage websites and APIs to scrape content from
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sources.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Database className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No sources configured</p>
                <p className="text-sm">Add a source to start scraping</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Rate Limit</TableHead>
                    <TableHead>Last Scraped</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sources.map((source) => (
                    <TableRow key={source.id}>
                      <TableCell className="font-medium">{source.name}</TableCell>
                      <TableCell className="max-w-xs truncate" title={source.url}>
                        {source.url}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{source.source_type}</Badge>
                      </TableCell>
                      <TableCell>{source.rate_limit}/hr</TableCell>
                      <TableCell>
                        {source.last_scraped_at 
                          ? new Date(source.last_scraped_at).toLocaleDateString()
                          : 'Never'}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={source.is_active}
                          onCheckedChange={(checked) => toggleSource(source.id, checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteSource(source.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Results Tab */}
      <TabsContent value="results" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Scraped Results</CardTitle>
            <CardDescription>
              Review and import scraped trip templates
            </CardDescription>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Search className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No results yet</p>
                <p className="text-sm">Run a scraping job to see results</p>
              </div>
            ) : (
              <div className="space-y-4">
                {results.slice(0, 10).map((result) => (
                  <div key={result.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold">
                          {result.template_data?.name || 'Untitled'}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {result.template_data?.description || 'No description'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={result.ai_enhanced ? 'default' : 'secondary'}>
                          {result.ai_enhanced ? (
                            <>
                              <Brain className="h-3 w-3 mr-1" />
                              AI Enhanced
                            </>
                          ) : 'Raw'}
                        </Badge>
                        <Badge variant="outline">
                          Score: {(result.quality_score * 100).toFixed(0)}%
                        </Badge>
                      </div>
                    </div>
                    {result.images_found && result.images_found.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {result.images_found.slice(0, 3).map((img, idx) => (
                          <img 
                            key={idx}
                            src={img} 
                            alt=""
                            className="h-20 w-20 object-cover rounded"
                            onError={(e) => e.currentTarget.style.display = 'none'}
                          />
                        ))}
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-sm text-gray-500">
                        {new Date(result.created_at).toLocaleString()}
                      </span>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-1" />
                          Preview
                        </Button>
                        {result.import_status === 'pending' && (
                          <Button size="sm">
                            <Download className="h-4 w-4 mr-1" />
                            Import
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* AI Config Tab */}
      <TabsContent value="ai" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Enhancement Configuration
            </CardTitle>
            <CardDescription>
              Configure AI-powered content enhancement settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>AI Enhancement</Label>
                <p className="text-sm text-gray-600">
                  Use AI to improve scraped content quality
                </p>
              </div>
              <Switch
                checked={aiSettings.is_active}
                onCheckedChange={(checked) => 
                  setAiSettings({ ...aiSettings, is_active: checked })
                }
              />
            </div>

            {aiConfig && (
              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <p className="text-sm font-medium">Current Configuration:</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Model: <span className="font-mono">{aiConfig.model_name}</span></div>
                  <div>Provider: <span className="font-mono">{aiConfig.provider}</span></div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="temperature">
                  Temperature: {aiSettings.temperature}
                </Label>
                <input
                  type="range"
                  id="temperature"
                  min="0"
                  max="2"
                  step="0.1"
                  value={aiSettings.temperature}
                  onChange={(e) => 
                    setAiSettings({ ...aiSettings, temperature: parseFloat(e.target.value) })
                  }
                  className="w-full"
                />
                <p className="text-xs text-gray-600">
                  Controls creativity (0 = focused, 2 = creative)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_tokens">Max Tokens</Label>
                <Input
                  id="max_tokens"
                  type="number"
                  min="100"
                  max="4000"
                  value={aiSettings.max_tokens}
                  onChange={(e) => 
                    setAiSettings({ ...aiSettings, max_tokens: parseInt(e.target.value) })
                  }
                />
                <p className="text-xs text-gray-600">
                  Maximum tokens for AI responses
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={updateAiConfig}>
                <Settings className="h-4 w-4 mr-2" />
                Save Configuration
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Add Source Tab */}
      <TabsContent value="add" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add New Source
            </CardTitle>
            <CardDescription>
              Configure a new website or API to scrape content from
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="source-name">Source Name</Label>
              <Input
                id="source-name"
                placeholder="e.g., Tourism Australia"
                value={newSource.name}
                onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="source-url">Source URL</Label>
              <Input
                id="source-url"
                placeholder="https://example.com/trips"
                value={newSource.url}
                onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="source-type">Source Type</Label>
                <Select
                  value={newSource.source_type}
                  onValueChange={(value) => setNewSource({ ...newSource, source_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scraper">Web Scraper</SelectItem>
                    <SelectItem value="api">API</SelectItem>
                    <SelectItem value="rss">RSS Feed</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rate-limit">Rate Limit (per hour)</Label>
                <Input
                  id="rate-limit"
                  type="number"
                  min="1"
                  max="1000"
                  value={newSource.rate_limit}
                  onChange={(e) => setNewSource({ ...newSource, rate_limit: parseInt(e.target.value) })}
                />
              </div>
            </div>

            {newSource.source_type === 'scraper' && (
              <div className="space-y-2">
                <Label>CSS Selectors (Optional)</Label>
                <Textarea
                  placeholder='{"title": "h1.trip-title", "description": ".trip-summary", "content": "article.content"}'
                  rows={4}
                  value={JSON.stringify(newSource.selectors, null, 2)}
                  onChange={(e) => {
                    try {
                      const selectors = JSON.parse(e.target.value);
                      setNewSource({ ...newSource, selectors });
                    } catch {}
                  }}
                />
                <p className="text-xs text-gray-600">
                  Define CSS selectors to extract specific content
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setNewSource({
                  name: '',
                  url: '',
                  source_type: 'scraper',
                  selectors: {},
                  rate_limit: 60
                })}
              >
                Clear
              </Button>
              <Button
                onClick={addSource}
                disabled={!newSource.name || !newSource.url}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Source
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default TripScraperControl;