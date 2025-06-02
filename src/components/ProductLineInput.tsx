import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Plus, X, Target, Star, Sparkles } from 'lucide-react';

interface ProductLineInputProps {
  onProductLinesChange: (productLines: string[]) => void;
}

export function ProductLineInput({ onProductLinesChange }: ProductLineInputProps) {
  const [productLines, setProductLines] = useState<string[]>([]);
  const [currentProduct, setCurrentProduct] = useState('');
  const [error, setError] = useState('');

  // Handle adding a new product line
  const addProductLine = () => {
    if (!currentProduct.trim()) {
      setError('Please enter a product name');
      return;
    }

    if (productLines.includes(currentProduct.trim())) {
      setError('This product has already been added');
      return;
    }

    const updatedLines = [...productLines, currentProduct.trim()];
    setProductLines(updatedLines);
    setCurrentProduct('');
    setError('');
    onProductLinesChange(updatedLines);
  };

  // Handle removing a product line
  const removeProductLine = (index: number) => {
    const updatedLines = productLines.filter((_, i) => i !== index);
    setProductLines(updatedLines);
    onProductLinesChange(updatedLines);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentProduct.trim()) {
      addProductLine();
    }
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Section Header */}
      <motion.div
        className="text-center space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <motion.div
          className="inline-flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-full backdrop-blur-sm"
          whileHover={{ scale: 1.05 }}
        >
          <Target className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-purple-300">Step 3</span>
        </motion.div>
        <h2 className="text-2xl font-bold text-white">Define Your Products</h2>
        <p className="text-white/70 max-w-lg mx-auto">
          Specify the products or services you want to analyze and position against the competition.
        </p>
      </motion.div>

      {/* Enhanced Input Section */}
      <motion.div
        className="relative"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        <form onSubmit={handleSubmit} className="relative group">
          <div className="relative flex rounded-2xl overflow-hidden backdrop-blur-xl border border-white/20 hover:border-purple-400/40 transition-all duration-300 focus-within:border-purple-400/60 focus-within:shadow-xl focus-within:shadow-purple-500/20">
            
            {/* Input Field */}
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none z-10">
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  transition={{ duration: 0.2 }}
                >
                  <Package className="h-5 w-5 text-purple-400" />
                </motion.div>
              </div>
              
              {/* Glassmorphism Background */}
              <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/10 to-white/5" />
              
              <input
                type="text"
                value={currentProduct}
                onChange={(e) => {
                  setCurrentProduct(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Enterprise CRM Platform, AI Analytics Tool..."
                className="relative z-10 w-full pl-12 pr-4 py-4 bg-transparent text-white placeholder-white/60 text-lg focus:outline-none"
              />
            </div>
            
            {/* Add Button */}
            <motion.button
              type="submit"
              className="relative flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold overflow-hidden group/btn focus:outline-none"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={!currentProduct.trim()}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
              <motion.div
                whileHover={{ rotate: 90 }}
                transition={{ duration: 0.2 }}
              >
                <Plus className="h-5 w-5 relative z-10" />
              </motion.div>
              <span className="relative z-10">Add Product</span>
            </motion.button>
          </div>
          
          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl backdrop-blur-sm"
              >
                <p className="text-sm text-red-300 flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-400 rounded-full" />
                  {error}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </motion.div>

      {/* Enhanced Product List */}
      <AnimatePresence>
        {productLines.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4"
          >
            <motion.div 
              className="flex justify-between items-center p-4 bg-gradient-to-r from-white/5 to-white/10 rounded-2xl backdrop-blur-sm border border-white/10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
                <h3 className="text-lg font-semibold text-white">
                  Your Products ({productLines.length})
                </h3>
              </div>
              
              <motion.div
                className="flex items-center gap-2 text-sm text-green-400"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Star className="w-4 h-4" />
                <span>Ready for analysis</span>
              </motion.div>
            </motion.div>
            
            <div className="grid gap-3">
              {productLines.map((product, index) => (
                <motion.div
                  key={`${product}-${index}`}
                  initial={{ opacity: 0, x: -20, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 20, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="group relative flex items-center p-5 bg-gradient-to-r from-white/5 via-white/10 to-white/5 border border-white/10 rounded-2xl backdrop-blur-sm hover:border-purple-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10"
                  whileHover={{ x: 4, scale: 1.01 }}
                >
                  {/* Status Indicator */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-purple-500 to-transparent opacity-0 group-hover:opacity-100 rounded-l-2xl transition-opacity duration-300" />
                  
                  {/* Product Icon */}
                  <motion.div 
                    className="w-12 h-12 flex-shrink-0 rounded-xl flex items-center justify-center mr-4 bg-gradient-to-br from-purple-500/20 to-pink-500/20 text-purple-300 border border-purple-500/30 relative"
                    whileHover={{ rotate: 5, scale: 1.1 }}
                  >
                    <Package size={20} />
                    {/* Sparkle Effect */}
                    <motion.div
                      className="absolute -top-1 -right-1"
                      animate={{ 
                        scale: [1, 1.2, 1],
                        rotate: [0, 180, 360]
                      }}
                      transition={{ 
                        duration: 2, 
                        repeat: Infinity, 
                        ease: "easeInOut" 
                      }}
                    >
                      <Sparkles size={8} className="text-purple-400" />
                    </motion.div>
                  </motion.div>
                  
                  {/* Product Content */}
                  <div className="min-w-0 flex-1">
                    <motion.p 
                      className="font-semibold text-white truncate text-lg group-hover:text-purple-200 transition-colors duration-300"
                      initial={{ opacity: 0.8 }}
                      animate={{ opacity: 1 }}
                    >
                      {product}
                    </motion.p>
                    <motion.p 
                      className="text-sm text-white/60 mt-1"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 }}
                    >
                      Product #{index + 1} • Ready for competitive analysis
                    </motion.p>
                  </div>
                  
                  {/* Remove Button */}
                  <motion.button
                    type="button"
                    onClick={() => removeProductLine(index)}
                    className="ml-4 p-2 rounded-xl hover:bg-red-500/20 transition-colors duration-200 text-white/60 hover:text-red-300 border border-transparent hover:border-red-500/30 opacity-0 group-hover:opacity-100"
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X size={18} />
                  </motion.button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Call to Action / Next Steps */}
      {productLines.length > 0 && (
        <motion.div
          className="text-center p-6 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-purple-500/5 rounded-2xl backdrop-blur-sm border border-purple-500/20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <motion.div
            className="inline-flex items-center gap-2 text-sm text-purple-300/80 mb-2"
            whileHover={{ scale: 1.05 }}
          >
            <div className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
            <span>🎯 Ready to analyze</span>
          </motion.div>
          <p className="text-white/70 text-sm">
            Great! You've defined {productLines.length} product{productLines.length > 1 ? 's' : ''} for analysis. 
            Our AI will generate comprehensive insights and competitive positioning.
          </p>
        </motion.div>
      )}

      {/* Helpful Tips for Empty State */}
      {productLines.length === 0 && (
        <motion.div
          className="text-center p-6 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-purple-500/5 rounded-2xl backdrop-blur-sm border border-purple-500/20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <motion.div
            className="inline-flex items-center gap-2 text-sm text-purple-300/80 mb-3"
            whileHover={{ scale: 1.05 }}
          >
            <div className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
            <span>💡 Examples</span>
          </motion.div>
          <div className="flex flex-wrap justify-center gap-2 text-sm">
            {['CRM Software', 'AI Analytics', 'Marketing Automation', 'Cloud Storage'].map((example, index) => (
              <motion.button
                key={example}
                onClick={() => {
                  setCurrentProduct(example);
                }}
                className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full hover:bg-purple-500/30 transition-colors duration-200 border border-purple-500/30"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                {example}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}