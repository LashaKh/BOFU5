import { motion } from 'framer-motion';
import { Loader2, Sparkles, Rocket, Brain, Zap, ArrowRight } from 'lucide-react';

interface SubmitSectionProps {
  isDisabled: boolean;
  isSubmitting: boolean;
  onSubmit: () => void;
}

export const SubmitSection: React.FC<SubmitSectionProps> = ({ onSubmit, isDisabled, isSubmitting }) => {
  return (
    <motion.div 
      className="mt-12 space-y-8"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.3 }}
    >
      {/* Enhanced Section Header */}
      <motion.div
        className="text-center space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <motion.div
          className="inline-flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-full backdrop-blur-sm"
          whileHover={{ scale: 1.05 }}
        >
          <Brain className="w-4 h-4 text-green-400" />
          <span className="text-sm font-medium text-green-300">Step 4</span>
        </motion.div>
        <h2 className="text-3xl font-bold text-white">Generate AI Analysis</h2>
        <p className="text-white/70 max-w-2xl mx-auto text-lg leading-relaxed">
          Our advanced AI will analyze your research materials and product definitions to create comprehensive 
          <span className="text-green-300 font-semibold"> bottom-of-funnel insights</span> that drive conversions.
        </p>
      </motion.div>

      {/* AI Processing Preview */}
      <motion.div
        className="relative max-w-4xl mx-auto"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        {/* Glassmorphism Container */}
        <div className="relative overflow-hidden rounded-3xl border backdrop-blur-xl bg-gradient-to-br from-white/5 via-white/10 to-white/5 border-white/20 p-8">
          
          {/* Animated Background Elements */}
          <div className="absolute inset-0 opacity-30">
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-green-500/10 to-transparent"
              animate={{
                x: ['-100%', '100%'],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </div>

          {/* AI Features Preview */}
          <div className="relative z-10 grid md:grid-cols-3 gap-6 mb-8">
            {[
              {
                icon: Brain,
                title: "AI Analysis",
                description: "Deep content understanding and competitive positioning",
                color: "from-blue-500 to-cyan-400"
              },
              {
                icon: Sparkles,
                title: "Smart Insights", 
                description: "Bottom-funnel conversion opportunities identified",
                color: "from-purple-500 to-pink-500"
              },
              {
                icon: Rocket,
                title: "Action Ready",
                description: "Concrete recommendations for immediate implementation",
                color: "from-green-500 to-emerald-400"
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                className="text-center space-y-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 * (index + 1) }}
                whileHover={{ y: -4 }}
              >
                <motion.div
                  className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-2xl`}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  <feature.icon className="w-8 h-8 text-white" />
                </motion.div>
                <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                <p className="text-sm text-white/70 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>

          {/* Main Submit Button */}
          <motion.div className="text-center space-y-4">
            <motion.button
              onClick={onSubmit}
              disabled={isDisabled || isSubmitting}
              className={`group relative overflow-hidden rounded-2xl text-lg font-bold py-6 px-12 transition-all duration-300 ${
                isDisabled || isSubmitting
                  ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed border border-gray-600/30'
                  : 'bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 text-white border border-green-400/50 hover:scale-105 hover:shadow-2xl hover:shadow-green-500/30 focus:ring-4 focus:ring-green-300/50'
              }`}
              whileHover={!isDisabled && !isSubmitting ? { 
                scale: 1.05,
                boxShadow: '0 25px 50px rgba(34, 197, 94, 0.3)'
              } : {}}
              whileTap={!isDisabled && !isSubmitting ? { scale: 0.98 } : {}}
            >
              {/* Button Background Animation */}
              {!isDisabled && !isSubmitting && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-white/20 via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  initial={false}
                />
              )}
              
              {/* Button Content */}
              <div className="relative z-10 flex items-center justify-center gap-3">
                {isSubmitting ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Loader2 className="w-6 h-6" />
                    </motion.div>
                    <span>AI Analysis in Progress...</span>
                  </>
                ) : (
                  <>
                    <motion.div
                      whileHover={{ scale: 1.2, rotate: 15 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Sparkles className="w-6 h-6" />
                    </motion.div>
                    <span>Generate AI Analysis</span>
                    <motion.div
                      initial={{ x: 0 }}
                      whileHover={{ x: 5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ArrowRight className="w-5 h-5" />
                    </motion.div>
                  </>
                )}
              </div>
            </motion.button>

            {/* Processing Time Info */}
            <motion.div
              className="flex items-center justify-center gap-2 text-sm text-white/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <Zap className="w-4 h-4" />
              <span>
                {isSubmitting 
                  ? 'Processing your research materials...' 
                  : 'Typical processing time: 1-2 minutes'
                }
              </span>
            </motion.div>
          </motion.div>
        </div>

        {/* Floating Elements for Visual Appeal */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-green-400/40 rounded-full"
              style={{
                left: `${20 + i * 20}%`,
                top: `${10 + (i % 2) * 80}%`,
              }}
              animate={{
                y: [-20, 20, -20],
                opacity: [0.2, 0.8, 0.2],
                scale: [1, 1.5, 1],
              }}
              transition={{
                duration: 3 + i * 0.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.3,
              }}
            />
          ))}
        </div>
      </motion.div>

      {/* What Happens Next */}
      {isSubmitting && (
        <motion.div
          className="text-center space-y-4 p-6 bg-gradient-to-r from-green-500/5 via-emerald-500/5 to-green-500/5 rounded-2xl backdrop-blur-sm border border-green-500/20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            className="inline-flex items-center gap-2 text-sm text-green-300/80 mb-2"
            whileHover={{ scale: 1.05 }}
          >
            <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            <span>🔄 Processing Status</span>
          </motion.div>
          <p className="text-white/70 text-sm leading-relaxed">
            Our AI is analyzing your research materials, extracting key insights, and generating comprehensive 
            competitive analysis. You'll receive detailed recommendations for positioning and conversion optimization.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}