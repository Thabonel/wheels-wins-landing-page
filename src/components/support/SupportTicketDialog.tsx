import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle } from 'lucide-react';

interface SupportTicketDialogProps {
  trigger?: React.ReactNode;
}

export function SupportTicketDialog({ trigger }: SupportTicketDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<string>('bug');
  const [description, setDescription] = useState('');

  const { user } = useAuth();
  const location = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      toast.error('Please describe the issue');
      return;
    }

    if (!user) {
      toast.error('Please sign in to submit a ticket');
      return;
    }

    setLoading(true);

    try {
      // Use backend API instead of direct Supabase to bypass RLS issues
      const backendUrl = import.meta.env.VITE_API_BASE_URL || 'https://wheels-wins-backend-staging.onrender.com';
      const response = await fetch(`${backendUrl}/api/v1/support/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          subject: `${category.charAt(0).toUpperCase() + category.slice(1)}: ${description.slice(0, 50)}${description.length > 50 ? '...' : ''}`,
          message: description,
          category: category,
          current_page: location.pathname,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to submit ticket' }));
        throw new Error(errorData.detail || 'Failed to submit ticket');
      }

      toast.success('Ticket submitted! We\'ll fix it immediately.');
      setDescription('');
      setCategory('bug');
      setOpen(false);
    } catch (error) {
      console.error('Error submitting ticket:', error);
      toast.error('Failed to submit ticket. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const defaultTrigger = (
    <Button
      variant="outline"
      size="sm"
      className="gap-2"
    >
      <AlertCircle className="h-4 w-4" />
      Report Issue
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Report an Issue</DialogTitle>
            <DialogDescription>
              Tell us what went wrong and we'll fix it immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bug">Bug - Something is broken</SelectItem>
                  <SelectItem value="feature_request">Feature Request - I have an idea</SelectItem>
                  <SelectItem value="question">Question - I need help</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                placeholder="What happened? Be as specific as possible..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[120px]"
                required
              />
            </div>

            <div className="text-sm text-muted-foreground">
              <p><strong>Current page:</strong> {location.pathname}</p>
              {user && <p><strong>User ID:</strong> {user.id.slice(0, 8)}...</p>}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !description.trim()}>
              {loading ? 'Submitting...' : 'Submit Ticket'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
