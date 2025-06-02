import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProductAnalysis } from '../../types/product/types';

// Enhanced imports for new architecture
import { ProductCardThemeProvider } from '../../contexts/ProductCardThemeContext';
import { ProductCardContainer, AdminProductCardContainer } from './ProductCardContainer';
import { ProductCardHeader } from './ProductCardHeader';
import { ProductCardContent } from './ProductCardContent';

// Legacy imports (preserved for backward compatibility)
import { supabase } from '../../lib/supabase';
import { ProductHeader } from './ProductHeader';
import { ProductSection } from './ProductSection';
import { CompetitorAnalysis } from './CompetitorAnalysis';
import { ProductDescription } from './ProductDescription';
import { TargetPersona } from './TargetPersona';
import { Capabilities } from './Capabilities';
import { Loader2, Save, CheckSquare, Send, FileText, ExternalLink } from 'lucide-react';
import { sendToAirOps } from '../../lib/airops';
import { toast } from 'react-hot-toast';

// Legacy interface for backward compatibility
interface LegacyProductCardProps {
  product: {
    productName: string;
    companyName?: string;
    usps?: string[];
    features?: string[];
    painPoints?: string[];
    targetPersona?: string;
    pricing?: string;
    approved?: boolean;
    google_doc?: string;
    competitorAnalysisUrl?: string;
  };
  isExpanded?: boolean;
  maxItems?: number;
  showExpandButton?: boolean;
  className?: string;
}

// Enhanced interface using ProductAnalysis
interface EnhancedProductCardProps {
  product: import('../../types/product/types').ProductAnalysis;
  isExpanded?: boolean;
  maxItems?: number;
  showExpandButton?: boolean;
  className?: string;
  // Phase 2: Context and action handlers
  context?: 'history' | 'product' | 'admin';
  onSave?: (product: import('../../types/product/types').ProductAnalysis) => Promise<void>;
  onApprove?: (product: import('../../types/product/types').ProductAnalysis) => Promise<void>;
  onExport?: (product: import('../../types/product/types').ProductAnalysis, format: 'pdf' | 'json' | 'csv') => Promise<void>;
  onEdit?: (product: import('../../types/product/types').ProductAnalysis) => void;
  onDelete?: (product: import('../../types/product/types').ProductAnalysis) => void;
  onShare?: (product: import('../../types/product/types').ProductAnalysis) => void;
  onUpdateSection?: (productIndex: number, sectionType: keyof import('../../types/product/types').ProductAnalysis, newValue: any) => Promise<void>;
  // Phase 2: Feature toggles
  showCapabilities?: boolean;
  showCompetitorAnalysis?: boolean;
  showActions?: boolean;
  // Editing capabilities
  enableEditing?: boolean;
  // Theme customization
  theme?: 'light' | 'dark' | 'auto';
  variant?: 'default' | 'compact' | 'detailed';
}

type ProductCardProps = LegacyProductCardProps | EnhancedProductCardProps;

// Type guards to distinguish between legacy and enhanced props
function isLegacyProps(props: ProductCardProps): props is LegacyProductCardProps {
  return 'productName' in props.product;
}

function isEnhancedProps(props: ProductCardProps): props is EnhancedProductCardProps {
  return 'productDetails' in props.product || 'businessOverview' in props.product;
}

// Transform legacy product to ProductAnalysis format
function transformLegacyProduct(legacyProduct: LegacyProductCardProps['product']): import('../../types/product/types').ProductAnalysis {
  return {
    companyName: legacyProduct.companyName || '',
    productDetails: {
      name: legacyProduct.productName,
      description: '',
    },
    usps: legacyProduct.usps || [],
    features: legacyProduct.features || [],
    painPoints: legacyProduct.painPoints || [],
    businessOverview: {
      mission: '',
      industry: '',
      keyOperations: '',
    },
    targetPersona: {
      primaryAudience: legacyProduct.targetPersona || '',
      demographics: '',
      industrySegments: '',
      psychographics: '',
    },
    pricing: legacyProduct.pricing || '',
    currentSolutions: {
      directCompetitors: [],
      existingMethods: [],
    },
    capabilities: [],
    isApproved: legacyProduct.approved || false,
    google_doc: legacyProduct.google_doc,
    competitorAnalysisUrl: legacyProduct.competitorAnalysisUrl,
  } as import('../../types/product/types').ProductAnalysis;
}

// Enhanced ProductCard component for new features
function EnhancedProductCard({
  product,
  isExpanded = false,
  maxItems = 3,
  showExpandButton = true,
  className = '',
  context = 'product',
  onSave,
  onApprove,
  onExport,
  onEdit,
  onDelete,
  onShare,
  onUpdateSection,
  showCapabilities = true,
  showCompetitorAnalysis = true,
  showActions = true,
  enableEditing = false,
  theme,
  variant = 'default',
}: EnhancedProductCardProps) {
  const [isExpandedState, setIsExpanded] = useState(isExpanded);
  const [isEditMode, setIsEditMode] = useState(true);

  const handleToggleDetails = () => {
    setIsExpanded(!isExpandedState);
  };

  const handleToggleEditing = () => {
    setIsEditMode(!isEditMode);
  };

  const handleProductUpdate = useCallback(async (productIndex: number, sectionType: keyof ProductAnalysis, newValue: any): Promise<void> => {
    try {
      if (onUpdateSection) {
        await onUpdateSection(productIndex, sectionType, newValue);
      }
    } catch (error) {
      console.error('Failed to update product section:', error);
      throw error;
    }
  }, [onUpdateSection]);

  if (!product) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-400">
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm font-medium">No product data available</p>
        </div>
      </div>
    );
  }

  const Container = context === 'admin' ? AdminProductCardContainer : ProductCardContainer;

  return (
    <ProductCardThemeProvider>
      <Container
        className={`space-y-6 ${className}`}
        product={product}
        index={0}
      >
        <ProductCardHeader
          product={product}
          index={0}
          showStatus={true}
          showActions={showActions}
          onToggleDetails={handleToggleDetails}
          isExpanded={isExpandedState}
        />

        <ProductCardContent
          product={product}
          isExpanded={isExpandedState}
          maxItems={maxItems}
          showExpandButton={showExpandButton}
          context={context}
          onSave={onSave}
          onApprove={onApprove}
          onExport={onExport}
          onEdit={onEdit}
          onDelete={onDelete}
          onShare={onShare}
          onUpdateSection={handleProductUpdate}
          showCapabilities={showCapabilities}
          showCompetitorAnalysis={showCompetitorAnalysis}
          showActions={showActions}
          enableEditing={isEditMode}
          index={0}
        />
      </Container>
    </ProductCardThemeProvider>
  );
}

// Legacy ProductCard component (simplified version for backward compatibility)
function LegacyProductCard({
  product,
  isExpanded = false,
  maxItems = 3,
  showExpandButton = true,
  className = '',
}: LegacyProductCardProps) {
  // Transform legacy product to ProductAnalysis format
  const transformedProduct = transformLegacyProduct(product);
  const context = 'history';
  
  return <EnhancedProductCard 
    product={transformedProduct} 
    context={context}
    isExpanded={isExpanded}
    maxItems={maxItems}
    showExpandButton={showExpandButton}
    className={className}
  />;
}

// Main export - restored enhanced implementation with fixed interfaces
export function ProductCard(props: any) {
  // For now, accept any props and transform to what we need
  if (!props.product) {
    return <div className="text-red-500">No product data provided</div>;
  }

  // Transform the product to ensure it has the right structure
  const enhancedProduct = React.useMemo(() => {
    const product = props.product;
    
    // Ensure the product has all required fields for ProductAnalysis
    return {
      companyName: product.companyName || 'Unknown Company',
      productDetails: {
        name: product.productDetails?.name || product.productDetails?.productName || 'Unknown Product',
        description: product.productDetails?.description || '',
      },
      usps: product.usps || [],
      features: product.features || [],
      painPoints: product.painPoints || [],
      businessOverview: product.businessOverview || {
        mission: '',
        industry: '',
        keyOperations: '',
      },
      targetPersona: product.targetPersona || {
        primaryAudience: '',
        demographics: '',
        industrySegments: '',
        psychographics: '',
      },
      pricing: product.pricing || '',
      currentSolutions: product.currentSolutions || {
        directCompetitors: [],
        existingMethods: [],
      },
      capabilities: product.capabilities || [],
      isApproved: product.isApproved || false,
      google_doc: product.google_doc,
      competitorAnalysisUrl: product.competitorAnalysisUrl,
    } as ProductAnalysis;
  }, [props.product]);

  // Extract context and other props
  const context = props.context || 'product';
  const isExpanded = props.isExpanded || false;
  const [isExpandedState, setIsExpanded] = useState(true); // Always start expanded

  const handleToggleDetails = () => {
    setIsExpanded(!isExpandedState);
  };

  // Auto-save handler for product updates
  const handleProductUpdate = useCallback(async (productIndex: number, sectionType: keyof ProductAnalysis, newValue: any): Promise<void> => {
    try {
      if (props.onUpdateSection) {
        await props.onUpdateSection(productIndex, sectionType, newValue);
      }
    } catch (error) {
      console.error('Failed to update product section:', error);
      throw error;
    }
  }, [props.onUpdateSection]);

  // Container selection based on context
  const Container = context === 'admin' ? AdminProductCardContainer : ProductCardContainer;
  
  return (
    <ProductCardThemeProvider>
      <Container
        product={enhancedProduct}
        index={props.index || 0}
        className={`space-y-6 ${props.className || ''}`}
      >
        <ProductCardHeader
          product={enhancedProduct}
          index={props.index || 0}
          showStatus={true}
          showActions={true}
          onToggleDetails={handleToggleDetails}
          isExpanded={isExpandedState}
        />

        <ProductCardContent
          product={enhancedProduct}
          isExpanded={isExpandedState}
          maxItems={props.maxItems || 3}
          showExpandButton={false} // Remove the "more" button as requested
          context={context}
          onSave={props.onSave}
          onApprove={props.onApprove}
          onExport={props.onExport}
          onEdit={props.onEdit}
          onDelete={props.onDelete}
          onShare={props.onShare}
          onUpdateSection={handleProductUpdate}
          showCapabilities={true}
          showCompetitorAnalysis={true}
          showActions={true}
          enableEditing={true} // Always enable editing
          index={props.index || 0}
        />
      </Container>
    </ProductCardThemeProvider>
  );
}

// Context-specific variants for new enhanced interface
export function HistoryProductCard(props: Omit<EnhancedProductCardProps, 'context'>) {
  return <EnhancedProductCard {...props} context="history" />;
}

export function ProductPageCard(props: Omit<EnhancedProductCardProps, 'context'>) {
  return <EnhancedProductCard {...props} context="product" />;
}

export function AdminProductCard(props: Omit<EnhancedProductCardProps, 'context'>) {
  return <EnhancedProductCard {...props} context="admin" />;
}

// Component for the floating document button
function CompetitorAnalysisDocButton({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-4 py-2 bg-blue-700/80 rounded-md text-white hover:bg-blue-600 transition-colors"
    >
      <FileText className="h-4 w-4" />
      View Analysis Doc
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}

export { ProductCard as default }; 