import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Loader2, CheckCircle } from 'lucide-react';
import { approveContentBrief } from '../../lib/airops';

interface ApproveContentBriefProps {
  contentBrief: string;
  internalLinks: string;
  articleTitle: string;
  contentFramework: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function ApproveContentBrief({
  contentBrief,
  internalLinks,
  articleTitle,
  contentFramework,
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
      await approveContentBrief({
        contentBrief,
        internalLinks,
        articleTitle,
        contentFramework
      });
      
      // Dismiss loading toast and show success
      toast.dismiss(loadingToast);
      toast.success(
        <div className="flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <div>
            <p className="font-medium">Content Brief Approved</p>
            <p className="text-sm text-gray-400">Your content brief has been successfully processed.</p>
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
