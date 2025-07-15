
import { pamUIController } from '@/lib/pam/PamUIController';

export function usePamUIActions() {
  const executeUIActions = async (actions: any[]) => {
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'navigate':
            await pamUIController.navigateToPage(action.target, action.params);
            console.log('🧭 PAM navigated to:', action.target);
            break;
            
          case 'fill_form':
            for (const [field, value] of Object.entries(action.data || {})) {
              await pamUIController.fillInput(`#${field}`, value);
              console.log('📝 PAM filled field:', field, 'with:', value);
            }
            break;
            
          case 'click':
            await pamUIController.clickButton(action.selector);
            console.log('👆 PAM clicked:', action.selector);
            break;
            
          case 'workflow':
            await pamUIController.executeWorkflow(action.steps);
            console.log('⚙️ PAM executed workflow with', action.steps.length, 'steps');
            break;
            
          case 'alert':
            console.log('💡 PAM alert:', action.content);
            break;
            
          case 'display_route':
            // Emit custom event for trip planner to handle
            window.dispatchEvent(new CustomEvent('pam-display-route', {
              detail: action.payload
            }));
            console.log('🗺️ PAM displaying route:', action.payload);
            break;
            
          case 'add_calendar_event':
            // Emit custom event for calendar to handle
            window.dispatchEvent(new CustomEvent('pam-add-calendar-event', {
              detail: action.payload
            }));
            console.log('📅 PAM adding calendar event:', action.payload);
            break;
            
          case 'add_expense':
            // Emit custom event for expense tracker to handle
            window.dispatchEvent(new CustomEvent('pam-add-expense', {
              detail: action.payload
            }));
            console.log('💰 PAM adding expense:', action.payload);
            break;
            
          default:
            console.log('❓ Unknown PAM action type:', action.type);
        }
      } catch (error) {
        console.error('❌ Error executing PAM UI action:', error);
      }
    }
  };

  return { executeUIActions };
}
