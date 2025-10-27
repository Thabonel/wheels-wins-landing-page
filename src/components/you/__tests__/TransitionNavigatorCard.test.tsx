import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { TransitionNavigatorCard } from '../TransitionNavigatorCard';
import type { TransitionProfile } from '@/types/transition.types';

const mockUseAuth = vi.fn();
const mockUseTransitionModule = vi.fn();
const rpcMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();
const navigateMock = vi.fn();

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/hooks/useTransitionModule', () => ({
  useTransitionModule: () => mockUseTransitionModule(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
  default: { rpc: (...args: unknown[]) => rpcMock(...args) },
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

describe('TransitionNavigatorCard', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123', email: 'user@example.com' },
    });

    mockUseTransitionModule.mockReturnValue({
      isEnabled: false,
      isLoading: false,
      profile: null,
      shouldShowInNav: false,
      daysUntilDeparture: null,
    });

    rpcMock.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
    navigateMock.mockReset();
  });

  afterEach(() => {
    mockUseAuth.mockReset();
    mockUseTransitionModule.mockReset();
  });

  it('calls RPC to start transition profile and navigates on success', async () => {
    const profile: TransitionProfile = {
      id: 'profile-1',
      user_id: 'user-123',
      departure_date: '2025-04-01',
      current_phase: 'planning',
      transition_type: 'full_time',
      motivation: null,
      concerns: [],
      is_enabled: true,
      auto_hide_after_departure: true,
      hide_days_after_departure: 30,
      completion_percentage: 0,
      last_milestone_reached: null,
      created_at: '2025-01-01T12:00:00Z',
      updated_at: '2025-01-01T12:00:00Z',
      archived_at: null,
    };

    rpcMock.mockResolvedValue({ data: profile, error: null });

    render(<TransitionNavigatorCard />);

    const startButton = screen.getByRole('button', { name: /start planning my transition/i });
    const baseDate = new Date();
    await userEvent.click(startButton);

    const expectedDate = new Date(baseDate);
    expectedDate.setDate(expectedDate.getDate() + 90);
    const expectedDateString = expectedDate.toISOString().slice(0, 10);

    await waitFor(() => {
      expect(rpcMock).toHaveBeenCalledWith('start_transition_profile', {
        p_departure_date: expectedDateString,
        p_is_enabled: true,
      });
    });

    expect(toastSuccessMock).toHaveBeenCalledWith("Let's start planning your transition!");
    expect(navigateMock).toHaveBeenCalledWith('/transition');
  });

  it('shows permission guidance when RPC returns RLS error', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { code: '42501', message: 'permission denied' } });

    render(<TransitionNavigatorCard />);

    const startButton = screen.getByRole('button', { name: /start planning my transition/i });
    await userEvent.click(startButton);

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith('Still missing permission to create your transition profile');
    });

    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('requires login before starting planning', async () => {
    mockUseAuth.mockReturnValue({ user: null });

    render(<TransitionNavigatorCard />);

    const startButton = screen.getByRole('button', { name: /start planning my transition/i });
    await userEvent.click(startButton);

    expect(toastErrorMock).toHaveBeenCalledWith('Please log in to start planning');
    expect(rpcMock).not.toHaveBeenCalled();
  });
});
