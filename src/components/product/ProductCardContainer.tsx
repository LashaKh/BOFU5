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
        group relative overflow-hidden
        ${layoutClasses.width}
        ${responsiveClasses}
        ${className}
      `}
      style={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)',
        boxShadow: `
          0 0 0 1px rgba(15, 23, 42, 0.05),
          0 1px 3px 0 rgba(15, 23, 42, 0.1),
          0 4px 6px -2px rgba(15, 23, 42, 0.05),
          0 10px 15px -3px rgba(15, 23, 42, 0.1),
          0 25px 50px -12px rgba(15, 23, 42, 0.15)
        `,
        borderRadius: '24px',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      onHoverStart={() => {
        if (!isReducedMotion) {
          // Enhanced hover animation will be handled by CSS
        }
      }}
    >
      {/* Animated background gradients */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
        <div 
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), 
                rgba(59, 130, 246, 0.05) 0%, 
                rgba(147, 51, 234, 0.03) 25%, 
                rgba(236, 72, 153, 0.02) 50%, 
                transparent 70%
              )
            `,
          }}
        />
        <div 
          className="absolute inset-0"
          style={{
            background: `
              conic-gradient(from 0deg at 50% 50%, 
                rgba(59, 130, 246, 0.03) 0deg, 
                rgba(147, 51, 234, 0.02) 120deg, 
                rgba(236, 72, 153, 0.02) 240deg, 
                rgba(59, 130, 246, 0.03) 360deg
              )
            `,
          }}
        />
      </div>

      {/* Premium border with gradient */}
      <div 
        className="absolute inset-0 rounded-[24px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `
            linear-gradient(135deg, 
              rgba(59, 130, 246, 0.2) 0%, 
              rgba(147, 51, 234, 0.15) 25%, 
              rgba(236, 72, 153, 0.15) 50%, 
              rgba(245, 158, 11, 0.15) 75%, 
              rgba(34, 197, 94, 0.2) 100%
            )
          `,
          padding: '1px',
          borderRadius: '24px',
        }}
      >
        <div 
          className="w-full h-full rounded-[23px]"
          style={{
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)',
          }}
        />
      </div>

      {/* Floating elements for depth */}
      <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-blue-400/10 to-purple-500/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-gradient-to-tr from-pink-400/10 to-yellow-500/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 delay-150" />

      {/* Enhanced glass morphism overlay */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `
            linear-gradient(135deg, 
              rgba(255, 255, 255, 0.1) 0%, 
              rgba(255, 255, 255, 0.05) 50%, 
              rgba(255, 255, 255, 0.02) 100%
            )
          `,
          backdropFilter: 'blur(20px) saturate(180%)',
          borderRadius: '24px',
        }}
      />
      {/* Enhanced close button for modal variant */}
      {theme.variant === 'modal' && onClose && (
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-50 w-10 h-10 rounded-full backdrop-blur-md bg-white/80 text-gray-700 hover:bg-white hover:text-gray-900 transition-all duration-300 flex items-center justify-center shadow-lg hover:shadow-xl border border-white/20 hover:scale-105"
          aria-label="Close product analysis"
          style={{
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(12px) saturate(180%)',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Premium main content wrapper */}
      <div 
        className={`relative z-20 ${layoutClasses.padding}`}
        style={{
          background: `
            linear-gradient(135deg, 
              rgba(255, 255, 255, 0.95) 0%, 
              rgba(255, 255, 255, 0.9) 50%, 
              rgba(255, 255, 255, 0.85) 100%
            )
          `,
          backdropFilter: 'blur(20px) saturate(180%)',
          borderRadius: '20px',
          margin: '4px',
        }}
      >
        {children}
      </div>

      {/* Premium loading state overlay */}
      <div 
        className="absolute inset-0 opacity-0 pointer-events-none transition-all duration-300 flex items-center justify-center z-50"
        id={`product-${index}-loading`}
        style={{
          background: `
            linear-gradient(135deg, 
              rgba(15, 23, 42, 0.95) 0%, 
              rgba(30, 41, 59, 0.9) 50%, 
              rgba(51, 65, 85, 0.95) 100%
            )
          `,
          backdropFilter: 'blur(20px) saturate(180%)',
          borderRadius: '24px',
        }}
      >
        <div className="flex flex-col items-center space-y-4 text-white">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
            <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-r-purple-400 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold mb-1">Processing</div>
            <div className="text-sm text-gray-300">Analyzing your product data...</div>
          </div>
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