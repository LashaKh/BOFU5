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
 * Create a brief approval notification for admins
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
    console.log('Creating brief approval notification...', { briefId, briefTitle, userId });

    // Get user profile information
    const { data: userProfile, error: userError } = await supabase
      .from('user_profiles')
      .select('id, email, company_name, profile_name')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error fetching user profile:', userError);
      return;
    }

    if (!userProfile) {
      console.error('User profile not found for userId:', userId);
      return;
    }

    console.log('User profile found:', {
      email: userProfile.email,
      company: userProfile.company_name
    });

    // Create notifications for both main admin and assigned sub-admins
    const adminIds = await getTargetAdminIds(userId);
    console.log('Target admin IDs:', adminIds);

    for (const adminId of adminIds) {
      // Get admin details for personalized emails
      const { data: adminProfile, error: adminError } = await supabase
        .from('admin_profiles')
        .select('id, email, name')
        .eq('id', adminId)
        .single();

      if (adminError || !adminProfile) {
        console.error('Error fetching admin profile:', adminError);
        continue;
      }

      // Create in-app notification
      const notification = await createInAppNotification({
        adminId,
        briefId,
        briefTitle,
        userEmail: userProfile.email,
        userCompany: userProfile.company_name || userProfile.profile_name || 'Unknown Company'
      });

      // Send email notification
      const emailSent = await sendBriefApprovalEmailNotification({
        adminEmail: adminProfile.email,
        adminName: adminProfile.name || 'Admin',
        userEmail: userProfile.email,
        userCompany: userProfile.company_name || userProfile.profile_name || 'Unknown Company',
        briefTitle
      });

      console.log(`Admin ${adminProfile.email}:`, {
        inAppNotification: notification ? 'created' : 'failed',
        emailNotification: emailSent ? 'sent' : 'failed'
      });
    }

  } catch (error) {
    console.error('Error creating brief approval notification:', error);
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
    }

    // Get sub-admins assigned to this user's company
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', userId)
      .single();

    if (userProfile?.company_id) {
      const { data: assignments } = await supabase
        .from('admin_client_assignments')
        .select('admin_id')
        .contains('assigned_client_ids', [userProfile.company_id]);

      if (assignments) {
        for (const assignment of assignments) {
          if (!adminIds.includes(assignment.admin_id)) {
            adminIds.push(assignment.admin_id);
          }
        }
      }
    }

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