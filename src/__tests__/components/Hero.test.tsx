import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import Hero from '../../components/Hero';

const HeroWithRouter = () => (
  <BrowserRouter>
    <Hero />
  </BrowserRouter>
);

describe('Hero Component', () => {
  it('renders hero section with main heading', () => {
    render(<HeroWithRouter />);
    
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
  });

  it('renders call-to-action button', () => {
    render(<HeroWithRouter />);
    
    const ctaButton = screen.getByRole('button');
    expect(ctaButton).toBeInTheDocument();
  });

  it('contains hero content section', () => {
    render(<HeroWithRouter />);
    
    const heroSection = screen.getByRole('main');
    expect(heroSection).toBeInTheDocument();
  });
});