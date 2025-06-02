import React from 'react';
import { motion, Variants } from 'framer-motion';
import { useAdaptiveStyles, useProductCardTheme } from '../../contexts/ProductCardThemeContext';
import { ProductAnalysis } from '../../types/product/types';

interface ProductCardContainerProps {
  product: ProductAnalysis;
  index: number;
  children: React.ReactNode;
  isMultipleProducts?: boolean;
  className?: string;
  onClose?: () => void;
}

// Advanced animation variants based on context and reduced motion
const getAnimationVariants = (isReducedMotion: boolean, index: number): Variants => {
  if (isReducedMotion) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    };
  }

  return {
    initial: { 
      opacity: 0, 
      y: 30,
    },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.6,
        delay: index * 0.15,
        ease: [0.25, 0.46, 0.45, 0.94],
        opacity: { duration: 0.4 },
        y: { duration: 0.6 },
      }
    },
    exit: { 
      opacity: 0,
      y: -20,
      transition: {
        duration: 0.3,
        ease: 'easeInOut',
      }
    }
  };
};

// Responsive layout classes based on context and density
const getLayoutClasses = (
  variant: string,
  density: string,
  isMultipleProducts: boolean
) => {
  const densityClasses = {
    compact: 'p-4 space-y-4',
    comfortable: 'p-6 space-y-6', 
    spacious: 'p-8 space-y-8',
  };

  const variantClasses = {
    modal: 'w-full max-w-5xl mx-auto',
    inline: isMultipleProducts ? 'w-full' : 'w-full max-w-4xl mx-auto',
    featured: 'w-full max-w-6xl mx-auto',
  };

  return {
    padding: densityClasses[density as keyof typeof densityClasses] || densityClasses.comfortable,
    width: variantClasses[variant as keyof typeof variantClasses] || variantClasses.inline,
  };
};

export function ProductCardContainer({
  product,
  index,
  children,
  isMultipleProducts = false,
  className = '',
  onClose,
}: ProductCardContainerProps) {
  const { theme, isReducedMotion } = useProductCardTheme();
  const styles = useAdaptiveStyles();
  
  const layoutClasses = getLayoutClasses(theme.variant, theme.density, isMultipleProducts);
  const animationVariants = getAnimationVariants(isReducedMotion, index);

  // Simplified responsive classes
  const responsiveClasses = [
    'min-h-0',
    'md:min-h-0',
    'lg:min-h-0',
    'xl:min-h-0',
  ].join(' ');

  // Accessibility attributes
  const accessibilityProps = {
    role: 'article',
    'aria-label': `Product analysis for ${product.companyName || 'Unknown Company'} - ${product.productDetails?.name || 'Unknown Product'}`,
    'aria-describedby': `product-${index}-description`,
    tabIndex: 0,
  };

  return (
    <motion.article
      key={`product-card-${index}`}
      variants={animationVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      layout={!isReducedMotion}
      {...accessibilityProps}
      className={`
        bg-white border border-gray-300 shadow-md
        ${layoutClasses.width}
        ${responsiveClasses}
        rounded-2xl 
        overflow-hidden 
        relative
        focus:outline-none 
        focus:ring-2 
        focus:ring-blue-500 
        focus:ring-offset-2 
        focus:ring-offset-transparent
        ${className}
      `}
    >
      {/* Close button for modal variant */}
      {theme.variant === 'modal' && onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 hover:text-gray-800 transition-all duration-200 flex items-center justify-center"
          aria-label="Close product analysis"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Main content wrapper */}
      <div className={`relative z-10 ${layoutClasses.padding}`}>
        {children}
      </div>

      {/* Loading state overlay (can be controlled by parent) */}
      <div 
        className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm rounded-2xl opacity-0 pointer-events-none transition-opacity duration-200 flex items-center justify-center"
        id={`product-${index}-loading`}
      >
        <div className="flex items-center space-x-3 text-white">
          <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Processing...</span>
        </div>
      </div>
    </motion.article>
  );
}

// Enhanced container specifically for admin context
export function AdminProductCardContainer(props: ProductCardContainerProps) {
  return (
    <div data-admin-dashboard className="w-full">
      <ProductCardContainer {...props} />
    </div>
  );
}

// Utility function to show loading state
export const showProductCardLoading = (index: number) => {
  const loadingElement = document.getElementById(`product-${index}-loading`);
  if (loadingElement) {
    loadingElement.style.opacity = '1';
    loadingElement.style.pointerEvents = 'auto';
  }
};

// Utility function to hide loading state
export const hideProductCardLoading = (index: number) => {
  const loadingElement = document.getElementById(`product-${index}-loading`);
  if (loadingElement) {
    loadingElement.style.opacity = '0';
    loadingElement.style.pointerEvents = 'none';
  }
}; 