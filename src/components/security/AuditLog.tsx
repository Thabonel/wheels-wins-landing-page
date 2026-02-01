import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Search,
  Filter,
  Download,
  Eye,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Activity,
  Shield
} from 'lucide-react';
import { format } from 'date-fns';
import { securityService } from '@/services/securityService';

interface AuditEntry {
  id: string;
  timestamp: string;
  event_type: string;
  severity: string;
  source_ip: string;
  endpoint: string;
  user_agent: string;
  user_id?: string;
  blocked: boolean;
  details: Record<string, any>;
}

interface AuditLogData {
  entries: AuditEntry[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_entries: number;
    limit: number;
    has_next: boolean;
    has_prev: boolean;
  };
  filters_applied: Record<string, any>;
}

export function AuditLog() {
  const [auditData, setAuditData] = useState<AuditLogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState<string | undefined>();
  const [severityFilter, setSeverityFilter] = useState<string | undefined>();
  const [sourceIpFilter, setSourceIpFilter] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Selected entry for details
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);

  useEffect(() => {
    loadAuditLog();
  }, [currentPage, pageSize, eventTypeFilter, severityFilter, sourceIpFilter, startDate, endDate]);

  const loadAuditLog = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters = {
        page: currentPage,
        limit: pageSize,
        event_type: eventTypeFilter,
        severity: severityFilter,
        source_ip: sourceIpFilter || undefined,
        start_date: startDate?.toISOString(),
        end_date: endDate?.toISOString(),
      };

      const data = await securityService.getAuditLog(filters);
      setAuditData(data);
    } catch (err) {
      setError('Failed to load audit log');
      console.error('Audit log error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const filters = {
        event_type: eventTypeFilter,
        severity: severityFilter,
        source_ip: sourceIpFilter || undefined,
        start_date: startDate?.toISOString(),
        end_date: endDate?.toISOString(),
      };

      await securityService.exportAuditLog(filters);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const clearFilters = () => {
    setEventTypeFilter(undefined);
    setSeverityFilter(undefined);
    setSourceIpFilter('');
    setStartDate(undefined);
    setEndDate(undefined);
    setSearchQuery('');
    setCurrentPage(1);
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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatEventType = (eventType: string) => {
    return eventType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading && !auditData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-gray-600">Loading audit log...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-2" />
          <p className="text-red-600">{error}</p>
          <Button onClick={loadAuditLog} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Event Type</label>
              <Select value={eventTypeFilter || ''} onValueChange={(value) => setEventTypeFilter(value || undefined)}>
                <SelectTrigger>
                  <SelectValue placeholder="All event types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All event types</SelectItem>
                  <SelectItem value="brute_force">Brute Force</SelectItem>
                  <SelectItem value="ddos">DDoS</SelectItem>
                  <SelectItem value="sql_injection">SQL Injection</SelectItem>
                  <SelectItem value="xss">XSS</SelectItem>
                  <SelectItem value="path_traversal">Path Traversal</SelectItem>
                  <SelectItem value="suspicious_behavior">Suspicious Behavior</SelectItem>
                  <SelectItem value="account_enumeration">Account Enumeration</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Severity</label>
              <Select value={severityFilter || ''} onValueChange={(value) => setSeverityFilter(value || undefined)}>
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
              <label className="text-sm font-medium">Source IP</label>
              <Input
                placeholder="Filter by IP address"
                value={sourceIpFilter}
                onChange={(e) => setSourceIpFilter(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Page Size</label>
              <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Start Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'PPP') : 'Pick start date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-sm font-medium">End Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'PPP') : 'Pick end date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={loadAuditLog} disabled={loading}>
              <Search className="h-4 w-4 mr-2" />
              Apply Filters
            </Button>
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Security Audit Log</CardTitle>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              {auditData && (
                <span>
                  Showing {((auditData.pagination.current_page - 1) * auditData.pagination.limit) + 1}-
                  {Math.min(auditData.pagination.current_page * auditData.pagination.limit, auditData.pagination.total_entries)} of{' '}
                  {auditData.pagination.total_entries} entries
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={loadAuditLog}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {auditData && auditData.entries.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Event Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Source IP</TableHead>
                      <TableHead>Endpoint</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditData.entries.map((entry) => (
                      <TableRow key={entry.id} className="hover:bg-gray-50">
                        <TableCell className="text-sm">
                          {new Date(entry.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getSeverityIcon(entry.severity)}
                            <span className="text-sm">{formatEventType(entry.event_type)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getSeverityColor(entry.severity)}>
                            {entry.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {entry.source_ip}
                        </TableCell>
                        <TableCell className="text-sm">
                          {entry.endpoint}
                        </TableCell>
                        <TableCell>
                          <Badge variant={entry.blocked ? 'destructive' : 'secondary'}>
                            {entry.blocked ? 'Blocked' : 'Allowed'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedEntry(entry)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={!auditData.pagination.has_prev || loading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => p + 1)}
                    disabled={!auditData.pagination.has_next || loading}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <span className="text-sm text-gray-600">
                  Page {auditData.pagination.current_page} of {auditData.pagination.total_pages}
                </span>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <Activity className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">No audit entries found</p>
              <p className="text-sm text-gray-500">Try adjusting your filters</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Entry Details Modal */}
      {selectedEntry && (
        <Card className="fixed inset-4 z-50 overflow-auto bg-white shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Audit Entry Details</CardTitle>
              <Button variant="ghost" onClick={() => setSelectedEntry(null)}>
                ×
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Event ID</label>
                <p className="text-sm font-mono">{selectedEntry.id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Timestamp</label>
                <p className="text-sm">{new Date(selectedEntry.timestamp).toLocaleString()}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Event Type</label>
                <p className="text-sm">{formatEventType(selectedEntry.event_type)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Severity</label>
                <Badge className={getSeverityColor(selectedEntry.severity)}>
                  {selectedEntry.severity}
                </Badge>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Source IP</label>
                <p className="text-sm font-mono">{selectedEntry.source_ip}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Endpoint</label>
                <p className="text-sm">{selectedEntry.endpoint}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">User Agent</label>
                <p className="text-sm break-all">{selectedEntry.user_agent}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Status</label>
                <Badge variant={selectedEntry.blocked ? 'destructive' : 'secondary'}>
                  {selectedEntry.blocked ? 'Blocked' : 'Allowed'}
                </Badge>
              </div>
            </div>

            {selectedEntry.details && Object.keys(selectedEntry.details).length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-600">Details</label>
                <pre className="text-xs bg-gray-50 p-3 rounded-md overflow-auto">
                  {JSON.stringify(selectedEntry.details, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Overlay */}
      {selectedEntry && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSelectedEntry(null)}
        />
      )}
    </div>
  );
}