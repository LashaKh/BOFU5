import { motion } from 'framer-motion';
import { Plus, History, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PageHeaderProps {
  companyName?: string;
  productCount: number;
  onStartNew: () => void;
  showHistory?: boolean;
  setShowHistory?: (show: boolean) => void;
  forceHistoryView?: () => void;
  hideHistoryButton?: boolean;
}

export function PageHeader({ 
  companyName, 
  productCount, 
  onStartNew,
  showHistory,
  setShowHistory,
  forceHistoryView,
  hideHistoryButton = false
}: PageHeaderProps) {
  const navigate = useNavigate();
  
  // Function to handle navigation between pages
  const handleNavigation = (path: string) => {
    // Simple direct navigation - no event dispatching needed since we're using pages now
    navigate(path, { replace: true });
    
    // Update state if needed
    if (path === '/history' && setShowHistory) {
      setShowHistory(true);
    } else if (path === '/' && setShowHistory) {
      setShowHistory(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <motion.div 
          className="mb-0"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 
            className="text-3xl font-bold text-white cursor-pointer flex items-center gap-2 hover:opacity-90 transition-opacity"
            onClick={() => handleNavigation('/')}
          >
            <Home className="h-5 w-5 text-primary-400" />
            {companyName || 'Research Results'}
          </h2>
          <p className="text-sm text-gray-400">
            {productCount} {productCount === 1 ? 'product' : 'products'} analyzed
          </p>
        </motion.div>
        
        <motion.div 
          className="flex items-center gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {!hideHistoryButton && (showHistory !== undefined || forceHistoryView) && (
            <motion.button
              onClick={() => handleNavigation('/history')}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2
                ${showHistory 
                  ? 'bg-gradient-to-r from-secondary-800 to-secondary-700 text-primary-300 border border-primary-500/30 shadow-glow hover:shadow-glow-strong' 
                  : 'text-gray-300 hover:text-primary-300 hover:bg-secondary-800/70'
                }`}
              whileHover={{ y: -1 }}
              whileTap={{ y: 1 }}
            >
              <History className="h-5 w-5" />
              History
            </motion.button>
          )}
          <motion.button
            onClick={onStartNew}
            className="px-4 py-2.5 bg-primary-500 text-secondary-900 rounded-lg hover:bg-primary-400 transition-all 
              shadow-glow hover:shadow-glow-strong flex items-center gap-2 font-medium"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus size={18} />
            New Research
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}