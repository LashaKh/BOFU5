import React, { useState, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProductAnalysis } from '../../types/product/types';
import { ProductCardCapabilities } from './ProductCardCapabilities';
import { ProductCardCompetitorAnalysis } from './ProductCardCompetitorAnalysis';
import { ProductCardActions } from './ProductCardActions';
import { EditableField } from './EditableField';
import { SaveStatusIndicator } from './SaveStatusIndicator';
import { useAutoSave } from '../../hooks/useAutoSave';
import { CompetitorAnalysis } from './CompetitorAnalysis';
import { ImageUploader } from '../ui/ImageUploader';
import { useAuth } from '../../lib/auth';
import { deleteCapabilityImage, UploadResult } from '../../lib/storage';
import { X, Plus, ChevronDown, ChevronUp } from 'lucide-react';

interface ProductCardContentProps {
  product: ProductAnalysis;
  isExpanded?: boolean;
  maxItems?: number;
  showExpandButton?: boolean;
  // Phase 2 action handlers
  onSave?: (product: ProductAnalysis) => Promise<void>;
  onApprove?: (product: ProductAnalysis) => Promise<void>;
  onExport?: (product: ProductAnalysis, format: 'pdf' | 'json' | 'csv') => Promise<void>;
  onEdit?: (product: ProductAnalysis) => void;
  onDelete?: (product: ProductAnalysis) => void;
  onShare?: (product: ProductAnalysis) => void;
  onUpdateSection?: (productIndex: number, sectionType: keyof ProductAnalysis, newValue: any) => Promise<void>;
  context?: 'history' | 'product' | 'admin';
  showCapabilities?: boolean;
  showCompetitorAnalysis?: boolean;
  showActions?: boolean;
  enableEditing?: boolean;
  index?: number;
}

// Content section wrapper with enhanced styling
const ContentSection = ({ 
  title, 
  children, 
  icon, 
  styles 
}: { 
  title: string; 
  children: React.ReactNode; 
  icon?: React.ReactNode; 
  styles: any; 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.4 }}
      className="space-y-3"
    >
      <div className="flex items-center space-x-3 mb-4">
        {icon && <div className={`${styles.accentText}`}>{icon}</div>}
        <h4 className={`${styles.primaryText} text-sm font-semibold uppercase tracking-wide`}>
          {title}
        </h4>
      </div>
      {children}
    </motion.div>
  );
};

// List component with enhanced styling and animations
const AnimatedList = ({ 
  items, 
  maxItems = 3, 
  showExpandButton = true,
  styles,
  isReducedMotion,
  emptyMessage
}: { 
  items: string[]; 
  maxItems?: number; 
  showExpandButton?: boolean;
  styles: any;
  isReducedMotion: boolean;
  emptyMessage?: string;
}) => {
  const [isExpanded, setIsExpanded] = useState(true); // Always start expanded
  
  if (!items || items.length === 0) {
    return emptyMessage ? (
      <div className={`${styles.secondaryText} text-sm italic opacity-60`}>
        {emptyMessage}
      </div>
    ) : null;
  }

  // Always show all items since user wants all fields visible
  const displayItems = items;

  return (
    <div className="space-y-2">
      {/* Remove AnimatePresence to prevent key conflicts */}
      {displayItems.map((item, index) => (
        <div
          key={`list-item-${index}-${item.substring(0, 20)}`} // More unique key
          className={`
            ${styles.secondaryText}
            text-sm p-3 rounded-lg
            bg-gray-50 border border-gray-200
            hover:bg-gray-100 hover:border-gray-300
            transition-all duration-200
          `}
        >
          {item}
        </div>
      ))}
    </div>
  );
};

// Business overview component with enhanced layout
const BusinessOverview = ({ 
  businessOverview, 
  styles 
}: { 
  businessOverview: ProductAnalysis['businessOverview']; 
  styles: any; 
}) => {
  if (!businessOverview.mission && !businessOverview.industry && !businessOverview.keyOperations) {
    return null;
  }

  return (
    <ContentSection 
      title="Business Overview" 
      styles={styles}
      icon={
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4M9 7h6m-6 4h6m-2 8l4-4 4 4" />
        </svg>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {businessOverview.mission && (
          <div className={`${styles.secondaryText} text-sm p-3 rounded-lg bg-gray-50 border border-gray-200`}>
            <strong className={styles.primaryText}>Mission:</strong> {businessOverview.mission}
          </div>
        )}
        {businessOverview.industry && (
          <div className={`${styles.secondaryText} text-sm p-3 rounded-lg bg-gray-50 border border-gray-200`}>
            <strong className={styles.primaryText}>Industry:</strong> {businessOverview.industry}
          </div>
        )}
        {businessOverview.keyOperations && (
          <div className={`${styles.secondaryText} text-sm p-3 rounded-lg bg-gray-50 border border-gray-200 md:col-span-2`}>
            <strong className={styles.primaryText}>Key Operations:</strong> {businessOverview.keyOperations}
          </div>
        )}
      </div>
    </ContentSection>
  );
};

// Target persona component with enhanced styling
const TargetPersona = ({ 
  targetPersona, 
  styles,
  isReducedMotion 
}: { 
  targetPersona: ProductAnalysis['targetPersona']; 
  styles: any;
  isReducedMotion: boolean;
}) => {
  if (!targetPersona.primaryAudience && !targetPersona.demographics && 
      !targetPersona.industrySegments && !targetPersona.psychographics) {
    return null;
  }

  const personaData = [
    { label: 'Primary Audience', value: targetPersona.primaryAudience, icon: '👥' },
    { label: 'Demographics', value: targetPersona.demographics, icon: '📊' },
    { label: 'Industry Segments', value: targetPersona.industrySegments, icon: '🏢' },
    { label: 'Psychographics', value: targetPersona.psychographics, icon: '🧠' },
  ].filter(item => item.value);

  return (
    <ContentSection 
      title="Target Persona" 
      styles={styles}
      icon={
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {personaData.map((item, index) => (
          <motion.div
            key={item.label}
            initial={!isReducedMotion ? { opacity: 0, y: 10 } : { opacity: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            className={`
              ${styles.secondaryText} text-sm p-3 rounded-lg
              bg-gray-50 border border-gray-200
              hover:border-gray-300 transition-colors duration-200
            `}
          >
            <div className="flex items-start space-x-2">
              <span className="text-sm">{item.icon}</span>
              <div>
                <strong className={`${styles.primaryText} text-xs uppercase tracking-wide`}>
                  {item.label}
                </strong>
                <div className="mt-1">{item.value}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </ContentSection>
  );
};

export function ProductCardContent({
  product,
  isExpanded = false,
  maxItems = 3,
  showExpandButton = true,
  onSave,
  onApprove,
  onExport,
  onEdit,
  onDelete,
  onShare,
  onUpdateSection,
  context = 'product',
  showCapabilities = true,
  showCompetitorAnalysis = true,
  showActions = true,
  enableEditing = false,
  index,
}: ProductCardContentProps) {
  // Authentication context
  const { user } = useAuth();
  
  // State for the editable product data
  const [editableProduct, setEditableProduct] = useState<ProductAnalysis>(product);
  
  // Ref to track when we're updating competitors to prevent resets
  const isUpdatingCompetitors = useRef(false);

  // Add state for capabilities collapse (collapsed by default)
  const [isCapabilitiesExpanded, setIsCapabilitiesExpanded] = useState(false);

  // Update editable product when the original product changes
  React.useEffect(() => {
    // Check if the new product has the same competitor data we just set
    const currentCompetitors = editableProduct.competitors;
    const newCompetitors = product.competitors;
    
    // If we're updating competitors, check if parent now has the same data
    if (isUpdatingCompetitors.current && currentCompetitors && newCompetitors) {
      const currentTotal = (currentCompetitors.direct_competitors?.length || 0) + 
                          (currentCompetitors.niche_competitors?.length || 0) + 
                          (currentCompetitors.broader_competitors?.length || 0);
      const newTotal = (newCompetitors.direct_competitors?.length || 0) + 
                      (newCompetitors.niche_competitors?.length || 0) + 
                      (newCompetitors.broader_competitors?.length || 0);
      
      if (currentTotal > 0 && newTotal > 0 && currentTotal === newTotal) {
        console.log("ProductCardContent useEffect: Parent product now has same competitors - clearing flag and allowing sync");
        isUpdatingCompetitors.current = false;
        // Don't return here - allow normal sync to proceed
      } else if (currentTotal > 0 && newTotal === 0) {
        console.log("ProductCardContent useEffect: Still waiting for parent to reflect competitors, skipping sync");
        return;
      }
    }
    
    // Don't reset if we're currently updating competitors
    if (isUpdatingCompetitors.current) {
      console.log("ProductCardContent useEffect: Skipping product update due to competitor update in progress");
      return;
    }
    
    // If competitors are the same, don't update to avoid unnecessary re-renders
    if (currentCompetitors && newCompetitors) {
      const currentTotal = (currentCompetitors.direct_competitors?.length || 0) + 
                          (currentCompetitors.niche_competitors?.length || 0) + 
                          (currentCompetitors.broader_competitors?.length || 0);
      const newTotal = (newCompetitors.direct_competitors?.length || 0) + 
                      (newCompetitors.niche_competitors?.length || 0) + 
                      (newCompetitors.broader_competitors?.length || 0);
      
      if (currentTotal > 0 && newTotal > 0 && currentTotal === newTotal) {
        console.log("ProductCardContent useEffect: Skipping update - competitors data appears unchanged");
        return;
      }
    }
    
    console.log("ProductCardContent useEffect: Updating editableProduct from product prop", {
      productId: product.companyName,
      hasNewCompetitors: !!newCompetitors,
      newCompetitorsCount: newCompetitors ? 
        (newCompetitors.direct_competitors?.length || 0) + 
        (newCompetitors.niche_competitors?.length || 0) + 
        (newCompetitors.broader_competitors?.length || 0) : 0,
      currentCompetitorsCount: currentCompetitors ? 
        (currentCompetitors.direct_competitors?.length || 0) + 
        (currentCompetitors.niche_competitors?.length || 0) + 
        (currentCompetitors.broader_competitors?.length || 0) : 0,
    });
    
    setEditableProduct(product);
  }, [product]);

  // Auto-save functionality
  const handleAutoSave = useCallback(async (updatedProduct: ProductAnalysis): Promise<boolean> => {
    try {
      if (onUpdateSection) {
        // We need to determine what changed and call onUpdateSection for each change
        const changes: Array<{ section: keyof ProductAnalysis, value: any }> = [];
        
        // Compare all sections and collect changes
        Object.keys(updatedProduct).forEach(key => {
          const sectionKey = key as keyof ProductAnalysis;
          const originalValue = product[sectionKey];
          const newValue = updatedProduct[sectionKey];
          
          // Safe comparison that handles undefined values
          const originalStr = originalValue !== undefined ? JSON.stringify(originalValue) : 'undefined';
          const newStr = newValue !== undefined ? JSON.stringify(newValue) : 'undefined';
          
          if (originalStr !== newStr) {
            changes.push({ section: sectionKey, value: newValue });
          }
        });

        // Apply changes sequentially
        for (const change of changes) {
          await onUpdateSection(index ?? 0, change.section, change.value);
        }
      } else if (onSave) {
        await onSave(updatedProduct);
      }
      return true;
    } catch (error) {
      console.error('Auto-save failed:', error);
      return false;
    }
  }, [onUpdateSection, onSave, product, index]);

  const {
    hasUnsavedChanges,
    lastSaved,
    saveStatus
  } = useAutoSave({
    data: editableProduct,
    onSave: handleAutoSave,
    enabled: enableEditing && (!!onUpdateSection || !!onSave),
    delay: 2000
  });

  // Update field handlers
  const updateField = useCallback((field: keyof ProductAnalysis, value: any) => {
    setEditableProduct(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const updateNestedField = useCallback((section: keyof ProductAnalysis, field: string, value: any) => {
    setEditableProduct(prev => {
      const currentSection = prev[section];
      if (typeof currentSection === 'object' && currentSection !== null && !Array.isArray(currentSection)) {
        return {
          ...prev,
          [section]: {
            ...currentSection,
            [field]: value
          }
        };
      }
      return prev;
    });
  }, []);

  // Default styles for the remaining static sections
  const defaultStyles = {
    primaryText: 'text-gray-900',
    secondaryText: 'text-gray-700',
    accentText: 'text-blue-600'
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="px-6 pb-6"
    >
      {/* Save Status Indicator */}
      {enableEditing && (
        <SaveStatusIndicator
          status={saveStatus}
          hasUnsavedChanges={hasUnsavedChanges}
          lastSaved={lastSaved}
          className="mb-4"
        />
      )}

      {/* Always show all editable fields */}
      <div className="space-y-8">
        {/* Basic Information - Enhanced */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4M9 7h6m-6 4h6m-2 8l4-4 4 4" />
              </svg>
            </div>
            <div>
              <h4 className="text-xl font-semibold text-gray-900">Basic Information</h4>
              <p className="text-sm text-gray-500">Core company and product details</p>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                <EditableField
                  label=""
                  value={editableProduct.companyName || ''}
                  onSave={(value) => updateField('companyName', value as string)}
                  type="text"
                  placeholder="Enter company name"
                  maxLength={100}
                  disabled={!enableEditing}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Product Name</label>
                <EditableField
                  label=""
                  value={editableProduct.productDetails?.name || ''}
                  onSave={(value) => updateNestedField('productDetails', 'name', value as string)}
                  type="text"
                  placeholder="Enter product name"
                  maxLength={100}
                  disabled={!enableEditing}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Product Description - Enhanced */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h4 className="text-xl font-semibold text-gray-900">Product Description</h4>
              <p className="text-sm text-gray-500">Detailed overview of your product</p>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">Description</label>
            <EditableField
              label=""
              value={editableProduct.productDetails?.description || ''}
              onSave={(value) => updateNestedField('productDetails', 'description', value as string)}
              type="textarea"
              placeholder="Describe your product in detail - its purpose, key functionality, and what makes it unique..."
              maxLength={1000}
              multiline
              disabled={!enableEditing}
            />
          </div>
        </motion.div>

        {/* Business Overview - Enhanced */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4M9 7h6m-6 4h6m-2 8l4-4 4 4" />
              </svg>
            </div>
            <div>
              <h4 className="text-xl font-semibold text-gray-900">Business Overview</h4>
              <p className="text-sm text-gray-500">Company mission, industry, and operations</p>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">Mission Statement</label>
                <EditableField
                  label=""
                  value={editableProduct.businessOverview?.mission || ''}
                  onSave={(value) => updateNestedField('businessOverview', 'mission', value as string)}
                  type="textarea"
                  placeholder="Define your company's mission and core purpose..."
                  maxLength={500}
                  disabled={!enableEditing}
                />
              </div>
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">Industry</label>
                <EditableField
                  label=""
                  value={editableProduct.businessOverview?.industry || ''}
                  onSave={(value) => updateNestedField('businessOverview', 'industry', value as string)}
                  type="text"
                  placeholder="e.g., SaaS, FinTech, Healthcare, E-commerce..."
                  maxLength={100}
                  disabled={!enableEditing}
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Key Operations</label>
              <EditableField
                label=""
                value={editableProduct.businessOverview?.keyOperations || []}
                onSave={(value) => updateNestedField('businessOverview', 'keyOperations', value)}
                type="array"
                arrayItemPlaceholder="Add key operational area (e.g., Product Development, Customer Support)..."
                disabled={!enableEditing}
              />
            </div>
          </div>
        </motion.div>

        {/* Target Persona - Enhanced */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="space-y-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-rose-500 to-pink-600 rounded-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h4 className="text-xl font-semibold text-gray-900">Target Persona</h4>
              <p className="text-sm text-gray-500">Define your ideal customer profile</p>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-6 space-y-6">
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Primary Audience</label>
              <EditableField
                label=""
                value={editableProduct.targetPersona?.primaryAudience || ''}
                onSave={(value) => updateNestedField('targetPersona', 'primaryAudience', value as string)}
                type="textarea"
                placeholder="Describe your primary target audience - who they are, what they do, their needs..."
                maxLength={500}
                disabled={!enableEditing}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">Demographics</label>
                <EditableField
                  label=""
                  value={editableProduct.targetPersona?.demographics || []}
                  onSave={(value) => updateNestedField('targetPersona', 'demographics', value)}
                  type="array"
                  arrayItemPlaceholder="Add demographic detail (e.g., Age: 25-45, Income: $50k+)..."
                  disabled={!enableEditing}
                />
              </div>
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">Industry Segments</label>
                <EditableField
                  label=""
                  value={editableProduct.targetPersona?.industrySegments || []}
                  onSave={(value) => updateNestedField('targetPersona', 'industrySegments', value)}
                  type="array"
                  arrayItemPlaceholder="Add industry segment (e.g., Technology, Finance, Healthcare)..."
                  disabled={!enableEditing}
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Psychographics</label>
              <EditableField
                label=""
                value={editableProduct.targetPersona?.psychographics || []}
                onSave={(value) => updateNestedField('targetPersona', 'psychographics', value)}
                type="array"
                arrayItemPlaceholder="Add psychographic detail (e.g., Values innovation, Early adopter)..."
                disabled={!enableEditing}
              />
            </div>
          </div>
        </motion.div>

        {/* Value Propositions - Enhanced */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="space-y-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <div>
              <h4 className="text-xl font-semibold text-gray-900">Value Propositions</h4>
              <p className="text-sm text-gray-500">What makes your product unique and valuable</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* USPs */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-1.5 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-lg border border-purple-200">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                <label className="block text-sm font-semibold text-gray-700">Unique Selling Points</label>
              </div>
              <EditableField
                label=""
                value={editableProduct.usps || []}
                onSave={(value) => updateField('usps', value)}
                type="array"
                arrayItemPlaceholder="Add unique selling point (e.g., 10x faster processing, No-code solution)..."
                disabled={!enableEditing}
              />
            </div>

            {/* Key Features */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-1.5 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-lg border border-emerald-200">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                </div>
                <label className="block text-sm font-semibold text-gray-700">Key Features</label>
              </div>
              <EditableField
                label=""
                value={editableProduct.features || []}
                onSave={(value) => updateField('features', value)}
                type="array"
                arrayItemPlaceholder="Add key feature (e.g., Real-time analytics, API integration)..."
                disabled={!enableEditing}
              />
            </div>

            {/* Pain Points */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-1.5 bg-gradient-to-br from-red-100 to-rose-100 rounded-lg border border-red-200">
                  <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <label className="block text-sm font-semibold text-gray-700">Pain Points Addressed</label>
              </div>
              <EditableField
                label=""
                value={editableProduct.painPoints || []}
                onSave={(value) => updateField('painPoints', value)}
                type="array"
                arrayItemPlaceholder="Add pain point (e.g., Manual data entry, Lack of real-time insights)..."
                disabled={!enableEditing}
              />
            </div>
          </div>
        </motion.div>

        {/* Core Capabilities - Enhanced Production-Ready Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsCapabilitiesExpanded(!isCapabilitiesExpanded)}
              className="flex items-center gap-3 flex-1 text-left hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors duration-200"
            >
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-xl font-semibold text-gray-900">Core Capabilities</h4>
                <p className="text-sm text-gray-500">Define your product's key capabilities and features</p>
              </div>
              <div className="ml-auto">
                {isCapabilitiesExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </button>
            {enableEditing && isCapabilitiesExpanded && (
              <button
                onClick={() => {
                  const newCapability = {
                    title: '',
                    description: '',
                    content: '',
                    images: []
                  };
                  const updatedCapabilities = [...(editableProduct.capabilities || []), newCapability];
                  updateField('capabilities', updatedCapabilities);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                <Plus size={18} />
                Add Capability
              </button>
            )}
          </div>

          {/* Capability Items */}
          <AnimatePresence>
            {isCapabilitiesExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="space-y-6"
              >
                {editableProduct.capabilities && editableProduct.capabilities.length > 0 ? (
                  editableProduct.capabilities.map((capability, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="relative bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
                    >
                      {/* Capability Header */}
                      <div className="p-6 border-b border-gray-100">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg border border-blue-200">
                              <span className="text-lg font-bold text-blue-600">
                                {index + 1}
                              </span>
                            </div>
                            <div className="flex-1">
                              <EditableField
                                label=""
                                value={capability.title || ''}
                                onSave={(value) => {
                                  const updatedCapabilities = [...(editableProduct.capabilities || [])];
                                  updatedCapabilities[index] = {
                                    ...updatedCapabilities[index],
                                    title: value as string
                                  };
                                  updateField('capabilities', updatedCapabilities);
                                }}
                                type="text"
                                placeholder="Capability title (e.g., Real-time Analytics)"
                                maxLength={100}
                                disabled={!enableEditing}
                                className="text-lg font-semibold"
                              />
                            </div>
                          </div>
                          {enableEditing && (
                            <button
                              onClick={() => {
                                const updatedCapabilities = editableProduct.capabilities?.filter((_, i) => i !== index) || [];
                                updateField('capabilities', updatedCapabilities);
                              }}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200"
                              title="Remove capability"
                            >
                              <X size={18} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Capability Content */}
                      <div className="p-6 space-y-6">
                        {/* Description */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Description
                          </label>
                          <EditableField
                            label=""
                            value={capability.description || ''}
                            onSave={(value) => {
                              const updatedCapabilities = [...(editableProduct.capabilities || [])];
                              updatedCapabilities[index] = {
                                ...updatedCapabilities[index],
                                description: value as string
                              };
                              updateField('capabilities', updatedCapabilities);
                            }}
                            type="textarea"
                            placeholder="Brief description of this capability..."
                            maxLength={300}
                            disabled={!enableEditing}
                          />
                        </div>

                        {/* Detailed Content */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Detailed Description
                          </label>
                          <EditableField
                            label=""
                            value={capability.content || ''}
                            onSave={(value) => {
                              const updatedCapabilities = [...(editableProduct.capabilities || [])];
                              updatedCapabilities[index] = {
                                ...updatedCapabilities[index],
                                content: value as string
                              };
                              updateField('capabilities', updatedCapabilities);
                            }}
                            type="textarea"
                            placeholder="Detailed explanation of how this capability works, its benefits, and technical details..."
                            maxLength={1000}
                            disabled={!enableEditing}
                          />
                        </div>

                        {/* Images Section */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <label className="block text-sm font-medium text-gray-700">
                              Images & Media
                            </label>
                          </div>
                          
                          {/* Image Uploader */}
                          {enableEditing && user && (
                            <div className="mb-4">
                              <ImageUploader
                                onUpload={async (result: UploadResult) => {
                                  if (result.url && !result.error) {
                                    const updatedCapabilities = [...(editableProduct.capabilities || [])];
                                    const currentImages = updatedCapabilities[index].images || [];
                                    updatedCapabilities[index] = {
                                      ...updatedCapabilities[index],
                                      images: [...currentImages, result.url]
                                    };
                                    
                                    // Update local state
                                    updateField('capabilities', updatedCapabilities);
                                    
                                    // Immediately save to parent to prevent data loss
                                    if (onUpdateSection) {
                                      try {
                                        await onUpdateSection(index ?? 0, 'capabilities', updatedCapabilities);
                                        console.log('Image upload: Successfully updated capabilities in parent');
                                      } catch (error) {
                                        console.error('Image upload: Failed to update capabilities in parent:', error);
                                      }
                                    }
                                  }
                                }}
                                userId={user.id}
                                capabilityId={`${editableProduct.research_result_id || editableProduct.companyName || 'temp'}-capability-${index}`}
                                disabled={!enableEditing}
                                maxFiles={5}
                                currentImages={capability.images || []}
                                className="mb-3"
                              />
                            </div>
                          )}
                          
                          {/* Images Display */}
                          {capability.images && capability.images.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                              {capability.images.map((imageUrl, imageIndex) => (
                                <div key={imageIndex} className="relative group">
                                  <div className="aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                                    <img
                                      src={imageUrl}
                                      alt={`Capability ${index + 1} - Image ${imageIndex + 1}`}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        // Handle broken images
                                        const target = e.target as HTMLImageElement;
                                        target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f3f4f6'/%3E%3Ctext x='50' y='50' font-family='Arial' font-size='12' fill='%236b7280' text-anchor='middle' dy='0.3em'%3EImage not found%3C/text%3E%3C/svg%3E";
                                      }}
                                    />
                                  </div>
                                  {enableEditing && (
                                    <button
                                      onClick={async () => {
                                        // If this is a storage URL, try to delete from storage
                                        if (imageUrl.includes('supabase') && imageUrl.includes('capability-images')) {
                                          try {
                                            const urlParts = imageUrl.split('/');
                                            const bucketIndex = urlParts.findIndex(part => part === 'capability-images');
                                            if (bucketIndex !== -1 && bucketIndex < urlParts.length - 1) {
                                              const filePath = urlParts.slice(bucketIndex + 1).join('/');
                                              await deleteCapabilityImage(filePath);
                                            }
                                          } catch (error) {
                                            console.error('Failed to delete image from storage:', error);
                                          }
                                        }
                                        
                                        // Remove from UI
                                        const updatedCapabilities = [...(editableProduct.capabilities || [])];
                                        const currentImages = updatedCapabilities[index].images || [];
                                        updatedCapabilities[index] = {
                                          ...updatedCapabilities[index],
                                          images: currentImages.filter((_, i) => i !== imageIndex)
                                        };
                                        
                                        // Update local state
                                        updateField('capabilities', updatedCapabilities);
                                        
                                        // Immediately save to parent to prevent data loss
                                        if (onUpdateSection) {
                                          try {
                                            await onUpdateSection(index ?? 0, 'capabilities', updatedCapabilities);
                                            console.log('Image deletion: Successfully updated capabilities in parent');
                                          } catch (error) {
                                            console.error('Image deletion: Failed to update capabilities in parent:', error);
                                          }
                                        }
                                      }}
                                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
                                    >
                                      <X size={14} />
                                    </button>
                                  )}
                                  {/* Image Preview Overlay */}
                                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center">
                                    <button
                                      onClick={() => {
                                        // Open image in new tab for full view
                                        window.open(imageUrl, '_blank');
                                      }}
                                      className="opacity-0 group-hover:opacity-100 p-2 bg-white rounded-full shadow-lg transition-all duration-200 hover:scale-110"
                                    >
                                      <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              <p className="mt-2 text-sm text-gray-500">
                                {enableEditing ? 'Use the uploader above to add visual examples' : 'No images added yet'}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Capability Footer with metadata */}
                      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 rounded-b-xl">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Capability {index + 1}</span>
                          <div className="flex items-center gap-4">
                            {capability.images && capability.images.length > 0 && (
                              <span className="flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {capability.images.length} image{capability.images.length !== 1 ? 's' : ''}
                              </span>
                            )}
                            {capability.content && (
                              <span className="flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                {capability.content.length} chars
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-12 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl border-2 border-dashed border-gray-300"
                  >
                    <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No capabilities defined yet</h3>
                    <p className="text-gray-500 mb-6 max-w-md mx-auto">
                      Start building your product's capability profile by adding core features and functionalities that make your product unique.
                    </p>
                    {enableEditing && (
                      <button
                        onClick={() => {
                          const newCapability = {
                            title: '',
                            description: '',
                            content: '',
                            images: []
                          };
                          const updatedCapabilities = [...(editableProduct.capabilities || []), newCapability];
                          updateField('capabilities', updatedCapabilities);
                        }}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                      >
                        <Plus size={18} />
                        Add Your First Capability
                      </button>
                    )}
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Competitor Analysis - Moved to bottom */}
      {showCompetitorAnalysis && (
        <CompetitorAnalysis
          product={editableProduct}
          onUpdate={(url: string) => {
            // Update the competitor analysis URL in the product
            const updatedProduct = {
              ...editableProduct,
              competitorAnalysisUrl: url,
              google_doc: url
            };
            setEditableProduct(updatedProduct);
            
            // Also call the parent update if available
            if (onUpdateSection) {
              onUpdateSection(index ?? 0, 'competitorAnalysisUrl', url);
            }
          }}
          onUpdateCompetitors={(competitors: any) => {
            console.log("ProductCardContent.onUpdateCompetitors called with:", competitors);
            
            // Set flag to prevent useEffect from resetting competitors
            isUpdatingCompetitors.current = true;
            
            // Update the competitors data in the product immediately
            const updatedProduct = {
              ...editableProduct,
              competitors: competitors
            };
            
            console.log("ProductCardContent setting editableProduct with competitors:", updatedProduct.competitors);
            setEditableProduct(updatedProduct);
            
            // Immediately call the parent update to persist the data
            if (onUpdateSection) {
              console.log("ProductCardContent calling onUpdateSection with competitors:", competitors);
              onUpdateSection(index ?? 0, 'competitors', competitors).then(() => {
                console.log("ProductCardContent: onUpdateSection completed successfully");
                // DO NOT clear the flag here - let the useEffect handle it when parent prop updates
                console.log("ProductCardContent: Waiting for parent product prop to reflect competitors before clearing flag");
              }).catch(error => {
                console.error("Failed to update competitors in parent:", error);
                // Clear flag on error
                setTimeout(() => {
                  isUpdatingCompetitors.current = false;
                }, 1000);
              });
            } else {
              console.warn("ProductCardContent: onUpdateSection is not available");
              // Clear flag if no onUpdateSection available
              setTimeout(() => {
                isUpdatingCompetitors.current = false;
              }, 1000);
            }
          }}
        />
      )}

      {/* Advanced sections - only show when expanded and needed */}
      {isExpanded && (
        <div className="space-y-6 mt-6 pt-6 border-t border-gray-200">
          {/* Actions */}
          {showActions && (
            <ProductCardActions
              product={editableProduct}
              context={context}
              onSave={onSave}
              onApprove={onApprove}
              onExport={onExport}
              onEdit={onEdit}
              onDelete={onDelete}
              onShare={onShare}
            />
          )}
        </div>
      )}
    </motion.div>
  );
} 