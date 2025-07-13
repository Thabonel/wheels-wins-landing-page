import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Features from '../../components/Features';

describe('Features Component', () => {
  it('renders features section', () => {
    render(<Features />);
    
    const featuresSection = screen.getByRole('region');
    expect(featuresSection).toBeInTheDocument();
  });

  it('renders feature headings', () => {
    render(<Features />);
    
    const headings = screen.getAllByRole('heading');
    expect(headings.length).toBeGreaterThan(0);
  });

  it('renders feature descriptions', () => {
    render(<Features />);
    
    const section = screen.getByRole('region');
    expect(section).toHaveTextContent(/feature/i);
  });
});