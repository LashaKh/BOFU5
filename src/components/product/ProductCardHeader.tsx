import React from 'react';
import { motion } from 'framer-motion';
import { useAdaptiveStyles, useProductCardTheme } from '../../contexts/ProductCardThemeContext';
import { useAdminContext } from '../../contexts/AdminContext';
import { ProductAnalysis } from '../../types/product/types';

interface ProductCardHeaderProps {
  product: ProductAnalysis;
  index: number;
  showStatus?: boolean;
  showActions?: boolean;
  onToggleDetails?: () => void;
  isExpanded?: boolean;
}

// Premium status badge component with sophisticated styling
const StatusBadge = ({ isApproved, theme }: { isApproved?: boolean; theme: any }) => {
  const isApprovedStatus = isApproved;
  
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0, rotate: -10 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={{ delay: 0.3, duration: 0.6, ease: 'backOut' }}
      className="relative"
    >
      <div
        className="px-4 py-2.5 rounded-xl text-sm font-bold flex items-center space-x-2 shadow-lg border backdrop-blur-md"
        style={{
          background: isApprovedStatus 
            ? `linear-gradient(135deg, 
                rgba(34, 197, 94, 0.9) 0%, 
                rgba(16, 185, 129, 0.8) 50%, 
                rgba(5, 150, 105, 0.9) 100%
              )`
            : `linear-gradient(135deg, 
                rgba(245, 158, 11, 0.9) 0%, 
                rgba(251, 191, 36, 0.8) 50%, 
                rgba(217, 119, 6, 0.9) 100%
              )`,
          color: 'white',
          border: isApprovedStatus 
            ? '1px solid rgba(34, 197, 94, 0.3)'
            : '1px solid rgba(245, 158, 11, 0.3)',
          boxShadow: isApprovedStatus
            ? '0 4px 6px -1px rgba(34, 197, 94, 0.3), 0 2px 4px -1px rgba(34, 197, 94, 0.2)'
            : '0 4px 6px -1px rgba(245, 158, 11, 0.3), 0 2px 4px -1px rgba(245, 158, 11, 0.2)',
        }}
      >
        {/* Premium status indicator */}
        <div className="relative">
          <div 
            className={`w-3 h-3 rounded-full ${
              isApprovedStatus ? 'bg-green-200' : 'bg-yellow-200'
            } animate-pulse`}
          />
          <div 
            className={`absolute inset-0 w-3 h-3 rounded-full ${
              isApprovedStatus ? 'bg-green-100' : 'bg-yellow-100'
            } animate-ping`}
          />
        </div>
        
        {/* Status text with icon */}
        <div className="flex items-center space-x-1">
          {isApprovedStatus ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <span className="font-bold tracking-wide">
            {isApprovedStatus ? 'Approved' : 'Pending Review'}
          </span>
        </div>
      </div>
      
      {/* Floating glow effect */}
      <div 
        className={`absolute inset-0 rounded-xl blur-md opacity-50 ${
          isApprovedStatus ? 'bg-green-400' : 'bg-yellow-400'
        } -z-10`}
      />
    </motion.div>
  );
};

// Admin info badge component for displaying user context
const AdminInfoBadge = ({ product, isAdmin }: { product: ProductAnalysis; isAdmin: boolean }) => {
  if (!isAdmin) return null;

  // Check what admin data we have available for this product

  // Show admin info if we have any relevant data
  const hasAnyAdminInfo = product.userEmail || product.userCompanyName || product.userUUID || 
                          product.research_result_id || product.approvedBy;

  if (!hasAnyAdminInfo) {
    // Still show something for admins to indicate this is admin-only info
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="bg-gradient-to-r from-amber-50 to-orange-100 border border-amber-200 rounded-lg px-3 py-2 text-xs space-y-1"
      >
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
          <span className="text-amber-900 font-semibold">Admin View</span>
        </div>
        <div className="text-amber-800 text-[10px]">No submission details available</div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="bg-gradient-to-r from-blue-50 to-indigo-100 border border-blue-200 rounded-lg px-3 py-2 text-xs space-y-1"
    >
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
        <span className="text-blue-900 font-semibold">Submission Details</span>
      </div>
      {product.userEmail && (
        <div className="text-blue-800 font-medium">📧 {product.userEmail}</div>
      )}
      {product.userCompanyName && (
        <div className="text-blue-700">🏢 {product.userCompanyName}</div>
      )}
      {product.userUUID && !product.userEmail && (
        <div className="text-blue-700 text-[10px]">User ID: {product.userUUID.slice(0, 8)}...</div>
      )}
      {product.approvedBy && (
        <div className="text-green-700 text-[10px]">✅ Approved by: {product.approvedBy.slice(0, 8)}...</div>
      )}
      {product.research_result_id && (
        <div className="text-blue-600 text-[10px] opacity-75">
          🔬 Research: {product.research_result_id.slice(0, 8)}...
        </div>
      )}
    </motion.div>
  );
};

// Premium company branding section with enhanced typography and visual hierarchy
const CompanyBranding = ({ product, styles, isAdmin }: { product: ProductAnalysis; styles: any; isAdmin: boolean }) => {
  return (
    <div className="flex-1 min-w-0 space-y-3">
      {/* Company Name with premium styling */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.6, ease: 'easeOut' }}
        className="relative"
      >
        <h2
          className="text-2xl md:text-3xl font-bold tracking-tight truncate"
          style={{
            background: `
              linear-gradient(135deg, 
                #1e293b 0%, 
                #334155 50%, 
                #475569 100%
              )
            `,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          }}
        >
          {product.companyName || 'Unknown Company'}
        </h2>
        {/* Subtle underline accent */}
        <div 
          className="absolute -bottom-1 left-0 h-0.5 w-1/3 rounded-full"
          style={{
            background: `
              linear-gradient(90deg, 
                rgba(59, 130, 246, 0.8) 0%, 
                rgba(147, 51, 234, 0.6) 50%, 
                transparent 100%
              )
            `,
          }}
        />
      </motion.div>

      {/* Product Name with enhanced styling */}
      {product.productDetails?.name && (
        <motion.h3
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-lg md:text-xl font-semibold text-gray-600 truncate"
          style={{
            background: `
              linear-gradient(135deg, 
                #64748b 0%, 
                #94a3b8 100%
              )
            `,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {product.productDetails.name}
        </motion.h3>
      )}

      {/* Admin Information Badge */}
      <AdminInfoBadge product={product} isAdmin={isAdmin} />

      {/* Premium document link with enhanced styling */}
      {(product.competitorAnalysisUrl || product.google_doc) && (
        <motion.a
          href={product.competitorAnalysisUrl || product.google_doc}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="inline-flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 hover:scale-105 group/link"
          style={{
            background: `
              linear-gradient(135deg, 
                rgba(59, 130, 246, 0.1) 0%, 
                rgba(147, 51, 234, 0.08) 100%
              )
            `,
            border: '1px solid rgba(59, 130, 246, 0.2)',
            color: '#3b82f6',
          }}
        >
          <div className="relative">
            <svg className="w-4 h-4 transition-transform duration-200 group-hover/link:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <div className="absolute inset-0 bg-blue-400 rounded-full blur-sm opacity-0 group-hover/link:opacity-30 transition-opacity duration-200" />
          </div>
          <span className="truncate max-w-[180px] font-semibold">
            {(product.competitorAnalysisUrl || product.google_doc || '').replace(/^https?:\/\//, '')}
          </span>
          <div className="w-1 h-1 bg-blue-400 rounded-full opacity-0 group-hover/link:opacity-100 transition-opacity duration-200" />
        </motion.a>
      )}
    </div>
  );
};

// Premium action buttons with sophisticated micro-interactions
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
    <div className="flex items-center space-x-3">
      {/* Premium Expand/Collapse Button */}
      <motion.button
        onClick={onToggleDetails}
        whileHover={!isReducedMotion ? { scale: 1.05, y: -2 } : undefined}
        whileTap={!isReducedMotion ? { scale: 0.95 } : undefined}
        className="relative group"
        title={isExpanded ? "Show Less Details" : "Show More Details"}
        style={{
          background: `
            linear-gradient(135deg, 
              rgba(59, 130, 246, 0.9) 0%, 
              rgba(147, 51, 234, 0.8) 50%, 
              rgba(236, 72, 153, 0.9) 100%
            )
          `,
          padding: '12px 16px',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: `
            0 4px 6px -1px rgba(59, 130, 246, 0.3),
            0 2px 4px -1px rgba(59, 130, 246, 0.2),
            0 0 0 1px rgba(255, 255, 255, 0.1) inset
          `,
          backdropFilter: 'blur(10px) saturate(180%)',
          color: 'white',
          fontWeight: '600',
          fontSize: '14px',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Background glow effect */}
        <div 
          className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"
          style={{
            background: `
              linear-gradient(135deg, 
                rgba(59, 130, 246, 0.4) 0%, 
                rgba(147, 51, 234, 0.3) 50%, 
                rgba(236, 72, 153, 0.4) 100%
              )
            `,
          }}
        />
        
        <div className="relative flex items-center space-x-2">
          <span className="font-bold tracking-wide">
            {isExpanded ? 'Show Less' : 'Show More'}
          </span>
          
          {/* Premium chevron with smooth rotation */}
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="relative"
          >
            <svg 
              className="w-4 h-4" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
            
            {/* Subtle glow on icon */}
            <div className="absolute inset-0 bg-white rounded-full blur-sm opacity-0 group-hover:opacity-20 transition-opacity duration-200" />
          </motion.div>
        </div>
        
        {/* Floating particles effect */}
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-300 rounded-full opacity-0 group-hover:opacity-100 animate-ping transition-opacity duration-200" />
        <div className="absolute -bottom-1 -left-1 w-1.5 h-1.5 bg-pink-300 rounded-full opacity-0 group-hover:opacity-100 animate-pulse transition-opacity duration-200 delay-100" />
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
  const { isAdmin } = useAdminContext();

  return (
    <div 
      className="relative overflow-hidden"
      style={{
        background: `
          linear-gradient(135deg, 
            rgba(255, 255, 255, 0.9) 0%, 
            rgba(248, 250, 252, 0.8) 50%, 
            rgba(241, 245, 249, 0.9) 100%
          )
        `,
        backdropFilter: 'blur(10px) saturate(180%)',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        padding: '24px',
        boxShadow: `
          0 0 0 1px rgba(15, 23, 42, 0.05),
          0 2px 4px -1px rgba(15, 23, 42, 0.1),
          0 4px 6px -1px rgba(15, 23, 42, 0.1)
        `,
      }}
    >
      {/* Premium background pattern */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: `
            radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(147, 51, 234, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, rgba(236, 72, 153, 0.05) 0%, transparent 50%)
          `,
        }}
      />
      
      {/* Floating decorative elements */}
      <div className="absolute top-2 right-2 w-16 h-16 bg-gradient-to-br from-blue-400/10 to-purple-500/10 rounded-full blur-xl" />
      <div className="absolute bottom-2 left-2 w-12 h-12 bg-gradient-to-tr from-pink-400/10 to-yellow-500/10 rounded-full blur-lg" />
      
      <div className="relative z-10 flex items-start justify-between space-x-6">
        {/* Left side: Enhanced Company branding */}
        <CompanyBranding product={product} styles={styles} isAdmin={isAdmin} />

        {/* Right side: Enhanced Status and actions */}
        <div className="flex items-center space-x-4 flex-shrink-0">
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