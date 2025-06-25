import React from 'react';

interface AdminPamChatProps {
  isPamChatOpen: boolean;
  setIsPamChatOpen: (open: boolean) => void;
}

const AdminPamChat: React.FC<AdminPamChatProps> = ({
  isPamChatOpen,
  setIsPamChatOpen,
}) => {
  // For now, return null since the component was missing
  // This can be implemented later with actual PAM chat functionality
  return null;
};

export default AdminPamChat;