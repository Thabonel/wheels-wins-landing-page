/**
 * Hook for PAM Visual Control
 * Provides visual site control capabilities to PAM
 */

import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { pamVisualController } from '@/services/pam/PamVisualController';
import type { PamVisualAction, ActionResult } from '@/services/pam/types';

export function usePamVisualControl() {
  const navigate = useNavigate();

  // Initialize the visual controller with navigation
  useEffect(() => {
    pamVisualController.setNavigate(navigate);
  }, [navigate]);

  /**
   * Process a PAM visual action from backend
   */
  const processPamAction = useCallback(async (action: PamVisualAction): Promise<ActionResult> => {
    console.log('PAM Visual Action:', action);

    try {
      switch (action.action) {
        case 'navigate':
          await pamVisualController.executeVisualCommand({
            type: 'navigate',
            target: action.parameters.route,
            description: action.parameters.description || `Navigating to ${action.parameters.route}`
          });
          break;

        case 'book_appointment':
          await pamVisualController.bookAppointment({
            person: action.parameters.person,
            date: action.parameters.date,
            time: action.parameters.time
          });
          break;

        case 'log_expense':
          await pamVisualController.logExpense({
            amount: action.parameters.amount,
            category: action.parameters.category,
            description: action.parameters.description
          });
          break;

        case 'fill_form':
          await pamVisualController.fillForm(action.parameters.formData);
          break;

        case 'click_element':
          await pamVisualController.executeVisualCommand({
            type: 'click',
            target: action.parameters.selector,
            description: action.parameters.description || 'Clicking element'
          });
          break;

        case 'scroll_to':
          await pamVisualController.executeVisualCommand({
            type: 'scroll',
            target: action.parameters.selector,
            description: action.parameters.description || 'Scrolling to element'
          });
          break;

        case 'highlight':
          await pamVisualController.executeVisualCommand({
            type: 'highlight',
            target: action.parameters.selector,
            description: action.parameters.description || 'Highlighting element'
          });
          break;

        default:
          console.warn('Unknown PAM action:', action.action);
          return { success: false, error: new Error(`Unknown action: ${action.action}`) };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error processing PAM action:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error : new Error('Failed to process action') 
      };
    }
  }, []);

  /**
   * Handle WebSocket messages with visual actions
   */
  const handlePamMessage = useCallback(async (message: any): Promise<void> => {
    if (message.type === 'visual_action' && message.action) {
      const result = await processPamAction(message.action);
      if (!result.success) {
        console.error('Visual action failed:', result.error);
      }
    }
  }, [processPamAction]);

  return {
    processPamAction,
    handlePamMessage,
    visualController: pamVisualController
  };
}