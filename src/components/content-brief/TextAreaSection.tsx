import React from 'react';

interface TextAreaSectionProps {
  sectionKey: string;
  value: string[] | string;
  onUpdate?: (sectionKey: string, value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
}

// A component for a text area that handles newline-separated values
const TextAreaSection: React.FC<TextAreaSectionProps> = ({ 
  sectionKey, 
  value, 
  onUpdate, 
  readOnly = false,
  placeholder 
}) => {
  // Convert array to string if needed
  const textValue = Array.isArray(value) ? value.join('\n') : value || '';
  
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (onUpdate) {
      onUpdate(sectionKey, e.target.value);
    }
  };
  
  return (
    <div className="mt-2">
      <textarea
        className="w-full p-3 border rounded-md text-gray-700 min-h-[150px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        value={textValue}
        onChange={handleChange}
        placeholder={placeholder || `Enter ${sectionKey.replace('_', ' ')} here, one per line`}
        disabled={readOnly}
      />
      {readOnly && !textValue && (
        <p className="text-gray-500 italic mt-2 text-sm">{placeholder || 'No data available'}</p>
      )}
    </div>
  );
};

export default TextAreaSection;
