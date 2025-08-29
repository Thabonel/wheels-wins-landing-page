import React, { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export interface CandidateMatch {
  fileId: string;
  fileName: string;
  score: number;
}

interface Props {
  candidates: CandidateMatch[];
  onSelect: (match: CandidateMatch) => void;
}

export function ContentMatchFallback({ candidates, onSelect }: Props) {
  const [selected, setSelected] = useState<CandidateMatch | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Matching Media</CardTitle>
        <CardDescription>
          No automatic match found. Please choose the correct media file.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {candidates.map((c) => (
            <li key={c.fileId}>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="match"
                  value={c.fileId}
                  onChange={() => setSelected(c)}
                />
                <span>
                  {c.fileName} ({Math.round(c.score * 100)}%)
                </span>
              </label>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button disabled={!selected} onClick={() => selected && onSelect(selected)}>
          Select
        </Button>
      </CardFooter>
    </Card>
  );
}

export default ContentMatchFallback;
