import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import Layout from '../../components/Layout';

// Mock AuthContext
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    signUp: vi.fn()
  })
}));

const LayoutWithRouter = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <Layout>{children}</Layout>
  </BrowserRouter>
);

describe('Layout Component', () => {
  it('renders layout with children', () => {
    render(
      <LayoutWithRouter>
        <div data-testid="test-child">Test Content</div>
      </LayoutWithRouter>
    );
    
    const child = screen.getByTestId('test-child');
    expect(child).toBeInTheDocument();
    expect(child).toHaveTextContent('Test Content');
  });

  it('renders main content area', () => {
    render(
      <LayoutWithRouter>
        <div>Content</div>
      </LayoutWithRouter>
    );
    
    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
  });

  it('provides layout structure', () => {
    render(
      <LayoutWithRouter>
        <div>Test</div>
      </LayoutWithRouter>
    );
    
    const layoutContainer = screen.getByRole('main').parentElement;
    expect(layoutContainer).toBeInTheDocument();
  });
});