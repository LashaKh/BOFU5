import React, { useState } from 'react';
import { Product } from '../../types'; // Adjust path as necessary
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Trash2, Edit2, Save, X } from 'lucide-react'; // Import icons
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface ProductCardProps {
  product: Product;
  onDelete: (productId: string) => void;
  onUpdate?: (updatedProduct: Product) => void; // Add onUpdate prop
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onDelete, onUpdate }) => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(product.name);
  const [editDescription, setEditDescription] = useState(product.description || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleCardClick = () => {
    if (!isEditing) {
      navigate(`/products/${product.id}`);
    }
  };

  const handleDeleteClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (window.confirm(`Are you sure you want to delete the product "${product.name}"? This action cannot be undone.`)) {
      onDelete(product.id);
    }
  };

  const handleEditClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsEditing(true);
    setEditName(product.name);
    setEditDescription(product.description || '');
  };

  const handleCancelEdit = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsEditing(false);
    setEditName(product.name);
    setEditDescription(product.description || '');
  };

  const handleSaveEdit = async (event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (!editName.trim()) {
      toast.error('Product name cannot be empty');
      return;
    }

    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .update({
          name: editName.trim(),
          description: editDescription.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', product.id)
        .select()
        .single();

      if (error) throw error;

      const updatedProduct = { ...product, ...data };
      if (onUpdate) {
        onUpdate(updatedProduct);
      }
      
      setIsEditing(false);
      toast.success('Product updated successfully');
    } catch (error: any) {
      console.error('Error updating product:', error);
      toast.error('Failed to update product');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      onClick={handleCardClick}
      className={`bg-secondary-800/50 p-6 rounded-xl shadow-lg hover:shadow-primary-500/20 ${!isEditing ? 'cursor-pointer' : ''} border border-secondary-700 hover:border-primary-500/30 transition-all duration-300 ease-in-out transform hover:-translate-y-1 flex flex-col justify-between h-full`}
    >
      <div>
        <div className="flex justify-between items-start mb-2">
          {isEditing ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="text-xl font-semibold text-black bg-white border border-secondary-600 rounded px-2 py-1 flex-1 mr-2 focus:outline-none focus:border-primary-500"
              placeholder="Product name"
              disabled={isSaving}
            />
          ) : (
            <h3 className="text-xl font-semibold text-primary-300 truncate mr-2" title={product.name}>
              {product.name}
            </h3>
          )}
          
          <div className="flex items-center space-x-1">
            {isEditing ? (
              <>
                <button 
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="p-1.5 text-green-500 hover:text-green-400 hover:bg-green-800/50 rounded-md transition-colors duration-150 disabled:opacity-50"
                  title="Save changes"
                >
                  <Save size={18} />
                </button>
                <button 
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="p-1.5 text-gray-500 hover:text-gray-400 hover:bg-gray-800/50 rounded-md transition-colors duration-150 disabled:opacity-50"
                  title="Cancel editing"
                >
                  <X size={18} />
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={handleEditClick}
                  className="p-1.5 text-blue-500 hover:text-blue-400 hover:bg-blue-800/50 rounded-md transition-colors duration-150"
                  title="Edit Product"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={handleDeleteClick}
                  className="p-1.5 text-red-500 hover:text-red-400 hover:bg-red-800/50 rounded-md transition-colors duration-150"
                  title="Delete Product"
                >
                  <Trash2 size={18} />
                </button>
              </>
            )}
          </div>
        </div>
        
        {isEditing ? (
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="text-black text-sm mb-4 w-full h-20 bg-white border border-secondary-600 rounded px-2 py-1 resize-none focus:outline-none focus:border-primary-500"
            placeholder="Product description"
            disabled={isSaving}
          />
        ) : (
          <p className="text-white text-sm mb-4 overflow-hidden line-clamp-3" title={product.description || ''}>
            {product.description || 'No description available.'}
          </p>
        )}
      </div>
      
      <div className="mt-auto pt-4 border-t border-secondary-700/50">
        <p className="text-xs text-gray-300">
          Last updated: {new Date(product.updated_at).toLocaleDateString()}
        </p>
      </div>
    </motion.div>
  );
};

export default ProductCard;
