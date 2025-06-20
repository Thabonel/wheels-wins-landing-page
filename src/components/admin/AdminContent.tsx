
import React from 'react';
import DashboardOverview from './DashboardOverview';
import LearningDashboard from './LearningDashboard';

interface AdminContentProps {
  activeSection: string;
}

const AdminContent: React.FC<AdminContentProps> = ({ activeSection }) => {
  const renderContent = () => {
    switch (activeSection) {
      case 'Dashboard':
        return <DashboardOverview />;
      case 'Users':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">User Management</h2>
            <p className="text-gray-600">User management features coming soon...</p>
          </div>
        );
      case 'Content Moderation':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Content Moderation</h2>
            <p className="text-gray-600">Content moderation features coming soon...</p>
          </div>
        );
      case 'Analytics':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Analytics</h2>
            <p className="text-gray-600">Analytics features coming soon...</p>
          </div>
        );
      case 'Chat Logs':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Chat Logs</h2>
            <p className="text-gray-600">Chat logs features coming soon...</p>
          </div>
        );
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
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Support Tickets</h2>
            <p className="text-gray-600">Support ticket features coming soon...</p>
          </div>
        );
      case 'Settings':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Settings</h2>
            <p className="text-gray-600">Settings features coming soon...</p>
          </div>
        );
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {renderContent()}
    </div>
  );
};

export default AdminContent;
