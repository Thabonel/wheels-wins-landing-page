import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import LazyUnimogTripPlanner from '@/components/trips/unimog/LazyUnimogTripPlanner';
import { useToast } from '@/hooks/use-toast';

export default function Trips() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to access the trip planner.",
        variant: "destructive"
      });
      navigate('/login');
    }
  }, [user, navigate, toast]);

  if (!user) {
    return null; // Will redirect
  }

  // Always use the UnimogTripPlanner - no more feature toggle
  return (
    <div className="fixed inset-0 bg-gray-100">
      <LazyUnimogTripPlanner />
    </div>
  );
}