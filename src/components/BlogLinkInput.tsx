import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link2, Plus, X, Globe, CheckCircle2 } from 'lucide-react';

interface BlogLinkInputProps {
  onBlogLinksChange: (links: string[]) => void;
}

export function BlogLinkInput({ onBlogLinksChange }: BlogLinkInputProps) {
  const [links, setLinks] = useState<string[]>([]);
  const [currentLink, setCurrentLink] = useState('');
  const [error, setError] = useState('');

  // Handle adding a new link
  const addLink = () => {
    if (!currentLink.trim()) {
      setError('Please enter a valid URL');
      return;
    }

    // Simple URL validation
    try {
      new URL(currentLink);
    } catch (e) {
      setError('Please enter a valid URL including http:// or https://');
      return;
    }

    const updatedLinks = [...links, currentLink.trim()];
    setLinks(updatedLinks);
    setCurrentLink('');
    setError('');
    onBlogLinksChange(updatedLinks);
  };

  // Handle removing a link
  const removeLink = (index: number) => {
    const updatedLinks = links.filter((_, i) => i !== index);
    setLinks(updatedLinks);
    onBlogLinksChange(updatedLinks);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentLink.trim()) {
      addLink();
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
          className="inline-flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-full backdrop-blur-sm"
          whileHover={{ scale: 1.05 }}
        >
          <Globe className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-blue-300">Step 2</span>
        </motion.div>
        <h2 className="text-2xl font-bold text-white">Add Blog URLs & Articles</h2>
        <p className="text-white/70 max-w-lg mx-auto">
          Include relevant blog posts, articles, or web content to enrich your research analysis.
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
          <div className="relative flex rounded-2xl overflow-hidden backdrop-blur-xl border border-white/20 hover:border-blue-400/40 transition-all duration-300 focus-within:border-blue-400/60 focus-within:shadow-xl focus-within:shadow-blue-500/20">
            
            {/* Input Field */}
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none z-10">
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  transition={{ duration: 0.2 }}
                >
                  <Link2 className="h-5 w-5 text-blue-400" />
                </motion.div>
              </div>
              
              {/* Glassmorphism Background */}
              <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/10 to-white/5" />
              
              <input
                type="text"
                value={currentLink}
                onChange={(e) => {
                  setCurrentLink(e.target.value);
                  if (error) setError('');
                }}
                placeholder="https://example.com/blog/amazing-article"
                className="relative z-10 w-full pl-12 pr-4 py-4 bg-transparent text-white placeholder-white/60 text-lg focus:outline-none"
              />
            </div>
            
            {/* Add Button */}
            <motion.button
              type="submit"
              className="relative flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold overflow-hidden group/btn focus:outline-none"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={!currentLink.trim()}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
              <motion.div
                whileHover={{ rotate: 90 }}
                transition={{ duration: 0.2 }}
              >
                <Plus className="h-5 w-5 relative z-10" />
              </motion.div>
              <span className="relative z-10">Add URL</span>
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

      {/* Enhanced URL List */}
      <AnimatePresence>
        {links.length > 0 && (
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
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                <h3 className="text-lg font-semibold text-white">
                  Added URLs ({links.length})
                </h3>
              </div>
              
              <motion.div
                className="flex items-center gap-2 text-sm text-green-400"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Ready for analysis</span>
              </motion.div>
            </motion.div>
            
            <div className="grid gap-3">
              {links.map((link, index) => (
                <motion.div
                  key={`${link}-${index}`}
                  initial={{ opacity: 0, x: -20, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 20, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="group relative flex items-center p-5 bg-gradient-to-r from-white/5 via-white/10 to-white/5 border border-white/10 rounded-2xl backdrop-blur-sm hover:border-blue-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10"
                  whileHover={{ x: 4, scale: 1.01 }}
                >
                  {/* Status Indicator */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-blue-500 to-transparent opacity-0 group-hover:opacity-100 rounded-l-2xl transition-opacity duration-300" />
                  
                  {/* URL Icon */}
                  <motion.div 
                    className="w-12 h-12 flex-shrink-0 rounded-xl flex items-center justify-center mr-4 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 text-blue-300 border border-blue-500/30"
                    whileHover={{ rotate: 5, scale: 1.1 }}
                  >
                    <Globe size={20} />
                  </motion.div>
                  
                  {/* URL Content */}
                  <div className="min-w-0 flex-1">
                    <motion.p 
                      className="font-medium text-white truncate text-lg group-hover:text-blue-200 transition-colors duration-300"
                      initial={{ opacity: 0.8 }}
                      animate={{ opacity: 1 }}
                    >
                      {link}
                    </motion.p>
                    <motion.p 
                      className="text-sm text-white/60 mt-1"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 }}
                    >
                      External content source
                    </motion.p>
                  </div>
                  
                  {/* Remove Button */}
                  <motion.button
                    type="button"
                    onClick={() => removeLink(index)}
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

      {/* Helpful Tips */}
      {links.length === 0 && (
        <motion.div
          className="text-center p-6 bg-gradient-to-r from-blue-500/5 via-cyan-500/5 to-blue-500/5 rounded-2xl backdrop-blur-sm border border-blue-500/20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <motion.div
            className="inline-flex items-center gap-2 text-sm text-blue-300/80 mb-2"
            whileHover={{ scale: 1.05 }}
          >
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
            <span>💡 Pro tip</span>
          </motion.div>
          <p className="text-white/60 text-sm">
            Adding relevant blog posts and articles helps our AI understand your market context better
          </p>
        </motion.div>
      )}
    </div>
  );
}