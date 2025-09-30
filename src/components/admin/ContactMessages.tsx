import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Mail,
  MailOpen,
  Reply,
  Archive,
  Trash2,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  BarChart3
} from 'lucide-react';
import { api } from '@/services/api';
import { formatDistanceToNow } from 'date-fns';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'unread' | 'read' | 'replied' | 'archived';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category: 'general' | 'support' | 'business' | 'technical' | 'feedback';
  user_id?: string;
  created_at: string;
  updated_at: string;
  read_at?: string;
  replied_at?: string;
}

interface ContactStats {
  total: number;
  unread: number;
  read: number;
  replied: number;
  archived: number;
  by_category: Record<string, number>;
  by_priority: Record<string, number>;
}

export const ContactMessages: React.FC = () => {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [stats, setStats] = useState<ContactStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status_filter', statusFilter);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);

      const response = await api.get(`/api/v1/contact/messages?${params.toString()}`);
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/api/v1/contact/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchMessages();
    fetchStats();
  }, [statusFilter, categoryFilter, priorityFilter]);

  const handleViewMessage = async (message: ContactMessage) => {
    setSelectedMessage(message);

    // Mark as read if unread
    if (message.status === 'unread') {
      try {
        await api.patch(`/api/v1/contact/messages/${message.id}`, {
          status: 'read'
        });
        fetchMessages();
        fetchStats();
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    }
  };

  const handleUpdateStatus = async (messageId: string, status: string) => {
    try {
      await api.patch(`/api/v1/contact/messages/${messageId}`, { status });
      toast.success(`Message marked as ${status}`);
      fetchMessages();
      fetchStats();
      setSelectedMessage(null);
    } catch (error) {
      console.error('Error updating message:', error);
      toast.error('Failed to update message');
    }
  };

  const handleUpdatePriority = async (messageId: string, priority: string) => {
    try {
      await api.patch(`/api/v1/contact/messages/${messageId}`, { priority });
      toast.success(`Priority updated to ${priority}`);
      fetchMessages();
      fetchStats();
    } catch (error) {
      console.error('Error updating priority:', error);
      toast.error('Failed to update priority');
    }
  };

  const handleDelete = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/api/v1/contact/messages/${messageId}`);
      toast.success('Message deleted');
      fetchMessages();
      fetchStats();
      setSelectedMessage(null);
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      unread: { variant: 'default', icon: Mail },
      read: { variant: 'secondary', icon: MailOpen },
      replied: { variant: 'success', icon: CheckCircle2 },
      archived: { variant: 'outline', icon: Archive },
    };

    const config = variants[status] || variants.unread;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-gray-100 text-gray-800',
      normal: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800',
    };

    return (
      <Badge className={colors[priority] || colors.normal}>
        {priority}
      </Badge>
    );
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      general: 'bg-purple-100 text-purple-800',
      support: 'bg-green-100 text-green-800',
      business: 'bg-indigo-100 text-indigo-800',
      technical: 'bg-yellow-100 text-yellow-800',
      feedback: 'bg-pink-100 text-pink-800',
    };

    return (
      <Badge className={colors[category] || colors.general}>
        {category}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Unread
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.unread}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MailOpen className="h-4 w-4" />
                Read
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.read}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Replied
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.replied}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Archive className="h-4 w-4" />
                Archived
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.archived}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Messages</CardTitle>
          <CardDescription>Manage and respond to user inquiries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[200px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                  <SelectItem value="replied">Replied</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="feedback">Feedback</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={() => { fetchMessages(); fetchStats(); }} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Messages List */}
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading messages...</div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No messages found</div>
            ) : (
              messages.map((message) => (
                <Card
                  key={message.id}
                  className={`cursor-pointer hover:bg-accent transition-colors ${message.status === 'unread' ? 'border-l-4 border-l-blue-600' : ''}`}
                  onClick={() => handleViewMessage(message)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold truncate">{message.subject}</h4>
                          {getStatusBadge(message.status)}
                          {getPriorityBadge(message.priority)}
                          {getCategoryBadge(message.category)}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          From: <span className="font-medium">{message.name}</span> ({message.email})
                        </p>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {message.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Message Detail Dialog */}
      {selectedMessage && (
        <Dialog open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedMessage.subject}
              </DialogTitle>
              <DialogDescription>
                <div className="flex flex-wrap gap-2 mt-2">
                  {getStatusBadge(selectedMessage.status)}
                  {getPriorityBadge(selectedMessage.priority)}
                  {getCategoryBadge(selectedMessage.category)}
                </div>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-1">From:</h4>
                <p className="text-sm">{selectedMessage.name}</p>
                <p className="text-sm text-muted-foreground">{selectedMessage.email}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-1">Received:</h4>
                <p className="text-sm">{new Date(selectedMessage.created_at).toLocaleString()}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-1">Message:</h4>
                <p className="text-sm whitespace-pre-wrap bg-muted p-4 rounded-md">
                  {selectedMessage.message}
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Priority:</h4>
                <Select
                  value={selectedMessage.priority}
                  onValueChange={(value) => handleUpdatePriority(selectedMessage.id, value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-wrap gap-2 pt-4">
                <Button
                  onClick={() => window.open(`mailto:${selectedMessage.email}?subject=Re: ${selectedMessage.subject}`)}
                  variant="default"
                >
                  <Reply className="h-4 w-4 mr-2" />
                  Reply via Email
                </Button>

                {selectedMessage.status !== 'replied' && (
                  <Button
                    onClick={() => handleUpdateStatus(selectedMessage.id, 'replied')}
                    variant="outline"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Mark as Replied
                  </Button>
                )}

                {selectedMessage.status !== 'archived' && (
                  <Button
                    onClick={() => handleUpdateStatus(selectedMessage.id, 'archived')}
                    variant="outline"
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </Button>
                )}

                <Button
                  onClick={() => handleDelete(selectedMessage.id)}
                  variant="destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ContactMessages;