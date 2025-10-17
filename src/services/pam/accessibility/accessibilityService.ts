/**
 * PAM Accessibility Service
 * 
 * Comprehensive accessibility support for PAM components including:
 * - ARIA label management
 * - Screen reader announcements
 * - Focus management
 * - Keyboard navigation
 * - Color contrast validation
 */

export interface AriaLabels {
  // Main PAM interface
  pamContainer: string;
  pamHeader: string;
  messagesArea: string;
  messageInput: string;
  sendButton: string;
  clearButton: string;
  
  // Messages
  userMessage: string;
  assistantMessage: string;
  loadingMessage: string;
  errorMessage: string;
  messageTimestamp: string;
  
  // Voice controls
  voiceToggle: string;
  voiceSettings: string;
  voiceInputToggle: string;
  voiceOutputToggle: string;
  stopSpeakingButton: string;
  
  // Navigation
  skipToInput: string;
  skipToMessages: string;
  
  // Status
  speakingIndicator: string;
  typingIndicator: string;
  errorAlert: string;
}

export interface AccessibilitySettings {
  enableScreenReader: boolean;
  enableKeyboardNavigation: boolean;
  enableFocusIndicators: boolean;
  enableHighContrast: boolean;
  reducedMotion: boolean;
  announceMessages: boolean;
  voicePreferences: {
    autoAnnounceResponses: boolean;
    pauseBeforeReading: number;
    speechRate: number;
  };
}

export interface ColorContrastSettings {
  background: string;
  foreground: string;
  primary: string;
  secondary: string;
  error: string;
  success: string;
  warning: string;
}

/**
 * Screen Reader Announcement Types
 */
export type AnnouncementPriority = 'polite' | 'assertive' | 'off';

export interface Announcement {
  message: string;
  priority: AnnouncementPriority;
  interrupt?: boolean;
}

/**
 * Focus Management Types
 */
export interface FocusTarget {
  element: HTMLElement;
  reason: 'user-action' | 'programmatic' | 'error' | 'completion';
}

export interface KeyboardShortcut {
  keys: string[];
  description: string;
  handler: () => void;
  scope: 'global' | 'pam' | 'input';
}

/**
 * PAM Accessibility Service Class
 */
export class PAMAccessibilityService {
  private static instance: PAMAccessibilityService;
  private ariaLiveRegion: HTMLElement | null = null;
  private settings: AccessibilitySettings;
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private focusHistory: HTMLElement[] = [];
  
  private constructor() {
    this.settings = this.loadSettings();
    this.initializeAriaLiveRegion();
    this.setupKeyboardShortcuts();
    this.detectAccessibilityPreferences();
  }

  public static getInstance(): PAMAccessibilityService {
    if (!PAMAccessibilityService.instance) {
      PAMAccessibilityService.instance = new PAMAccessibilityService();
    }
    return PAMAccessibilityService.instance;
  }

  /**
   * Initialize ARIA live region for screen reader announcements
   */
  private initializeAriaLiveRegion(): void {
    // Create or find existing aria-live region
    this.ariaLiveRegion = document.getElementById('pam-aria-live');
    
    if (!this.ariaLiveRegion) {
      this.ariaLiveRegion = document.createElement('div');
      this.ariaLiveRegion.id = 'pam-aria-live';
      this.ariaLiveRegion.setAttribute('aria-live', 'polite');
      this.ariaLiveRegion.setAttribute('aria-atomic', 'true');
      this.ariaLiveRegion.className = 'sr-only absolute -left-[10000px] w-[1px] h-[1px] overflow-hidden';
      document.body.appendChild(this.ariaLiveRegion);
    }
  }

  /**
   * Setup keyboard shortcuts for PAM
   */
  private setupKeyboardShortcuts(): void {
    const shortcuts: KeyboardShortcut[] = [
      {
        keys: ['Ctrl', 'Enter'],
        description: 'Send message',
        handler: () => this.triggerSendMessage(),
        scope: 'pam'
      },
      {
        keys: ['Ctrl', 'Shift', 'C'],
        description: 'Clear chat',
        handler: () => this.triggerClearChat(),
        scope: 'pam'
      },
      {
        keys: ['Ctrl', 'Shift', 'V'],
        description: 'Toggle voice input',
        handler: () => this.triggerVoiceToggle(),
        scope: 'pam'
      },
      {
        keys: ['Escape'],
        description: 'Stop speaking',
        handler: () => this.triggerStopSpeaking(),
        scope: 'pam'
      },
      {
        keys: ['Ctrl', '/'],
        description: 'Show keyboard shortcuts',
        handler: () => this.showKeyboardShortcuts(),
        scope: 'pam'
      }
    ];

    shortcuts.forEach(shortcut => {
      const key = shortcut.keys.join('+');
      this.shortcuts.set(key, shortcut);
    });

    // Add global keyboard listener
    document.addEventListener('keydown', this.handleKeyboardShortcut.bind(this));
  }

  /**
   * Handle keyboard shortcuts
   */
  private handleKeyboardShortcut(event: KeyboardEvent): void {
    const pressedKeys: string[] = [];
    
    if (event.ctrlKey) pressedKeys.push('Ctrl');
    if (event.shiftKey) pressedKeys.push('Shift');
    if (event.altKey) pressedKeys.push('Alt');
    if (event.metaKey) pressedKeys.push('Meta');
    
    pressedKeys.push(event.key);
    
    const keyCombo = pressedKeys.join('+');
    const shortcut = this.shortcuts.get(keyCombo);
    
    if (shortcut) {
      event.preventDefault();
      shortcut.handler();
      this.announce(`Keyboard shortcut activated: ${shortcut.description}`, 'polite');
    }
  }

  /**
   * Detect user's accessibility preferences
   */
  private detectAccessibilityPreferences(): void {
    // Detect reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    // Detect high contrast preference
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
    
    // Update settings based on system preferences
    this.settings.reducedMotion = prefersReducedMotion;
    this.settings.enableHighContrast = prefersHighContrast;
    
    // Listen for preference changes
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
      this.settings.reducedMotion = e.matches;
      this.saveSettings();
    });
    
    window.matchMedia('(prefers-contrast: high)').addEventListener('change', (e) => {
      this.settings.enableHighContrast = e.matches;
      this.saveSettings();
    });
  }

  /**
   * Announce message to screen readers
   */
  public announce(message: string, priority: AnnouncementPriority = 'polite', interrupt: boolean = false): void {
    if (!this.settings.enableScreenReader || !this.ariaLiveRegion) return;

    // Update aria-live priority
    this.ariaLiveRegion.setAttribute('aria-live', priority);
    
    if (interrupt) {
      // Clear existing content first
      this.ariaLiveRegion.textContent = '';
      // Small delay to ensure screen reader notices the change
      setTimeout(() => {
        if (this.ariaLiveRegion) {
          this.ariaLiveRegion.textContent = message;
        }
      }, 50);
    } else {
      this.ariaLiveRegion.textContent = message;
    }
  }

  /**
   * Announce new message received
   */
  public announceNewMessage(role: 'user' | 'assistant', content: string): void {
    if (!this.settings.announceMessages) return;
    
    const roleText = role === 'user' ? 'You said' : 'PAM responded';
    const cleanContent = this.cleanTextForScreenReader(content);
    const announcement = `${roleText}: ${cleanContent}`;
    
    this.announce(announcement, 'polite');
  }

  /**
   * Announce PAM status changes
   */
  public announceStatusChange(status: 'thinking' | 'speaking' | 'listening' | 'error' | 'ready'): void {
    const statusMessages = {
      thinking: 'PAM is processing your message',
      speaking: 'PAM is speaking the response',
      listening: 'PAM is listening for voice input',
      error: 'An error occurred. Please try again',
      ready: 'PAM is ready for your next message'
    };
    
    this.announce(statusMessages[status], 'polite');
  }

  /**
   * Clean text for screen reader consumption
   */
  private cleanTextForScreenReader(text: string): string {
    return text
      .replace(/\*\*(.+?)\*\*/g, 'emphasized $1') // Bold text
      .replace(/\*(.+?)\*/g, 'emphasized $1')     // Italic text
      .replace(/`(.+?)`/g, 'code $1')             // Code text
      .replace(/#{1,6}\s(.+)/g, 'heading $1')     // Headers
      .replace(/\n+/g, '. ')                      // Line breaks
      .replace(/\s+/g, ' ')                       // Multiple spaces
      .trim();
  }

  /**
   * Manage focus for accessibility
   */
  public manageFocus(target: FocusTarget): void {
    if (!this.settings.enableKeyboardNavigation) return;
    
    // Store current focus for history
    const currentElement = document.activeElement as HTMLElement;
    if (currentElement && currentElement !== target.element) {
      this.focusHistory.push(currentElement);
      // Keep history to last 10 elements
      if (this.focusHistory.length > 10) {
        this.focusHistory.shift();
      }
    }
    
    // Focus the target element
    target.element.focus();
    
    // Announce focus change if needed
    const elementRole = target.element.getAttribute('role') || target.element.tagName.toLowerCase();
    const elementLabel = this.getAccessibleName(target.element);
    
    if (target.reason === 'error') {
      this.announce(`Focus moved to ${elementRole}${elementLabel ? `: ${  elementLabel}` : ''} due to error`, 'assertive');
    }
  }

  /**
   * Get accessible name for an element
   */
  private getAccessibleName(element: HTMLElement): string {
    return element.getAttribute('aria-label') ||
           element.getAttribute('aria-labelledby') ||
           (element as HTMLInputElement).placeholder ||
           element.textContent ||
           '';
  }

  /**
   * Restore previous focus
   */
  public restoreFocus(): void {
    if (this.focusHistory.length > 0) {
      const previousElement = this.focusHistory.pop();
      if (previousElement && document.contains(previousElement)) {
        previousElement.focus();
      }
    }
  }

  /**
   * Get ARIA labels for PAM components
   */
  public getAriaLabels(): AriaLabels {
    return {
      // Main PAM interface
      pamContainer: 'PAM - Personal AI Manager chat interface',
      pamHeader: 'PAM header with controls and status',
      messagesArea: 'Conversation messages area',
      messageInput: 'Type your message to PAM',
      sendButton: 'Send message to PAM',
      clearButton: 'Clear chat history',
      
      // Messages
      userMessage: 'Your message',
      assistantMessage: 'PAM response',
      loadingMessage: 'PAM is processing your message',
      errorMessage: 'Error message',
      messageTimestamp: 'Message timestamp',
      
      // Voice controls
      voiceToggle: 'Toggle voice input',
      voiceSettings: 'Voice input and output settings',
      voiceInputToggle: 'Enable or disable voice input',
      voiceOutputToggle: 'Enable or disable voice output',
      stopSpeakingButton: 'Stop PAM from speaking',
      
      // Navigation
      skipToInput: 'Skip to message input',
      skipToMessages: 'Skip to messages area',
      
      // Status
      speakingIndicator: 'PAM is currently speaking',
      typingIndicator: 'PAM is typing a response',
      errorAlert: 'Error alert'
    };
  }

  /**
   * Validate color contrast ratios
   */
  public validateColorContrast(foreground: string, background: string): {
    ratio: number;
    aaCompliant: boolean;
    aaaCompliant: boolean;
  } {
    const ratio = this.calculateContrastRatio(foreground, background);
    
    return {
      ratio,
      aaCompliant: ratio >= 4.5,
      aaaCompliant: ratio >= 7
    };
  }

  /**
   * Calculate contrast ratio between two colors
   */
  private calculateContrastRatio(color1: string, color2: string): number {
    const lum1 = this.getLuminance(color1);
    const lum2 = this.getLuminance(color2);
    
    const bright = Math.max(lum1, lum2);
    const dark = Math.min(lum1, lum2);
    
    return (bright + 0.05) / (dark + 0.05);
  }

  /**
   * Calculate relative luminance of a color
   */
  private getLuminance(color: string): number {
    // Convert color to RGB values
    const rgb = this.hexToRgb(color);
    if (!rgb) return 0;
    
    const sRGB = [rgb.r, rgb.g, rgb.b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
  }

  /**
   * Convert hex color to RGB
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  /**
   * Get accessibility settings
   */
  public getSettings(): AccessibilitySettings {
    return { ...this.settings };
  }

  /**
   * Update accessibility settings
   */
  public updateSettings(newSettings: Partial<AccessibilitySettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
    this.announce('Accessibility settings updated', 'polite');
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): AccessibilitySettings {
    const stored = localStorage.getItem('pam-accessibility-settings');
    const defaults: AccessibilitySettings = {
      enableScreenReader: true,
      enableKeyboardNavigation: true,
      enableFocusIndicators: true,
      enableHighContrast: false,
      reducedMotion: false,
      announceMessages: true,
      voicePreferences: {
        autoAnnounceResponses: true,
        pauseBeforeReading: 500,
        speechRate: 1.0
      }
    };
    
    return stored ? { ...defaults, ...JSON.parse(stored) } : defaults;
  }

  /**
   * Save settings to localStorage
   */
  private saveSettings(): void {
    localStorage.setItem('pam-accessibility-settings', JSON.stringify(this.settings));
  }

  /**
   * Show keyboard shortcuts help
   */
  private showKeyboardShortcuts(): void {
    const shortcuts = Array.from(this.shortcuts.entries())
      .map(([keys, shortcut]) => `${keys}: ${shortcut.description}`)
      .join('. ');
    
    this.announce(`Available keyboard shortcuts: ${shortcuts}`, 'polite');
  }

  // Keyboard shortcut handlers (to be connected to actual PAM functionality)
  private triggerSendMessage(): void {
    const event = new CustomEvent('pam-send-message');
    document.dispatchEvent(event);
  }

  private triggerClearChat(): void {
    const event = new CustomEvent('pam-clear-chat');
    document.dispatchEvent(event);
  }

  private triggerVoiceToggle(): void {
    const event = new CustomEvent('pam-toggle-voice');
    document.dispatchEvent(event);
  }

  private triggerStopSpeaking(): void {
    const event = new CustomEvent('pam-stop-speaking');
    document.dispatchEvent(event);
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    document.removeEventListener('keydown', this.handleKeyboardShortcut);
    if (this.ariaLiveRegion && this.ariaLiveRegion.parentNode) {
      this.ariaLiveRegion.parentNode.removeChild(this.ariaLiveRegion);
    }
  }
}

// Export singleton instance
export const accessibilityService = PAMAccessibilityService.getInstance();

// Export hook for React components
export const useAccessibility = () => {
  return {
    announce: accessibilityService.announce.bind(accessibilityService),
    announceNewMessage: accessibilityService.announceNewMessage.bind(accessibilityService),
    announceStatusChange: accessibilityService.announceStatusChange.bind(accessibilityService),
    manageFocus: accessibilityService.manageFocus.bind(accessibilityService),
    restoreFocus: accessibilityService.restoreFocus.bind(accessibilityService),
    getAriaLabels: accessibilityService.getAriaLabels.bind(accessibilityService),
    getSettings: accessibilityService.getSettings.bind(accessibilityService),
    updateSettings: accessibilityService.updateSettings.bind(accessibilityService),
    validateColorContrast: accessibilityService.validateColorContrast.bind(accessibilityService)
  };
};