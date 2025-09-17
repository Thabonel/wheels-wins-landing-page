
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";   
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { RefreshCw, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface FlaggedContent {
  id: string;
  content_type: string;
  content_id: string;
  content_text: string;
  author_email: string;
  flagged_reason: string;
  status: string;
  moderator_notes?: string;
  created_at: string;
  updated_at: string;
}

const ContentModeration = () => {
  const [flaggedContent, setFlaggedContent] = useState<FlaggedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedNotes, setSelectedNotes] = useState<{[key: string]: string}>({});
  
  const fetchFlaggedContent = async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error: fetchError } = await supabase
        .from('content_moderation')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setFlaggedContent(data || []);
      toast.success("Flagged content refreshed");
    } catch (err: any) {
      console.error('Error fetching flagged content:', err);

      // Provide more specific error messages
      let errorMessage = "Failed to fetch flagged content";
      if (err?.code === '42501') {
        errorMessage = "Permission denied: Admin access required for content moderation";
      } else if (err?.code === '42P01') {
        errorMessage = "Content moderation table not found - database setup needed";
      } else if (err?.message) {
        errorMessage = `Error: ${err.message}`;
      }

      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleModerationAction = async (id: string, action: "approved" | "rejected" | "removed") => {
    const notes = selectedNotes[id] || '';
    
    try {
      const { error } = await supabase
        .from('content_moderation')
        .update({ 
          status: action, 
          moderator_notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      setFlaggedContent(prevContent => 
        prevContent.map(content => 
          content.id === id 
            ? { 
                ...content, 
                status: action, 
                moderator_notes: notes,
                updated_at: new Date().toISOString()
              }
            : content
        )
      );
      
      toast.success(`Content ${action} successfully`);
      setSelectedNotes(prev => ({ ...prev, [id]: '' }));
    } catch (error) {
      console.error('Error updating content moderation:', error);
      toast.error("Failed to update content status");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-700">Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-100 text-green-700">Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-100 text-red-700">Rejected</Badge>;
      case 'removed':
        return <Badge variant="outline" className="bg-gray-100 text-gray-700">Removed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'post':
        return '📝';
      case 'comment':
        return '💬';
      case 'profile':
        return '👤';
      default:
        return '📄';
    }
  };

  useEffect(() => {
    fetchFlaggedContent();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Content Moderation</h1>
          <p className="text-muted-foreground text-sm">Review and moderate flagged content</p>
        </div>
        <Button onClick={fetchFlaggedContent} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{flaggedContent.filter(c => c.status === 'pending').length}</p>
                <p className="text-sm text-gray-600">Pending Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{flaggedContent.filter(c => c.status === 'approved').length}</p>
                <p className="text-sm text-gray-600">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{flaggedContent.filter(c => c.status === 'rejected').length}</p>
                <p className="text-sm text-gray-600">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 bg-gray-500 rounded-full" />
              <div>
                <p className="text-2xl font-bold">{flaggedContent.filter(c => c.status === 'removed').length}</p>
                <p className="text-sm text-gray-600">Removed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Flagged Content ({flaggedContent.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : error ? (
            <div className="text-center py-8 space-y-4">
              <div className="max-w-md mx-auto">
                <p className="text-red-500 font-medium">{error}</p>
                {error.includes("Permission denied") && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800">
                      <strong>Database Setup Required:</strong><br/>
                      Run the SQL fix in <code>docs/sql-fixes/fix-content-moderation-rls.sql</code> to enable admin access to content moderation.
                    </p>
                  </div>
                )}
                {error.includes("table not found") && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-800">
                      The content_moderation table needs to be created in the database.
                    </p>
                  </div>
                )}
              </div>
              <Button onClick={fetchFlaggedContent} className="mt-4">
                Retry
              </Button>
            </div>
          ) : flaggedContent.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No flagged content found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Content</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flaggedContent.map((content) => (
                    <TableRow key={content.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{getContentTypeIcon(content.content_type)}</span>
                          <span className="capitalize">{content.content_type}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="truncate">{content.content_text}</p>
                      </TableCell>
                      <TableCell>{content.author_email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-orange-100 text-orange-700">
                          {content.flagged_reason}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(content.status)}</TableCell>
                      <TableCell>{new Date(content.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {content.status === 'pending' ? (
                          <div className="space-y-2">
                            <Textarea
                              placeholder="Add moderation notes..."
                              value={selectedNotes[content.id] || ''}
                              onChange={(e) => setSelectedNotes(prev => ({ ...prev, [content.id]: e.target.value }))}
                              className="min-h-[60px] text-xs"
                            />
                            <div className="flex gap-1">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleModerationAction(content.id, "approved")}
                                className="text-green-600 border-green-200 hover:bg-green-50"
                              >
                                Approve
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleModerationAction(content.id, "rejected")}
                                className="text-orange-600 border-orange-200 hover:bg-orange-50"
                              >
                                Reject
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => handleModerationAction(content.id, "removed")}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">
                            {content.moderator_notes && (
                              <p className="italic">"{content.moderator_notes}"</p>
                            )}
                            <p>Reviewed</p>
                          </div>
                        )}
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

export default ContentModeration;
