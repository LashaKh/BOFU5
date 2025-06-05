import React from 'react';
import { MessageCircle, CheckCircle, Archive } from 'lucide-react';
import { ArticleComment } from '../../lib/commentApi';

interface CommentMarkerProps {
  comment: ArticleComment;
  position: {
    top: number;
    left: number;
    height: number;
  };
  onClick: (comment: ArticleComment, position: { x: number; y: number }) => void;
}

export const CommentMarker: React.FC<CommentMarkerProps> = ({
  comment,
  position,
  onClick
}) => {
  const getMarkerColor = () => {
    switch (comment.status) {
      case 'active':
        return 'bg-blue-500 hover:bg-blue-600';
      case 'resolved':
        return 'bg-green-500 hover:bg-green-600';
      case 'archived':
        return 'bg-gray-500 hover:bg-gray-600';
      default:
        return 'bg-blue-500 hover:bg-blue-600';
    }
  };

  const getIcon = () => {
    switch (comment.status) {
      case 'resolved':
        return <CheckCircle size={12} />;
      case 'archived':
        return <Archive size={12} />;
      default:
        return <MessageCircle size={12} />;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = e.currentTarget.getBoundingClientRect();
    onClick(comment, {
      x: rect.right + 10,
      y: rect.top
    });
  };

  return (
    <div
      className={`absolute pointer-events-auto cursor-pointer w-6 h-6 rounded-full ${getMarkerColor()} text-white flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 group`}
      style={{
        top: position.top,
        left: position.left,
        zIndex: 10
      }}
      onClick={handleClick}
      title={`Comment by ${comment.user?.name || 'Unknown'}: ${comment.content.slice(0, 100)}${comment.content.length > 100 ? '...' : ''}`}
    >
      {getIcon()}
      
      {/* Reply count indicator */}
      {comment.reply_count && comment.reply_count > 0 && (
        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
          {comment.reply_count > 9 ? '9+' : comment.reply_count}
        </div>
      )}

      {/* Hover preview */}
      <div className="absolute left-8 top-0 bg-gray-900 text-white text-xs rounded-lg p-2 max-w-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-20">
        <div className="font-medium">{comment.user?.name || 'Unknown'}</div>
        <div className="truncate max-w-[200px]">{comment.content}</div>
        <div className="text-gray-400 text-xs mt-1">
          {new Date(comment.created_at).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}; 