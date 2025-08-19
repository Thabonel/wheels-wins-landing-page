import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { RefreshCw, MessageSquare, Bug, Lightbulb, AlertTriangle, Star } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from "@/integrations/supabase/client";
import { format } from 'date-fns';

interface UserFeedbackItem {
  id: string;
  type: string;
  category: string;
  severity: string;
  status: string;
  title: string;
  description: string;
  user_message: string;
  user_id: string | null;
  user_email: string | null;
  user_context: any;
  metadata: any;
  admin_response: string | null;
  admin_notes: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

const UserFeedback = () => {
  const [feedback, setFeedback] = useState<UserFeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [editingResponse, setEditingResponse] = useState<string | null>(null);
  const [responseText, setResponseText] = useState<string>('');
  const [notesText, setNotesText] = useState<string>('');

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Filter the data client-side to avoid TypeScript issues
      let filteredData = data || [];
      
      if (statusFilter !== 'all') {
        filteredData = filteredData.filter((item: any) => item.status === statusFilter);
      }
      if (typeFilter !== 'all') {
        filteredData = filteredData.filter((item: any) => item.type === typeFilter);
      }
      if (categoryFilter !== 'all') {
        filteredData = filteredData.filter((item: any) => item.category === categoryFilter);
      }
      if (severityFilter !== 'all') {
        filteredData = filteredData.filter((item: any) => item.severity === severityFilter);
      }

      setFeedback(filteredData as unknown as UserFeedbackItem[]);
    } catch (error) {
      console.error('Error fetching feedback:', error);
      toast.error('Failed to fetch feedback data');
    } finally {
      setLoading(false);
    }
  };

  const updateFeedbackStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('user_feedback')
        .update({ status } as any)
        .eq('id', id);

      if (error) throw error;

      setFeedback(prev => 
        prev.map(item => 
          item.id === id ? { ...item, status } as UserFeedbackItem : item
        )
      );

      toast.success(`Feedback marked as ${status}`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const saveAdminResponse = async (id: string) => {
    try {
      const { error } = await supabase
        .from('user_feedback')
        .update({
          admin_response: responseText,
          admin_notes: notesText,
          status: 'in_progress' // Automatically set to in_progress when admin responds
        } as any)
        .eq('id', id);

      if (error) throw error;

      setFeedback(prev => 
        prev.map(item => 
          item.id === id 
            ? { ...item, admin_response: responseText, admin_notes: notesText, status: 'in_progress' as const } 
            : item
        )
      );

      setEditingResponse(null);
      setResponseText('');
      setNotesText('');
      toast.success('Response saved successfully');
    } catch (error) {
      console.error('Error saving response:', error);
      toast.error('Failed to save response');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bug': return <Bug className="h-4 w-4 text-red-500" />;
      case 'suggestion': return <Lightbulb className="h-4 w-4 text-yellow-500" />;
      case 'feature_request': return <Star className="h-4 w-4 text-purple-500" />;
      case 'complaint': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default: return <MessageSquare className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      case 'duplicate': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const startEditing = (item: UserFeedbackItem) => {
    setEditingResponse(item.id);
    setResponseText(item.admin_response || '');
    setNotesText(item.admin_notes || '');
  };

  useEffect(() => {
    fetchFeedback();
  }, [statusFilter, typeFilter, categoryFilter, severityFilter]);

  const filteredStats = {
    total: feedback.length,
    new: feedback.filter(f => f.status === 'new').length,
    inProgress: feedback.filter(f => f.status === 'in_progress').length,
    resolved: feedback.filter(f => f.status === 'resolved').length,
    critical: feedback.filter(f => f.severity === 'critical').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">User Feedback & Reports</h2>
          <p className="text-muted-foreground">Manage user feedback, bug reports, and feature requests from PAM conversations</p>
        </div>
        <Button onClick={fetchFeedback} disabled={loading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredStats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">New</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{filteredStats.new}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{filteredStats.inProgress}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{filteredStats.resolved}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{filteredStats.critical}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="duplicate">Duplicate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Type</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="bug">Bug Report</SelectItem>
                  <SelectItem value="suggestion">Suggestion</SelectItem>
                  <SelectItem value="feature_request">Feature Request</SelectItem>
                  <SelectItem value="complaint">Complaint</SelectItem>
                  <SelectItem value="issue">General Issue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Category</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="voice">Voice/PAM</SelectItem>
                  <SelectItem value="calendar">Calendar</SelectItem>
                  <SelectItem value="maps">Maps/Trip Planning</SelectItem>
                  <SelectItem value="ui">User Interface</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Severity</label>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feedback Table */}
      <Card>
        <CardHeader>
          <CardTitle>Feedback Reports</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin" />
            </div>
          ) : feedback.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No feedback found with current filters
            </div>
          ) : (
            <div className="space-y-2">
              {feedback.map((item) => (
                <div key={item.id} className="border rounded-lg">
                  {/* Main Row */}
                  <div 
                    className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setExpandedRow(expandedRow === item.id ? null : item.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1">
                        <div className="flex-shrink-0">
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-xs">
                            {expandedRow === item.id ? "Hide" : "Show"}
                          </Button>
                        </div>
                        
                        <div className="flex-shrink-0">
                          {getTypeIcon(item.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium truncate">{item.title}</p>
                            <Badge className={getStatusColor(item.status)}>
                              {item.status.replace('_', ' ')}
                            </Badge>
                            <Badge className={getSeverityColor(item.severity)}>
                              {item.severity}
                            </Badge>
                            <Badge variant="outline">
                              {item.category}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {item.description.substring(0, 100)}...
                          </p>
                        </div>
                        
                        <div className="flex-shrink-0 text-sm text-muted-foreground">
                          {format(new Date(item.created_at), 'MMM d, yyyy')}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedRow === item.id && (
                    <div className="border-t p-4 bg-muted/20">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Feedback Details */}
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-semibold mb-2">Original User Message</h4>
                            <div className="bg-background p-3 rounded border">
                              <p className="text-sm">{item.user_message}</p>
                            </div>
                          </div>

                          <div>
                            <h4 className="font-semibold mb-2">Description</h4>
                            <div className="bg-background p-3 rounded border">
                              <p className="text-sm">{item.description}</p>
                            </div>
                          </div>

                          {item.user_context && Object.keys(item.user_context).length > 0 && (
                            <div>
                              <h4 className="font-semibold mb-2">User Context</h4>
                              <div className="bg-background p-3 rounded border text-xs">
                                <pre>{JSON.stringify(item.user_context, null, 2)}</pre>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center space-x-4">
                            <div>
                              <span className="font-semibold">User:</span> {item.user_email || 'Anonymous'}
                            </div>
                            <div>
                              <span className="font-semibold">Created:</span> {format(new Date(item.created_at), 'PPpp')}
                            </div>
                          </div>
                        </div>

                        {/* Admin Actions */}
                        <div className="space-y-4">
                          <div className="flex space-x-2">
                            <Select 
                              value={item.status} 
                              onValueChange={(value) => updateFeedbackStatus(item.id, value)}
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="new">New</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="resolved">Resolved</SelectItem>
                                <SelectItem value="closed">Closed</SelectItem>
                                <SelectItem value="duplicate">Duplicate</SelectItem>
                              </SelectContent>
                            </Select>

                            <Button 
                              variant="outline" 
                              onClick={() => startEditing(item)}
                              disabled={editingResponse === item.id}
                            >
                              {item.admin_response ? 'Edit Response' : 'Add Response'}
                            </Button>
                          </div>

                          {editingResponse === item.id ? (
                            <div className="space-y-3">
                              <div>
                                <label className="text-sm font-medium mb-1 block">Admin Response</label>
                                <Textarea
                                  value={responseText}
                                  onChange={(e) => setResponseText(e.target.value)}
                                  placeholder="Enter your response to the user..."
                                  rows={3}
                                />
                              </div>
                              
                              <div>
                                <label className="text-sm font-medium mb-1 block">Internal Notes</label>
                                <Textarea
                                  value={notesText}
                                  onChange={(e) => setNotesText(e.target.value)}
                                  placeholder="Internal notes (not visible to user)..."
                                  rows={2}
                                />
                              </div>

                              <div className="flex space-x-2">
                                <Button onClick={() => saveAdminResponse(item.id)}>
                                  Save Response
                                </Button>
                                <Button 
                                  variant="outline" 
                                  onClick={() => {
                                    setEditingResponse(null);
                                    setResponseText('');
                                    setNotesText('');
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {item.admin_response && (
                                <div>
                                  <h4 className="font-semibold mb-1">Admin Response</h4>
                                  <div className="bg-green-50 p-3 rounded border border-green-200">
                                    <p className="text-sm">{item.admin_response}</p>
                                  </div>
                                </div>
                              )}

                              {item.admin_notes && (
                                <div>
                                  <h4 className="font-semibold mb-1">Internal Notes</h4>
                                  <div className="bg-blue-50 p-3 rounded border border-blue-200">
                                    <p className="text-sm">{item.admin_notes}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserFeedback;