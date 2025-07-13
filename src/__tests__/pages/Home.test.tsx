import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import Home from '../../pages/Home';

// Mock all the complex components
vi.mock('../../components/Hero', () => ({
  default: () => <div data-testid="hero">Hero Component</div>
}));

vi.mock('../../components/Features', () => ({
  default: () => <div data-testid="features">Features Component</div>
}));

vi.mock('../../components/HowItWorks', () => ({
  default: () => <div data-testid="how-it-works">How It Works Component</div>
}));

vi.mock('../../components/Testimonials', () => ({
  default: () => <div data-testid="testimonials">Testimonials Component</div>
}));

vi.mock('../../components/PricingPlans', () => ({
  default: () => <div data-testid="pricing">Pricing Component</div>
}));

vi.mock('../../components/CallToAction', () => ({
  default: () => <div data-testid="cta">Call to Action Component</div>
}));

const HomeWithRouter = () => (
  <BrowserRouter>
    <Home />
  </BrowserRouter>
);

describe('Home Page', () => {
  it('renders all main sections', () => {
    render(<HomeWithRouter />);
    
    expect(screen.getByTestId('hero')).toBeInTheDocument();
    expect(screen.getByTestId('features')).toBeInTheDocument();
    expect(screen.getByTestId('how-it-works')).toBeInTheDocument();
    expect(screen.getByTestId('testimonials')).toBeInTheDocument();
    expect(screen.getByTestId('pricing')).toBeInTheDocument();
    expect(screen.getByTestId('cta')).toBeInTheDocument();
  });

  it('renders page container', () => {
    render(<HomeWithRouter />);
    
    const pageContainer = screen.getByTestId('hero').parentElement;
    expect(pageContainer).toBeInTheDocument();
  });
});