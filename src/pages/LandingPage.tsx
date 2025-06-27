import React from 'react';
import { MainHeader } from '../components/MainHeader';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  CheckCircle, 
  BarChart2, 
  FileText, 
  Zap, 
  Brain, 
  Target, 
  LucideIcon,
  Upload,
  Settings,
  Sparkles,
  Shield,
  Users,
  TrendingUp,
  Clock,
  Database,
  MessageSquare,
  Star,
  Globe,
  Award
} from 'lucide-react';

// Animation variants
const containerVariant = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariant = {
  hidden: { y: 30, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
};

const slideInLeft = {
  hidden: { x: -50, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.8,
      ease: "easeOut",
    },
  },
};

const slideInRight = {
  hidden: { x: 50, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.8,
      ease: "easeOut",
    },
  },
};

interface LandingPageProps {
  user: any;
  onShowAuthModal: () => void;
  onSignOut: () => Promise<void>;
}

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  isLarge?: boolean;
}

interface ProcessStepProps {
  icon: LucideIcon;
  title: string;
  description: string;
  step: number;
  isReversed?: boolean;
}

interface StatProps {
  value: string;
  label: string;
  icon: LucideIcon;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon: Icon, title, description, isLarge = false }) => (
  <motion.div
    className={`relative group bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 hover:border-primary-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-primary-500/10 ${isLarge ? 'md:col-span-2' : ''}`}
    variants={itemVariant}
    whileHover={{ y: -5 }}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-yellow-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    <div className="relative">
      <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-primary-500 to-yellow-500 rounded-xl mb-4 group-hover:scale-110 transition-transform duration-300">
        <Icon className="text-gray-900" size={28} />
      </div>
      <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
      <p className="text-gray-300 leading-relaxed">{description}</p>
    </div>
  </motion.div>
);

const ProcessStep: React.FC<ProcessStepProps> = ({ icon: Icon, title, description, step, isReversed = false }) => (
  <motion.div 
    className={`flex items-center gap-8 ${isReversed ? 'flex-row-reverse' : ''}`}
    variants={isReversed ? slideInRight : slideInLeft}
  >
    <div className="flex-1">
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-primary-500 to-yellow-500 rounded-full text-gray-900 font-bold text-lg">
          {step}
        </div>
        <div className="flex items-center justify-center w-12 h-12 bg-gray-800 rounded-xl">
          <Icon className="text-primary-400" size={24} />
        </div>
      </div>
      <h3 className="text-2xl font-bold text-white mb-3">{title}</h3>
      <p className="text-gray-300 text-lg leading-relaxed">{description}</p>
    </div>
    <div className="hidden lg:block w-80 h-60 bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl border border-gray-700/50 flex-shrink-0">
      <div className="w-full h-full rounded-2xl bg-gradient-to-br from-primary-500/10 to-yellow-500/10 flex items-center justify-center">
        <Icon className="text-primary-400" size={80} />
      </div>
    </div>
  </motion.div>
);

const StatCard: React.FC<StatProps> = ({ value, label, icon: Icon }) => (
  <motion.div
    className="text-center group"
    variants={itemVariant}
    whileHover={{ scale: 1.05 }}
  >
    <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-yellow-500 rounded-2xl mx-auto mb-4 group-hover:shadow-lg transition-all duration-300">
      <Icon className="text-gray-900" size={32} />
    </div>
    <div className="text-4xl font-bold text-white mb-2">{value}</div>
    <div className="text-gray-300 font-medium">{label}</div>
  </motion.div>
);

const LandingPage: React.FC<LandingPageProps> = ({ user, onShowAuthModal, onSignOut }) => {
  console.log('[LandingPage] Rendering with user:', user?.email);
  
  return (
    <div className="min-h-screen text-white overflow-x-hidden" style={{ backgroundColor: '#1f2937' }}>
      <MainHeader 
        user={user} 
        onShowAuthModal={onShowAuthModal} 
        onSignOut={onSignOut} 
        showHistory={false}
        setShowHistory={() => {}}
      />

      {/* Hero Section - Full Width */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/20 to-primary-900/10" />
        <div className="absolute inset-0">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,230,0,0.1)" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        
        <div className="relative z-10 w-full">
          <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center min-h-[80vh]">
            {/* Left Content */}
            <motion.div
              className="space-y-6 lg:space-y-8"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
      >
              <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-primary-500/20 to-yellow-500/20 border border-primary-500/30 rounded-full">
                <Sparkles className="text-primary-400 mr-2" size={16} />
                <span className="text-primary-300 font-medium">AI-Powered Research Assistant</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight">
                <span className="block text-white">
                  Transform Your
                </span>
                <span className="block text-yellow-400 font-extrabold">
                  Research Documents
                </span>
                <span className="block text-white">
                  Into Powerful Insights
                </span>
              </h1>
              
              <p className="text-lg lg:text-xl text-gray-300 leading-relaxed max-w-2xl">
                Upload documents, add blog URLs, and define your products to generate comprehensive 
                analysis that drives conversions with AI-powered bottom-of-funnel insights.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link
                  to="/app"
                  className="group bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-8 py-4 rounded-xl text-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 inline-flex items-center justify-center"
                >
                  Get Started Free
                  <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={20} />
                </Link>
                
                <button
                  onClick={onShowAuthModal}
                  className="border-2 border-gray-600 hover:border-yellow-500 text-white hover:text-yellow-300 font-semibold px-8 py-4 rounded-xl text-lg transition-all duration-300 hover:bg-yellow-500/10"
                >
                  Sign In
                </button>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 pt-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="text-green-400" size={20} />
                  <span className="text-gray-300">No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="text-blue-400" size={20} />
                  <span className="text-gray-300">Enterprise secure</span>
                </div>
              </div>
            </motion.div>
            
            {/* Right Visual */}
            <motion.div
              className="relative"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <div className="relative bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm border border-gray-700/50 rounded-3xl p-8">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-primary-500/20 p-4 rounded-xl flex items-center gap-3">
                    <Upload className="text-primary-400" size={24} />
                    <span className="text-white font-medium">Upload Sources</span>
                  </div>
                  <div className="bg-blue-500/20 p-4 rounded-xl flex items-center gap-3">
                    <Target className="text-blue-400" size={24} />
                    <span className="text-white font-medium">Define Products</span>
                  </div>
                  <div className="bg-purple-500/20 p-4 rounded-xl flex items-center gap-3">
                    <Brain className="text-purple-400" size={24} />
                    <span className="text-white font-medium">AI Analysis</span>
                  </div>
                  <div className="bg-green-500/20 p-4 rounded-xl flex items-center gap-3">
                    <Zap className="text-green-400" size={24} />
                    <span className="text-white font-medium">Take Action</span>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-primary-500/10 to-yellow-500/10 p-6 rounded-2xl">
                  <div className="flex items-center gap-3 mb-4">
                    <Sparkles className="text-primary-400" size={24} />
                    <span className="text-white font-semibold">AI-Powered Insights</span>
                  </div>
                  <div className="space-y-2">
                    <div className="h-2 bg-primary-500/30 rounded-full">
                      <div className="h-2 bg-gradient-to-r from-primary-500 to-yellow-500 rounded-full w-4/5"></div>
                    </div>
                    <div className="h-2 bg-primary-500/30 rounded-full">
                      <div className="h-2 bg-gradient-to-r from-primary-500 to-yellow-500 rounded-full w-3/5"></div>
                    </div>
                    <div className="h-2 bg-primary-500/30 rounded-full">
                      <div className="h-2 bg-gradient-to-r from-primary-500 to-yellow-500 rounded-full w-4/5"></div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gray-900/30">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            className="grid grid-cols-2 lg:grid-cols-4 gap-8"
            variants={containerVariant}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            <StatCard value="50%" label="Faster Content Creation" icon={Clock} />
            <StatCard value="95%" label="Accuracy Rate" icon={Target} />
            <StatCard value="24/7" label="AI Availability" icon={Zap} />
            <StatCard value="100+" label="Document Types" icon={FileText} />
          </motion.div>
        </div>
      </section>

      {/* How It Works - Full Width Process */}
      <section className="py-32">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-5xl font-bold text-white mb-6">
              How It Works
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Transform your research workflow in four simple steps
            </p>
          </motion.div>
          
          <motion.div 
            className="space-y-32"
            variants={containerVariant}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
          >
            <ProcessStep 
              step={1}
              icon={Upload}
              title="Upload & Organize"
              description="Upload documents, add blog URLs, and organize your research sources. Our AI extracts and processes content from PDFs, Word docs, PowerPoint, and web pages automatically."
            />
            
            <ProcessStep 
              step={2}
              icon={Target}
              title="Define Products"
              description="Specify your product lines and target markets. Our system creates dedicated knowledge bases for each product, ensuring relevant and focused analysis."
              isReversed
            />
            
            <ProcessStep 
              step={3}
              icon={Brain}
              title="AI Analysis"
              description="Advanced AI analyzes your content to generate comprehensive product insights, competitive advantages, pain points, and market positioning strategies."
            />
            
            <ProcessStep 
              step={4}
              icon={Zap}
              title="Generate Content"
              description="Create powerful bottom-of-funnel content, marketing materials, and strategic documents based on AI-generated insights and analysis."
              isReversed
            />
          </motion.div>
        </div>
      </section>

      {/* Features Grid - Better Layout */}
      <section className="py-32 bg-gray-900/30">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-5xl font-bold text-white mb-6">
              Powerful Features
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Everything you need to transform research into results
            </p>
          </motion.div>
          
          <motion.div 
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
            variants={containerVariant}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            <FeatureCard 
              icon={Database} 
              title="Smart Document Processing" 
              description="Automatically extract and analyze content from multiple file formats with advanced AI processing capabilities."
            />
            <FeatureCard 
              icon={Brain} 
              title="AI-Powered Analysis" 
              description="Generate deep insights, competitive analysis, and strategic recommendations from your research data."
            />
            <FeatureCard 
              icon={MessageSquare} 
              title="Interactive AI Chat" 
              description="Discuss your products, ask questions, and get instant AI-powered recommendations and insights."
            />
            <FeatureCard 
              icon={TrendingUp} 
              title="Performance Tracking" 
              description="Monitor content performance and optimize your bottom-of-funnel strategies with data-driven insights."
            />
            <FeatureCard 
              icon={Shield} 
              title="Enterprise Security" 
              description="Bank-grade security ensures your sensitive research and product data remains protected and private."
            />
            <FeatureCard 
              icon={Globe} 
              title="Multi-Format Support" 
              description="Support for PDFs, Word docs, PowerPoint, web pages, and direct text input for maximum flexibility."
              isLarge
            />
          </motion.div>
        </div>
      </section>

      {/* Call to Action - Full Width */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-600/20 to-yellow-600/20" />
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/80 to-gray-800/80" />
        
        <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-5xl lg:text-6xl font-bold text-white mb-8">
              Ready to Transform Your 
              <span className="bg-gradient-to-r from-primary-400 to-yellow-400 bg-clip-text text-transparent">
                {" "}Research Workflow?
              </span>
            </h2>
            
            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-12">
              Join thousands of professionals who are already using BOFU AI to create 
              more effective content and drive better results.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link
              to="/app"
                className="group bg-gradient-to-r from-primary-500 to-yellow-500 hover:from-primary-600 hover:to-yellow-600 text-gray-900 font-bold px-12 py-5 rounded-xl text-xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 inline-flex items-center"
            >
                Start Free Today
                <ArrowRight className="ml-3 group-hover:translate-x-1 transition-transform" size={24} />
            </Link>
              
              <div className="flex items-center gap-4 text-gray-300">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="text-yellow-400 fill-current" size={20} />
                  ))}
                </div>
                <span className="font-medium">Trusted by 10,000+ users</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-900 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-yellow-500 rounded-lg"></div>
              <span className="text-white font-bold text-xl">BOFU ai</span>
            </div>
            <p className="text-gray-400 text-sm">
              &copy; {new Date().getFullYear()} BOFU ai. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
