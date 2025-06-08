
import React from 'react';
import { motion } from 'framer-motion';
import UserManagement from "@/components/admin/UserManagement";
import ContentModeration from "@/components/admin/ContentModeration";
import ShopManagement from "@/components/admin/ShopManagement";
import ReportsAnalytics from "@/components/admin/ReportsAnalytics";
import DashboardOverview from "@/components/admin/DashboardOverview";
import Settings from "@/components/admin/Settings";
import PAMAnalyticsDashboard from "@/components/admin/PAMAnalyticsDashboard";

interface AdminContentProps {
  activeSection: string;
}

const AdminContent: React.FC<AdminContentProps> = ({ activeSection }) => {
  const renderContent = () => {
    switch (activeSection) {
      case 'user-management':
        return (
          <motion.div
            key="User Management"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
           <UserManagement />
          </motion.div>
        );
      case 'content-moderation':
        return (
          <motion.div
            key="Content Moderation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ContentModeration />
          </motion.div>
        );
      case 'shop-management':
        return (
          <motion.div
            key="Shop Management"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
           <ShopManagement />
          </motion.div>
        );
      case 'Reports & Analytics':
        return (
          <motion.div
            key="Reports & Analytics"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ReportsAnalytics />
          </motion.div>
        );
      case 'pam-analytics':
        return (
          <motion.div
            key="PAM Analytics"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <PAMAnalyticsDashboard />
          </motion.div>
        );
      case 'Settings':
        return (
          <motion.div
            key="Settings"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Settings />
          </motion.div>
        );
      default:
        return <DashboardOverview />;
    }
  };

  return <>{renderContent()}</>;
};

export default AdminContent;
