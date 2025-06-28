import { toast } from "@/hooks/use-toast";
import { getWebSocketUrl } from "@/services/api";

interface NavigationParams {
  [key: string]: string | number;
}

interface FormData {
  [fieldId: string]: string | number | boolean;
}

interface UICommand {
  type: 'navigate' | 'fillForm' | 'highlight' | 'toast';
  payload: any;
}

class PamUIController {
  private websocket: WebSocket | null = null;
  private isConnected = false;

  constructor() {
    // this.connectWebSocket(); // Temporarily disabled
  }

  /**
   * Programmatically navigate to a page with optional parameters
   */
  navigateToPage(page: string, params?: NavigationParams): void {
    try {
      let url = page;
      
      // Add parameters to URL if provided
      if (params && Object.keys(params).length > 0) {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          searchParams.append(key, value.toString());
        });
        url += `?${searchParams.toString()}`;
      }

      // Use window.location for navigation since we don't have direct access to router here
      window.location.href = url;
    } catch (error) {
      console.error('Navigation failed:', error);
      this.showToast('Navigation failed', 'destructive');
    }
  }

  /**
   * Fill form fields with provided data
   */
  fillForm(formId: string, data: FormData): void {
    try {
      const form = document.getElementById(formId) as HTMLFormElement;
      if (!form) {
        console.error(`Form with ID ${formId} not found`);
        return;
      }

      Object.entries(data).forEach(([fieldId, value]) => {
        const field = form.querySelector(`#${fieldId}`) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        
        if (field) {
          if (field.type === 'checkbox' && typeof value === 'boolean') {
            (field as HTMLInputElement).checked = value;
          } else if (field.type === 'radio' && typeof value === 'string') {
            const radioButton = form.querySelector(`input[name="${field.name}"][value="${value}"]`) as HTMLInputElement;
            if (radioButton) {
              radioButton.checked = true;
            }
          } else {
            field.value = value.toString();
            
            // Trigger change event for React controlled components
            const event = new Event('input', { bubbles: true });
            field.dispatchEvent(event);
          }
        } else {
          console.warn(`Field with ID ${fieldId} not found in form ${formId}`);
        }
      });

      this.showToast('Form filled successfully');
    } catch (error) {
      console.error('Form filling failed:', error);
      this.showToast('Failed to fill form', 'destructive');
    }
  }

  /**
   * Highlight an element for visual feedback
   */
  highlightElement(elementId: string, duration: number = 3000): void {
    try {
      const element = document.getElementById(elementId);
      if (!element) {
        console.error(`Element with ID ${elementId} not found`);
        return;
      }

      // Add highlight class
      element.classList.add('pam-highlight');
      
      // Add highlight styles if not already present
      if (!document.getElementById('pam-highlight-styles')) {
        const style = document.createElement('style');
        style.id = 'pam-highlight-styles';
        style.textContent = `
          .pam-highlight {
            animation: pamPulse 2s infinite;
            box-shadow: 0 0 0 4px hsl(var(--primary) / 0.3);
            border-radius: 4px;
            transition: all 0.3s ease;
          }
          
          @keyframes pamPulse {
            0%, 100% { box-shadow: 0 0 0 4px hsl(var(--primary) / 0.3); }
            50% { box-shadow: 0 0 0 8px hsl(var(--primary) / 0.1); }
          }
        `;
        document.head.appendChild(style);
      }

      // Remove highlight after duration
      setTimeout(() => {
        element.classList.remove('pam-highlight');
      }, duration);

      // Scroll element into view
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });

    } catch (error) {
      console.error('Element highlighting failed:', error);
    }
  }

  /**
   * Show toast notification to user
   */
  showToast(message: string, variant: 'default' | 'destructive' = 'default'): void {
    try {
      toast({
        title: variant === 'destructive' ? 'Error' : 'PAM Assistant',
        description: message,
        variant: variant,
      });
    } catch (error) {
      console.error('Toast notification failed:', error);
      // Fallback to browser alert
      alert(message);
    }
  }

  /**
   * Connect to WebSocket for receiving UI commands from backend
   */
  private connectWebSocket(): void {
    try {
      const wsUrl = getWebSocketUrl('/api/pam/ws');
      
      this.websocket = new WebSocket(wsUrl);

      this.websocket.onopen = () => {
        console.log('PAM UI Controller WebSocket connected');
        this.isConnected = true;
      };

      this.websocket.onmessage = (event) => {
        try {
          const command: UICommand = JSON.parse(event.data);
          this.handleUICommand(command);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.websocket.onclose = () => {
        console.log('PAM UI Controller WebSocket disconnected');
        this.isConnected = false;
        
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          if (!this.isConnected) {
            // this.connectWebSocket(); // Temporarily disabled
          }
        }, 5000);
      };

      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

    } catch (error) {
      console.error('WebSocket connection failed:', error);
    }
  }

  /**
   * Handle incoming UI commands from WebSocket
   */
  private handleUICommand(command: UICommand): void {
    switch (command.type) {
      case 'navigate':
        this.navigateToPage(command.payload.page, command.payload.params);
        break;

      case 'fillForm':
        this.fillForm(command.payload.formId, command.payload.data);
        break;

      case 'highlight':
        this.highlightElement(command.payload.elementId, command.payload.duration);
        break;

      case 'toast':
        this.showToast(command.payload.message, command.payload.variant);
        break;

      default:
        console.warn('Unknown UI command type:', command.type);
    }
  }

  /**
   * Send message to backend via WebSocket
   */
  sendMessage(message: any): void {
    if (this.websocket && this.isConnected) {
      this.websocket.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }

  /**
   * Get connection status
   */
  isWebSocketConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
      this.isConnected = false;
    }
  }
}

// Export singleton instance
export const pamUIController = new PamUIController();

// Export class for testing purposes
export { PamUIController };