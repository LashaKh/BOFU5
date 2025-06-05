import React, { useState, useRef, useEffect } from 'react';
import { Download, FileText, File, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { exportService } from '../../lib/export/ExportService';
import { ExportFormat, ExportResult } from '../../lib/export';
import { Editor } from '@tiptap/react';
import { cn } from '../../lib/utils';

interface ExportButtonProps {
  editor: Editor | null;
  articleTitle?: string;
  articleId?: string;
  className?: string;
  variant?: 'button' | 'dropdown';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

interface ExportStatus {
  isExporting: boolean;
  lastResult: ExportResult | null;
  error: string | null;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  editor,
  articleTitle = 'Untitled Article',
  articleId = '',
  className = '',
  variant = 'dropdown',
  size = 'md',
  showLabel = true,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [exportStatus, setExportStatus] = useState<ExportStatus>({
    isExporting: false,
    lastResult: null,
    error: null,
  });
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Handle export for a specific format
  const handleExport = async (format: ExportFormat) => {
    if (!editor) {
      setExportStatus({
        isExporting: false,
        lastResult: null,
        error: 'Editor not available',
      });
      return;
    }

    setExportStatus({
      isExporting: true,
      lastResult: null,
      error: null,
    });

    setIsDropdownOpen(false);

    try {
      const defaultOptions = exportService.getDefaultOptions(format);
      const result = await exportService.exportFromEditor(
        editor,
        articleTitle,
        articleId,
        { ...defaultOptions, format }
      );

      setExportStatus({
        isExporting: false,
        lastResult: result,
        error: result.success ? null : result.error || 'Export failed',
      });

      // Clear status after 3 seconds if successful
      if (result.success) {
        setTimeout(() => {
          setExportStatus(prev => ({ ...prev, lastResult: null }));
        }, 3000);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setExportStatus({
        isExporting: false,
        lastResult: null,
        error: errorMessage,
      });
    }
  };

  // Get available export formats
  const supportedFormats = exportService.getSupportedFormats();

  // Format configuration
  const formatConfig: Record<ExportFormat, { 
    label: string; 
    icon: React.ComponentType<any>; 
    description: string;
    extension: string;
  }> = {
    markdown: {
      label: 'Markdown',
      icon: FileText,
      description: 'Plain text with formatting syntax',
      extension: 'md',
    },
    txt: {
      label: 'Plain Text',
      icon: File,
      description: 'Text only, no formatting',
      extension: 'txt',
    },
    html: {
      label: 'HTML',
      icon: FileText,
      description: 'Web page format',
      extension: 'html',
    },
    pdf: {
      label: 'PDF',
      icon: FileText,
      description: 'Portable document format',
      extension: 'pdf',
    },
    docx: {
      label: 'Word Document',
      icon: FileText,
      description: 'Microsoft Word format',
      extension: 'docx',
    },
  };

  // Size configuration
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  // Render single format button
  if (variant === 'button' && supportedFormats.length > 0) {
    const defaultFormat = supportedFormats[0];
    const config = formatConfig[defaultFormat];
    
    return (
      <button
        ref={buttonRef}
        onClick={() => handleExport(defaultFormat)}
        disabled={!editor || exportStatus.isExporting}
        className={cn(
          'flex items-center space-x-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
          sizeClasses[size],
          className
        )}
        title={`Export as ${config.label}`}
      >
        {exportStatus.isExporting ? (
          <Loader2 className={cn('animate-spin', iconSizes[size])} />
        ) : exportStatus.lastResult?.success ? (
          <CheckCircle className={cn('text-green-600', iconSizes[size])} />
        ) : exportStatus.error ? (
          <AlertCircle className={cn('text-red-600', iconSizes[size])} />
        ) : (
          <config.icon className={iconSizes[size]} />
        )}
        {showLabel && <span>Export</span>}
      </button>
    );
  }

  // Render dropdown variant
  return (
    <div ref={dropdownRef} className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        disabled={!editor || exportStatus.isExporting}
        className={cn(
          'flex items-center space-x-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
          sizeClasses[size],
          className
        )}
        title="Export article"
      >
        {exportStatus.isExporting ? (
          <Loader2 className={cn('animate-spin', iconSizes[size])} />
        ) : exportStatus.lastResult?.success ? (
          <CheckCircle className={cn('text-green-600', iconSizes[size])} />
        ) : exportStatus.error ? (
          <AlertCircle className={cn('text-red-600', iconSizes[size])} />
        ) : (
          <Download className={iconSizes[size]} />
        )}
        {showLabel && <span>Export</span>}
        <svg
          className={cn(
            'transition-transform duration-200',
            iconSizes[size],
            isDropdownOpen && 'rotate-180'
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Export status messages */}
      {exportStatus.error && (
        <div className="absolute top-full left-0 mt-1 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 whitespace-nowrap z-50">
          <div className="flex items-center space-x-1">
            <AlertCircle className="w-3 h-3" />
            <span>{exportStatus.error}</span>
          </div>
        </div>
      )}

      {exportStatus.lastResult?.success && (
        <div className="absolute top-full left-0 mt-1 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700 whitespace-nowrap z-50">
          <div className="flex items-center space-x-1">
            <CheckCircle className="w-3 h-3" />
            <span>Exported successfully as {exportStatus.lastResult.filename}</span>
          </div>
        </div>
      )}

      {/* Dropdown menu */}
      {isDropdownOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-2">
            <div className="text-xs font-medium text-gray-700 mb-2 px-2">
              Choose export format:
            </div>
            <div className="space-y-1">
              {supportedFormats.map((format) => {
                const config = formatConfig[format];
                return (
                  <button
                    key={format}
                    onClick={() => handleExport(format)}
                    disabled={exportStatus.isExporting}
                    className="w-full flex items-start space-x-3 p-2 text-left rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <config.icon className="w-4 h-4 mt-0.5 text-gray-600" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900">
                        {config.label} (.{config.extension})
                      </div>
                      <div className="text-xs text-gray-500">
                        {config.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          
          {supportedFormats.length === 0 && (
            <div className="p-4 text-center text-sm text-gray-500">
              No export formats available
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ExportButton; 