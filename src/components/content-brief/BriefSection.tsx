import React, { useState } from 'react';

interface BriefSectionProps {
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  actionButton?: React.ReactNode;
}

export function BriefSection({ 
  title, 
  children, 
  collapsible = false,
  defaultOpen = true,
  actionButton
}: BriefSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const toggleOpen = () => {
    if (collapsible) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className="brief-section mb-6">
      <div className="brief-section-header" onClick={toggleOpen}>
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          {collapsible && (
            <button className="p-1 mr-2 text-gray-500 hover:text-gray-700 transition-colors">
              <svg 
                className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
          {title}
        </h3>
        {actionButton && (
          <div>
            {actionButton}
          </div>
        )}
      </div>
      {(!collapsible || isOpen) && (
        <div className="brief-section-content">
          {children}
        </div>
      )}
    </div>
  );
}
