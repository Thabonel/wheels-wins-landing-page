import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { HubConnectionBuilder, HubConnection } from '@microsoft/signalr';

interface ProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  script: string;
}

interface ProgressPayload {
  step: string;
  percent: number;
  details: string;
}

export default function ProcessingModal({ isOpen, onClose, script }: ProcessingModalProps) {
  const [connection, setConnection] = useState<HubConnection | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    const conn = new HubConnectionBuilder()
      .withUrl('/hubs/editing')
      .withAutomaticReconnect()
      .build();

    conn.on('ProgressUpdate', (payload: ProgressPayload) => {
      setProgress(payload.percent);
      setCurrentStep(payload.step);
      setCompletedSteps((prev) => {
        if (prev.includes(payload.step)) return prev;
        return [...prev, payload.step];
      });
    });

    conn.start().then(() => {
      setConnection(conn);
      conn.send(JSON.stringify({ script }));
    });

    return () => {
      conn.stop();
    };
  }, [isOpen]);

  const handleCancel = () => {
    if (connection) {
      connection.send('cancel');
    }
    onClose();
  };

  const steps = [
    'Analyzing script',
    'Transcribing media files',
    'Matching content to script',
    'Generating timeline',
    'Processing audio',
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[600px] h-[400px] flex flex-col justify-between">
        <div>
          <DialogHeader>
            <DialogTitle>Processing</DialogTitle>
            <DialogDescription>{currentStep}</DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <Progress value={progress} />
          </div>
          <ul className="mt-4 space-y-1 text-sm">
            {steps.map((s) => (
              <li key={s} className={completedSteps.includes(s) ? 'text-primary' : 'text-muted-foreground'}>
                {s}
              </li>
            ))}
          </ul>
        </div>
        <Button variant="destructive" onClick={handleCancel} className="self-end">
          Cancel
        </Button>
      </DialogContent>
    </Dialog>
  );
}
