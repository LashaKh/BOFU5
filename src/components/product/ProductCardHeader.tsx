import React from 'react';
import { motion } from 'framer-motion';
import { useAdaptiveStyles, useProductCardTheme } from '../../contexts/ProductCardThemeContext';
import { ProductAnalysis } from '../../types/product/types';

interface ProductCardHeaderProps {
  product: ProductAnalysis;
  index: number;
  showStatus?: boolean;
  showActions?: boolean;
  onToggleDetails?: () => void;
  isExpanded?: boolean;
}

// Status badge component with sophisticated styling
const StatusBadge = ({ isApproved, theme }: { isApproved?: boolean; theme: any }) => {
  const badgeClasses = isApproved
    ? 'bg-green-500/20 text-green-300 border-green-400/30'
    : 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30';

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.3, duration: 0.4, ease: 'backOut' }}
      className={`
        ${badgeClasses}
        px-3 py-1.5 rounded-full text-xs font-semibold 
        border backdrop-blur-sm
        flex items-center space-x-1.5
      `}
    >
      <div className={`w-2 h-2 rounded-full ${isApproved ? 'bg-green-400' : 'bg-yellow-400'} animate-pulse`} />
      <span>{isApproved ? 'Approved' : 'Pending'}</span>
    </motion.div>
  );
};

// Company branding section with enhanced typography
const CompanyBranding = ({ product, styles }: { product: ProductAnalysis; styles: any }) => {
  return (
    <div className="flex-1 min-w-0">
      {/* Company Name */}
      <motion.h2
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className={`
          ${styles.primaryText}
          text-xl md:text-2xl font-bold tracking-tight
          truncate group-hover:text-primary-400 
          transition-colors duration-300
        `}
      >
        {product.companyName || 'Unknown Company'}
      </motion.h2>

      {/* Product Name */}
      {product.productDetails?.name && (
        <motion.h3
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className={`
            ${styles.secondaryText}
            text-base md:text-lg font-medium 
            truncate
          `}
        >
          {product.productDetails.name}
        </motion.h3>
      )}

      {/* Competitor Analysis URL or Google Doc with enhanced styling */}
      {(product.competitorAnalysisUrl || product.google_doc) && (
        <motion.a
          href={product.competitorAnalysisUrl || product.google_doc}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className={`
            ${styles.accentText}
            text-xs md:text-sm font-medium mt-2
            inline-flex items-center space-x-1
            hover:text-primary-300 transition-colors duration-200
            hover:underline decoration-primary-400/50 underline-offset-2
          `}
        >
          <svg className="w-3 h-3 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          <span className="truncate max-w-[200px]">
            {(product.competitorAnalysisUrl || product.google_doc || '').replace(/^https?:\/\//, '')}
          </span>
        </motion.a>
      )}
    </div>
  );
};

// Action buttons with micro-interactions
const ActionButtons = ({ 
  onToggleDetails, 
  isExpanded, 
  styles, 
  isReducedMotion
}: { 
  onToggleDetails?: () => void; 
  isExpanded?: boolean; 
  styles: any; 
  isReducedMotion: boolean;
}) => {
  if (!onToggleDetails) return null;

  return (
    <div className="flex items-center space-x-2">
      {/* Expand/Collapse Button */}
      <motion.button
        onClick={onToggleDetails}
        whileHover={!isReducedMotion ? { scale: 1.05 } : undefined}
        whileTap={!isReducedMotion ? { scale: 0.95 } : undefined}
        className={`
          px-3 py-1.5 rounded-lg text-xs font-medium
          bg-gray-100 text-gray-600 border border-gray-200
          flex items-center space-x-1
          hover:shadow-md
          focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1
          transition-all duration-200
        `}
        title={isExpanded ? "Show Less" : "Show More"}
      >
        <span>{isExpanded ? 'Less' : 'More'}</span>
        <motion.svg 
          className="w-3 h-3" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </motion.svg>
      </motion.button>
    </div>
  );
};

export function ProductCardHeader({
  product,
  index,
  showStatus = true,
  showActions = false,
  onToggleDetails,
  isExpanded = false,
}: ProductCardHeaderProps) {
  const { theme, isReducedMotion } = useProductCardTheme();
  const styles = useAdaptiveStyles();

  return (
    <div className="flex items-start justify-between space-x-4">
      {/* Left side: Company branding */}
      <CompanyBranding product={product} styles={styles} />

      {/* Right side: Status and actions */}
      <div className="flex items-center space-x-3 flex-shrink-0">
        {/* Status badge */}
        {showStatus && (
          <StatusBadge isApproved={product.isApproved} theme={theme} />
        )}

        {/* Action buttons */}
        {showActions && (
          <ActionButtons
            onToggleDetails={onToggleDetails}
            isExpanded={isExpanded}
            styles={styles}
            isReducedMotion={isReducedMotion}
          />
        )}
      </div>
    </div>
  );
}

// Variants for different contexts
export function HistoryPageHeader(props: ProductCardHeaderProps) {
  return <ProductCardHeader {...props} showStatus={true} showActions={true} />;
}

export function ProductPageHeader(props: ProductCardHeaderProps) {
  return <ProductCardHeader {...props} showStatus={true} showActions={false} />;
}

export function AdminHeader(props: ProductCardHeaderProps) {
  return <ProductCardHeader {...props} showStatus={true} showActions={true} />;
} 