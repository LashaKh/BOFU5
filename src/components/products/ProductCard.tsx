import React from 'react';
import { Product } from '../../types'; // Adjust path as necessary
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react'; // Import Trash2 icon

interface ProductCardProps {
  product: Product;
  onDelete: (productId: string) => void; // Add onDelete prop
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onDelete }) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/dashboard/products/${product.id}`);
  };

  const handleDeleteClick = (event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent card click navigation
    if (window.confirm(`Are you sure you want to delete the product "${product.name}"? This action cannot be undone.`)) {
      onDelete(product.id);
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
      className="bg-secondary-800/50 p-6 rounded-xl shadow-lg hover:shadow-primary-500/20 cursor-pointer border border-secondary-700 hover:border-primary-500/30 transition-all duration-300 ease-in-out transform hover:-translate-y-1 flex flex-col justify-between h-full"
    >
      <div>
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-semibold text-primary-300 truncate mr-2" title={product.name}>
            {product.name}
          </h3>
          <button 
            onClick={handleDeleteClick}
            className="p-1.5 text-red-500 hover:text-red-400 hover:bg-red-800/50 rounded-md transition-colors duration-150"
            title="Delete Product"
          >
            <Trash2 size={18} />
          </button>
        </div>
        <p className="text-white text-sm mb-4 overflow-hidden line-clamp-3" title={product.description || ''}>
          {product.description || 'No description available.'}
        </p>
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
