import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';

interface PageHelpProps {
  title: string;
  description: string;
  tips?: string[];
}

export function PageHelp({ title, description, tips }: PageHelpProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-4 right-4 z-50 shadow-lg rounded-full h-12 w-12"
          aria-label="Help"
        >
          <HelpCircle className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-gray-700">{description}</p>
          {tips && tips.length > 0 && (
            <div>
              <h3 className="font-medium mb-2">Quick Tips:</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                {tips.map((tip, i) => (
                  <li key={i} className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
