import { useEffect } from 'react';

interface CalendarEventData {
  title: string;
  date: string;
  time?: string;
  description?: string;
}

interface PamCalendarIntegrationProps {
  onEventReceived?: (eventData: CalendarEventData) => void;
  onNavigateToCalendar?: () => void;
}

/**
 * Hook for integrating PAM calendar events with calendar components
 */
export function usePamCalendarIntegration({ 
  onEventReceived, 
  onNavigateToCalendar 
}: PamCalendarIntegrationProps = {}) {
  
  useEffect(() => {
    const handleAddCalendarEvent = async (event: CustomEvent<CalendarEventData>) => {
      console.log('📅 PAM calendar integration: Adding event', event.detail);
      
      if (onEventReceived) {
        onEventReceived(event.detail);
      } else {
        // Default behavior: try to create calendar event
        const eventData = event.detail;
        
        // Try to open calendar event form
        const addEventButton = document.querySelector('#add-event-btn, [data-action="add-event"], button:has-text("Add Event")') as HTMLButtonElement;
        if (addEventButton) {
          addEventButton.click();
          
          // Wait for form to open, then fill it
          setTimeout(() => {
            const titleInput = document.querySelector('#event-title, [name="title"], [placeholder*="title" i]') as HTMLInputElement;
            const dateInput = document.querySelector('#event-date, [name="date"], input[type="date"]') as HTMLInputElement;
            const timeInput = document.querySelector('#event-time, [name="time"], input[type="time"]') as HTMLInputElement;
            
            if (titleInput && eventData.title) {
              titleInput.value = eventData.title;
              titleInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
            
            if (dateInput && eventData.date) {
              dateInput.value = eventData.date;
              dateInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
            
            if (timeInput && eventData.time) {
              timeInput.value = eventData.time;
              timeInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
          }, 300);
        }
      }
    };

    const handleNavigateToCalendar = () => {
      console.log('📅 PAM calendar integration: Navigating to calendar');
      if (onNavigateToCalendar) {
        onNavigateToCalendar();
      }
    };

    // Listen for PAM calendar events
    window.addEventListener('pam-add-calendar-event', handleAddCalendarEvent as EventListener);
    window.addEventListener('pam-navigate-calendar', handleNavigateToCalendar);

    return () => {
      window.removeEventListener('pam-add-calendar-event', handleAddCalendarEvent as EventListener);
      window.removeEventListener('pam-navigate-calendar', handleNavigateToCalendar);
    };
  }, [onEventReceived, onNavigateToCalendar]);

  // Helper function to manually trigger event creation
  const addEvent = (title: string, date: string, time?: string) => {
    window.dispatchEvent(new CustomEvent('pam-add-calendar-event', {
      detail: { title, date, time }
    }));
  };

  return {
    addEvent
  };
}