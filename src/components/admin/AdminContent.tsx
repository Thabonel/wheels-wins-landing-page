
import React from 'react';
import DashboardOverview from './DashboardOverview';
import LearningDashboard from './LearningDashboard';
import UserManagement from './UserManagement';
import ContentModeration from './ContentModeration';
import ReportsAnalytics from './ReportsAnalytics';
import PAMAnalyticsDashboard from './PAMAnalyticsDashboard';
import ShopManagement from './ShopManagement';
import Settings from './Settings';

interface AdminContentProps {
  activeSection: string;
}

const AdminContent: React.FC<AdminContentProps> = ({ activeSection }) => {
  const renderContent = () => {
    switch (activeSection) {
      case 'Dashboard':
        return <DashboardOverview />;
      case 'Users':
        return <UserManagement />;
      case 'Content Moderation':
        return <ContentModeration />;
      case 'Analytics':
        return <ReportsAnalytics />;
      case 'Chat Logs':
        return <PAMAnalyticsDashboard />;
      case 'Learning Dashboard':
        return <LearningDashboard />;
      case 'Shop Management':
        return <ShopManagement />;
      case 'Support Tickets':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Support Tickets</h2>
            <p className="text-gray-600">Support ticket features coming soon...</p>
          </div>
        );
      case 'Settings':
        return <Settings />;
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
