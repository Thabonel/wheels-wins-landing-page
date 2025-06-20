
import React from 'react';
import AdminOverview from './AdminOverview';
import AdminUsers from './AdminUsers';
import AdminContentModeration from './AdminContentModeration';
import AdminAnalytics from './AdminAnalytics';
import AdminChatLogs from './AdminChatLogs';
import AdminSettings from './AdminSettings';
import AdminSupportTickets from './AdminSupportTickets';
import LearningDashboard from './LearningDashboard';

interface AdminContentProps {
  activeSection: string;
}

const AdminContent: React.FC<AdminContentProps> = ({ activeSection }) => {
  const renderContent = () => {
    switch (activeSection) {
      case 'Dashboard':
        return <AdminOverview />;
      case 'Users':
        return <AdminUsers />;
      case 'Content Moderation':
        return <AdminContentModeration />;
      case 'Analytics':
        return <AdminAnalytics />;
      case 'Chat Logs':
        return <AdminChatLogs />;
      case 'Learning Dashboard':
        return <LearningDashboard />;
      case 'Shop Management':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Shop Management</h2>
            <p className="text-gray-600">Shop management features coming soon...</p>
          </div>
        );
      case 'Support Tickets':
        return <AdminSupportTickets />;
      case 'Settings':
        return <AdminSettings />;
      default:
        return <AdminOverview />;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {renderContent()}
    </div>
  );
};

export default AdminContent;
