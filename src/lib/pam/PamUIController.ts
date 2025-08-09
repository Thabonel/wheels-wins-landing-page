export class PamUIController {
  private animationDuration = 300;
  private highlightColor = '#8B5CF6';
  
  // Navigation Control
  async navigateToPage(page: string, params?: Record<string, any>) {
    console.log(`PAM: Navigating to ${page}`, params);
    const url = params ? `${page}?${new URLSearchParams(params).toString()}` : page;
    window.location.href = url;
  }
  
  async smoothScrollTo(selector: string) {
    const element = document.querySelector(selector);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await this.highlightElement(selector);
    }
  }
  
  // Form Manipulation
  async fillInput(selector: string, value: any) {
    const input = document.querySelector(selector) as HTMLInputElement;
    if (input) {
      // Show typing animation
      await this.typeAnimation(input, value.toString());
      // Trigger change event
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
  
  async selectOption(selector: string, option: string) {
    const select = document.querySelector(selector) as HTMLSelectElement;
    if (select) {
      await this.highlightElement(selector);
      select.value = option;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
  
  async clickButton(selector: string) {
    const button = document.querySelector(selector) as HTMLElement;
    if (button) {
      await this.highlightElement(selector);
      await this.pulseElement(selector);
      button.click();
    }
  }
  
  async submitForm(selector: string) {
    const form = document.querySelector(selector) as HTMLFormElement;
    if (form) {
      await this.highlightElement(selector);
      form.submit();
    }
  }
  
  // Visual Feedback
  async highlightElement(selector: string, duration = 1000) {
    const element = document.querySelector(selector) as HTMLElement;
    if (!element) return;
    
    const originalBorder = element.style.border;
    const originalBoxShadow = element.style.boxShadow;
    
    element.style.border = `2px solid ${this.highlightColor}`;
    element.style.boxShadow = `0 0 20px ${this.highlightColor}`;
    element.style.transition = 'all 0.3s ease';
    
    await new Promise(resolve => setTimeout(resolve, duration));
    
    element.style.border = originalBorder;
    element.style.boxShadow = originalBoxShadow;
  }
  
  async showPointer(x: number, y: number) {
    const pointer = document.createElement('div');
    pointer.style.cssText = `
      position: fixed;
      width: 20px;
      height: 20px;
      background: ${this.highlightColor};
      border-radius: 50%;
      z-index: 99999;
      pointer-events: none;
      transition: all 0.3s ease;
    `;
    pointer.style.left = `${x}px`;
    pointer.style.top = `${y}px`;
    
    document.body.appendChild(pointer);
    
    await new Promise(resolve => setTimeout(resolve, 50));
    pointer.style.transform = 'scale(2)';
    pointer.style.opacity = '0';
    
    await new Promise(resolve => setTimeout(resolve, 300));
    pointer.remove();
  }
  
  async typeAnimation(input: HTMLInputElement, text: string) {
    input.focus();
    input.value = '';
    
    for (let i = 0; i < text.length; i++) {
      input.value += text[i];
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 50));
    }
  }
  
  async pulseElement(selector: string) {
    const element = document.querySelector(selector) as HTMLElement;
    if (!element) return;
    
    element.style.animation = 'pam-pulse 0.5s ease-in-out';
    
    // Add keyframes if not exists
    if (!document.querySelector('#pam-animations')) {
      const style = document.createElement('style');
      style.id = 'pam-animations';
      style.textContent = `
        @keyframes pam-pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
      `;
      document.head.appendChild(style);
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
    element.style.animation = '';
  }
  
  // Complex Actions
  async executeWorkflow(steps: ActionStep[]) {
    for (const step of steps) {
      console.log(`PAM: Executing ${step.type}`, step);
      
      switch (step.type) {
        case 'navigate':
          await this.navigateToPage(step.target!, step.params);
          break;
        case 'fill':
          await this.fillInput(step.selector!, step.value);
          break;
        case 'click':
          await this.clickButton(step.selector!);
          break;
        case 'wait':
          await new Promise(resolve => setTimeout(resolve, step.duration || 1000));
          break;
        case 'scroll':
          await this.smoothScrollTo(step.selector!);
          break;
      }
    }
  }
  
  async demonstrateFeature(feature: string) {
    console.log(`PAM: Demonstrating ${feature}`);
    // Feature-specific demonstrations
  }
}

export interface ActionStep {
  type: 'navigate' | 'fill' | 'click' | 'wait' | 'scroll';
  selector?: string;
  target?: string;
  value?: any;
  params?: Record<string, any>;
  duration?: number;
}

export const pamUIController = new PamUIController();
