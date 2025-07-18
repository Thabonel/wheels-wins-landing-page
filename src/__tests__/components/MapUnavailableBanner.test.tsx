import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import MapUnavailableBanner from '../../components/wheels/trip-planner/MapUnavailableBanner';

describe('MapUnavailableBanner', () => {
  it('renders warning text', () => {
    render(<MapUnavailableBanner />);
    expect(screen.getByText(/map features are disabled/i)).toBeInTheDocument();
  });
});
