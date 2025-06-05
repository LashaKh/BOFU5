import React, { useEffect, useRef, useState } from 'react';
import { X, ArrowLeft, ChevronLeft } from 'lucide-react';
import { useMobileDetection, getSafeAreaInsets } from '../../hooks/useMobileDetection';

interface MobileResponsiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
  showBackButton?: boolean;
  onBack?: () => void;
  fullHeight?: boolean;
  enableSwipeGestures?: boolean;
}

export const MobileResponsiveModal: React.FC<MobileResponsiveModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className = '',
  showBackButton = false,
  onBack,
  fullHeight = false,
  enableSwipeGestures = true
}) => {
  const { isMobile, isTablet, orientation, screenHeight } = useMobileDetection();
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [startY, setStartY] = useState<number>(0);
  const [currentY, setCurrentY] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [translateY, setTranslateY] = useState<number>(0);
  
  const safeAreaInsets = getSafeAreaInsets();
  
  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      
      // Set CSS custom properties for safe area insets
      document.documentElement.style.setProperty('--safe-area-inset-top', `${safeAreaInsets.top}px`);
      document.documentElement.style.setProperty('--safe-area-inset-bottom', `${safeAreaInsets.bottom}px`);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, safeAreaInsets]);
  
  // Handle swipe gestures for mobile
  const handleTouchStart = (event: React.TouchEvent) => {
    if (!enableSwipeGestures || !isMobile) return;
    
    setStartY(event.touches[0].clientY);
    setCurrentY(event.touches[0].clientY);
    setIsDragging(true);
  };
  
  const handleTouchMove = (event: React.TouchEvent) => {
    if (!enableSwipeGestures || !isMobile || !isDragging) return;
    
    event.preventDefault();
    const deltaY = event.touches[0].clientY - startY;
    setCurrentY(event.touches[0].clientY);
    
    // Only allow downward swipe to close
    if (deltaY > 0) {
      setTranslateY(deltaY);
    }
  };
  
  const handleTouchEnd = () => {
    if (!enableSwipeGestures || !isMobile || !isDragging) return;
    
    setIsDragging(false);
    
    // Close modal if swiped down more than 100px
    if (translateY > 100) {
      onClose();
    } else {
      setTranslateY(0);
    }
  };
  
  // Handle backdrop click
  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === modalRef.current) {
      onClose();
    }
  };
  
  if (!isOpen) return null;
  
  const getModalStyles = () => {
    if (isMobile) {
      // Mobile: Full screen modal with safe area considerations
      const baseStyles = {
        paddingTop: safeAreaInsets.top,
        paddingBottom: safeAreaInsets.bottom,
        paddingLeft: safeAreaInsets.left,
        paddingRight: safeAreaInsets.right,
        transform: isDragging ? `translateY(${translateY}px)` : 'translateY(0)',
        transition: isDragging ? 'none' : 'transform 0.3s ease-out'
      };
      
      if (fullHeight || orientation === 'portrait') {
        return {
          ...baseStyles,
          height: '100vh',
          maxHeight: '100vh'
        };
      } else {
        // Landscape: Use more of the screen but not necessarily full height
        return {
          ...baseStyles,
          height: 'auto',
          minHeight: '70vh',
          maxHeight: '95vh'
        };
      }
    } else if (isTablet) {
      // Tablet: Larger modal but not full screen
      return {
        maxWidth: '90vw',
        maxHeight: '90vh',
        width: '800px',
        height: 'auto'
      };
    } else {
      // Desktop: Standard modal sizing
      return {
        maxWidth: '80vw',
        maxHeight: '85vh',
        width: '1200px',
        height: 'auto'
      };
    }
  };
  
  const getContentStyles = () => {
    if (isMobile) {
      return {
        display: 'flex',
        flexDirection: 'column' as const,
        height: '100%',
        overflowY: 'hidden' as const
      };
    } else {
      return {
        display: 'flex',
        flexDirection: 'column' as const,
        maxHeight: '100%'
      };
    }
  };
  
  const headerHeight = isMobile ? '60px' : '56px';
  const buttonSize = isMobile ? 'min-w-[44px] min-h-[44px]' : 'w-8 h-8';
  
  return (
    <div
      ref={modalRef}
      className={`
        fixed inset-0 z-50 
        ${isMobile ? 'bg-white' : 'bg-black bg-opacity-50'} 
        flex items-center justify-center
        ${isMobile ? '' : 'p-4'}
      `}
      onClick={handleBackdropClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        style={getModalStyles()}
        className={`
          ${isMobile ? 'w-full h-full' : 'bg-white rounded-lg shadow-xl'} 
          ${isMobile ? '' : 'border border-gray-200'} 
          ${className}
        `}
      >
        <div style={getContentStyles()}>
          {/* Header */}
          <div 
            className={`
              flex items-center justify-between 
              px-4 py-3 
              border-b border-gray-200 
              bg-white
              ${isMobile ? 'sticky top-0 z-10' : ''}
            `}
            style={{ height: headerHeight, minHeight: headerHeight }}
          >
            <div className="flex items-center space-x-3">
              {showBackButton && onBack && (
                <button
                  onClick={onBack}
                  className={`
                    ${buttonSize} 
                    flex items-center justify-center 
                    text-gray-600 hover:text-gray-800 
                    hover:bg-gray-100 rounded-full 
                    transition-colors
                  `}
                  title="Back"
                >
                  {isMobile ? <ArrowLeft size={20} /> : <ChevronLeft size={16} />}
                </button>
              )}
              
              <h2 className={`
                font-semibold text-gray-900 
                ${isMobile ? 'text-lg' : 'text-xl'}
                truncate max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg
              `}>
                {title}
              </h2>
            </div>
            
            <button
              onClick={onClose}
              className={`
                ${buttonSize} 
                flex items-center justify-center 
                text-gray-600 hover:text-gray-800 
                hover:bg-gray-100 rounded-full 
                transition-colors
              `}
              title="Close"
            >
              <X size={isMobile ? 20 : 16} />
            </button>
          </div>
          
          {/* Swipe indicator for mobile */}
          {isMobile && enableSwipeGestures && (
            <div className="flex justify-center py-2 bg-gray-50">
              <div className="w-8 h-1 bg-gray-300 rounded-full" />
            </div>
          )}
          
          {/* Content */}
          <div 
            ref={contentRef}
            className={`
              flex-1 
              ${isMobile ? 'overflow-y-auto' : 'overflow-hidden'} 
              ${isMobile ? 'min-h-0' : ''}
            `}
            style={{
              height: isMobile ? `calc(100% - ${headerHeight} - ${enableSwipeGestures ? '16px' : '0px'})` : 'auto'
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

// Specific modal variant for article editing
export const ArticleEditorModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  articleTitle: string;
  articleId: string;
  children: React.ReactNode;
}> = ({ isOpen, onClose, articleTitle, articleId, children }) => {
  const { isMobile } = useMobileDetection();
  
  return (
    <MobileResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title={isMobile ? 'Edit Article' : `Edit: ${articleTitle}`}
      fullHeight={true}
      enableSwipeGestures={true}
      className="article-editor-modal"
    >
      <div className="h-full flex flex-col">
        {!isMobile && (
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
            <p className="text-sm text-gray-600 truncate" title={articleTitle}>
              {articleTitle}
            </p>
          </div>
        )}
        
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    </MobileResponsiveModal>
  );
};

// Hook for managing modal state with mobile considerations
export const useResponsiveModal = (initialState = false) => {
  const [isOpen, setIsOpen] = useState(initialState);
  const { isMobile } = useMobileDetection();
  
  const openModal = () => {
    setIsOpen(true);
    
    // Prevent background scroll on mobile
    if (isMobile) {
      document.body.style.position = 'fixed';
      document.body.style.top = `-${window.scrollY}px`;
      document.body.style.width = '100%';
    }
  };
  
  const closeModal = () => {
    setIsOpen(false);
    
    // Restore scroll position on mobile
    if (isMobile) {
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }
  };
  
  return {
    isOpen,
    openModal,
    closeModal,
    toggleModal: () => isOpen ? closeModal() : openModal()
  };
}; 