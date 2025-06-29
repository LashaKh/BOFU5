import { supabase } from './supabase';
import { sendBriefApprovalEmailNotification } from './emailService';

export interface BriefApprovalNotification {
  id: string;
  admin_id: string;
  brief_id: string;
  brief_title: string;
  user_email: string;
  user_company: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

/**
 * Create a brief approval notification for admins using Edge Function
 */
export async function createBriefApprovalNotification({
  briefId,
  briefTitle,
  userId
}: {
  briefId: string;
  briefTitle: string;
  userId: string;
}) {
  try {
    console.log('Creating brief approval notification via Edge Function...', { briefId, briefTitle, userId });

    // Get the current session for authentication
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.error('No active session found');
      return;
    }

    // Call the Edge Function with service role permissions
    const { data, error } = await supabase.functions.invoke('send-brief-approval-notification', {
      body: {
        briefId,
        briefTitle,
        userId
      },
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      }
    });

    if (error) {
      console.error('Error calling notification Edge Function:', error);
      throw error;
    }

    console.log('✅ Edge Function response:', data);
    
    // If Edge Function didn't create notifications, create them as fallback
    if (data && data.notifications === 0) {
      console.log('🔄 Edge Function created 0 notifications, creating fallback notifications...');
      await createFallbackNotifications({ briefId, briefTitle, userId });
    }
    
    return data;

  } catch (error) {
    console.error('Error creating brief approval notification:', error);
    throw error;
  }
}

/**
 * Create fallback notifications when Edge Function fails
 */
async function createFallbackNotifications({
  briefId,
  briefTitle,
  userId
}: {
  briefId: string;
  briefTitle: string;
  userId: string;
}) {
  try {
    // Get user profile information
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('email, company_name')
      .eq('id', userId)
      .single();

    if (!userProfile) {
      console.error('User profile not found for fallback notifications');
      return;
    }

    // Get target admin IDs
    const adminIds = await getTargetAdminIds(userId);
    
    let createdCount = 0;
    for (const adminId of adminIds) {
      const notification = await createInAppNotification({
        adminId,
        briefId,
        briefTitle,
        userEmail: userProfile.email,
        userCompany: userProfile.company_name || 'Unknown Company'
      });
      
      if (notification) {
        createdCount++;
        console.log('✅ Fallback notification created:', notification.id);
      }
    }
    
    console.log(`🔄 Created ${createdCount} fallback notifications`);
  } catch (error) {
    console.error('Error creating fallback notifications:', error);
  }
}

/**
 * Create in-app notification record
 */
async function createInAppNotification({
  adminId,
  briefId,
  briefTitle,
  userEmail,
  userCompany
}: {
  adminId: string;
  briefId: string;
  briefTitle: string;
  userEmail: string;
  userCompany: string;
}) {
  try {
    // Get main admin (lashay@bofu.ai) ID
    const { data: mainAdmin } = await supabase
      .from('admin_profiles')
      .select('id')
      .eq('email', 'lashay@bofu.ai')
      .single();

    const isMainAdmin = mainAdmin && mainAdmin.id === adminId;

    const message = `${userEmail} from ${userCompany} has approved a content brief: "${briefTitle}"`;

    const { data, error } = await supabase
      .from('brief_approval_notifications')
      .insert({
        admin_id: adminId,
        brief_id: briefId,
        brief_title: briefTitle,
        user_email: userEmail,
        user_company: userCompany,
        message,
        notification_type: 'brief_approved',
        title: `Content Brief Approved: ${briefTitle}`,
        is_read: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating in-app notification:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in createInAppNotification:', error);
    return null;
  }
}

/**
 * Get target admin IDs (main admin + assigned sub-admins)
 */
async function getTargetAdminIds(userId: string): Promise<string[]> {
  try {
    const adminIds: string[] = [];

    // Always include main admin (lashay@bofu.ai)
    const { data: mainAdmin } = await supabase
      .from('admin_profiles')
      .select('id')
      .eq('email', 'lashay@bofu.ai')
      .single();

    if (mainAdmin) {
      adminIds.push(mainAdmin.id);
      console.log('Added main admin:', mainAdmin.id);
    }

    // Get sub-admins assigned directly to this user
    const { data: assignments } = await supabase
      .from('admin_client_assignments')
      .select('admin_id')
      .eq('client_user_id', userId)
      .eq('is_active', true);

    if (assignments) {
      for (const assignment of assignments) {
        if (!adminIds.includes(assignment.admin_id)) {
          adminIds.push(assignment.admin_id);
          console.log('Added sub-admin:', assignment.admin_id);
        }
      }
    }

    console.log('Total target admin IDs:', adminIds);
    return adminIds;
  } catch (error) {
    console.error('Error getting target admin IDs:', error);
    return [];
  }
}

/**
 * Get brief approval notifications for an admin
 */
export async function getBriefApprovalNotifications(adminId: string) {
  try {
    const { data, error } = await supabase
      .from('brief_approval_notifications')
      .select('*')
      .eq('admin_id', adminId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching brief approval notifications:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getBriefApprovalNotifications:', error);
    return [];
  }
}

/**
 * Mark brief approval notifications as read
 */
export async function markBriefApprovalNotificationsAsRead(adminId: string, notificationIds?: string[]) {
  try {
    let query = supabase
      .from('brief_approval_notifications')
      .update({ is_read: true })
      .eq('admin_id', adminId);

    if (notificationIds && notificationIds.length > 0) {
      query = query.in('id', notificationIds);
    }

    const { error } = await query;

    if (error) {
      console.error('Error marking notifications as read:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in markBriefApprovalNotificationsAsRead:', error);
    return false;
  }
} 