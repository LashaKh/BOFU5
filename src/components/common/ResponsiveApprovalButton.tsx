import { ApproveContentBrief } from '../content/ApproveContentBrief';
import { ContentBrief } from '../../types/contentBrief';
import { ensureLinksAsText } from '../../utils/contentFormatUtils';

/**
 * Responsive wrapper for ApproveContentBrief component
 * Handles both desktop and mobile layouts with proper data formatting
 */

interface ResponsiveApprovalButtonProps {
  brief: ContentBrief;
  briefId: string;
  editorContent?: string;
  onSuccess: () => void;
  className?: string;
}

export const ResponsiveApprovalButton = ({
  brief,
  briefId,
  editorContent,
  onSuccess,
  className = ''
}: ResponsiveApprovalButtonProps) => {
  // Prepare article title
  const articleTitle = 
    Array.isArray(brief.possible_article_titles) && brief.possible_article_titles.length > 0 
      ? brief.possible_article_titles[0] 
      : (typeof brief.possible_article_titles === 'string' 
          ? brief.possible_article_titles.split('\n')[0] 
          : brief.title || '');

  // Prepare internal links
  const internalLinks = 
    typeof brief.internal_links === 'string' 
      ? brief.internal_links 
      : (Array.isArray(brief.internal_links) 
          ? brief.internal_links.join('\n') 
          : (brief.suggested_links?.map(link => link.url).join('\n') || ''));

  // Prepare content framework
  const contentFramework = brief.suggested_content_frameworks || brief.framework || '';

  // Prepare content brief
  const contentBrief = brief.brief_content || editorContent || '';

  return (
    <div className={className}>
      <ApproveContentBrief
        contentBrief={contentBrief}
        articleTitle={articleTitle}
        internalLinks={internalLinks}
        contentFramework={contentFramework}
        briefId={briefId}
        onSuccess={onSuccess}
      />
    </div>
  );
};

/**
 * Desktop version - hidden on small screens
 */
export const DesktopApprovalButton = (props: ResponsiveApprovalButtonProps) => (
  <ResponsiveApprovalButton 
    {...props} 
    className={`hidden sm:block ${props.className || ''}`}
  />
);

/**
 * Mobile version - visible only on small screens
 */
export const MobileApprovalButton = (props: ResponsiveApprovalButtonProps) => (
  <ResponsiveApprovalButton 
    {...props} 
    className={`sm:hidden flex justify-center mt-4 mb-8 ${props.className || ''}`}
  />
); 