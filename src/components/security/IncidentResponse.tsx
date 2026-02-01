import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Settings,
  Users,
  Activity,
  RefreshCw,
  FileText,
  Zap,
  Shield,
  Timer,
  User,
  Calendar
} from 'lucide-react';
import { securityService } from '@/services/securityService';

interface Incident {
  incident_id: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  status: string;
  escalation_level: string;
  created_at: string;
  updated_at: string;
  assigned_to?: string;
  resolved_at?: string;
  source_events: string[];
  affected_assets: string[];
  affected_users: string[];
  estimated_impact?: string;
}

interface IncidentTimeline {
  timestamp: string;
  event: string;
  actor: string;
}

interface IncidentDetails {
  incident: Incident;
  timeline: IncidentTimeline[];
  related_events: any[];
  response_actions: any[];
  impact_assessment: {
    affected_users: number;
    affected_systems: string[];
    estimated_cost: number;
    reputation_impact: string;
  };
}

export function IncidentResponse() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<IncidentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    severity: '',
    category: ''
  });
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_incidents: 0,
    limit: 20
  });

  useEffect(() => {
    loadIncidents();
  }, [filters, pagination.current_page]);

  const loadIncidents = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        status_filter: filters.status || undefined,
        severity_filter: filters.severity || undefined,
        category_filter: filters.category || undefined,
        page: pagination.current_page,
        limit: pagination.limit
      };

      const data = await securityService.getIncidents(params);
      setIncidents(data.incidents || []);
      setPagination(prev => ({
        ...prev,
        total_incidents: data.total || 0,
        total_pages: Math.ceil((data.total || 0) / pagination.limit)
      }));
    } catch (err) {
      setError('Failed to load incidents');
      console.error('Incidents error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadIncidentDetails = async (incidentId: string) => {
    try {
      const details = await securityService.getIncidentDetails(incidentId);
      setSelectedIncident(details);
    } catch (err) {
      console.error('Failed to load incident details:', err);
    }
  };

  const handleStatusUpdate = async (incidentId: string, newStatus: string, assignedTo?: string) => {
    try {
      await securityService.updateIncidentStatus(incidentId, newStatus, assignedTo);
      await loadIncidents(); // Refresh incidents list

      if (selectedIncident && selectedIncident.incident.incident_id === incidentId) {
        await loadIncidentDetails(incidentId); // Refresh details if viewing
      }
    } catch (err) {
      console.error('Failed to update incident status:', err);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800 border-red-200';
      case 'investigating': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'contained': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200';
      case 'closed': return 'bg-gray-100 text-gray-800 border-gray-200';
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'investigating': return <Activity className="h-4 w-4 text-yellow-600" />;
      case 'contained': return <Shield className="h-4 w-4 text-blue-600" />;
      case 'resolved': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'closed': return <CheckCircle className="h-4 w-4 text-gray-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  if (loading && incidents.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-gray-600">Loading incidents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Incident Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="investigating">Investigating</SelectItem>
                  <SelectItem value="contained">Contained</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Severity</label>
              <Select value={filters.severity} onValueChange={(value) => setFilters(prev => ({ ...prev, severity: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All severities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Category</label>
              <Select value={filters.category} onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All categories</SelectItem>
                  <SelectItem value="security_breach">Security Breach</SelectItem>
                  <SelectItem value="data_leak">Data Leak</SelectItem>
                  <SelectItem value="ddos_attack">DDoS Attack</SelectItem>
                  <SelectItem value="malware">Malware</SelectItem>
                  <SelectItem value="phishing">Phishing</SelectItem>
                  <SelectItem value="insider_threat">Insider Threat</SelectItem>
                  <SelectItem value="system_compromise">System Compromise</SelectItem>
                  <SelectItem value="account_takeover">Account Takeover</SelectItem>
                  <SelectItem value="suspicious_activity">Suspicious Activity</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={loadIncidents} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Incidents Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Incidents</p>
                <p className="text-2xl font-bold">{pagination.total_incidents}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Open Incidents</p>
                <p className="text-2xl font-bold text-red-600">
                  {incidents.filter(i => i.status === 'open').length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Critical Incidents</p>
                <p className="text-2xl font-bold text-red-600">
                  {incidents.filter(i => i.severity === 'critical').length}
                </p>
              </div>
              <Shield className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Resolution</p>
                <p className="text-2xl font-bold text-green-600">4.2h</p>
              </div>
              <Timer className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Incidents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Security Incidents</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {incidents.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-gray-600">No incidents found</p>
              <p className="text-sm text-gray-500">All security incidents are resolved</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incidents.map((incident) => (
                    <TableRow key={incident.incident_id} className="hover:bg-gray-50">
                      <TableCell className="font-mono text-xs">
                        {incident.incident_id.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getSeverityIcon(incident.severity)}
                          <span className="font-medium">{incident.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {incident.category.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getSeverityColor(incident.severity)}>
                          {incident.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(incident.status)}
                          <Badge className={getStatusColor(incident.status)}>
                            {incident.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(incident.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 text-gray-400" />
                          <span className="text-sm">{incident.assigned_to || 'Unassigned'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => loadIncidentDetails(incident.incident_id)}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          {incident.status === 'open' && (
                            <Button
                              size="sm"
                              onClick={() => handleStatusUpdate(incident.incident_id, 'investigating')}
                            >
                              Investigate
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, current_page: Math.max(1, prev.current_page - 1) }))}
                    disabled={pagination.current_page <= 1 || loading}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, current_page: Math.min(prev.total_pages, prev.current_page + 1) }))}
                    disabled={pagination.current_page >= pagination.total_pages || loading}
                  >
                    Next
                  </Button>
                </div>
                <span className="text-sm text-gray-600">
                  Page {pagination.current_page} of {pagination.total_pages}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Incident Details Modal */}
      {selectedIncident && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setSelectedIncident(null)} />
          <Card className="fixed inset-4 z-50 overflow-auto bg-white shadow-lg max-h-[90vh]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {getSeverityIcon(selectedIncident.incident.severity)}
                  Incident Details: {selectedIncident.incident.title}
                </CardTitle>
                <Button variant="ghost" onClick={() => setSelectedIncident(null)}>
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Incident ID</label>
                  <p className="text-sm font-mono">{selectedIncident.incident.incident_id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Category</label>
                  <p className="text-sm">{selectedIncident.incident.category.replace('_', ' ')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Severity</label>
                  <Badge className={getSeverityColor(selectedIncident.incident.severity)}>
                    {selectedIncident.incident.severity}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(selectedIncident.incident.status)}>
                      {selectedIncident.incident.status}
                    </Badge>
                    <Select
                      value={selectedIncident.incident.status}
                      onValueChange={(status) => handleStatusUpdate(selectedIncident.incident.incident_id, status)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="investigating">Investigating</SelectItem>
                        <SelectItem value="contained">Contained</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Created</label>
                  <p className="text-sm">{new Date(selectedIncident.incident.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Last Updated</label>
                  <p className="text-sm">{new Date(selectedIncident.incident.updated_at).toLocaleString()}</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium text-gray-600">Description</label>
                <p className="text-sm mt-1 p-3 bg-gray-50 rounded">{selectedIncident.incident.description}</p>
              </div>

              {/* Impact Assessment */}
              <div>
                <h4 className="font-medium mb-3">Impact Assessment</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Affected Users</label>
                    <p className="text-sm">{selectedIncident.impact_assessment.affected_users}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Affected Systems</label>
                    <p className="text-sm">{selectedIncident.impact_assessment.affected_systems.join(', ') || 'None'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Estimated Cost</label>
                    <p className="text-sm">${selectedIncident.impact_assessment.estimated_cost}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Reputation Impact</label>
                    <Badge variant="outline">{selectedIncident.impact_assessment.reputation_impact}</Badge>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div>
                <h4 className="font-medium mb-3">Incident Timeline</h4>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {selectedIncident.timeline.map((event, index) => (
                    <div key={index} className="flex gap-3 p-2 border rounded">
                      <Calendar className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{event.event}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(event.timestamp).toLocaleString()} • {event.actor}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Response Actions */}
              <div>
                <h4 className="font-medium mb-3">Response Actions Taken</h4>
                <div className="space-y-2">
                  {selectedIncident.response_actions.length === 0 ? (
                    <p className="text-sm text-gray-500">No response actions recorded</p>
                  ) : (
                    selectedIncident.response_actions.map((action, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 border rounded">
                        <Zap className="h-4 w-4 text-blue-600" />
                        <span className="text-sm">{action.description || `Action ${index + 1}`}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}