import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Edit2, Plus, Trash2, CheckCircle, AlertCircle, Save, Loader2 } from 'lucide-react';
import TextareaAutosize from 'react-textarea-autosize';

interface ProductSectionProps {
  title: string;
  items: string[];
  onUpdate: (items: string[]) => void;
  isExpanded: boolean;
  toggleExpanded: () => void;
  sectionType: 'usps' | 'features' | 'painPoints';
  isSaving?: boolean;
}

export function ProductSection({ 
  title, 
  items, 
  onUpdate, 
  isExpanded, 
  toggleExpanded,
  sectionType,
  isSaving
}: ProductSectionProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editedItems, setEditedItems] = React.useState(items);
  const [newItem, setNewItem] = React.useState('');

  React.useEffect(() => {
    // Sync editedItems with items prop if not editing or when items prop itself changes.
    // This ensures that if the parent data changes, the view updates, and
    // when edit mode is entered, it starts with the latest data.
    console.log(`[ProductSection: ${title}] useEffect triggered. isEditing: ${isEditing}, items prop:`, JSON.parse(JSON.stringify(items)));
    if (!isEditing) {
      console.log(`[ProductSection: ${title}] Not editing. Syncing editedItems with items prop.`);
      setEditedItems(items);
    } else {
      console.log(`[ProductSection: ${title}] Currently editing. Not syncing from prop.`);
    }
  }, [items, isEditing, title]);
  
  const getIcon = () => {
    switch (sectionType) {
      case 'usps':
        return <CheckCircle className="text-primary-400 mt-1 mr-2 flex-shrink-0" size={16} />;
      case 'painPoints':
        return <AlertCircle className="text-primary-400 mt-1 mr-2 flex-shrink-0" size={16} />;
      case 'features':
        return <CheckCircle className="text-primary-400 mt-1 mr-2 flex-shrink-0" size={16} />;
      default:
        return <CheckCircle className="text-primary-400 mt-1 mr-2 flex-shrink-0" size={16} />;
    }
  };
  
  const getSectionStyle = () => {
    switch (sectionType) {
      case 'usps':
        return 'hover:bg-primary-500/10 border-primary-500/20';
      case 'painPoints':
        return 'hover:bg-primary-500/10 border-primary-500/20';
      case 'features':
        return 'hover:bg-primary-500/10 border-primary-500/20';
      default:
        return 'hover:bg-primary-500/10 border-primary-500/20';
    }
  };

  const handleSave = () => {
    onUpdate(editedItems);
    setIsEditing(false);
  };

  const handleAddItem = () => {
    if (newItem.trim()) {
      const updatedItems = [...editedItems, newItem.trim()];
      setEditedItems(updatedItems);
      // onUpdate(updatedItems); // Optionally call onUpdate immediately or only on save
      setNewItem('');
    }
  };

  const handleRemoveItem = (index: number) => {
    const updatedItems = editedItems.filter((_, i) => i !== index);
    setEditedItems(updatedItems);
    // onUpdate(updatedItems); // Optionally call onUpdate immediately or only on save
  };

  const handleEditItemChange = (index: number, value: string) => {
    const updatedItems = editedItems.map((item, i) => (i === index ? value : item));
    setEditedItems(updatedItems);
  };

  return (
    <div className={`bg-secondary-900/80 backdrop-blur-sm rounded-xl border ${getSectionStyle()} p-4 hover:shadow-glow transition-all group`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-primary-400">{title}</h3>
        <div className="flex items-center">
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="p-1.5 text-primary-400 hover:bg-primary-500/20 rounded-lg transition-colors mr-1"
            >
              <Edit2 size={16} />
            </button>
          )}
          <button
            onClick={toggleExpanded}
            className="p-1 hover:bg-secondary-800 rounded-lg transition-colors"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? "Collapse section" : "Expand section"}
          >
            {isExpanded ? 
              <ChevronUp size={18} className="text-gray-700 dark:text-gray-400" /> : 
              <ChevronDown className="text-gray-700 dark:text-gray-400" size={18} />
            }
          </button>
        </div>
      </div>
      
      <AnimatePresence>
        {isExpanded && !isEditing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-1 text-sm mt-1"
          >
            {/* Render `items` prop directly when not editing */} 
            {items && items.length > 0 ? (
              items.map((item, i) => (
                <div key={i} className="flex items-start">
                  {getIcon()}
                  <p className="text-gray-300">{item}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-800 dark:text-gray-100 italic">No items available</p>
            )}
          </motion.div>
        )}
        
        {isExpanded && isEditing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                className="flex-1 px-3 py-2 bg-secondary-800 border border-primary-500/30 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Add new item..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newItem.trim()) {
                    handleAddItem();
                  }
                }}
              />
              <button
                onClick={handleAddItem}
                className="p-2 text-primary-400 hover:bg-primary-500/20 rounded-lg transition-colors"
              >
                <Plus size={20} />
              </button>
            </div>
            
            <div className="space-y-2">
              {editedItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between group/item p-2 hover:bg-secondary-800 rounded-lg">
                  <TextareaAutosize
                    value={item}
                    onChange={(e) => handleEditItemChange(i, e.target.value)}
                    className="flex-1 px-2 py-1 bg-transparent border-b border-primary-500/50 text-white dark:text-gray-100 focus:outline-none focus:border-primary-500 resize-none w-full min-h-[30px] overflow-y-hidden"
                    minRows={1}
                    maxRows={6}
                  />
                  <button
                    onClick={() => handleRemoveItem(i)}
                    className="ml-2 invisible group-hover/item:visible p-1 text-gray-600 dark:text-gray-400 hover:text-red-400 hover:bg-red-900/30 rounded-full transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  // Reset editedItems from the canonical `items` prop when cancelling
                  setEditedItems(items); 
                  setIsEditing(false);
                }}
                className="px-3 py-1.5 text-gray-400 hover:text-gray-300 hover:bg-secondary-800 rounded-lg transition-colors"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className={`px-3 py-1.5 bg-primary-500 text-secondary-900 rounded-lg hover:bg-primary-400 transition-colors flex items-center gap-1 ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 size={16} className="animate-spin mr-1" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Save
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {!isExpanded && (
        <div className="mt-1 flex items-center">
          <span className="text-sm dark:text-white dark:opacity-100">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </span>
          <button
            onClick={toggleExpanded}
            className="ml-2 text-xs text-primary-400 hover:text-primary-300 flex items-center"
          >
            Show details
          </button>
        </div>
      )}
    </div>
  );
} 