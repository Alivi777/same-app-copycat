import { supabase } from "@/integrations/supabase/client";

interface StatusChangeParams {
  orderId: string;
  oldStatus: string | null;
  newStatus: string;
  userId: string;
  previousChangedAt?: string;
}

export const recordStatusChange = async ({
  orderId,
  oldStatus,
  newStatus,
  userId,
  previousChangedAt,
}: StatusChangeParams) => {
  // Calculate duration since last status change (if available)
  let durationSeconds: number | null = null;
  
  if (previousChangedAt) {
    const previousTime = new Date(previousChangedAt).getTime();
    const currentTime = new Date().getTime();
    durationSeconds = Math.floor((currentTime - previousTime) / 1000);
  }

  const { error } = await supabase
    .from('order_status_history')
    .insert({
      order_id: orderId,
      old_status: oldStatus,
      new_status: newStatus,
      changed_by: userId,
      duration_seconds: durationSeconds,
    });

  if (error) {
    console.error('Error recording status change:', error);
    throw error;
  }
};

export const getLastStatusChange = async (orderId: string) => {
  const { data, error } = await supabase
    .from('order_status_history')
    .select('*')
    .eq('order_id', orderId)
    .order('changed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching last status change:', error);
    return null;
  }

  return data;
};

export const getOrderStatusHistory = async (orderId: string) => {
  const { data, error } = await supabase
    .from('order_status_history')
    .select('*')
    .eq('order_id', orderId)
    .order('changed_at', { ascending: true });

  if (error) {
    console.error('Error fetching order status history:', error);
    return [];
  }

  return data || [];
};

export const calculateTotalProductionTime = (history: any[]) => {
  // Find when the order was first accepted (moved from pending to in-progress or similar)
  const acceptedStatuses = ['in-progress', 'projetando'];
  const completedStatus = 'completed';

  const acceptedEntry = history.find(h => acceptedStatuses.includes(h.new_status));
  const completedEntry = history.find(h => h.new_status === completedStatus);

  if (!acceptedEntry || !completedEntry) {
    return null;
  }

  const startTime = new Date(acceptedEntry.changed_at).getTime();
  const endTime = new Date(completedEntry.changed_at).getTime();

  return Math.floor((endTime - startTime) / 1000); // Return in seconds
};

export const formatDuration = (seconds: number | null): string => {
  if (seconds === null || seconds === undefined) return '-';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes}min`;
};
