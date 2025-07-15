import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Features from '../../components/Features';

describe('Features Component', () => {
  it('renders features section', () => {
    render(<Features />);
    
    const featuresSection = screen.getByText('Everything You Need for Life on the Road');
    expect(featuresSection).toBeInTheDocument();
  });

  it('renders feature headings', () => {
    render(<Features />);
    
    const headings = screen.getAllByRole('heading');
    expect(headings.length).toBeGreaterThan(0);
  });

  it('renders feature descriptions', () => {
    render(<Features />);
    
    expect(screen.getByText('Track Your Travel Budget')).toBeInTheDocument();
    expect(screen.getByText('Plan Perfect Routes')).toBeInTheDocument();
    expect(screen.getByText('Connect with Fellow Travelers')).toBeInTheDocument();
    expect(screen.getByText('AI Travel Companion')).toBeInTheDocument();
  });
});
