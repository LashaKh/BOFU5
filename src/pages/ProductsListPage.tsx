import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Product } from '../types';
import ProductCard from '../components/products/ProductCard';
import ProductCreationModal from '../components/products/ProductCreationModal';
import { useAuth } from '../lib/auth';
import { PlusCircleIcon, MessageSquareText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { MainHeader } from '../components/MainHeader';
import { Briefcase as BriefcaseIcon } from 'lucide-react';
import ChatWindow from '../components/ChatWindow';

const ProductsListPage: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);

  const fetchProducts = useCallback(async () => {
    if (!user) {
      // This case should ideally be handled by routing/auth guards
      // but good to have a check.
      setProducts([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setProducts(data || []);
    } catch (err: any) {
      console.error('Error fetching products:', err);
      setError(err.message || 'Failed to fetch products.');
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleProductCreated = (newProduct: Product) => {
    setProducts(prevProducts => [newProduct, ...prevProducts]);
    // Optionally, could refetch or just optimistically update
  };

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const handleDeleteProduct = async (productId: string) => {
    if (!user) {
      toast.error('You must be logged in to delete products.');
      return;
    }

    // Confirmation is handled in ProductCard, but good to have a safeguard or re-confirm if needed
    // For now, we assume ProductCard's window.confirm is sufficient.

    try {
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)
        .eq('user_id', user.id); // Ensure user can only delete their own products

      if (deleteError) throw deleteError;

      setProducts(currentProducts => currentProducts.filter(p => p.id !== productId));
      toast.success('Product deleted successfully!');
    } catch (err: any) {
      console.error('Error deleting product:', err);
      toast.error(err.message || 'Failed to delete product.');
    }
  };

  const handleProductUpdate = (updatedProduct: Product) => {
    setProducts(currentProducts => 
      currentProducts.map(p => 
        p.id === updatedProduct.id ? updatedProduct : p
      )
    );
  };

  // Skeleton loader for product cards
  const SkeletonCard = () => (
    <div className="bg-secondary-800/30 p-6 rounded-xl shadow-md animate-pulse">
      <div className="h-6 bg-secondary-700/50 rounded w-3/4 mb-3"></div>
      <div className="h-4 bg-secondary-700/50 rounded w-full mb-2"></div>
      <div className="h-4 bg-secondary-700/50 rounded w-5/6 mb-4"></div>
      <div className="h-3 bg-secondary-700/50 rounded w-1/2 mt-auto pt-4 border-t border-secondary-700/30"></div>
    </div>
  );

  return (
    <>
      <MainHeader user={user} />
      <div className="p-4 md:p-8 min-h-screen text-gray-100" style={{ backgroundColor: '#1f2937' }}>
        <div className="max-w-7xl mx-auto">
          <header className="mb-8 flex flex-col md:flex-row justify-between items-center">
            <h1 className="text-3xl md:text-4xl font-bold text-primary-300 mb-4 md:mb-0">
              Your Products
            </h1>
            <motion.button
              onClick={openModal}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg shadow-md transition-colors duration-150"
            >
              <PlusCircleIcon className="h-5 w-5 mr-2" />
              Create New Product
            </motion.button>
          </header>

          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => <SkeletonCard key={`skel-${i}`} />)}
            </div>
          )}

          {!isLoading && error && (
            <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-center">
              <p>Error: {error}</p>
              <button onClick={fetchProducts} className="mt-2 px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-md text-sm">
                Try Again
              </button>
            </div>
          )}

          {!isLoading && !error && products.length === 0 && (
            <div className="text-center py-12">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <BriefcaseIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" /> 
                <h3 className="text-xl font-semibold text-gray-200 mb-2">No Products Yet</h3> 
                <p className="text-sm text-gray-300">
                  Click 'Create New Product' to get started.
                </p>
              </motion.div>
            </div>
          )}

          {!isLoading && !error && products.length > 0 && (
            <AnimatePresence>
              <motion.div 
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ staggerChildren: 0.1 }}
              >
                {products.map(product => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    onDelete={handleDeleteProduct}
                    onUpdate={handleProductUpdate}
                  />
                ))}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        <ProductCreationModal 
          isOpen={isModalOpen} 
          onClose={closeModal} 
          onProductCreated={handleProductCreated} 
        />

        {/* Chat Window and Floating Button Section */}
        {!isChatOpen && (
          <button
            onClick={() => setIsChatOpen(true)}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-black hover:bg-gray-800 text-white font-bold py-3 px-6 rounded-full shadow-2xl transition-all duration-300 ease-in-out transform hover:scale-105 z-50 flex items-center space-x-2"
            aria-label="Open AI Chat"
          >
            <MessageSquareText size={24} />
            <span>Chat with AI</span>
          </button>
        )}
        {isChatOpen && (
          <ChatWindow isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
        )}
      </div>
    </>
  );
};

export default ProductsListPage;
