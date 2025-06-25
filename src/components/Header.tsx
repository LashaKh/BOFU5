import { motion } from 'framer-motion';
import { Sparkles, Target, BarChart, LineChart, Zap, Brain, Rocket, Shield } from 'lucide-react';

export function Header() {
  return (
    <header className="w-full mb-12">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-primary-500/10 to-yellow-400/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-blue-500/10 to-purple-600/10 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      <motion.div 
        className="relative max-w-4xl mx-auto space-y-8"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.1 }}
      >
        {/* Hero Title with Enhanced Animation */}
        <motion.div className="text-center space-y-6">
          <motion.div
            className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-primary-500/20 to-yellow-400/20 border border-primary-500/30 rounded-full backdrop-blur-sm"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            >
              <Zap className="w-5 h-5 text-primary-400" />
            </motion.div>
            <span className="text-sm font-medium text-primary-300">AI-Powered Research Assistant</span>
          </motion.div>

          <motion.h1
            className="text-6xl md:text-7xl font-bold leading-tight"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <motion.span 
              className="bg-gradient-to-r from-white via-primary-200 to-yellow-300 bg-clip-text text-transparent"
              animate={{
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              style={{
                backgroundSize: "200% 200%"
              }}
            >
              BOFU.ai
            </motion.span>
            <br />
            <motion.span 
              className="bg-gradient-to-r from-yellow-400 via-amber-300 to-orange-400 bg-clip-text text-transparent"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              Research Assistant
            </motion.span>
          </motion.h1>
          
          <motion.div 
            className="flex justify-center"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 120, opacity: 1 }}
            transition={{ duration: 1.2, delay: 0.6 }}
          >
            <div className="h-1 bg-gradient-to-r from-transparent via-primary-500 to-transparent rounded-full" />
          </motion.div>
        </motion.div>
        
        {/* Enhanced Description */}
        <motion.div
          className="text-center max-w-2xl mx-auto space-y-4"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <p className="text-xl text-white/90 leading-relaxed">
            Transform your research documents into powerful 
            <span className="text-primary-300 font-semibold"> bottom-of-funnel insights</span> with AI
          </p>
          <p className="text-base text-white/70 leading-relaxed">
            Upload documents, add blog URLs, and define your products to generate comprehensive analysis that drives conversions
          </p>
        </motion.div>

        {/* Enhanced Feature Pills */}
        <motion.div 
          className="flex flex-wrap justify-center items-center gap-3 mt-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          {[
            { 
              icon: Sparkles, 
              label: "Upload Sources", 
              color: "from-primary-500 to-yellow-500", 
              bgColor: "from-primary-500/20 to-yellow-500/20",
              borderColor: "border-primary-500/40",
              active: true 
            },
            { 
              icon: Target, 
              label: "Define Products", 
              color: "from-blue-500 to-cyan-400", 
              bgColor: "from-blue-500/20 to-cyan-400/20",
              borderColor: "border-blue-500/40",
              active: true 
            },
            { 
              icon: Brain, 
              label: "AI Analysis", 
              color: "from-purple-500 to-pink-500", 
              bgColor: "from-gray-500/10 to-gray-400/10",
              borderColor: "border-gray-600/40",
              active: false 
            },
            { 
              icon: Rocket, 
              label: "Take Action", 
              color: "from-green-500 to-emerald-400", 
              bgColor: "from-gray-500/10 to-gray-400/10",
              borderColor: "border-gray-600/40",
              active: false 
            }
          ].map((item, index) => (
            <motion.div 
              key={index}
              className={`group relative flex items-center px-6 py-4 rounded-2xl border backdrop-blur-sm transition-all duration-300 ${
                item.active 
                  ? `bg-gradient-to-r ${item.bgColor} ${item.borderColor} hover:scale-105 cursor-pointer` 
                  : 'bg-gray-900/40 border-gray-700/40 opacity-60'
              }`}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 * (index + 4) }}
              whileHover={item.active ? { 
                y: -4, 
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
                scale: 1.05
              } : {}}
            >
              {/* Animated Background Glow */}
              {item.active && (
                <motion.div
                  className={`absolute inset-0 bg-gradient-to-r ${item.color} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300`}
                  layoutId={`glow-${index}`}
                />
              )}
              
              <div className={`flex items-center justify-center h-11 w-11 rounded-xl mr-4 bg-gradient-to-br ${item.color} relative z-10`}>
                <motion.div
                  whileHover={{ rotate: item.active ? 15 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <item.icon size={20} className="text-white drop-shadow-sm" />
                </motion.div>
              </div>
              
              <div className="relative z-10">
                <span className={`text-sm font-semibold ${
                  item.active ? 'text-white' : 'text-gray-400'
                }`}>
                  {item.label}
                </span>
                {item.active && (
                  <motion.div
                    className="h-0.5 bg-gradient-to-r from-transparent via-white/40 to-transparent mt-1"
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 0.5, delay: 0.2 * (index + 1) }}
                  />
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Trust Indicators */}
        <motion.div
          className="flex justify-center items-center gap-8 mt-8 opacity-60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ duration: 1, delay: 1 }}
        >
          <div className="flex items-center gap-2 text-xs text-white/60">
            <Shield className="w-4 h-4" />
            <span>Enterprise Security</span>
          </div>
          <div className="w-1 h-1 bg-white/30 rounded-full" />
          <div className="flex items-center gap-2 text-xs text-white/60">
            <Zap className="w-4 h-4" />
            <span>Lightning Fast</span>
          </div>
          <div className="w-1 h-1 bg-white/30 rounded-full" />
          <div className="flex items-center gap-2 text-xs text-white/60">
            <Brain className="w-4 h-4" />
            <span>AI-Powered</span>
          </div>
        </motion.div>
      </motion.div>
    </header>
  );
}