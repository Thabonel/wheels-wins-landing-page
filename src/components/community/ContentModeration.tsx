import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCommunityFeatures } from '@/hooks/useCommunityFeatures';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Flag, Shield, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface ModerationReport {
  id: string;
  content_type: string;
  content_id: string;
  reason: string;
  category: string;
  description?: string;
  priority_level: string;
  status: string;
  created_at: string;
}

export default function ContentModeration() {
  const { user } = useAuth();
  const { reportContent, getUserTrustScore, loading } = useCommunityFeatures();
  
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportForm, setReportForm] = useState({
    content_type: 'post',
    content_id: '',
    reason: '',
    category: 'inappropriate' as const,
    description: ''
  });

  useEffect(() => {
    fetchUserReports();
  }, []);

  const fetchUserReports = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('moderation_queue')
        .select('*')
        .eq('reported_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };

  const handleSubmitReport = async () => {
    const success = await reportContent(
      reportForm.content_type,
      reportForm.content_id,
      reportForm.reason,
      reportForm.category,
      reportForm.description
    );

    if (success) {
      setShowReportDialog(false);
      setReportForm({
        content_type: 'post',
        content_id: '',
        reason: '',
        category: 'inappropriate',
        description: ''
      });
      fetchUserReports();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'dismissed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'reviewing': return <Shield className="h-4 w-4 text-blue-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'secondary';
      case 'medium': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Content Moderation</h2>
          <p className="text-muted-foreground">Report inappropriate content and track your reports</p>
        </div>
        
        <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
          <DialogTrigger asChild>
            <Button>
              <Flag className="h-4 w-4 mr-2" />
              Report Content
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Report Content</DialogTitle>
              <DialogDescription>
                Help keep our community safe by reporting inappropriate content
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="content_type">Content Type</Label>
                <Select 
                  value={reportForm.content_type} 
                  onValueChange={(value) => setReportForm({...reportForm, content_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="post">Post</SelectItem>
                    <SelectItem value="comment">Comment</SelectItem>
                    <SelectItem value="group">Group</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="user_profile">User Profile</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="content_id">Content ID</Label>
                <input
                  id="content_id"
                  type="text"
                  value={reportForm.content_id}
                  onChange={(e) => setReportForm({...reportForm, content_id: e.target.value})}
                  placeholder="Enter the ID of the content you're reporting"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select 
                  value={reportForm.category} 
                  onValueChange={(value: any) => setReportForm({...reportForm, category: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="spam">Spam</SelectItem>
                    <SelectItem value="inappropriate">Inappropriate Content</SelectItem>
                    <SelectItem value="harassment">Harassment</SelectItem>
                    <SelectItem value="misinformation">Misinformation</SelectItem>
                    <SelectItem value="copyright">Copyright Violation</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  value={reportForm.reason}
                  onChange={(e) => setReportForm({...reportForm, reason: e.target.value})}
                  placeholder="Briefly explain why you're reporting this content"
                />
              </div>

              <div>
                <Label htmlFor="description">Additional Details (Optional)</Label>
                <Textarea
                  id="description"
                  value={reportForm.description}
                  onChange={(e) => setReportForm({...reportForm, description: e.target.value})}
                  placeholder="Provide any additional context or details"
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleSubmitReport} 
                  disabled={loading || !reportForm.reason || !reportForm.content_id}
                >
                  Submit Report
                </Button>
                <Button variant="outline" onClick={() => setShowReportDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="my-reports" className="w-full">
        <TabsList>
          <TabsTrigger value="my-reports">My Reports</TabsTrigger>
          <TabsTrigger value="guidelines">Community Guidelines</TabsTrigger>
        </TabsList>

        <TabsContent value="my-reports" className="space-y-4">
          <div className="grid gap-4">
            {reports.map((report) => (
              <Card key={report.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(report.status)}
                        <h4 className="font-semibold capitalize">{report.content_type} Report</h4>
                        <Badge variant={getPriorityColor(report.priority_level) as any}>
                          {report.priority_level}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-2">
                        Category: <span className="capitalize">{report.category}</span>
                      </p>
                      
                      <p className="text-sm mb-2">{report.reason}</p>
                      
                      {report.description && (
                        <p className="text-sm text-muted-foreground mb-2">{report.description}</p>
                      )}
                      
                      <p className="text-xs text-muted-foreground">
                        Reported on {new Date(report.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <Badge variant="outline" className="capitalize">
                      {report.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {reports.length === 0 && (
              <div className="text-center py-12">
                <Flag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Reports Yet</h3>
                <p className="text-muted-foreground">You haven't reported any content yet.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="guidelines" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Community Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Be Respectful</h4>
                <p className="text-sm text-muted-foreground">
                  Treat all community members with respect. No harassment, bullying, or discriminatory language.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Stay On Topic</h4>
                <p className="text-sm text-muted-foreground">
                  Keep discussions relevant to RV travel, camping, and related topics.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">No Spam or Self-Promotion</h4>
                <p className="text-sm text-muted-foreground">
                  Avoid excessive self-promotion or spam. Share helpful content that benefits the community.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Accurate Information</h4>
                <p className="text-sm text-muted-foreground">
                  Share accurate information, especially regarding safety and travel advice.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}