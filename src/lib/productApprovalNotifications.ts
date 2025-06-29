import { supabase } from './supabase';

export interface ProductApprovalNotification {
  id: string;
  admin_id: string;
  brief_id: string; // Using existing column structure, but for product ID
  brief_title: string; // Product name
  user_email: string;
  user_company: string;
  message: string;
  is_read: boolean;
  created_at: string;
  notification_type: string;
}

/**
 * Create a product approval notification for admins using Edge Function
 */
export async function createProductApprovalNotification({
  productId,
  productName,
  userId
}: {
  productId: string;
  productName: string;
  userId: string;
}) {
  try {
    console.log('Creating product approval notification via Edge Function...', { productId, productName, userId });

    // Get the current session for authentication
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.error('No active session found');
      return;
    }

    // Call the Edge Function with service role permissions
    const { data, error } = await supabase.functions.invoke('send-product-approval-notification', {
      body: {
        productId,
        productName,
        userId
      },
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      }
    });

    if (error) {
      console.error('Error calling product notification Edge Function:', error);
      // Create fallback notifications if Edge Function fails
      console.log('🔄 Edge Function failed, creating fallback notifications...');
      await createFallbackProductNotifications({ productId, productName, userId });
      return;
    }

    console.log('✅ Product notification Edge Function response:', data);
    
    // If Edge Function didn't create notifications, create them as fallback
    if (data && data.notifications === 0) {
      console.log('🔄 Edge Function created 0 notifications, creating fallback notifications...');
      await createFallbackProductNotifications({ productId, productName, userId });
    }
    
    return data;

  } catch (error) {
    console.error('Error creating product approval notification:', error);
    // Create fallback notifications
    await createFallbackProductNotifications({ productId, productName, userId });
  }
}

/**
 * Create fallback notifications when Edge Function fails
 */
async function createFallbackProductNotifications({
  productId,
  productName,
  userId
}: {
  productId: string;
  productName: string;
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
      console.error('User profile not found for fallback product notifications');
      return;
    }

    // Get target admin IDs
    const adminIds = await getTargetAdminIds(userId);
    
    let createdCount = 0;
    for (const adminId of adminIds) {
      const notification = await createInAppProductNotification({
        adminId,
        productId,
        productName,
        userEmail: userProfile.email,
        userCompany: userProfile.company_name || 'Unknown Company'
      });
      
      if (notification) {
        createdCount++;
        console.log('✅ Fallback product notification created:', notification.id);
      }
    }
    
    console.log(`🔄 Created ${createdCount} fallback product notifications`);
  } catch (error) {
    console.error('Error creating fallback product notifications:', error);
  }
}

/**
 * Create in-app product notification record
 */
async function createInAppProductNotification({
  adminId,
  productId,
  productName,
  userEmail,
  userCompany
}: {
  adminId: string;
  productId: string;
  productName: string;
  userEmail: string;
  userCompany: string;
}) {
  try {
    const message = `${userEmail} from ${userCompany} has approved a product card: "${productName}"`;

    const { data, error } = await supabase
      .from('brief_approval_notifications')
      .insert({
        admin_id: adminId,
        brief_id: productId, // Using existing column for product ID
        brief_title: productName, // Using existing column for product name
        user_email: userEmail,
        user_company: userCompany,
        message,
        notification_type: 'product_approved', // Different type for product approvals
        title: `Product Card Approved: ${productName}`,
        is_read: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating in-app product notification:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in createInAppProductNotification:', error);
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
      console.log('Added main admin to product notifications:', mainAdmin.id);
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
          console.log('Added sub-admin to product notifications:', assignment.admin_id);
        }
      }
    }

    console.log('Total target admin IDs for product notifications:', adminIds);
    return adminIds;
  } catch (error) {
    console.error('Error getting target admin IDs for product notifications:', error);
    return [];
  }
}

/**
 * Get product approval notifications for an admin
 */
export async function getProductApprovalNotifications(adminId: string) {
  try {
    const { data, error } = await supabase
      .from('brief_approval_notifications')
      .select('*')
      .eq('admin_id', adminId)
      .eq('notification_type', 'product_approved')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching product approval notifications:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getProductApprovalNotifications:', error);
    return [];
  }
}

/**
 * Mark product approval notifications as read
 */
export async function markProductApprovalNotificationsAsRead(adminId: string, notificationIds?: string[]) {
  try {
    let query = supabase
      .from('brief_approval_notifications')
      .update({ is_read: true })
      .eq('admin_id', adminId)
      .eq('notification_type', 'product_approved');

    if (notificationIds && notificationIds.length > 0) {
      query = query.in('id', notificationIds);
    }

    const { error } = await query;

    if (error) {
      console.error('Error marking product notifications as read:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in markProductApprovalNotificationsAsRead:', error);
    return false;
  }
} 