import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Mail, Send, Loader2 } from 'lucide-react';
import { api } from '@/services/api';

interface ContactFormProps {
  defaultCategory?: 'general' | 'support' | 'business' | 'technical' | 'feedback';
  defaultSubject?: string;
  triggerButton?: React.ReactNode;
  inline?: boolean;
  onSuccess?: () => void;
}

export const ContactForm: React.FC<ContactFormProps> = ({
  defaultCategory = 'general',
  defaultSubject = '',
  triggerButton,
  inline = false,
  onSuccess,
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: defaultSubject,
    message: '',
    category: defaultCategory,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim() || formData.name.length < 2) {
      toast.error('Please enter your name (at least 2 characters)');
      return;
    }

    if (!formData.email.trim() || !formData.email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (!formData.subject.trim() || formData.subject.length < 3) {
      toast.error('Please enter a subject (at least 3 characters)');
      return;
    }

    if (!formData.message.trim() || formData.message.length < 10) {
      toast.error('Please enter a message (at least 10 characters)');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/api/v1/contact/submit', formData);

      if (response.data.success) {
        toast.success('Message sent successfully! We\'ll get back to you soon.');

        // Reset form
        setFormData({
          name: '',
          email: '',
          subject: '',
          message: '',
          category: 'general',
        });

        // Close dialog if not inline
        if (!inline) {
          setOpen(false);
        }

        // Call success callback
        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast.error('Failed to send message. Please try again.');
      }
    } catch (error: any) {
      console.error('Contact form error:', error);
      toast.error(error.response?.data?.detail || 'Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          type="text"
          placeholder="Your name"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          required
          minLength={2}
          maxLength={100}
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          placeholder="your.email@example.com"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          required
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Select
          value={formData.category}
          onValueChange={(value) => handleChange('category', value)}
          disabled={loading}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="general">General Inquiry</SelectItem>
            <SelectItem value="support">Technical Support</SelectItem>
            <SelectItem value="business">Business Inquiry</SelectItem>
            <SelectItem value="technical">Technical Question</SelectItem>
            <SelectItem value="feedback">Feedback</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject">Subject *</Label>
        <Input
          id="subject"
          type="text"
          placeholder="Brief subject of your message"
          value={formData.subject}
          onChange={(e) => handleChange('subject', e.target.value)}
          required
          minLength={3}
          maxLength={200}
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Message *</Label>
        <Textarea
          id="message"
          placeholder="Tell us more about your inquiry..."
          value={formData.message}
          onChange={(e) => handleChange('message', e.target.value)}
          required
          minLength={10}
          maxLength={5000}
          rows={6}
          disabled={loading}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">
          {formData.message.length}/5000 characters
        </p>
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" />
            Send Message
          </>
        )}
      </Button>
    </form>
  );

  // Inline mode - just render the form
  if (inline) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        {formContent}
      </div>
    );
  }

  // Dialog mode - render in a dialog
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button variant="outline" size="sm">
            <Mail className="mr-2 h-4 w-4" />
            Contact Us
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Contact Us</DialogTitle>
          <DialogDescription>
            Fill out the form below and we'll get back to you as soon as possible.
          </DialogDescription>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
};

export default ContactForm;