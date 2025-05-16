import React from 'react';
import { FileText, Link2, Trash2, Eye, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { ProductDocument } from '../../types/product/types'; // Adjusted path

interface AssociatedDocumentCardProps {
  document: ProductDocument;
  onDelete: (documentId: string) => void;
  onView: (document: ProductDocument) => void;
}

const iconMap: { [key: string]: React.ElementType } = {
  pdf: FileText,
  docx: FileText,
  doc: FileText,
  pptx: FileText,
  gdoc: Link2,
  link: Link2,
  text: FileText,
  unknown: FileText,
  file: FileText, // Generic file type
  default: FileText,
};

const statusIconMap: { [key: string]: React.ElementType } = {
  pending: RefreshCw, 
  processing: RefreshCw,
  processed: CheckCircle, 
  failed: AlertTriangle,    
  default: AlertTriangle,
};

const statusColorMap: { [key: string]: string } = {
  pending: 'text-yellow-500',
  processing: 'text-blue-500',
  processed: 'text-green-500',
  failed: 'text-red-500',
  default: 'text-gray-500',
};

const AssociatedDocumentCard: React.FC<AssociatedDocumentCardProps> = ({ document, onDelete, onView }) => {
  const docTypeString = typeof document.document_type === 'string' ? document.document_type.toLowerCase() : 'unknown';
  const IconComponent = iconMap[docTypeString] || iconMap.default;
  
  const statusString = typeof document.status === 'string' ? document.status.toLowerCase() : 'unknown';
  const StatusIcon = statusIconMap[statusString] || statusIconMap.default;
  const statusColor = statusColorMap[statusString] || statusColorMap.default;

  return (
    <div className="bg-secondary-800/60 p-4 rounded-lg shadow-md border border-secondary-700 hover:border-primary-500/50 transition-all duration-150 flex flex-col justify-between min-h-[180px]">
      <div>
        <div className="flex items-start mb-2">
          <IconComponent size={20} className="mr-3 text-primary-400 flex-shrink-0 mt-1" />
          <h3 className="text-md font-semibold text-gray-100 break-all" title={document.file_name}>
            {document.file_name}
          </h3>
        </div>
        <div className="flex items-center text-xs text-gray-400 mb-1 pl-8">
          <StatusIcon size={14} className={`mr-1.5 ${statusColor} ${statusString === 'processing' || statusString === 'pending' ? 'animate-spin' : ''}`} />
          Status: <span className={`ml-1 font-medium ${statusColor}`}>{document.status}</span>
        </div>
        <p className="text-xs text-primary-400 mb-3 pl-8">
          Added: {new Date(document.created_at).toLocaleDateString()}
        </p>
      </div>
      <div className="flex justify-end space-x-2 pt-3 border-t border-secondary-700/50 mt-auto">
        <button 
          onClick={() => onView(document)}
          className="px-3 py-1.5 text-xs font-medium text-primary-300 bg-primary-500/20 hover:bg-primary-500/30 rounded-md transition-colors flex items-center"
          aria-label={`View ${document.file_name}`}
        >
          <Eye size={14} className="mr-1.5" /> View
        </button>
        <button 
          onClick={() => onDelete(document.id)}
          className="px-3 py-1.5 text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-md transition-colors flex items-center"
          aria-label={`Delete ${document.file_name}`}
        >
          <Trash2 size={14} className="mr-1.5" /> Delete
        </button>
      </div>
    </div>
  );
};

export default AssociatedDocumentCard;
