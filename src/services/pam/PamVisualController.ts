/**
 * PAM Visual Controller
 * Enables PAM to visually control the website through programmatic navigation,
 * form filling, and UI interactions with visual feedback
 */

import { NavigateFunction } from 'react-router-dom';
import type { 
  VisualCommand, 
  NavigationAction, 
  AppointmentDetails, 
  ExpenseDetails,
  ActionResult,
  QueueMetrics,
  DOMCleanupTracker,
  FormData
} from './types';
import { 
  sanitizeText, 
  sanitizeSelector, 
  sanitizeRoute, 
  sanitizeFieldName, 
  sanitizeFormValue,
  createSafeStyles 
} from './sanitizer';

export class PamVisualController {
  private navigationQueue: VisualCommand[] = [];
  private currentAction: VisualCommand | null = null;
  private navigate: NavigateFunction | null = null;
  private isProcessing = false;
  private processingLock = false;
  private cleanupTracker: DOMCleanupTracker = {
    elements: new WeakSet(),
    timeouts: new Set(),
    intervals: new Set()
  };
  private metrics: QueueMetrics = {
    queueSize: 0,
    processing: false,
    currentAction: null,
    completedCount: 0,
    failedCount: 0
  };

  /**
   * Initialize the visual controller with React Router navigation
   */
  setNavigate(navigate: NavigateFunction) {
    this.navigate = navigate;
  }

  /**
   * Execute a visual command with feedback
   */
  async executeVisualCommand(command: VisualCommand): Promise<ActionResult> {
    try {
      // Prevent concurrent queue processing
      if (this.processingLock) {
        this.navigationQueue.push(command);
        this.metrics.queueSize = this.navigationQueue.length;
        return { success: true, message: 'Command queued' };
      }
      
      // Queue visual actions for smooth execution
      this.navigationQueue.push(command);
      this.metrics.queueSize = this.navigationQueue.length;
      
      if (!this.isProcessing) {
        await this.processQueue();
      }
      
      return { success: true };
    } catch (error) {
      this.metrics.failedCount++;
      return { 
        success: false, 
        error: error instanceof Error ? error : new Error('Unknown error')
      };
    }
  }

  /**
   * Process queued visual commands sequentially
   */
  private async processQueue(): Promise<void> {
    // Acquire lock
    if (this.processingLock) return;
    this.processingLock = true;
    this.isProcessing = true;
    this.metrics.processing = true;
    
    try {
      while (this.navigationQueue.length > 0) {
        const action = this.navigationQueue.shift();
        if (action) {
          this.currentAction = action;
          this.metrics.currentAction = action;
          this.metrics.queueSize = this.navigationQueue.length;
          
          const startTime = performance.now();
          const result = await this.executeWithVisualFeedback(action);
          const duration = performance.now() - startTime;
          
          if (result.success) {
            this.metrics.completedCount++;
          } else {
            this.metrics.failedCount++;
          }
          
          this.currentAction = null;
          this.metrics.currentAction = null;
        }
      }
    } finally {
      this.isProcessing = false;
      this.processingLock = false;
      this.metrics.processing = false;
    }
  }

  /**
   * Execute a command with visual feedback
   */
  private async executeWithVisualFeedback(command: VisualCommand): Promise<ActionResult> {
    // Show what PAM is doing
    this.showActionTooltip(sanitizeText(command.description));
    
    try {
      const timeout = command.options?.timeout || 10000;
      const timeoutPromise = new Promise<never>((_, reject) => {
        const id = setTimeout(() => reject(new Error('Command timeout')), timeout);
        this.cleanupTracker.timeouts.add(id);
      });
      
      const executePromise = this.executeCommand(command);
      
      await Promise.race([executePromise, timeoutPromise]);
      
      // Show success feedback
      this.showSuccess(sanitizeText(`✓ ${command.description}`));
      return { success: true, message: command.description };
    } catch (error) {
      console.error('PAM Visual Control Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.showError(sanitizeText(`Failed: ${command.description} - ${errorMessage}`));
      return { success: false, error: error instanceof Error ? error : new Error(errorMessage) };
    }
  }
  
  private async executeCommand(command: VisualCommand): Promise<void> {
    switch (command.type) {
      case 'navigate':
        await this.navigateToRoute(sanitizeRoute(command.target || '/'));
        break;
      case 'fill_form':
        await this.fillForm(command.data || {});
        break;
      case 'click':
        await this.clickElement(sanitizeSelector(command.target || ''));
        break;
      case 'scroll':
        await this.scrollToElement(sanitizeSelector(command.target || ''));
        break;
      case 'highlight':
        await this.highlightElement(sanitizeSelector(command.target || ''));
        break;
      default:
        throw new Error(`Unknown command type: ${command.type}`);
    }
  }

  /**
   * Navigate to a route with animation
   */
  private async navigateToRoute(route: string): Promise<void> {
    if (!this.navigate) {
      throw new Error('Navigation not initialized');
    }
    
    // Highlight navigation area
    await this.highlightElement('[data-pam-nav="true"]');
    
    // Navigate
    this.navigate(route);
    
    // Wait for navigation to complete
    await this.wait(500);
  }

  /**
   * Fill a form with animated typing
   */
  async fillForm(formData: FormData): Promise<void> {
    // Validate formData exists and is an object
    if (!formData || typeof formData !== 'object') {
      console.warn('Invalid form data provided to fillForm');
      return;
    }
    
    for (const [fieldName, value] of Object.entries(formData)) {
      // Skip if fieldName is invalid
      if (!fieldName || typeof fieldName !== 'string') {
        console.warn('Invalid field name:', fieldName);
        continue;
      }
      
      const sanitizedFieldName = sanitizeFieldName(fieldName);
      const field = this.findFormField(sanitizedFieldName);
      
      if (field && field instanceof HTMLInputElement) {
        // Highlight the field
        await this.highlightElement(`#${sanitizedFieldName}, [name="${sanitizedFieldName}"]`);
        
        // Type in the field with animation
        const sanitizedValue = sanitizeFormValue(value);
        await this.typeInField(field, sanitizedValue);
        
        // Trigger React events
        this.triggerReactEvents(field);
        
        // Small delay between fields
        await this.wait(300);
      } else {
        console.warn(`Field not found: ${sanitizedFieldName}`);
      }
    }
  }

  /**
   * Type text into a field with animation
   */
  private async typeInField(field: HTMLInputElement, value: string): Promise<void> {
    field.focus();
    field.value = '';
    
    // Add typing indicator
    field.classList.add('pam-typing');
    
    for (let i = 0; i < value.length; i++) {
      field.value += value[i];
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Variable typing speed for natural feel
      await this.wait(50 + Math.random() * 50);
    }
    
    // Remove typing indicator
    field.classList.remove('pam-typing');
  }

  /**
   * Click an element with visual feedback
   */
  private async clickElement(selector: string): Promise<void> {
    const element = document.querySelector(selector) as HTMLElement;
    if (!element) {
      throw new Error(`Element not found: ${selector}`);
    }
    
    // Highlight before clicking
    await this.highlightElement(selector);
    
    // Simulate click
    element.click();
    
    // Trigger React events
    this.triggerReactEvents(element);
    
    await this.wait(300);
  }

  /**
   * Scroll to an element smoothly
   */
  private async scrollToElement(selector: string): Promise<void> {
    const element = document.querySelector(selector);
    if (!element) {
      throw new Error(`Element not found: ${selector}`);
    }
    
    element.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center' 
    });
    
    await this.wait(500);
    await this.highlightElement(selector);
  }

  /**
   * Highlight an element with pulsing animation
   */
  private async highlightElement(selector: string): Promise<void> {
    const element = document.querySelector(selector) as HTMLElement;
    if (!element) return;
    
    // Add highlight class
    element.classList.add('pam-highlight');
    
    // Remove after animation
    setTimeout(() => {
      element.classList.remove('pam-highlight');
    }, 1000);
    
    await this.wait(1000);
  }

  /**
   * Find a form field by name or id
   */
  private findFormField(fieldName: string): Element | null {
    const sanitized = sanitizeFieldName(fieldName);
    try {
      return document.querySelector(`#${sanitized}`) ||
             document.querySelector(`[name="${sanitized}"]`) ||
             document.querySelector(`[data-field="${sanitized}"]`);
    } catch (error) {
      console.error(`Invalid selector for field: ${sanitized}`);
      return null;
    }
  }

  /**
   * Trigger React events on an element
   */
  private triggerReactEvents(element: Element): void {
    const events = ['input', 'change', 'blur'];
    events.forEach(eventType => {
      const event = new Event(eventType, { bubbles: true, cancelable: true });
      element.dispatchEvent(event);
    });
  }

  /**
   * Show an action tooltip
   */
  private showActionTooltip(text: string): void {
    this.removeExistingTooltips();
    
    const tooltip = document.createElement('div');
    tooltip.className = 'pam-action-tooltip';
    tooltip.textContent = `🤖 PAM: ${text}`;
    
    const styles = createSafeStyles({
      'position': 'fixed',
      'top': '20px',
      'right': '20px',
      'background': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'color': 'white',
      'padding': '12px 20px',
      'border-radius': '8px',
      'font-size': '14px',
      'font-weight': '500',
      'z-index': '10000',
      'animation': 'slideIn 0.3s ease-out'
    });
    
    tooltip.style.cssText = styles;
    document.body.appendChild(tooltip);
    
    // Track for cleanup
    const timeoutId = setTimeout(() => {
      if (tooltip.parentNode) {
        tooltip.remove();
      }
      this.cleanupTracker.timeouts.delete(timeoutId);
    }, 3000);
    
    this.cleanupTracker.timeouts.add(timeoutId);
  }
  
  private removeExistingTooltips(): void {
    document.querySelectorAll('.pam-action-tooltip').forEach(el => el.remove());
  }

  /**
   * Show success message
   */
  private showSuccess(message: string): void {
    const toast = document.createElement('div');
    toast.className = 'pam-success-toast';
    toast.textContent = message;
    
    const styles = createSafeStyles({
      'position': 'fixed',
      'bottom': '20px',
      'right': '20px',
      'background': '#10b981',
      'color': 'white',
      'padding': '12px 20px',
      'border-radius': '8px',
      'font-size': '14px',
      'z-index': '10000',
      'animation': 'fadeInOut 2s ease-in-out'
    });
    
    toast.style.cssText = styles;
    document.body.appendChild(toast);
    
    const timeoutId = setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
      this.cleanupTracker.timeouts.delete(timeoutId);
    }, 2000);
    
    this.cleanupTracker.timeouts.add(timeoutId);
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    const toast = document.createElement('div');
    toast.className = 'pam-error-toast';
    toast.textContent = message;
    
    const styles = createSafeStyles({
      'position': 'fixed',
      'bottom': '20px',
      'right': '20px',
      'background': '#ef4444',
      'color': 'white',
      'padding': '12px 20px',
      'border-radius': '8px',
      'font-size': '14px',
      'z-index': '10000',
      'animation': 'fadeInOut 3s ease-in-out'
    });
    
    toast.style.cssText = styles;
    document.body.appendChild(toast);
    
    const timeoutId = setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
      this.cleanupTracker.timeouts.delete(timeoutId);
    }, 3000);
    
    this.cleanupTracker.timeouts.add(timeoutId);
  }

  /**
   * Wait for specified milliseconds
   */
  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * High-level action: Book an appointment
   */
  async bookAppointment(details: AppointmentDetails): Promise<ActionResult> {
    try {
    // Validate and sanitize details
    const person = details.person || 'Unknown';
    const date = details.date || new Date().toISOString().split('T')[0];
    const time = details.time || '09:00';
    
    // Navigate to You page
    await this.executeVisualCommand({
      type: 'navigate',
      target: '/you',
      description: 'Opening your dashboard'
    });
    
    // Click add event button
    await this.executeVisualCommand({
      type: 'click',
      target: '#add-event-button',
      description: 'Opening calendar'
    });
    
    // Fill appointment form
    await this.executeVisualCommand({
      type: 'fill_form',
      data: {
        'event-title': `Appointment with ${person}`,
        'event-date': date,
        'event-time': time,
        'event-type': 'appointment'
      },
      description: `Scheduling appointment with ${person}`
    });
    
    // Submit form
    await this.executeVisualCommand({
      type: 'click',
      target: '#save-event-button',
      description: 'Saving appointment'
    });
    
    return { success: true, message: `Appointment with ${person} booked successfully` };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error : new Error('Failed to book appointment')
      };
    }
  }

  /**
   * High-level action: Log an expense
   */
  async logExpense(details: ExpenseDetails): Promise<ActionResult> {
    try {
    // Navigate to Wins page
    await this.executeVisualCommand({
      type: 'navigate',
      target: '/wins',
      description: 'Opening financial dashboard'
    });
    
    // Scroll to expenses section
    await this.executeVisualCommand({
      type: 'scroll',
      target: '#expenses-section',
      description: 'Finding expenses section'
    });
    
    // Click add expense
    await this.executeVisualCommand({
      type: 'click',
      target: '#add-expense-button',
      description: 'Opening expense form'
    });
    
    // Fill expense form
    await this.executeVisualCommand({
      type: 'fill_form',
      data: {
        'expense-amount': details.amount.toString(),
        'expense-category': details.category,
        'expense-description': details.description || `${details.category} expense`
      },
      description: `Recording $${details.amount} ${details.category} expense`
    });
    
    // Submit
    await this.executeVisualCommand({
      type: 'click',
      target: '#save-expense-button',
      description: 'Saving expense'
    });
    
    return { success: true, message: `Expense of $${details.amount} logged successfully` };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error : new Error('Failed to log expense')
      };
    }
  }
  
  /**
   * Clean up resources and reset state
   */
  public destroy(): void {
    // Clear all timeouts
    this.cleanupTracker.timeouts.forEach(id => clearTimeout(id));
    this.cleanupTracker.timeouts.clear();
    
    // Clear all intervals
    this.cleanupTracker.intervals.forEach(id => clearInterval(id));
    this.cleanupTracker.intervals.clear();
    
    // Remove all tooltips and toasts
    this.removeExistingTooltips();
    document.querySelectorAll('.pam-success-toast, .pam-error-toast').forEach(el => el.remove());
    
    // Reset state
    this.navigationQueue = [];
    this.currentAction = null;
    this.isProcessing = false;
    this.processingLock = false;
    this.metrics = {
      queueSize: 0,
      processing: false,
      currentAction: null,
      completedCount: 0,
      failedCount: 0
    };
  }
  
  /**
   * Get current metrics
   */
  public getMetrics(): QueueMetrics {
    return { ...this.metrics };
  }
}

// Singleton instance
export const pamVisualController = new PamVisualController();