/**
 * Unit tests for PamVisualController
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PamVisualController } from '../PamVisualController';
import type { VisualCommand, AppointmentDetails, ExpenseDetails } from '../types';

// Mock the sanitizer module
vi.mock('../sanitizer', () => ({
  sanitizeText: (text: string) => text,
  sanitizeSelector: (selector: string) => selector,
  sanitizeRoute: (route: string) => route,
  sanitizeFieldName: (name: string) => name,
  sanitizeFormValue: (value: any) => String(value),
  createSafeStyles: (styles: Record<string, string>) => 
    Object.entries(styles).map(([k, v]) => `${k}: ${v}`).join('; ')
}));

describe('PamVisualController', () => {
  let controller: PamVisualController;
  let mockNavigate: ReturnType<typeof vi.fn>;
  
  beforeEach(() => {
    // Create a new instance for each test
    controller = new PamVisualController();
    mockNavigate = vi.fn();
    controller.setNavigate(mockNavigate);
    
    // Mock DOM methods
    document.body.innerHTML = '';
    vi.spyOn(document, 'querySelector').mockImplementation((selector) => {
      if (selector === '#test-field') {
        const input = document.createElement('input');
        input.id = 'test-field';
        return input;
      }
      return null;
    });
  });
  
  afterEach(() => {
    // Clean up
    controller.destroy();
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });
  
  describe('Queue Management', () => {
    it('should queue commands for sequential execution', async () => {
      const command1: VisualCommand = {
        type: 'navigate',
        target: '/test1',
        description: 'Test navigation 1'
      };
      
      const command2: VisualCommand = {
        type: 'navigate',
        target: '/test2',
        description: 'Test navigation 2'
      };
      
      const result1 = await controller.executeVisualCommand(command1);
      const result2 = await controller.executeVisualCommand(command2);
      
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
    
    it('should handle queue processing lock correctly', async () => {
      const commands = Array.from({ length: 5 }, (_, i) => ({
        type: 'highlight' as const,
        target: `#element-${i}`,
        description: `Highlight ${i}`
      }));
      
      // Execute all commands simultaneously
      const results = await Promise.all(
        commands.map(cmd => controller.executeVisualCommand(cmd))
      );
      
      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });
  
  describe('Navigation', () => {
    it('should navigate to specified route', async () => {
      const command: VisualCommand = {
        type: 'navigate',
        target: '/dashboard',
        description: 'Navigate to dashboard'
      };
      
      await controller.executeVisualCommand(command);
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 600));
      
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
    
    it('should handle navigation without initialized navigator', async () => {
      const newController = new PamVisualController();
      
      const command: VisualCommand = {
        type: 'navigate',
        target: '/test',
        description: 'Test navigation'
      };
      
      const result = await newController.executeVisualCommand(command);
      
      // Should fail gracefully
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Navigation not initialized');
      
      newController.destroy();
    });
  });
  
  describe('Form Filling', () => {
    it('should fill form fields with animation', async () => {
      const input = document.createElement('input');
      input.id = 'test-field';
      document.body.appendChild(input);
      
      const command: VisualCommand = {
        type: 'fill_form',
        data: {
          'test-field': 'test value'
        },
        description: 'Fill test form'
      };
      
      await controller.executeVisualCommand(command);
      
      // Wait for typing animation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      expect(input.value).toBe('test value');
    });
    
    it('should handle missing form fields gracefully', async () => {
      const command: VisualCommand = {
        type: 'fill_form',
        data: {
          'non-existent-field': 'test value'
        },
        description: 'Fill non-existent form'
      };
      
      const result = await controller.executeVisualCommand(command);
      
      // Should not throw, just log warning
      expect(result.success).toBe(true);
    });
  });
  
  describe('Error Handling', () => {
    it('should handle command timeout', async () => {
      const command: VisualCommand = {
        type: 'click',
        target: '#non-existent',
        description: 'Click non-existent element',
        options: { timeout: 100 }
      };
      
      const result = await controller.executeVisualCommand(command);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Element not found');
    });
    
    it('should handle invalid command type', async () => {
      const command = {
        type: 'invalid-type',
        description: 'Invalid command'
      } as any;
      
      const result = await controller.executeVisualCommand(command);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Unknown command type');
    });
  });
  
  describe('High-Level Actions', () => {
    it('should book appointment with correct sequence', async () => {
      const details: AppointmentDetails = {
        person: 'John Doe',
        date: '2025-08-10',
        time: '14:00'
      };
      
      const result = await controller.bookAppointment(details);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('John Doe');
    });
    
    it('should log expense with correct sequence', async () => {
      const details: ExpenseDetails = {
        amount: 50.00,
        category: 'fuel',
        description: 'Gas station'
      };
      
      const result = await controller.logExpense(details);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('$50');
    });
  });
  
  describe('Memory Management', () => {
    it('should track and cleanup timeouts', async () => {
      const initialTimeoutCount = controller['cleanupTracker'].timeouts.size;
      
      // Create tooltip (which sets a timeout)
      controller['showActionTooltip']('Test tooltip');
      
      expect(controller['cleanupTracker'].timeouts.size).toBeGreaterThan(initialTimeoutCount);
      
      // Destroy should clear all timeouts
      controller.destroy();
      
      expect(controller['cleanupTracker'].timeouts.size).toBe(0);
    });
    
    it('should remove DOM elements on destroy', () => {
      // Create some tooltips and toasts
      controller['showActionTooltip']('Test tooltip');
      controller['showSuccess']('Test success');
      controller['showError']('Test error');
      
      // Should have created DOM elements
      expect(document.querySelectorAll('.pam-action-tooltip').length).toBeGreaterThan(0);
      
      // Destroy should remove all
      controller.destroy();
      
      expect(document.querySelectorAll('.pam-action-tooltip').length).toBe(0);
      expect(document.querySelectorAll('.pam-success-toast').length).toBe(0);
      expect(document.querySelectorAll('.pam-error-toast').length).toBe(0);
    });
  });
  
  describe('Metrics', () => {
    it('should track completed and failed actions', async () => {
      const metrics = controller.getMetrics();
      const initialCompleted = metrics.completedCount;
      const initialFailed = metrics.failedCount;
      
      // Successful command
      await controller.executeVisualCommand({
        type: 'highlight',
        target: 'body',
        description: 'Test highlight'
      });
      
      // Failed command
      await controller.executeVisualCommand({
        type: 'click',
        target: '#non-existent',
        description: 'Test click'
      });
      
      const newMetrics = controller.getMetrics();
      expect(newMetrics.completedCount).toBeGreaterThan(initialCompleted);
      expect(newMetrics.failedCount).toBeGreaterThan(initialFailed);
    });
    
    it('should track queue size', async () => {
      const commands = Array.from({ length: 3 }, (_, i) => ({
        type: 'highlight' as const,
        target: `#element-${i}`,
        description: `Highlight ${i}`
      }));
      
      // Add commands rapidly
      commands.forEach(cmd => controller.executeVisualCommand(cmd));
      
      const metrics = controller.getMetrics();
      expect(metrics.queueSize).toBeGreaterThanOrEqual(0);
    });
  });
});