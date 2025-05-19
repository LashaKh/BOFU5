import React from 'react';
import { MainHeader } from '../components/MainHeader';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle, BarChart2, FileText, Zap, Brain, Target, LucideIcon } from 'lucide-react';

// Variants for staggering animations - moved to module scope
const containerVariant = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2, // Time between each child animation
    },
  },
};

const itemVariant = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5, // Duration of each child's animation
    },
  },
};

interface LandingPageProps {
  user: any; // Replace 'any' with a more specific User type if available
  onShowAuthModal: () => void;
  onSignOut: () => Promise<void>; // Or appropriate return type
}

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  // delay prop is no longer needed due to staggerChildren
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon: Icon, title, description /* delay prop no longer needed */ }) => (
  <motion.div
    className="bg-secondary-800 p-6 rounded-xl shadow-lg hover:shadow-primary-500/30 transition-shadow duration-300 border border-secondary-700"
    variants={itemVariant}
    // initial, animate, transition props are now controlled by parent variants
  >
    <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-primary-500 to-yellow-500 rounded-full mb-4">
      <Icon className="text-secondary-900" size={24} />
    </div>
    <h3 className="text-xl font-semibold text-gray-100 mb-2">{title}</h3>
    <p className="text-white text-sm leading-relaxed">{description}</p>
  </motion.div>
);

interface HowItWorksStepProps {
  number: string | number;
  title: string;
  description: string;
}

const HowItWorksStep: React.FC<HowItWorksStepProps> = ({ number, title, description }) => (
  <motion.div 
    className="flex items-start space-x-4"
    variants={itemVariant}
    // initial, animate, transition props are now controlled by parent variants
  >
    <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 bg-gradient-to-br from-primary-500 to-yellow-500 text-secondary-900 font-bold rounded-full">
      {number}
    </div>
    <div>
      <h4 className="text-lg font-semibold text-primary-300 mb-1">{title}</h4>
      <p className="text-gray-200 text-sm leading-relaxed">{description}</p>
    </div>
  </motion.div>
);

const LandingPage: React.FC<LandingPageProps> = ({ user, onShowAuthModal, onSignOut }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-neutral-800 text-white overflow-x-hidden">
      <MainHeader 
        user={user} 
        onShowAuthModal={onShowAuthModal} 
        onSignOut={onSignOut} 
        showHistory={false} // Assuming history button isn't active on landing
        setShowHistory={() => { /* Can navigate to /history or be a no-op */ }}
      />
      {/* Hero Section */}
      <motion.section
        className="py-20 md:py-32 text-center relative overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className="absolute inset-0 opacity-10">
          {/* Subtle background pattern or effect */}
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,220,0,0.2)" strokeWidth="0.5"/></pattern></defs><rect width="100%" height="100%" fill="url(#smallGrid)" /></svg>
        </div>
        <div className="container mx-auto px-6 relative z-10">
          <motion.h1
            className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 bg-clip-text text-transparent"
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            Unlock Your Product's Full Potential with AI-Powered Analysis
          </motion.h1>
          <motion.p
            className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-10"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.4 }}
          >
            BOFU ai is your dedicated platform for transforming product documentation into a dynamic knowledge base. Generate powerful product analyses, craft high-converting bottom-of-funnel content, and keep your product information always up-to-date.
          </motion.p>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <Link
              to="/app" // This will be the new route for your main application
              className="bg-gradient-to-r from-primary-500 to-yellow-500 hover:from-primary-600 hover:to-yellow-600 text-secondary-900 font-semibold px-10 py-4 rounded-lg text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 inline-flex items-center"
            >
              Launch App & Analyze <ArrowRight className="ml-2" size={20} />
            </Link>
          </motion.div>
        </div>
      </motion.section>

      {/* How It Works Section */}
      <section className="py-16 md:py-24 bg-secondary-900/30">
        <div className="container mx-auto px-6">
          <motion.h2 
            className="text-3xl md:text-4xl font-bold text-center mb-16 text-primary-400"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Simple Steps to In-Depth Product Mastery
          </motion.h2>
          <motion.div 
            className="max-w-3xl mx-auto grid md:grid-cols-1 gap-10"
            variants={containerVariant}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            <HowItWorksStep 
              number="1" 
              title="1. Build Your Product's Knowledge Base" 
              description="Consolidate all product documentation—manuals, research papers, marketing materials, and updates. BOFU ai creates a centralized, intelligent repository for each product."
            />
            <HowItWorksStep 
              number="2" 
              title="2. AI-Driven Analysis & Insight Generation"
              description="Our advanced AI dives deep into your knowledge base, extracting critical insights, USPs, pain points, and technical specifications to generate a comprehensive Product Analysis."
            />
            <HowItWorksStep 
              number="3" 
              title="3. Generate High-Impact Content Briefs"
              description="Transform raw Product Analysis into structured, actionable Content Briefs, perfectly primed for creating persuasive bottom-of-funnel marketing content."
            />
            <HowItWorksStep 
              number="4" 
              title="4. Create, Discuss & Dynamically Update"
              description="Generate compelling content, engage with our AI for product-specific discussions and suggestions, and seamlessly update your knowledge base as your product evolves. Keep everything in sync."
            />
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-6">
          <motion.h2 
            className="text-3xl md:text-4xl font-bold text-center mb-16 text-primary-400"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Core Advantages of BOFU ai
          </motion.h2>
          <motion.div 
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
            variants={containerVariant}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            <FeatureCard icon={FileText} title="Centralized Knowledge Hub" description="Easily upload and manage all product-related documents in one place. PDFs, DOCX, URLs, and text inputs are all supported."/>
            <FeatureCard icon={Zap} title="Dynamic Product Analysis" description="AI meticulously analyzes your documents to create in-depth Product Analyses, highlighting key features, benefits, and target audience insights."/>
            <FeatureCard icon={Brain} title="Automated Content Briefs" description="Generate structured content briefs from product analyses, streamlining your bottom-of-funnel content creation process."/>
            <FeatureCard icon={BarChart2} title="Interactive AI Product Chat" description="Discuss your product, ask questions, and get suggestions directly from our AI, trained on your specific product knowledge."/>
            <FeatureCard icon={CheckCircle} title="Live Document Sync" description="Update documents dynamically. Your product's knowledge base and analyses adapt instantly to new information."/>
            <FeatureCard icon={Target} title="Efficient Content Workflow" description="From documentation to analysis to content brief to final content – manage the entire lifecycle efficiently."/>
          </motion.div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-20 md:py-32 bg-gradient-to-r from-primary-600 to-yellow-600">
        <div className="container mx-auto px-6 text-center">
          <motion.h2 
            className="text-3xl md:text-5xl font-bold text-secondary-900 mb-6"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Transform Your Product Content Strategy Today
          </motion.h2>
          <motion.p 
            className="text-lg md:text-xl text-white font-semibold max-w-xl mx-auto mb-10"
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.25 }}
          >
            Empower your team with AI-driven insights and a streamlined content creation process. Turn your product knowledge into your most powerful asset.
          </motion.p>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Link
              to="/app"
              className="bg-white hover:bg-gray-100 text-yellow-500 font-semibold px-12 py-4 rounded-lg text-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 inline-flex items-center"
            >
              Launch the App <ArrowRight className="ml-2" size={20} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 bg-gray-900 text-center">
        <p className="text-gray-500 text-sm">&copy; {new Date().getFullYear()} BOFU ai. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
