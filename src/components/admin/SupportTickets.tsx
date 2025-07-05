import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
}

// Mock data for demonstration
const mockTickets: Ticket[] = [
  {
    id: '1',
    user_id: 'user_12345678',
    subject: 'Login Issues',
    message: 'I cannot log into my account. Getting authentication error.',
    status: 'open',
    created_at: new Date().toISOString()
  },
  {
    id: '2',
    user_id: 'user_87654321',
    subject: 'Payment Problem',
    message: 'My payment was declined but I was charged. Please help resolve this.',
    status: 'in_progress',
    created_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: '3',
    user_id: 'user_11223344',
    subject: 'Feature Request',
    message: 'Would love to see dark mode added to the app.',
    status: 'open',
    created_at: new Date(Date.now() - 172800000).toISOString()
  }
];

const SupportTickets = () => {
  const [tickets, setTickets] = useState<Ticket[]>(mockTickets);
  const [loading, setLoading] = useState(false);

  const fetchTickets = async () => {
    setLoading(true);
    // Simulate API delay
    setTimeout(() => {
      setTickets(mockTickets);
      setLoading(false);
      toast.success('Tickets refreshed');
    }, 1000);
  };

  const updateStatus = async (ticketId: string, status: string) => {
    setTickets(prev => 
      prev.map(ticket => 
        ticket.id === ticketId 
          ? { ...ticket, status }
          : ticket
      )
    );
    toast.success('Ticket status updated');
  };

  useEffect(() => {
    // Initial load with mock data
    setTickets(mockTickets);
    setLoading(false);
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Support Tickets</h1>
          <p className="text-muted-foreground text-sm">Manage user support requests</p>
        </div>
        <Button onClick={fetchTickets} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Open Tickets ({tickets.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No open tickets.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{t.subject}</p>
                          <p className="text-sm text-gray-500 truncate max-w-xs">{t.message}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{t.user_id.slice(0, 8)}...</TableCell>
                      <TableCell>
                        <Badge variant="outline">{t.status}</Badge>
                      </TableCell>
                      <TableCell>{new Date(t.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Select value={t.status} onValueChange={(val) => updateStatus(t.id, val)}>
                          <SelectTrigger className="w-[120px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
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

export default SupportTickets;
