import { useState } from 'react';
import { Button } from '@/components/ui/button';
import ProcessingModal from '@/components/editing/ProcessingModal';

export default function VideoEditor() {
  const [open, setOpen] = useState(false);
  const sampleScript =
    "ANCHOR: Good evening, I'm Alex. VO: The city council met today...";
  return (
    <div className="container p-6">
      <Button onClick={() => setOpen(true)}>Start Processing</Button>
      <ProcessingModal
        isOpen={open}
        onClose={() => setOpen(false)}
        script={sampleScript}
      />
    </div>
  );
}
