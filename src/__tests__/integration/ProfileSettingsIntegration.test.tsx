/**
 * Integration Tests: Profile & Settings Components
 * Tests the interaction between profile management and settings configuration
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { mockSupabaseClient, resetAllMocks, createMockProfile } from '../../test/mocks/supabase';
import ProfilePage from '../../pages/profile/ProfilePage';
import SettingsPage from '../../pages/SettingsPage';

// Mock components that would typically be tested separately
vi.mock('../../components/profile/ProfileImageUpload', () => ({
  default: ({ onImageChange }: { onImageChange: (url: string) => void }) => (
    <div data-testid="profile-image-upload">
      <button 
        onClick={() => onImageChange('https://example.com/new-avatar.jpg')}
        data-testid="upload-image-btn"
      >
        Upload Image
      </button>
    </div>
  )
}));

vi.mock('../../components/settings/ProfileSettings', () => ({
  default: ({ profile, onUpdate }: { profile: any; onUpdate: (data: any) => void }) => (
    <div data-testid="profile-settings">
      <input
        data-testid="full-name-input"
        defaultValue={profile?.full_name || ''}
        onChange={(e) => onUpdate({ full_name: e.target.value })}
      />
      <input
        data-testid="bio-input"
        defaultValue={profile?.bio || ''}
        onChange={(e) => onUpdate({ bio: e.target.value })}
      />
    </div>
  )
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
});

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Profile & Settings Integration Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    resetAllMocks();
    queryClient = createTestQueryClient();
    
    // Setup default successful responses
    mockSupabaseClient.from = vi.fn().mockImplementation((table) => ({
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: createMockProfile(),
        error: null
      })
    }));
  });

  describe('Profile Data Synchronization', () => {
    it('should sync profile updates between profile page and settings', async () => {
      const user = userEvent.setup();
      
      // Render profile page first
      const { rerender } = render(
        <TestWrapper>
          <ProfilePage />
        </TestWrapper>
      );

      // Wait for profile to load
      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
      });

      // Update profile image
      const uploadBtn = screen.getByTestId('upload-image-btn');
      await user.click(uploadBtn);

      // Verify update was called
      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('profiles');
      });

      // Now render settings page
      rerender(
        <TestWrapper>
          <SettingsPage />
        </TestWrapper>
      );

      // Check that settings page reflects the updated profile
      await waitFor(() => {
        const profileSettings = screen.getByTestId('profile-settings');
        expect(profileSettings).toBeInTheDocument();
      });
    });

    it('should handle profile update failures gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock update failure
      mockSupabaseClient.from = vi.fn().mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockRejectedValue(new Error('Update failed'))
      }));

      render(
        <TestWrapper>
          <ProfilePage />
        </TestWrapper>
      );

      const uploadBtn = screen.getByTestId('upload-image-btn');
      await user.click(uploadBtn);

      // Should show error state
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Settings Profile Updates', () => {
    it('should update profile from settings and reflect in profile display', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SettingsPage />
        </TestWrapper>
      );

      // Wait for settings to load
      await waitFor(() => {
        expect(screen.getByTestId('profile-settings')).toBeInTheDocument();
      });

      // Update full name in settings
      const nameInput = screen.getByTestId('full-name-input');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Test User');

      // Verify database update was triggered
      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('profiles');
      });
    });

    it('should validate profile data before updates', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SettingsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('profile-settings')).toBeInTheDocument();
      });

      // Try to set empty name (should be invalid)
      const nameInput = screen.getByTestId('full-name-input');
      await user.clear(nameInput);

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Profile Updates', () => {
    it('should handle concurrent profile updates', async () => {
      const user = userEvent.setup();
      
      // Simulate concurrent updates
      let updateCallCount = 0;
      mockSupabaseClient.from = vi.fn().mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockImplementation(() => {
          updateCallCount++;
          return {
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: createMockProfile({ full_name: `User ${updateCallCount}` }),
              error: null
            })
          };
        })
      }));

      render(
        <TestWrapper>
          <SettingsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('profile-settings')).toBeInTheDocument();
      });

      // Trigger multiple rapid updates
      const nameInput = screen.getByTestId('full-name-input');
      await user.type(nameInput, 'A');
      await user.type(nameInput, 'B');
      await user.type(nameInput, 'C');

      // Should handle all updates properly
      await waitFor(() => {
        expect(updateCallCount).toBeGreaterThan(0);
      });
    });
  });

  describe('Profile Completion Flow', () => {
    it('should guide user through profile completion in settings', async () => {
      const user = userEvent.setup();
      
      // Mock incomplete profile
      mockSupabaseClient.from = vi.fn().mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: createMockProfile({ 
            full_name: '',
            bio: '',
            avatar_url: null
          }),
          error: null
        }),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis()
      }));

      render(
        <TestWrapper>
          <SettingsPage />
        </TestWrapper>
      );

      // Should show profile completion prompts
      await waitFor(() => {
        expect(screen.getByText(/complete your profile/i)).toBeInTheDocument();
      });

      // Fill required fields
      const nameInput = screen.getByTestId('full-name-input');
      await user.type(nameInput, 'Complete User');

      const bioInput = screen.getByTestId('bio-input');
      await user.type(bioInput, 'User bio description');

      // Should update completion status
      await waitFor(() => {
        expect(screen.queryByText(/complete your profile/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Data Persistence', () => {
    it('should persist profile changes across page reloads', async () => {
      const user = userEvent.setup();
      
      const { rerender } = render(
        <TestWrapper>
          <SettingsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('profile-settings')).toBeInTheDocument();
      });

      // Update profile
      const nameInput = screen.getByTestId('full-name-input');
      await user.clear(nameInput);
      await user.type(nameInput, 'Persistent User');

      // Simulate page reload by re-rendering
      rerender(
        <TestWrapper>
          <SettingsPage />
        </TestWrapper>
      );

      // Should load updated profile
      await waitFor(() => {
        expect(screen.getByDisplayValue('Persistent User')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Mock network error
      mockSupabaseClient.from = vi.fn().mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockRejectedValue(new Error('Network error'))
      }));

      render(
        <TestWrapper>
          <ProfilePage />
        </TestWrapper>
      );

      // Should show error state
      await waitFor(() => {
        expect(screen.getByText(/failed to load profile/i)).toBeInTheDocument();
      });

      // Should provide retry option
      expect(screen.getByText(/retry/i)).toBeInTheDocument();
    });

    it('should handle authentication errors', async () => {
      // Mock auth error
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' }
      });

      render(
        <TestWrapper>
          <SettingsPage />
        </TestWrapper>
      );

      // Should redirect to login
      await waitFor(() => {
        expect(screen.getByText(/please log in/i)).toBeInTheDocument();
      });
    });
  });
});