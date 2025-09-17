
import React from 'react';
import DashboardOverview from './DashboardOverview';
import AuthDebugAdmin from './AuthDebugAdmin';
import {
  LearningDashboard,
  UserManagement,
  ContentModeration,
  ReportsAnalytics,
  PAMAnalyticsDashboard,
  ObservabilityDashboard,
  TestingDashboard,
  ShopManagement,
  TripTemplateManagement,
  SupportTickets,
  UserFeedback,
  Settings,
  DataCollectorMonitor
} from './LazyAdminComponents';

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
