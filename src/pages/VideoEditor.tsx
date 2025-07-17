import { useState } from 'react';
import { Button } from '@/components/ui/button';
import ProcessingModal from '@/components/editing/ProcessingModal';

export default function VideoEditor() {
  const [open, setOpen] = useState(false);
  return (
    <div className="container p-6">
      <Button onClick={() => setOpen(true)}>Start Processing</Button>
      <ProcessingModal isOpen={open} onClose={() => setOpen(false)} />
    </div>
  );
}
