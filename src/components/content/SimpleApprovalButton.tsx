import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { createBriefApprovalNotification } from '../../lib/briefApprovalNotifications';

interface SimpleApprovalButtonProps {
  briefId: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  className?: string;
}

export function SimpleApprovalButton({
  briefId,
  onSuccess,
  onError,
  className = ''
}: SimpleApprovalButtonProps) {
  const [isApproving, setIsApproving] = useState(false);

  const handleApprove = async () => {
    if (!briefId) {
      toast.error('Brief ID is required');
      return;
    }

    // Show initial loading toast
    const loadingToast = toast.loading(
      <div className="flex items-center gap-3">
        <div className="animate-pulse">✅</div>
        <div>
          <p className="font-medium">Approving Content</p>
          <p className="text-sm text-gray-400">Marking as approved...</p>
        </div>
      </div>
    );
    
    setIsApproving(true);

    try {
      // Update content brief approval status in database
      const { error } = await supabase
        .from('content_briefs')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', briefId);

      if (error) {
        throw new Error(`Failed to approve content brief: ${error.message}`);
      }

      // Get the current user and brief details for notifications
      const { data: { user } } = await supabase.auth.getUser();
      const { data: briefData } = await supabase
        .from('content_briefs')
        .select('product_name, user_id')
        .eq('id', briefId)
        .single();

      // Send notifications to admins (both email and in-app)
      if (user && briefData) {
        try {
          await createBriefApprovalNotification({
            briefId,
            briefTitle: briefData.product_name || 'Content Brief',
            userId: briefData.user_id
          });
          console.log('✅ Brief approval notifications sent successfully');
        } catch (notificationError) {
          console.error('⚠️ Failed to send notifications:', notificationError);
          // Don't fail the approval if notifications fail
        }
      }

      // Dismiss loading toast and show success
      toast.dismiss(loadingToast);
      toast.success(
        <div className="flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <div>
            <p className="font-medium">Content Approved</p>
            <p className="text-sm text-gray-400">Your content brief has been marked as approved. Email notifications sent to admins.</p>
          </div>
        </div>
      );
      
      onSuccess?.();
    } catch (error) {
      // Dismiss loading toast and show error
      toast.dismiss(loadingToast);
      
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      
      toast.error(
        <div className="flex items-center gap-3">
          <div className="text-red-500">❌</div>
          <div>
            <p className="font-medium">Error Approving Content</p>
            <p className="text-sm text-gray-400">{errorMessage}</p>
          </div>
        </div>
      );
      
      if (error instanceof Error) {
        onError?.(error);
      }
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className={className}>
      <button
        onClick={handleApprove}
        disabled={isApproving}
        className={`
          inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium
          ${isApproving
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-inner'
            : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-md hover:shadow-lg'
          }
          transition-all duration-200 ease-in-out
        `}
        title="Mark content brief as approved (no article generation)"
      >
        {isApproving ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Approving</span>
          </>
        ) : (
          <>
            <CheckCircle className="h-5 w-5" />
            <span>Approve Content</span>
          </>
        )}
      </button>
    </div>
  );
} 