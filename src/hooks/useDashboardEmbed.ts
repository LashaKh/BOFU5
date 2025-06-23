import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

interface DashboardEmbed {
  id: string;
  user_id: string;
  dashboard_identifier: string;
  dashboard_name: string;
  created_at: string;
  updated_at: string;
}

export const useDashboardEmbed = (dashboardName: string = 'Main Dashboard') => {
  const { user } = useAuth();
  const [dashboardEmbed, setDashboardEmbed] = useState<DashboardEmbed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchDashboardEmbed();
    } else {
      setLoading(false);
    }
  }, [user?.id, dashboardName]);

  const fetchDashboardEmbed = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('user_dashboard_embeds')
        .select('*')
        .eq('user_id', user!.id)
        .eq('dashboard_name', dashboardName)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          console.log('No dashboard embed found for user:', user!.id);
          setDashboardEmbed(null);
        } else {
          throw error;
        }
      } else {
        setDashboardEmbed(data);
      }
    } catch (err) {
      console.error('Error fetching dashboard embed:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard embed');
    } finally {
      setLoading(false);
    }
  };

  const createDashboardEmbed = async (dashboardIdentifier: string) => {
    try {
      setError(null);

      const { data, error } = await supabase
        .from('user_dashboard_embeds')
        .insert([
          {
            user_id: user!.id,
            dashboard_identifier: dashboardIdentifier,
            dashboard_name: dashboardName
          }
        ])
        .select()
        .single();

      if (error) throw error;

      setDashboardEmbed(data);
      return data;
    } catch (err) {
      console.error('Error creating dashboard embed:', err);
      setError(err instanceof Error ? err.message : 'Failed to create dashboard embed');
      throw err;
    }
  };

  const updateDashboardEmbed = async (dashboardIdentifier: string) => {
    try {
      setError(null);

      const { data, error } = await supabase
        .from('user_dashboard_embeds')
        .update({ dashboard_identifier: dashboardIdentifier })
        .eq('user_id', user!.id)
        .eq('dashboard_name', dashboardName)
        .select()
        .single();

      if (error) throw error;

      setDashboardEmbed(data);
      return data;
    } catch (err) {
      console.error('Error updating dashboard embed:', err);
      setError(err instanceof Error ? err.message : 'Failed to update dashboard embed');
      throw err;
    }
  };

  return {
    dashboardEmbed,
    loading,
    error,
    refetch: fetchDashboardEmbed,
    createDashboardEmbed,
    updateDashboardEmbed
  };
}; 