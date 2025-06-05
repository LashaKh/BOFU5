import React, { useState, useEffect, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { 
  Link as LinkIcon, ExternalLink, Edit, Trash2, Check, X, 
  AlertCircle, Globe, Mail, Phone 
} from 'lucide-react';

interface LinkManagementProps {
  editor: Editor;
  isOpen: boolean;
  onClose: () => void;
  existingLink?: { url: string; text: string; target?: string };
}

export const LinkManagement: React.FC<LinkManagementProps> = ({
  editor,
  isOpen,
  onClose,
  existingLink
}) => {
  const [url, setUrl] = useState(existingLink?.url || '');
  const [linkText, setLinkText] = useState(existingLink?.text || '');
  const [target, setTarget] = useState(existingLink?.target || '_self');
  const [title, setTitle] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [validationMessage, setValidationMessage] = useState('');
  const [urlType, setUrlType] = useState<'web' | 'email' | 'phone' | 'other'>('web');
  
  const urlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Auto-focus URL input when modal opens
      setTimeout(() => urlInputRef.current?.focus(), 100);
      
      // If we have selected text and no existing link, use it as link text
      const { from, to } = editor.state.selection;
      if (!existingLink && from !== to) {
        const selectedText = editor.state.doc.textBetween(from, to);
        if (selectedText && !linkText) {
          setLinkText(selectedText);
        }
      }
    }
  }, [isOpen, editor, existingLink, linkText]);

  useEffect(() => {
    validateUrl(url);
  }, [url]);

  const validateUrl = (inputUrl: string) => {
    if (!inputUrl.trim()) {
      setIsValid(false);
      setValidationMessage('URL is required');
      setUrlType('web');
      return false;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(inputUrl)) {
      setIsValid(true);
      setValidationMessage('');
      setUrlType('email');
      return true;
    }

    // Phone validation
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (phoneRegex.test(inputUrl.replace(/[\s\-\(\)]/g, ''))) {
      setIsValid(true);
      setValidationMessage('');
      setUrlType('phone');
      return true;
    }

    // URL validation
    try {
      // Add protocol if missing
      let urlToValidate = inputUrl;
      if (!inputUrl.match(/^https?:\/\//)) {
        urlToValidate = `https://${inputUrl}`;
      }
      
      const urlObj = new URL(urlToValidate);
      
      if (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') {
        setIsValid(true);
        setValidationMessage('');
        setUrlType('web');
        return true;
      }
    } catch {
      // Invalid URL
    }

    setIsValid(false);
    setValidationMessage('Please enter a valid URL, email, or phone number');
    setUrlType('other');
    return false;
  };

  const formatUrl = (inputUrl: string): string => {
    if (!inputUrl.trim()) return '';

    // Handle email
    if (urlType === 'email') {
      return inputUrl.startsWith('mailto:') ? inputUrl : `mailto:${inputUrl}`;
    }

    // Handle phone
    if (urlType === 'phone') {
      const cleanPhone = inputUrl.replace(/[\s\-\(\)]/g, '');
      return cleanPhone.startsWith('tel:') ? inputUrl : `tel:${cleanPhone}`;
    }

    // Handle web URL
    if (urlType === 'web') {
      return inputUrl.match(/^https?:\/\//) ? inputUrl : `https://${inputUrl}`;
    }

    return inputUrl;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValid || !url.trim()) {
      return;
    }

    const formattedUrl = formatUrl(url);
    const finalLinkText = linkText.trim() || url;

    // Set link attributes
    const linkAttributes: any = {
      href: formattedUrl,
    };

    if (target !== '_self') {
      linkAttributes.target = target;
    }

    if (title.trim()) {
      linkAttributes.title = title.trim();
    }

    // Insert or update link
    if (existingLink) {
      // Update existing link
      editor.chain().focus().extendMarkRange('link').setLink(linkAttributes).run();
      
      // Update text if it changed
      if (linkText !== existingLink.text) {
        editor.chain().focus().insertContent(finalLinkText).run();
      }
    } else {
      // Insert new link
      const { from, to } = editor.state.selection;
      if (from === to) {
        // No selection - insert link with text
        editor.chain().focus().insertContent(`<a href="${formattedUrl}"${target !== '_self' ? ` target="${target}"` : ''}${title ? ` title="${title}"` : ''}>${finalLinkText}</a>`).run();
      } else {
        // Has selection - apply link to selection
        editor.chain().focus().setLink(linkAttributes).run();
      }
    }

    onClose();
    resetForm();
  };

  const handleRemoveLink = () => {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    onClose();
    resetForm();
  };

  const resetForm = () => {
    setUrl('');
    setLinkText('');
    setTarget('_self');
    setTitle('');
    setIsValid(true);
    setValidationMessage('');
    setUrlType('web');
  };

  const getUrlIcon = () => {
    switch (urlType) {
      case 'email':
        return <Mail size={16} className="text-blue-600" />;
      case 'phone':
        return <Phone size={16} className="text-green-600" />;
      case 'web':
        return <Globe size={16} className="text-purple-600" />;
      default:
        return <LinkIcon size={16} className="text-gray-600" />;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose} />
      
      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl z-50 w-full max-w-md">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {existingLink ? 'Edit Link' : 'Insert Link'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* URL Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL, Email, or Phone Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                  {getUrlIcon()}
                </div>
                <input
                  ref={urlInputRef}
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com, user@email.com, or +1234567890"
                  className={`w-full pl-10 pr-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    !isValid && url ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
              </div>
              {!isValid && url && (
                <div className="flex items-center mt-1 text-sm text-red-600">
                  <AlertCircle size={14} className="mr-1" />
                  {validationMessage}
                </div>
              )}
            </div>

            {/* Link Text Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Link Text (optional)
              </label>
              <input
                type="text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="Leave blank to use URL as text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Title/Tooltip Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title (tooltip)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Optional tooltip text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Target Selection */}
            {urlType === 'web' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Open in
                </label>
                <select
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="_self">Same tab</option>
                  <option value="_blank">New tab</option>
                </select>
              </div>
            )}

            {/* Preview */}
            {isValid && url && (
              <div className="p-3 bg-gray-50 rounded-md">
                <div className="text-sm text-gray-600 mb-1">Preview:</div>
                <div className="flex items-center">
                  {getUrlIcon()}
                  <span className="ml-2 text-blue-600 underline">
                    {linkText || url}
                  </span>
                  {target === '_blank' && (
                    <ExternalLink size={12} className="ml-1 text-gray-500" />
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4">
              <div>
                {existingLink && (
                  <button
                    type="button"
                    onClick={handleRemoveLink}
                    className="flex items-center px-3 py-2 text-red-600 hover:bg-red-50 rounded-md"
                  >
                    <Trash2 size={16} className="mr-1" />
                    Remove Link
                  </button>
                )}
              </div>
              
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isValid || !url.trim()}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check size={16} className="mr-1" />
                  {existingLink ? 'Update' : 'Insert'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}; 