import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RichTextEditor } from './RichTextEditor';
import TextareaAutosize from 'react-textarea-autosize';
import { Edit2, Save, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

interface Capability {
  title: string;
  description: string;
  content: string;
  images?: string[];
}

interface CapabilityEditorProps {
  capability: Capability;
  onUpdate: (capability: Capability) => void;
  onDelete: () => void;
}

export function CapabilityEditor({ capability, onUpdate, onDelete }: CapabilityEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedCapability, setEditedCapability] = useState(capability);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleImageUpload = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSave = () => {
    onUpdate(editedCapability);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <motion.div 
        className="bg-secondary-800 rounded-xl border border-primary-500/20 p-6 space-y-4"
        initial={{ opacity: 0.8, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary-400 mb-1">Title</label>
            <TextareaAutosize
              value={editedCapability.title}
              onChange={(e) => setEditedCapability({ ...editedCapability, title: e.target.value })}
              className="w-full px-3 py-2 bg-secondary-900 border border-primary-500/30 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Enter capability title"
              minRows={1}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-primary-400 mb-1">Brief Description</label>
            <TextareaAutosize
              value={editedCapability.description}
              onChange={(e) => setEditedCapability({ ...editedCapability, description: e.target.value })}
              className="w-full px-3 py-2 bg-secondary-900 border border-primary-500/30 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Enter a brief description"
              minRows={2}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-primary-400 mb-1">Detailed Content</label>
            <RichTextEditor
              content={editedCapability.content}
              onChange={(content) => setEditedCapability({ ...editedCapability, content })}
              onImageUpload={handleImageUpload}
            />
          </div>
        </div>
        
        <div className="flex justify-between">
          <button
            onClick={() => setIsEditing(false)}
            className="px-3 py-1.5 text-gray-400 hover:text-gray-300 hover:bg-secondary-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <div className="flex gap-2">
            <button
              onClick={onDelete}
              className="px-3 py-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-1"
            >
              <Trash2 size={16} />
              Delete
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1.5 bg-primary-500 text-secondary-900 rounded-lg hover:bg-primary-400 transition-colors flex items-center gap-1 font-medium"
            >
              <Save size={16} />
              Save
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="bg-secondary-800 backdrop-blur-sm rounded-xl border border-primary-500/20 p-6 hover:shadow-glow transition-all group"
      initial={{ opacity: 0.8, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <div className="absolute top-3 right-3 flex items-center gap-1">
        <button
          onClick={() => setIsEditing(true)}
          className="p-1.5 text-primary-400 hover:bg-primary-500/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
        >
          <Edit2 size={16} />
        </button>
      </div>

      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-primary-400">
          {capability.title.startsWith('Capability') ? capability.title : `Capability #${capability.title}`}
        </h4>
        
        <div className="relative">
          <p className="text-gray-300">{capability.description}</p>
          
          {/* Display images if they exist */}
          {capability.images && capability.images.length > 0 && (
            <div className="mt-4">
              <div className="text-sm text-primary-400 font-medium mb-2">
                📷 Images ({capability.images.length})
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {capability.images.map((imageUrl, index) => (
                  <div key={index} className="group relative">
                    <img 
                      src={imageUrl} 
                      alt={`${capability.title} - Image ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border border-primary-500/20 group-hover:border-primary-500/40 transition-colors"
                      onError={(e) => {
                        // Fallback to link if image fails to load
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <div className="hidden bg-secondary-700 p-3 rounded-lg border border-primary-500/20">
                      <a 
                        href={imageUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary-400 hover:text-primary-300 text-sm break-all"
                      >
                        🖼️ Image {index + 1}: {imageUrl.split('/').pop()?.substring(0, 30)}...
                      </a>
                    </div>
                    {/* Image overlay with link */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <a 
                        href={imageUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="bg-primary-500/80 text-white px-3 py-1 rounded-lg text-sm font-medium hover:bg-primary-500"
                      >
                        View Full Size
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-4"
              >
                <div 
                  className="prose max-w-none text-gray-300 prose-headings:text-primary-400 prose-a:text-primary-400"
                  dangerouslySetInnerHTML={{ __html: capability.content }}
                />
              </motion.div>
            )}
          </AnimatePresence>
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-2 text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors"
          >
            {isExpanded ? (
              <>Show Less <ChevronUp size={16} className="text-gray-600 dark:text-gray-400" /></>
            ) : (
              <>See More <ChevronDown size={16} className="text-gray-600 dark:text-gray-400" /></>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}