
import React from 'react';
import DashboardOverview from './DashboardOverview';
import LearningDashboard from './LearningDashboard';
import UserManagement from './UserManagement';
import ContentModeration from './ContentModeration';
import ReportsAnalytics from './ReportsAnalytics';
import PAMAnalyticsDashboard from './PAMAnalyticsDashboard';
import ObservabilityDashboard from './observability/ObservabilityDashboard';
import { TestingDashboard } from './TestingDashboard';
import ShopManagement from './ShopManagement';
import TripTemplateManagement from './TripTemplateManagement';
import SupportTickets from './SupportTickets';
import UserFeedback from './UserFeedback';
import Settings from './Settings';
import DataCollectorMonitor from './DataCollectorMonitor';
import AuthDebugAdmin from './AuthDebugAdmin';

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
      case 'Data Collector':
        return <DataCollectorMonitor />;
      case 'Chat Logs':
        return <PAMAnalyticsDashboard />;
      case 'User Feedback':
        return <UserFeedback />;
      case 'Learning Dashboard':
        return <LearningDashboard />;
      case 'AI Observability':
        return <ObservabilityDashboard />;
      case 'Testing Dashboard':
        return <TestingDashboard />;
      case 'Auth Debug':
        return <AuthDebugAdmin />;
      case 'Shop Management':
        return <ShopManagement />;
      case 'Trip Templates':
        return <TripTemplateManagement />;
      case 'Support Tickets':
        return <SupportTickets />;
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
