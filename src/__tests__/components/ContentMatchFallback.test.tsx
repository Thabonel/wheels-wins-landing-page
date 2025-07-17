import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ContentMatchFallback, { CandidateMatch } from '../../components/ContentMatchFallback';

describe('ContentMatchFallback', () => {
  it('allows manual selection of candidates', () => {
    const candidates: CandidateMatch[] = [
      { fileId: '1', fileName: 'a.mp4', score: 0.9 },
      { fileId: '2', fileName: 'b.mp4', score: 0.8 },
    ];
    const onSelect = vi.fn();
    render(<ContentMatchFallback candidates={candidates} onSelect={onSelect} />);
    const option = screen.getByLabelText(/a.mp4/i);
    fireEvent.click(option);
    fireEvent.click(screen.getByRole('button', { name: /select/i }));
    expect(onSelect).toHaveBeenCalledWith(candidates[0]);
  });
});
