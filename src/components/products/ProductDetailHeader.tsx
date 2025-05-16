import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface ProductDetailHeaderProps {
  productName?: string;
  productDescription?: string;
  onBackClick: () => void;
  isLoading?: boolean;
}

const ProductDetailHeader: React.FC<ProductDetailHeaderProps> = ({
  productName,
  productDescription,
  onBackClick,
  isLoading,
}) => {
  return (
    <div className="mb-8 p-6 bg-secondary-800/50 rounded-xl shadow-lg border border-secondary-700">
      <button
        onClick={onBackClick}
        className="mb-4 bg-primary-500 hover:bg-primary-600 text-white font-semibold py-2 px-4 rounded inline-flex items-center transition-colors duration-150"
      >
        <ArrowLeft size={20} className="mr-2" />
        Back to Products
      </button>

      {isLoading ? (
        <>
          <div className="h-8 bg-secondary-700 rounded w-3/4 mb-4 animate-pulse"></div>
          <div className="h-4 bg-secondary-700 rounded w-full mb-2 animate-pulse"></div>
          <div className="h-4 bg-secondary-700 rounded w-5/6 animate-pulse"></div>
        </>
      ) : (
        <>
          <h1 className="text-3xl font-bold text-primary-300 mb-2 break-words">
            {productName || 'Product Not Found'}
          </h1>
          <p className="text-gray-400 text-md break-words">
            {productDescription || 'No description available.'}
          </p>
        </>
      )}
    </div>
  );
};

export default ProductDetailHeader;
