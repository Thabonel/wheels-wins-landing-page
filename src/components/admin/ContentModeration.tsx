
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";   
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { RefreshCw, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

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
  // Mock flagged content data
  const mockFlaggedContent: FlaggedContent[] = [
    {
      id: '1',
      content_type: 'post',
      content_id: 'post123',
      content_text: 'This is some inappropriate content that was flagged by users for being offensive.',
      author_email: 'user1@example.com',
      flagged_reason: 'inappropriate',
      status: 'pending',
      created_at: '2024-07-04T10:30:00Z',
      updated_at: '2024-07-04T10:30:00Z'
    },
    {
      id: '2', 
      content_type: 'comment',
      content_id: 'comment456',
      content_text: 'Spam comment with links to suspicious websites.',
      author_email: 'spammer@example.com',
      flagged_reason: 'spam',
      status: 'pending',
      created_at: '2024-07-04T09:15:00Z',
      updated_at: '2024-07-04T09:15:00Z'
    },
    {
      id: '3',
      content_type: 'profile',
      content_id: 'profile789',
      content_text: 'Profile description with hate speech content.',
      author_email: 'problem@example.com',
      flagged_reason: 'hate_speech',
      status: 'approved',
      moderator_notes: 'Reviewed - content is within guidelines',
      created_at: '2024-07-03T14:20:00Z',
      updated_at: '2024-07-03T15:30:00Z'
    },
    {
      id: '4',
      content_type: 'post',
      content_id: 'post321',
      content_text: 'Another post with questionable content that needs review.',
      author_email: 'user2@example.com',
      flagged_reason: 'misinformation',
      status: 'rejected',
      moderator_notes: 'Content removed for spreading false information',
      created_at: '2024-07-02T11:45:00Z',
      updated_at: '2024-07-02T16:20:00Z'
    }
  ];

  const [flaggedContent, setFlaggedContent] = useState<FlaggedContent[]>(mockFlaggedContent);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedNotes, setSelectedNotes] = useState<{[key: string]: string}>({});
  
  const fetchFlaggedContent = async () => {
    // Mock refresh - simulate loading
    setLoading(true);
    setTimeout(() => {
      setFlaggedContent(mockFlaggedContent);
      setLoading(false);
      setError("");
      toast.success("Flagged content refreshed");
    }, 1000);
  };

  const handleModerationAction = async (id: string, action: "approved" | "rejected" | "removed") => {
    const notes = selectedNotes[id] || '';
    
    // Mock moderation action - update local state
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
    // Initialize with mock data
    setFlaggedContent(mockFlaggedContent);
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
            <div className="text-center py-8">
              <p className="text-red-500">Error: {error}</p>
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
