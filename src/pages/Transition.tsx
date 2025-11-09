import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';
import { TransitionDashboard } from '@/components/transition/TransitionDashboard';

/**
 * Life Transition Navigator
 *
 * Helps users plan their transition from traditional life to full-time RV living.
 * This module can be enabled/disabled in user settings and auto-hides after departure date.
 */
export default function Transition() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" />;
  }

  return <TransitionDashboard />;
}
