import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Key, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  ExternalLink,
  AlertTriangle
} from 'lucide-react';

interface ObservabilityConfig {
  enabled: boolean;
  environment: string;
  langfuse_host: string;
  platforms: {
    gemini: {
      configured: boolean;
      key_preview?: string;
    };
    anthropic: {
      configured: boolean;
      key_preview?: string;
    };
    langfuse: {
      configured: boolean;
      host: string;
      public_key_preview?: string;
    };
  };
}

export default function APIKeyManagement() {
  const [config, setConfig] = useState<ObservabilityConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<string | null>(null);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  // Test results
  const [testResults, setTestResults] = useState<Record<string, { connected: boolean; message: string }>>({});

  const fetchConfiguration = async () => {
    try {
      const response = await fetch('/api/v1/observability/configuration', {
        headers: { 'Admin-Token': 'admin-token-123' }
      });

      if (response.ok) {
        const result = await response.json();
        setConfig(result.data);
      } else {
        toast.error('Failed to load configuration');
      }
    } catch (error) {
      console.error('Failed to fetch configuration:', error);
      toast.error('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const testPlatformConnection = async (platform: string) => {
    try {
      setTesting(platform);
      
      const response = await fetch(`/api/v1/observability/test-connection/${platform}`, {
        method: 'POST',
        headers: { 'Admin-Token': 'admin-token-123' }
      });

      if (response.ok) {
        const result = await response.json();
        setTestResults(prev => ({
          ...prev,
          [platform]: result.data
        }));
        
        if (result.data.connected) {
          toast.success(`${platform} connection successful`);
        } else {
          toast.error(`${platform} connection failed: ${result.data.message}`);
        }
      } else {
        const error = await response.json();
        toast.error(`Failed to test ${platform}: ${error.detail}`);
      }
    } catch (error) {
      console.error(`Failed to test ${platform}:`, error);
      toast.error(`Failed to test ${platform} connection`);
    } finally {
      setTesting(null);
    }
  };

  const toggleKeyVisibility = (platform: string) => {
    setShowKeys(prev => ({
      ...prev,
      [platform]: !prev[platform]
    }));
  };

  useEffect(() => {
    fetchConfiguration();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading configuration...</span>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Failed to load configuration</p>
        <Button onClick={fetchConfiguration} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  const getStatusIcon = (configured: boolean, tested?: boolean) => {
    if (tested !== undefined) {
      return tested ? (
        <CheckCircle className="h-4 w-4 text-green-500" />
      ) : (
        <XCircle className="h-4 w-4 text-red-500" />
      );
    }
    return configured ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold">API Key Management</h3>
          <p className="text-gray-600">Configure and test observability platform connections</p>
        </div>
        <Badge variant={config.enabled ? "default" : "destructive"}>
          {config.enabled ? "Enabled" : "Disabled"}
        </Badge>
      </div>

      {/* Configuration Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Key className="h-5 w-5 mr-2" />
            Platform Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Google Gemini Flash (Primary) */}
            <div className="p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(config.platforms.gemini?.configured, testResults.gemini?.connected)}
                  <span className="font-medium text-blue-700">Google Gemini Flash</span>
                  <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-300">PRIMARY</Badge>
                </div>
                <a
                  href="https://makersuite.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-700"
                  title="Get Gemini API Key"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>

              <div className="space-y-2">
                <Badge variant={config.platforms.gemini?.configured ? "default" : "outline"}>
                  {config.platforms.gemini?.configured ? "Configured" : "Not Configured"}
                </Badge>

                {config.platforms.gemini?.key_preview && (
                  <div className="text-sm">
                    <Label>API Key:</Label>
                    <div className="flex items-center space-x-2">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {showKeys.gemini ? config.platforms.gemini.key_preview : "AIza••••••••"}
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleKeyVisibility('gemini')}
                      >
                        {showKeys.gemini ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => testPlatformConnection('gemini')}
                  disabled={!config.platforms.gemini?.configured || testing === 'gemini'}
                  className="w-full"
                >
                  {testing === 'gemini' ? (
                    <RefreshCw className="h-3 w-3 animate-spin mr-2" />
                  ) : null}
                  Test Connection
                </Button>

                {testResults.gemini && (
                  <p className={`text-xs ${testResults.gemini.connected ? 'text-green-600' : 'text-red-600'}`}>
                    {testResults.gemini.message}
                  </p>
                )}

                <p className="text-xs text-blue-600 mt-2">
                  💰 25x cheaper • ⚡ 5x faster • 🧠 1M context
                </p>
              </div>
            </div>

            {/* Anthropic Claude (Fallback) */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(config.platforms.anthropic.configured, testResults.anthropic?.connected)}
                  <span className="font-medium">Anthropic Claude</span>
                  <Badge variant="outline" className="text-xs">FALLBACK</Badge>
                </div>
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-700"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
              
              <div className="space-y-2">
                <Badge variant={config.platforms.anthropic.configured ? "default" : "outline"}>
                  {config.platforms.anthropic.configured ? "Configured" : "Not Configured"}
                </Badge>

                {config.platforms.anthropic.key_preview && (
                  <div className="text-sm">
                    <Label>API Key:</Label>
                    <div className="flex items-center space-x-2">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {showKeys.anthropic ? config.platforms.anthropic.key_preview : "sk-ant-••••••••"}
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleKeyVisibility('anthropic')}
                      >
                        {showKeys.anthropic ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => testPlatformConnection('anthropic')}
                  disabled={!config.platforms.anthropic.configured || testing === 'anthropic'}
                  className="w-full"
                >
                  {testing === 'anthropic' ? (
                    <RefreshCw className="h-3 w-3 animate-spin mr-2" />
                  ) : null}
                  Test Connection
                </Button>

                {testResults.anthropic && (
                  <p className={`text-xs ${testResults.anthropic.connected ? 'text-green-600' : 'text-red-600'}`}>
                    {testResults.anthropic.message}
                  </p>
                )}
              </div>
            </div>

            {/* Langfuse */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(config.platforms.langfuse.configured, testResults.langfuse?.connected)}
                  <span className="font-medium">Langfuse</span>
                </div>
                <a
                  href={config.platforms.langfuse.host}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-700"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
              
              <div className="space-y-2">
                <Badge variant={config.platforms.langfuse.configured ? "default" : "outline"}>
                  {config.platforms.langfuse.configured ? "Configured" : "Not Configured"}
                </Badge>
                
                {config.platforms.langfuse.public_key_preview && (
                  <div className="text-sm">
                    <Label>Public Key:</Label>
                    <div className="flex items-center space-x-2">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {showKeys.langfuse ? config.platforms.langfuse.public_key_preview : "pk-lf-••••••••"}
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleKeyVisibility('langfuse')}
                      >
                        {showKeys.langfuse ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                )}
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => testPlatformConnection('langfuse')}
                  disabled={!config.platforms.langfuse.configured || testing === 'langfuse'}
                  className="w-full"
                >
                  {testing === 'langfuse' ? (
                    <RefreshCw className="h-3 w-3 animate-spin mr-2" />
                  ) : null}
                  Test Connection
                </Button>
                
                {testResults.langfuse && (
                  <p className={`text-xs ${testResults.langfuse.connected ? 'text-green-600' : 'text-red-600'}`}>
                    {testResults.langfuse.message}
                  </p>
                )}
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-yellow-500" />
            Setup Instructions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="env" className="space-y-4">
            <TabsList>
              <TabsTrigger value="env">Environment Variables</TabsTrigger>
              <TabsTrigger value="platforms">Platform Setup</TabsTrigger>
            </TabsList>

            <TabsContent value="env" className="space-y-4">
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Configure these environment variables in your deployment platform (Render, etc.):
                </p>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <code className="text-sm">
                    <div>ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here</div>
                    <div>LANGFUSE_SECRET_KEY=sk-lf-your-secret-key-here</div>
                    <div>LANGFUSE_PUBLIC_KEY=pk-lf-your-public-key-here</div>
                    <div>LANGFUSE_HOST=https://cloud.langfuse.com</div>
                    <div>OBSERVABILITY_ENABLED=true</div>
                  </code>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="platforms" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Anthropic Claude Setup</h4>
                  <ol className="text-sm text-gray-600 space-y-1">
                    <li>1. Visit console.anthropic.com</li>
                    <li>2. Go to API Keys section</li>
                    <li>3. Create new secret key</li>
                    <li>4. Copy key starting with "sk-ant-"</li>
                  </ol>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">Langfuse Setup</h4>
                  <ol className="text-sm text-gray-600 space-y-1">
                    <li>1. Visit cloud.langfuse.com</li>
                    <li>2. Create free account</li>
                    <li>3. Go to Settings → API Keys</li>
                    <li>4. Copy both public and secret keys</li>
                  </ol>
                </div>
                
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}