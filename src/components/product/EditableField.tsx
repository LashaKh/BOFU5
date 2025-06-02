import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, Check, X, Plus, Trash2 } from 'lucide-react';
import TextareaAutosize from 'react-textarea-autosize';

interface EditableFieldProps {
  label: string;
  value: string | string[];
  onSave: (value: string | string[]) => void;
  type?: 'text' | 'textarea' | 'array';
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  className?: string;
  allowEmpty?: boolean;
  multiline?: boolean;
  arrayItemPlaceholder?: string;
}

export function EditableField({
  label,
  value,
  onSave,
  type = 'text',
  placeholder = '',
  maxLength,
  disabled = false,
  className = '',
  allowEmpty = true,
  multiline = false,
  arrayItemPlaceholder = 'Add new item...'
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [newArrayItem, setNewArrayItem] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing) {
      if ((type === 'text' || type === 'array') && inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(inputRef.current.value.length, inputRef.current.value.length);
      } else if ((type === 'textarea' || multiline) && textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(textareaRef.current.value.length, textareaRef.current.value.length);
      }
    }
  }, [isEditing, type, multiline]);

  const handleSave = () => {
    if (type === 'array') {
      const arrayValue = Array.isArray(editValue) ? editValue : [];
      onSave(arrayValue);
    } else {
      const stringValue = typeof editValue === 'string' ? editValue : '';
      if (!allowEmpty && !stringValue.trim()) return;
      onSave(stringValue);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setNewArrayItem('');
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && type !== 'textarea' && !multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const addArrayItem = () => {
    if (newArrayItem.trim() && Array.isArray(editValue)) {
      setEditValue([...editValue, newArrayItem.trim()]);
      setNewArrayItem('');
    }
  };

  const removeArrayItem = (index: number) => {
    if (Array.isArray(editValue)) {
      setEditValue(editValue.filter((_, i) => i !== index));
    }
  };

  const updateArrayItem = (index: number, newValue: string) => {
    if (Array.isArray(editValue)) {
      const updated = [...editValue];
      updated[index] = newValue;
      setEditValue(updated);
    }
  };

  const renderDisplayValue = () => {
    if (type === 'array') {
      const arrayValue = Array.isArray(value) ? value : [];
      if (arrayValue.length === 0) {
        return (
          <div className="text-gray-500 italic text-sm">
            No items added yet
          </div>
        );
      }
      return (
        <div className="space-y-1">
          {arrayValue.map((item, index) => (
            <div key={index} className="text-sm text-gray-700 flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 flex-shrink-0"></div>
              <span className="flex-1">{item}</span>
            </div>
          ))}
        </div>
      );
    }

    const stringValue = typeof value === 'string' ? value : '';
    if (!stringValue.trim()) {
      return (
        <div className="text-gray-500 italic text-sm">
          {placeholder || `Click to add ${label.toLowerCase()}`}
        </div>
      );
    }

    return (
      <div className="text-gray-900 text-sm whitespace-pre-wrap">
        {stringValue}
      </div>
    );
  };

  const renderEditForm = () => {
    if (type === 'array') {
      const arrayValue = Array.isArray(editValue) ? editValue : [];
      return (
        <div className="space-y-3">
          {/* Add new item input */}
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newArrayItem}
              onChange={(e) => setNewArrayItem(e.target.value)}
              placeholder={arrayItemPlaceholder}
              className="flex-1 px-3 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addArrayItem();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  handleCancel();
                }
              }}
              maxLength={maxLength}
            />
            <button
              onClick={addArrayItem}
              disabled={!newArrayItem.trim()}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Existing items */}
          {arrayValue.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {arrayValue.map((item, index) => (
                <div key={index} className="flex gap-2 items-center group">
                  <TextareaAutosize
                    value={item}
                    onChange={(e) => updateArrayItem(index, e.target.value)}
                    className="flex-1 px-3 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                    minRows={1}
                    maxRows={4}
                    maxLength={maxLength}
                  />
                  <button
                    onClick={() => removeArrayItem(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors text-sm"
            >
              <X size={16} className="inline mr-1" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors text-sm"
            >
              <Check size={16} className="inline mr-1" />
              Save
            </button>
          </div>
        </div>
      );
    }

    // Text or textarea input
    const useTextarea = multiline || type === 'textarea';
    const stringValue = typeof editValue === 'string' ? editValue : '';

    return (
      <div className="space-y-3">
        {useTextarea ? (
          <TextareaAutosize
            ref={textareaRef}
            value={stringValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            maxLength={maxLength}
            className="w-full px-3 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            minRows={2}
            maxRows={6}
          />
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={stringValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            maxLength={maxLength}
            className="w-full px-3 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={handleCancel}
            className="px-3 py-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors text-sm"
          >
            <X size={16} className="inline mr-1" />
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!allowEmpty && !stringValue.trim()}
            className="px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors text-sm"
          >
            <Check size={16} className="inline mr-1" />
            Save
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={`border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-all ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        {!disabled && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
            title={`Edit ${label}`}
          >
            <Edit2 size={14} />
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {isEditing ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            {renderEditForm()}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="cursor-pointer"
            onClick={() => !disabled && setIsEditing(true)}
          >
            {renderDisplayValue()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 