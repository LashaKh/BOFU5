import React from 'react';
import { motion } from 'framer-motion';
import { SectionItemProps } from '../../types/contentBrief';

/**
 * Compact section wrapper component optimized for overview visibility
 * Provides consistent styling with minimal scrolling design
 */
export const SectionItem: React.FC<SectionItemProps> = ({
  title,
  icon,
  colorClass = 'text-primary-600',
  children
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200"
    >
      {/* Compact Header */}
      <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-lg">
        <div className="px-4 py-3">
          <div className="flex items-center space-x-2">
            {icon && (
              <div className={`flex-shrink-0 p-1 rounded-lg bg-white shadow-sm ${colorClass}`}>
                {icon}
              </div>
            )}
            <div>
              <h3 className="text-base font-semibold text-gray-900 leading-tight">
                {title}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Compact Content */}
      <div className="p-4">
        {children}
      </div>
    </motion.div>
  );
};

export default SectionItem; 