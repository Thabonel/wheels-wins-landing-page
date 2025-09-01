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
  Database
} from 'lucide-react';

interface ScraperJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  source_url: string;
  region: string;
  parameters: any;
  results: any;
  templates_created: number;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

interface TripScraperControlProps {
  onTemplatesScraped?: () => void;
}

const TripScraperControl: React.FC<TripScraperControlProps> = ({ onTemplatesScraped }) => {
  const [jobs, setJobs] = useState<ScraperJob[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [aiConfig, setAiConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [activeTab, setActiveTab] = useState('jobs');
  const { toast } = useToast();

  // Scraper configuration form
  const [scraperConfig, setScraperConfig] = useState({
    source_url: '',
    region: 'Australia',
    search_keywords: '',
    max_pages: 5,
    auto_import: true,
    find_images: true,
    ai_enhancement: true
  });

  // Predefined scraping sources
  const scrapingSources = [
    { name: 'Tourism Australia', url: 'https://www.australia.com/en/trips-and-itineraries.html' },
    { name: 'Lonely Planet Australia', url: 'https://www.lonelyplanet.com/australia/narratives/practical-information/directory/itineraries' },
    { name: 'Visit USA', url: 'https://www.visittheusa.com/trip/great-american-road-trips' },
    { name: 'RV Life', url: 'https://rvlife.com/rv-trip-planning/' },
    { name: 'Roadtrippers', url: 'https://roadtrippers.com/magazine/category/road-trips/' }
  ];

  useEffect(() => {
    fetchScraperJobs();
    loadSources();
    loadResults();
    loadAiConfig();
    // Poll for job updates every 5 seconds
    const interval = setInterval(fetchScraperJobs, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchScraperJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('trip_scraper_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Error fetching scraper jobs:', error);
    } finally {
      setLoading(false);
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
      setAiConfig(data);
    } catch (error) {
      console.error('Error loading AI config:', error);
    }
  };

  const startScrapingJob = async () => {
    if (!scraperConfig.source_url) {
      toast({
        title: 'Error',
        description: 'Please provide a source URL',
        variant: 'destructive'
      });
      return;
    }

    setIsCreatingJob(true);
    try {
      // Create a new scraper job
      const { data: job, error } = await supabase
        .from('trip_scraper_jobs')
        .insert({
          source_url: scraperConfig.source_url,
          region: scraperConfig.region,
          parameters: {
            search_keywords: scraperConfig.search_keywords,
            max_pages: scraperConfig.max_pages,
            auto_import: scraperConfig.auto_import,
            find_images: scraperConfig.find_images
          },
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Scraping Job Started',
        description: 'The scraper will begin processing your request shortly'
      });

      // In a real implementation, this would trigger a backend worker
      // For now, we'll simulate the scraping process
      startScrapingProcess(job.id);

      fetchScraperJobs();
    } catch (error) {
      console.error('Error starting scraper job:', error);
      toast({
        title: 'Error',
        description: 'Failed to start scraping job',
        variant: 'destructive'
      });
    } finally {
      setIsCreatingJob(false);
    }
  };

  const startScrapingProcess = async (jobId: string) => {
    try {
      // Get active sources
      const { data: sources } = await supabase
        .from('trip_scraper_sources')
        .select('id')
        .eq('is_active', true);

      if (!sources || sources.length === 0) {
        toast({
          title: 'No Active Sources',
          description: 'Please enable at least one scraping source',
          variant: 'destructive'
        });
        return;
      }

      // Call the backend API to start scraping
      const session = await supabase.auth.getSession();
      const response = await fetch('/api/v1/scraper/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.data.session?.access_token}`
        },
        body: JSON.stringify({
          source_ids: sources.map(s => s.id),
          ai_enhancement: scraperConfig.ai_enhancement
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start scraping job');
      }

      const result = await response.json();
      
      toast({
        title: 'Scraping Started',
        description: `Job ${result.job_id} has been started`,
      });

      // Start polling for job status
      pollJobStatus(jobId);
    } catch (error) {
      console.error('Error starting scraping:', error);
      toast({
        title: 'Error',
        description: 'Failed to start scraping process',
        variant: 'destructive'
      });
    }
  };

  const pollJobStatus = async (jobId: string) => {
    const checkStatus = async () => {
      try {
        const session = await supabase.auth.getSession();
        const response = await fetch(`/api/v1/scraper/jobs/${jobId}`, {
          headers: {
            'Authorization': `Bearer ${session.data.session?.access_token}`
          }
        });

        if (!response.ok) return;

        const status = await response.json();
        
        // Update local job status
        const { data: job } = await supabase
          .from('trip_scraper_jobs')
          .select('*')
          .eq('id', jobId)
          .single();

        if (job) {
          setJobs(current => 
            current.map(j => j.id === jobId ? job : j)
          );
        }

        // Continue polling if still running
        if (status.status === 'running' || status.status === 'pending') {
          setTimeout(checkStatus, 2000);
        } else if (status.status === 'completed') {
          toast({
            title: 'Scraping Complete',
            description: `Successfully scraped ${status.results_count} templates`,
          });
          fetchScraperJobs();
          if (scraperConfig.auto_import && onTemplatesScraped) {
            onTemplatesScraped();
          }
        } else if (status.status === 'failed') {
          toast({
            title: 'Scraping Failed',
            description: status.error_message || 'An error occurred during scraping',
            variant: 'destructive'
          });
        }
      } catch (error) {
        console.error('Error polling job status:', error);
      }
    };

    checkStatus();
  };

  const retryJob = async (job: ScraperJob) => {
    try {
      // Create a new job with the same parameters
      const { error } = await supabase
        .from('trip_scraper_jobs')
        .insert({
          source_url: job.source_url,
          region: job.region,
          parameters: job.parameters,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: 'Job Restarted',
        description: 'The scraping job has been queued for retry'
      });

      fetchScraperJobs();
    } catch (error) {
      console.error('Error retrying job:', error);
      toast({
        title: 'Error',
        description: 'Failed to retry scraping job',
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

    const { icon: Icon, color, bg } = config[status as keyof typeof config];
    return (
      <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${bg} ${color} text-sm`}>
        <Icon className={`h-3 w-3 ${status === 'running' ? 'animate-spin' : ''}`} />
        <span className="capitalize">{status}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Scraper Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Trip Discovery Scraper
          </CardTitle>
          <CardDescription>
            Automatically discover and import trip templates from various sources
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="source">Source URL</Label>
              <div className="flex gap-2">
                <Input
                  id="source"
                  placeholder="https://example.com/trips"
                  value={scraperConfig.source_url}
                  onChange={(e) => setScraperConfig({ ...scraperConfig, source_url: e.target.value })}
                />
                <Select 
                  onValueChange={(value) => setScraperConfig({ ...scraperConfig, source_url: value })}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Quick select" />
                  </SelectTrigger>
                  <SelectContent>
                    {scrapingSources.map(source => (
                      <SelectItem key={source.url} value={source.url}>
                        {source.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="region">Target Region</Label>
              <Select 
                value={scraperConfig.region} 
                onValueChange={(value) => setScraperConfig({ ...scraperConfig, region: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Australia">Australia</SelectItem>
                  <SelectItem value="USA">USA</SelectItem>
                  <SelectItem value="Europe">Europe</SelectItem>
                  <SelectItem value="Asia">Asia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="keywords">Search Keywords (optional)</Label>
            <Input
              id="keywords"
              placeholder="scenic routes, coastal drives, national parks"
              value={scraperConfig.search_keywords}
              onChange={(e) => setScraperConfig({ ...scraperConfig, search_keywords: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_pages">Max Pages to Scrape</Label>
              <Input
                id="max_pages"
                type="number"
                min="1"
                max="50"
                value={scraperConfig.max_pages}
                onChange={(e) => setScraperConfig({ ...scraperConfig, max_pages: parseInt(e.target.value) })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="auto_import"
                checked={scraperConfig.auto_import}
                onChange={(e) => setScraperConfig({ ...scraperConfig, auto_import: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="auto_import">Auto-import templates</Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="find_images"
                checked={scraperConfig.find_images}
                onChange={(e) => setScraperConfig({ ...scraperConfig, find_images: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="find_images">Find representative images</Label>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4">
            <div className="text-sm text-gray-600">
              <AlertCircle className="h-4 w-4 inline mr-1" />
              Scraping will respect robots.txt and rate limits
            </div>
            <Button 
              onClick={startScrapingJob}
              disabled={isCreatingJob || !scraperConfig.source_url}
            >
              {isCreatingJob ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start Scraping
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Scraper Jobs History */}
      <Card>
        <CardHeader>
          <CardTitle>Scraping History</CardTitle>
          <CardDescription>
            Recent scraping jobs and their results
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600" />
              <p className="mt-2 text-gray-600">Loading scraper jobs...</p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Database className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No scraping jobs yet</p>
              <p className="text-sm">Start a scraping job to discover new trip templates</p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Templates</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>{getStatusBadge(job.status)}</TableCell>
                      <TableCell className="max-w-xs truncate" title={job.source_url}>
                        {new URL(job.source_url).hostname}
                      </TableCell>
                      <TableCell>{job.region}</TableCell>
                      <TableCell>
                        {job.templates_created > 0 ? (
                          <Badge variant="default">{job.templates_created} imported</Badge>
                        ) : job.status === 'completed' ? (
                          <span className="text-gray-500">None imported</span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {job.started_at 
                          ? new Date(job.started_at).toLocaleString()
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        {job.started_at && job.completed_at ? (
                          `${Math.round((new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 1000)}s`
                        ) : job.status === 'running' ? (
                          <span className="text-blue-600">Running...</span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {job.status === 'failed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => retryJob(job)}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          )}
                          {job.status === 'completed' && job.results && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                console.log('Job results:', job.results);
                                toast({
                                  title: 'Job Results',
                                  description: `Found ${job.results.templates_found || 0} templates`
                                });
                              }}
                            >
                              <Search className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TripScraperControl;