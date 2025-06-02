import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdaptiveStyles, useProductCardTheme } from '../../contexts/ProductCardThemeContext';
import { ProductAnalysis } from '../../types/product/types';

type CapabilityCategory = 'core' | 'advanced' | 'premium';

interface ProductCardCapabilitiesProps {
  product: ProductAnalysis;
  isExpanded?: boolean;
  showInteractive?: boolean;
}

// Enhanced capability card with interactive features
const CapabilityCard = ({ 
  title, 
  description, 
  icon, 
  category, 
  styles, 
  isReducedMotion,
  onClick 
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  category: CapabilityCategory;
  styles: any;
  isReducedMotion: boolean;
  onClick?: () => void;
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const categoryColors = {
    core: 'bg-blue-50 border-blue-200',
    advanced: 'bg-purple-50 border-purple-200',
    premium: 'bg-amber-50 border-amber-200',
  };

  const categoryIcons = {
    core: '⚡',
    advanced: '🚀', 
    premium: '💎',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={!isReducedMotion ? { y: -4, scale: 1.02 } : undefined}
      whileTap={!isReducedMotion ? { scale: 0.98 } : undefined}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onClick}
      className={`
        ${categoryColors[category]}
        rounded-xl p-4
        transition-all duration-300 cursor-pointer
        hover:shadow-md
        group relative overflow-hidden
      `}
    >
      {/* Background glow effect - removed for simple design */}
      
      {/* Category badge */}
      <div className="absolute top-2 right-2 flex items-center space-x-1">
        <span className="text-xs">{categoryIcons[category]}</span>
        <span className={`${styles.text.accent} text-xs font-medium uppercase tracking-wide`}>
          {category}
        </span>
      </div>

      {/* Icon */}
      <div className={`${styles.text.accent} text-2xl mb-3 relative z-10`}>
        {icon}
      </div>

      {/* Content */}
      <div className="relative z-10">
        <h4 className={`${styles.text.primary} font-semibold mb-2 text-sm`}>
          {title}
        </h4>
        <p className={`${styles.text.secondary} text-xs leading-relaxed`}>
          {description}
        </p>
      </div>

      {/* Interactive indicator */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-primary-500/20 flex items-center justify-center"
          >
            <svg className="w-3 h-3 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5-5 5M6 12h12" />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Interactive capability showcase
const CapabilityShowcase = ({ 
  capabilities, 
  styles, 
  isReducedMotion 
}: {
  capabilities: Array<{
    title: string;
    description: string;
    icon: React.ReactNode;
    category: CapabilityCategory;
  }>;
  styles: any;
  isReducedMotion: boolean;
}) => {
  const [selectedCapability, setSelectedCapability] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      {/* Capability grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {capabilities.map((capability, index) => (
          <CapabilityCard
            key={index}
            {...capability}
            styles={styles}
            isReducedMotion={isReducedMotion}
            onClick={() => setSelectedCapability(index === selectedCapability ? null : index)}
          />
        ))}
      </div>

      {/* Selected capability details */}
      <AnimatePresence>
        {selectedCapability !== null && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className={`
              ${styles.card.background} ${styles.card.border}
              rounded-xl p-6 mt-4 overflow-hidden
            `}
          >
            <div className="flex items-start space-x-4">
              <div className={`${styles.text.accent} text-3xl`}>
                {capabilities[selectedCapability].icon}
              </div>
              <div className="flex-1">
                <h5 className={`${styles.text.primary} text-lg font-bold mb-2`}>
                  {capabilities[selectedCapability].title}
                </h5>
                <p className={`${styles.text.secondary} text-sm leading-relaxed mb-4`}>
                  {capabilities[selectedCapability].description}
                </p>
                <div className="flex items-center space-x-3">
                  <span className={`
                    ${styles.text.accent} text-xs font-semibold uppercase tracking-wide
                    px-2 py-1 rounded-full bg-primary-500/20
                  `}>
                    {capabilities[selectedCapability].category} Feature
                  </span>
                  <button 
                    onClick={() => setSelectedCapability(null)}
                    className={`${styles.text.secondary} hover:${styles.text.primary} text-xs transition-colors`}
                  >
                    Close Details
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export function ProductCardCapabilities({
  product,
  isExpanded = false,
  showInteractive = true,
}: ProductCardCapabilitiesProps) {
  const { theme, isReducedMotion } = useProductCardTheme();
  const styles = useAdaptiveStyles();

  // Transform product features into enhanced capabilities
  const capabilities = React.useMemo((): Array<{
    title: string;
    description: string;
    icon: React.ReactNode;
    category: CapabilityCategory;
  }> => {
    const features = product.features || [];
    const usps = product.usps || [];
    
    const allCapabilities: Array<{
      title: string;
      description: string;
      icon: React.ReactNode;
      category: CapabilityCategory;
    }> = [
      ...features.map((feature, index) => ({
        title: feature.length > 30 ? feature.substring(0, 30) + '...' : feature,
        description: feature,
        icon: index % 3 === 0 ? '🔧' : index % 3 === 1 ? '⚙️' : '🎯',
        category: 'core' as CapabilityCategory,
      })),
      ...usps.slice(0, 3).map((usp, index) => ({
        title: usp.length > 30 ? usp.substring(0, 30) + '...' : usp,
        description: usp,
        icon: index % 3 === 0 ? '🚀' : index % 3 === 1 ? '💡' : '⭐',
        category: 'advanced' as CapabilityCategory,
      })),
    ];

    // Add premium capabilities if product has premium features
    if (product.pricing && (
      product.pricing.toLowerCase().includes('enterprise') || 
      product.pricing.toLowerCase().includes('premium') ||
      product.pricing.toLowerCase().includes('pro')
    )) {
      allCapabilities.push({
        title: 'Enterprise Grade',
        description: 'Advanced enterprise features with premium support and enhanced security.',
        icon: '💎',
        category: 'premium' as CapabilityCategory,
      });
    }

    return allCapabilities.slice(0, 6); // Limit to 6 capabilities for optimal UX
  }, [product]);

  if (!capabilities.length) {
    return (
      <div className={`${styles.text.secondary} text-sm text-center py-8`}>
        <div className="space-y-2">
          <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <p>No capabilities defined</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`${styles.text.accent} text-xl`}>🔥</div>
          <h3 className={`${styles.text.primary} text-lg font-bold`}>
            Core Capabilities
          </h3>
        </div>
        <div className={`${styles.text.secondary} text-xs font-medium`}>
          {capabilities.length} capabilities
        </div>
      </div>

      {/* Interactive showcase */}
      {showInteractive ? (
        <CapabilityShowcase 
          capabilities={capabilities}
          styles={styles}
          isReducedMotion={isReducedMotion}
        />
      ) : (
        /* Simple grid for non-interactive contexts */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {capabilities.map((capability, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`
                ${styles.text.secondary} text-sm p-3 rounded-lg
                bg-primary-500/5 border border-primary-500/20
                flex items-center space-x-3
              `}
            >
              <span className="text-lg">{capability.icon}</span>
              <span className="flex-1">{capability.title}</span>
            </motion.div>
          ))}
        </div>
      )}

      {/* Capability stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className={`
          ${styles.card.background} ${styles.card.border}
          rounded-lg p-4 mt-4
        `}
      >
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className={`${styles.text.primary} text-lg font-bold`}>
              {capabilities.filter(c => c.category === 'core').length}
            </div>
            <div className={`${styles.text.secondary} text-xs`}>Core</div>
          </div>
          <div>
            <div className={`${styles.text.primary} text-lg font-bold`}>
              {capabilities.filter(c => c.category === 'advanced').length}
            </div>
            <div className={`${styles.text.secondary} text-xs`}>Advanced</div>
          </div>
          <div>
            <div className={`${styles.text.primary} text-lg font-bold`}>
              {capabilities.filter(c => c.category === 'premium').length}
            </div>
            <div className={`${styles.text.secondary} text-xs`}>Premium</div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
} 