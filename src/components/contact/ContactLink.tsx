import React from 'react';
import { ContactForm } from './ContactForm';

interface ContactLinkProps {
  category?: 'general' | 'support' | 'business' | 'technical' | 'feedback';
  subject?: string;
  children?: React.ReactNode;
  className?: string;
}

/**
 * ContactLink - Replacement for mailto: links
 * Opens a contact form instead of email client
 */
export const ContactLink: React.FC<ContactLinkProps> = ({
  category = 'general',
  subject = '',
  children,
  className = '',
}) => {
  return (
    <ContactForm
      defaultCategory={category}
      defaultSubject={subject}
      triggerButton={
        <button
          type="button"
          className={`text-purple-600 hover:underline cursor-pointer ${className}`}
        >
          {children || 'Contact Us'}
        </button>
      }
    />
  );
};

export default ContactLink;