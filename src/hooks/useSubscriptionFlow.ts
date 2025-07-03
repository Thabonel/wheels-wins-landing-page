import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const useSubscriptionFlow = () => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{ priceId: string; planName: string } | null>(null);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      // Check if there's a stored plan from before signup
      const storedPlan = sessionStorage.getItem('selectedPlan');
      if (storedPlan) {
        try {
          const plan = JSON.parse(storedPlan);
          setSelectedPlan(plan);
          setShowConfirmation(true);
          sessionStorage.removeItem('selectedPlan');
        } catch (error) {
          console.error('Error parsing stored plan:', error);
          sessionStorage.removeItem('selectedPlan');
        }
      }
    }
  }, [isAuthenticated, loading]);

  return {
    showConfirmation,
    setShowConfirmation,
    selectedPlan,
    setSelectedPlan
  };
};