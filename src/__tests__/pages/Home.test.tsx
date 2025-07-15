import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import Home from '../../pages/Home';

const HomeWithRouter = () => (
  <BrowserRouter>
    <Home />
  </BrowserRouter>
);

describe('Home Page', () => {
  it('renders main heading and description', () => {
    render(<HomeWithRouter />);
    
    expect(screen.getByText('Welcome to Wheels & Wins')).toBeInTheDocument();
    expect(screen.getByText('Your AI-powered travel community platform')).toBeInTheDocument();
  });

  it('renders all feature cards', () => {
    render(<HomeWithRouter />);
    
    expect(screen.getByText('Plan Your Journey')).toBeInTheDocument();
    expect(screen.getByText('Track Progress')).toBeInTheDocument();
    expect(screen.getByText('Connect & Share')).toBeInTheDocument();
  });

  it('renders page container', () => {
    render(<HomeWithRouter />);
    
    const container = screen.getByText('Welcome to Wheels & Wins').closest('.container');
    expect(container).toBeInTheDocument();
  });
});
