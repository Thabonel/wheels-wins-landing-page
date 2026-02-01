import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Shield,
  Eye,
  Globe,
  Activity,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  MapPin,
  Zap,
  Brain,
  Lock,
  Unlock,
  Ban,
  Search
} from 'lucide-react';
import { securityService } from '@/services/securityService';

interface ThreatDetectionData {
  active_threats: Array<{
    id: string;
    type: string;
    severity: string;
    source_ip: string;
    started_at: string;
    status: string;
  }>;
  threat_sources: {
    geographic_distribution: Record<string, number>;
    top_asns: string[];
    known_threat_ips: number;
    tor_exit_nodes: number;
  };
  attack_patterns: {
    common_patterns: string[];
    attack_sophistication: string;
    automated_vs_manual: Record<string, number>;
  };
  geolocation_data: Array<{
    lat: number;
    lng: number;
    threats: number;
    city: string;
  }>;
  blocked_entities: {
    ips: string[];
    users: string[];
  };
  detection_rules: Array<{
    id: string;
    name: string;
    enabled: boolean;
  }>;
  false_positive_rate: number;
  threat_intelligence: {
    ioc_matches: number;
    threat_feeds: string[];
    last_update: string;
  };
}

export function ThreatDetection() {
  const [threatData, setThreatData] = useState<ThreatDetectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'active' | 'patterns' | 'intel' | 'blocked'>('active');
  const [manualBlockIp, setManualBlockIp] = useState('');
  const [blockingIp, setBlockingIp] = useState<string | null>(null);

  useEffect(() => {
    loadThreatDetectionData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(loadThreatDetectionData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadThreatDetectionData = async () => {
    try {
      setError(null);
      const data = await securityService.getThreatDetectionData();
      setThreatData(data);
    } catch (err) {
      setError('Failed to load threat detection data');
      console.error('Threat detection error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBlockIp = async (ip: string) => {
    try {
      setBlockingIp(ip);
      await securityService.blockIpAddress(ip, 60, 'Manual block from threat detection');
      await loadThreatDetectionData(); // Refresh data
      setManualBlockIp('');
    } catch (err) {
      console.error('Failed to block IP:', err);
    } finally {
      setBlockingIp(null);
    }
  };

  const handleUnblockIp = async (ip: string) => {
    try {
      await securityService.unblockIpAddress(ip);
      await loadThreatDetectionData(); // Refresh data
    } catch (err) {
      console.error('Failed to unblock IP:', err);
    }
  };

  const handleToggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      // This would call an API to enable/disable detection rules
      console.log(`${enabled ? 'Enabling' : 'Disabling'} rule ${ruleId}`);
      await loadThreatDetectionData();
    } catch (err) {
      console.error('Failed to toggle detection rule:', err);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'low': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'medium': return <Activity className="h-4 w-4 text-yellow-600" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'critical': return <Shield className="h-4 w-4 text-red-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Shield className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading threat detection data...</p>
        </div>
      </div>
    );
  }

  if (error || !threatData) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error || 'No threat detection data available'}
          <Button onClick={loadThreatDetectionData} className="ml-4" variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-1" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Threats</p>
                <p className="text-2xl font-bold text-red-600">{threatData.active_threats.length}</p>
              </div>
              <Shield className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Blocked IPs</p>
                <p className="text-2xl font-bold text-orange-600">{threatData.blocked_entities.ips.length}</p>
              </div>
              <Ban className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">IOC Matches</p>
                <p className="text-2xl font-bold text-blue-600">{threatData.threat_intelligence.ioc_matches}</p>
              </div>
              <Brain className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">False Positive Rate</p>
                <p className="text-2xl font-bold text-green-600">{threatData.false_positive_rate}%</p>
              </div>
              <Activity className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b">
        <button
          className={`px-4 py-2 font-medium ${selectedTab === 'active' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          onClick={() => setSelectedTab('active')}
        >
          Active Threats
        </button>
        <button
          className={`px-4 py-2 font-medium ${selectedTab === 'patterns' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          onClick={() => setSelectedTab('patterns')}
        >
          Attack Patterns
        </button>
        <button
          className={`px-4 py-2 font-medium ${selectedTab === 'intel' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          onClick={() => setSelectedTab('intel')}
        >
          Threat Intelligence
        </button>
        <button
          className={`px-4 py-2 font-medium ${selectedTab === 'blocked' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          onClick={() => setSelectedTab('blocked')}
        >
          Blocked Entities
        </button>
      </div>

      {/* Active Threats */}
      {selectedTab === 'active' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Active Threats
              </CardTitle>
            </CardHeader>
            <CardContent>
              {threatData.active_threats.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-gray-600">No active threats detected</p>
                  <p className="text-sm text-gray-500">All systems are secure</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Threat Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Source IP</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {threatData.active_threats.map((threat) => (
                      <TableRow key={threat.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getSeverityIcon(threat.severity)}
                            <span className="capitalize">{threat.type.replace('_', ' ')}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getSeverityColor(threat.severity)}>
                            {threat.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono">{threat.source_ip}</TableCell>
                        <TableCell>{new Date(threat.started_at).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{threat.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleBlockIp(threat.source_ip)}
                            disabled={blockingIp === threat.source_ip}
                          >
                            <Ban className="h-3 w-3 mr-1" />
                            Block
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Geographic Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-600" />
                Geographic Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Top Countries</h4>
                  <div className="space-y-2">
                    {Object.entries(threatData.threat_sources.geographic_distribution)
                      .sort(([,a], [,b]) => b - a)
                      .slice(0, 5)
                      .map(([country, count]) => (
                        <div key={country} className="flex items-center justify-between">
                          <span className="text-sm">{country}</span>
                          <Badge variant="outline">{count} threats</Badge>
                        </div>
                      ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Network Analysis</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Known Threat IPs</span>
                      <span className="font-medium">{threatData.threat_sources.known_threat_ips}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Tor Exit Nodes</span>
                      <span className="font-medium">{threatData.threat_sources.tor_exit_nodes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Top ASNs</span>
                      <span className="font-medium">{threatData.threat_sources.top_asns.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Attack Patterns */}
      {selectedTab === 'patterns' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-purple-600" />
                Attack Pattern Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Attack Sophistication</h4>
                  <Badge className={
                    threatData.attack_patterns.attack_sophistication === 'low' ? 'bg-green-100 text-green-800' :
                    threatData.attack_patterns.attack_sophistication === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }>
                    {threatData.attack_patterns.attack_sophistication}
                  </Badge>
                </div>

                <div className="text-center p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Automated Attacks</h4>
                  <p className="text-2xl font-bold text-blue-600">
                    {threatData.attack_patterns.automated_vs_manual.automated || 0}%
                  </p>
                </div>

                <div className="text-center p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Manual Attacks</h4>
                  <p className="text-2xl font-bold text-orange-600">
                    {threatData.attack_patterns.automated_vs_manual.manual || 0}%
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Common Attack Patterns</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {threatData.attack_patterns.common_patterns.map((pattern, index) => (
                    <Badge key={index} variant="outline" className="justify-center py-2">
                      {pattern}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detection Rules */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-600" />
                Detection Rules
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {threatData.detection_rules.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={(checked) => handleToggleRule(rule.id, checked)}
                      />
                      <span className="font-medium">{rule.name}</span>
                    </div>
                    <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                      {rule.enabled ? 'Active' : 'Disabled'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Threat Intelligence */}
      {selectedTab === 'intel' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-600" />
                Threat Intelligence
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">IOC Matches</h4>
                  <p className="text-2xl font-bold text-red-600">{threatData.threat_intelligence.ioc_matches}</p>
                </div>

                <div className="text-center p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Active Feeds</h4>
                  <p className="text-2xl font-bold text-blue-600">{threatData.threat_intelligence.threat_feeds.length}</p>
                </div>

                <div className="text-center p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Last Update</h4>
                  <p className="text-sm text-gray-600">
                    {new Date(threatData.threat_intelligence.last_update).toLocaleString()}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Active Threat Feeds</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {threatData.threat_intelligence.threat_feeds.map((feed, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 border rounded">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">{feed.replace('_', ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Blocked Entities */}
      {selectedTab === 'blocked' && (
        <div className="space-y-6">
          {/* Manual IP Blocking */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ban className="h-5 w-5 text-red-600" />
                Manual IP Blocking
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter IP address to block"
                  value={manualBlockIp}
                  onChange={(e) => setManualBlockIp(e.target.value)}
                />
                <Button
                  onClick={() => handleBlockIp(manualBlockIp)}
                  disabled={!manualBlockIp || blockingIp === manualBlockIp}
                >
                  <Ban className="h-4 w-4 mr-2" />
                  Block IP
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Blocked IPs */}
          <Card>
            <CardHeader>
              <CardTitle>Blocked IP Addresses</CardTitle>
            </CardHeader>
            <CardContent>
              {threatData.blocked_entities.ips.length === 0 ? (
                <div className="text-center py-8">
                  <Unlock className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-gray-600">No IPs currently blocked</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {threatData.blocked_entities.ips.map((ip) => (
                      <TableRow key={ip}>
                        <TableCell className="font-mono">{ip}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUnblockIp(ip)}
                          >
                            <Unlock className="h-3 w-3 mr-1" />
                            Unblock
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Blocked Users */}
          <Card>
            <CardHeader>
              <CardTitle>Blocked Users</CardTitle>
            </CardHeader>
            <CardContent>
              {threatData.blocked_entities.users.length === 0 ? (
                <div className="text-center py-8">
                  <Unlock className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-gray-600">No users currently blocked</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User ID</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {threatData.blocked_entities.users.map((userId) => (
                      <TableRow key={userId}>
                        <TableCell>{userId}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">
                            <Unlock className="h-3 w-3 mr-1" />
                            Unblock
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}