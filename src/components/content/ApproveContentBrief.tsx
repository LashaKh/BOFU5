import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Loader2, CheckCircle } from 'lucide-react';
import { approveContentBrief } from '../../lib/airops';
import { supabase } from '../../lib/supabase';
import { createBriefApprovalNotification } from '../../lib/briefApprovalNotifications';

interface ApproveContentBriefProps {
  contentBrief: string;
  internalLinks: string;
  articleTitle: string;
  contentFramework: string;
  briefId: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function ApproveContentBrief({
  contentBrief,
  internalLinks,
  articleTitle,
  contentFramework,
  briefId,
  onSuccess,
  onError
}: ApproveContentBriefProps) {
  const [isApproving, setIsApproving] = useState(false);

  const handleApprove = async () => {
    // Validate required fields
    if (!contentBrief || !articleTitle) {
      toast.error('Content brief and article title are required');
      return;
    }
    // Show initial loading toast
    const loadingToast = toast.loading(
      <div className="flex items-center gap-3">
        <div className="animate-pulse">📝</div>
        <div>
          <p className="font-medium">Approving Content Brief</p>
          <p className="text-sm text-gray-400">Processing your request...</p>
        </div>
      </div>
    );
    
    setIsApproving(true);

    try {
      // Get current user
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) {
        throw new Error('User not authenticated');
      }

      // Fetch research_result_id from content_briefs table
      let researchResultId: string | null = null;
      if (briefId) {
        const { data: briefData, error: briefError } = await supabase
          .from('content_briefs')
          .select('research_result_id')
          .eq('id', briefId)
          .single();

        if (briefError) {
          console.error('Error fetching research_result_id:', briefError);
          // Decide if you want to proceed without it or show an error
        }
        if (briefData) {
          researchResultId = briefData.research_result_id;
        }
      }

      await approveContentBrief({
        contentBrief,
        internalLinks,
        articleTitle,
        contentFramework,
        research_result_id: researchResultId
      });
      
      // Create notification for admins (both in-app and email)
      if (briefId && currentUser.user) {
        try {
          await createBriefApprovalNotification({
            briefId,
            briefTitle: articleTitle,
            userId: currentUser.user.id
          });
          console.log('Admin notifications (in-app and email) sent successfully');
        } catch (notificationError) {
          console.error('Failed to send admin notifications:', notificationError);
          // Don't fail the approval process if notifications fail
        }
      }
      
      // Dismiss loading toast and show success
      toast.dismiss(loadingToast);
      toast.success(
        <div className="flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <div>
            <p className="font-medium">Content Brief Approved</p>
            <p className="text-sm text-gray-400">Your content brief has been successfully processed. Admins have been notified via email and in-app notifications.</p>
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
            <p className="font-medium">Error Approving Content Brief</p>
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
    <button
      onClick={handleApprove}
      disabled={isApproving}
      className={`
        inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium
        ${isApproving
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-inner'
          : 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800 shadow-md hover:shadow-lg'
        }
        transition-all duration-200 ease-in-out
      `}
      title="Send content brief to AirOps for content generation"
    >
      {isApproving ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Processing</span>
        </>
      ) : (
        <>
          <CheckCircle className="h-5 w-5" />
          <span>Approve & Generate</span>
        </>
      )}
    </button>
  );
}
