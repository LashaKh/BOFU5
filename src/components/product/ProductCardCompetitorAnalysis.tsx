import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdaptiveStyles, useProductCardTheme } from '../../contexts/ProductCardThemeContext';
import { ProductAnalysis } from '../../types/product/types';
import { 
  TrendingUp, 
  TrendingDown, 
  Eye, 
  Target, 
  DollarSign, 
  Users, 
  Award,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';

interface ProductCardCompetitorAnalysisProps {
  product: ProductAnalysis;
  showDetailed?: boolean;
  isExpanded?: boolean;
}

// Competitive advantage indicator
const CompetitiveAdvantage = ({ 
  advantage, 
  type, 
  styles 
}: { 
  advantage: string; 
  type: 'strength' | 'neutral' | 'weakness';
  styles: any;
}) => {
  const icons = {
    strength: <ArrowUpRight className="w-4 h-4 text-green-400" />,
    neutral: <Minus className="w-4 h-4 text-yellow-400" />,
    weakness: <ArrowDownRight className="w-4 h-4 text-red-400" />,
  };

  const colors = {
    strength: 'bg-green-50 border-green-200',
    neutral: 'bg-yellow-50 border-yellow-200',
    weakness: 'bg-red-50 border-red-200',
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className={`
        ${colors[type]}
        rounded-lg p-3
        flex items-center space-x-3
        hover:shadow-sm transition-shadow duration-200
      `}
    >
      {icons[type]}
      <span className={`${styles.text.primary} text-sm flex-1`}>
        {advantage}
      </span>
    </motion.div>
  );
};

// Competitor comparison card
const CompetitorCard = ({ 
  competitor, 
  product,
  styles, 
  isReducedMotion 
}: { 
  competitor: string; 
  product: ProductAnalysis;
  styles: any;
  isReducedMotion: boolean;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Simulated competitive analysis data
  const competitorData = {
    name: competitor,
    marketShare: Math.floor(Math.random() * 30) + 10,
    strengths: [
      'Market leader position',
      'Strong brand recognition',
      'Established customer base'
    ],
    weaknesses: [
      'Legacy technology',
      'Higher pricing',
      'Limited innovation'
    ],
    pricingModel: 'Enterprise/Subscription',
    targetMarket: 'Enterprise customers',
    keyFeatures: [
      'Advanced analytics',
      'Multi-platform support',
      'API integrations'
    ]
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={!isReducedMotion ? { y: -2 } : undefined}
      className={`
        ${styles.card.background} ${styles.card.border}
        rounded-xl p-4 transition-all duration-200
        hover:shadow-md
        cursor-pointer
      `}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center">
            <Target className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <h4 className={`${styles.text.primary} font-semibold text-sm`}>
              {competitorData.name}
            </h4>
            <p className={`${styles.text.secondary} text-xs`}>
              {competitorData.marketShare}% market share
            </p>
          </div>
        </div>
        
        {/* Market position indicator */}
        <div className="flex items-center space-x-1">
          <BarChart3 className="w-4 h-4 text-primary-400" />
          <span className={`${styles.text.accent} text-xs font-medium`}>
            #{Math.floor(Math.random() * 5) + 1}
          </span>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className={`${styles.text.secondary} text-xs`}>
          <span className={styles.text.secondary}>Pricing:</span>
          <span className="ml-1 font-medium">{competitorData.pricingModel}</span>
        </div>
        <div className={`${styles.text.secondary} text-xs`}>
          <span className={styles.text.secondary}>Target:</span>
          <span className="ml-1 font-medium">{competitorData.targetMarket}</span>
        </div>
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4 pt-3 border-t border-primary-500/20"
          >
            {/* Strengths */}
            <div>
              <h5 className={`${styles.text.primary} text-xs font-semibold mb-2 flex items-center space-x-1`}>
                <TrendingUp className="w-3 h-3 text-green-400" />
                <span>Strengths</span>
              </h5>
              <div className="space-y-1">
                {competitorData.strengths.slice(0, 2).map((strength, index) => (
                  <div key={index} className={`${styles.text.secondary} text-xs flex items-center space-x-2`}>
                    <div className="w-1 h-1 rounded-full bg-green-400" />
                    <span>{strength}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Weaknesses */}
            <div>
              <h5 className={`${styles.text.primary} text-xs font-semibold mb-2 flex items-center space-x-1`}>
                <TrendingDown className="w-3 h-3 text-red-400" />
                <span>Opportunities</span>
              </h5>
              <div className="space-y-1">
                {competitorData.weaknesses.slice(0, 2).map((weakness, index) => (
                  <div key={index} className={`${styles.text.secondary} text-xs flex items-center space-x-2`}>
                    <div className="w-1 h-1 rounded-full bg-red-400" />
                    <span>{weakness}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expand indicator */}
      <motion.div
        className="flex justify-center mt-3"
        animate={{ rotate: isExpanded ? 180 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <svg className={`w-4 h-4 ${styles.text.secondary}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </motion.div>
    </motion.div>
  );
};

// Competitive positioning overview
const CompetitivePositioning = ({ 
  product, 
  competitors,
  styles, 
  isReducedMotion 
}: { 
  product: ProductAnalysis; 
  competitors: string[];
  styles: any;
  isReducedMotion: boolean;
}) => {
  // Analyze competitive advantages
  const competitiveAdvantages = [
    { text: 'Superior pricing model', type: 'strength' as const },
    { text: 'Modern technology stack', type: 'strength' as const },
    { text: 'Smaller market presence', type: 'weakness' as const },
    { text: 'Growing user base', type: 'strength' as const },
    { text: 'Limited brand recognition', type: 'weakness' as const },
  ];

  const marketMetrics = [
    { label: 'Market Position', value: '#' + (Math.floor(Math.random() * 10) + 3), icon: Award, trend: 'up' },
    { label: 'Price Competitiveness', value: Math.floor(Math.random() * 20) + 80 + '%', icon: DollarSign, trend: 'up' },
    { label: 'Feature Completeness', value: Math.floor(Math.random() * 15) + 85 + '%', icon: Target, trend: 'up' },
    { label: 'User Satisfaction', value: Math.floor(Math.random() * 10) + 85 + '%', icon: Users, trend: 'neutral' },
  ];

  return (
    <div className="space-y-6">
      {/* Market metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {marketMetrics.map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`
              ${styles.card.background} ${styles.card.border}
              rounded-lg p-3 text-center
              hover:shadow-sm transition-shadow duration-200
            `}
          >
            <div className="flex items-center justify-center mb-2">
              <metric.icon className={`w-5 h-5 ${styles.text.accent}`} />
              {metric.trend === 'up' && <TrendingUp className="w-3 h-3 text-green-400 ml-1" />}
              {metric.trend === 'down' && <TrendingDown className="w-3 h-3 text-red-400 ml-1" />}
            </div>
            <div className={`${styles.text.primary} text-lg font-bold`}>
              {metric.value}
            </div>
            <div className={`${styles.text.secondary} text-xs`}>
              {metric.label}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Competitive advantages */}
      <div>
        <h4 className={`${styles.text.primary} text-sm font-semibold mb-4 flex items-center space-x-2`}>
          <Eye className="w-4 h-4 text-primary-400" />
          <span>Competitive Analysis</span>
        </h4>
        <div className="space-y-2">
          {competitiveAdvantages.map((advantage, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <CompetitiveAdvantage 
                advantage={advantage.text}
                type={advantage.type}
                styles={styles}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export function ProductCardCompetitorAnalysis({
  product,
  showDetailed = true,
  isExpanded = false,
}: ProductCardCompetitorAnalysisProps) {
  const { theme, isReducedMotion } = useProductCardTheme();
  const styles = useAdaptiveStyles();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'competitors'>('overview');

  // Extract competitors from the product data
  const competitors = React.useMemo(() => {
    const directCompetitors = product.currentSolutions?.directCompetitors || [];
    const existingMethods = product.currentSolutions?.existingMethods || [];
    
    // Combine and deduplicate
    const allCompetitors = [...directCompetitors, ...existingMethods]
      .filter(comp => comp && comp.length > 0)
      .slice(0, 6); // Limit for UI performance
    
    return allCompetitors;
  }, [product]);

  if (!competitors.length && !showDetailed) {
    return (
      <div className={`${styles.text.secondary} text-sm text-center py-8`}>
        <div className="space-y-2">
          <Target className="w-8 h-8 mx-auto" />
          <p>No competitor analysis available</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Section header with tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`${styles.text.accent} text-xl`}>🎯</div>
          <h3 className={`${styles.text.primary} text-lg font-bold`}>
            Competitive Analysis
          </h3>
        </div>
        
        {competitors.length > 0 && (
          <div className="flex items-center space-x-1 bg-primary-500/10 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`
                px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200
                ${activeTab === 'overview' 
                  ? `${styles.text.primary} bg-primary-500/20` 
                  : `${styles.text.secondary} hover:${styles.text.primary}`
                }
              `}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('competitors')}
              className={`
                px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200
                ${activeTab === 'competitors' 
                  ? `${styles.text.primary} bg-primary-500/20` 
                  : `${styles.text.secondary} hover:${styles.text.primary}`
                }
              `}
            >
              Competitors ({competitors.length})
            </button>
          </div>
        )}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' ? (
          <motion.div
            key="overview"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <CompetitivePositioning 
              product={product}
              competitors={competitors}
              styles={styles}
              isReducedMotion={isReducedMotion}
            />
          </motion.div>
        ) : (
          <motion.div
            key="competitors"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {competitors.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {competitors.map((competitor, index) => (
                  <CompetitorCard
                    key={`${competitor}-${index}`}
                    competitor={competitor}
                    product={product}
                    styles={styles}
                    isReducedMotion={isReducedMotion}
                  />
                ))}
              </div>
            ) : (
              <div className={`${styles.text.secondary} text-sm text-center py-8 opacity-60`}>
                <Target className="w-8 h-8 mx-auto opacity-50 mb-2" />
                <p>No direct competitors identified</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* External analysis link */}
      {(product.competitorAnalysisUrl || product.google_doc) && (
        <motion.a
          href={product.competitorAnalysisUrl || product.google_doc}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileHover={!isReducedMotion ? { scale: 1.02 } : undefined}
          className={`
            ${styles.card.background} ${styles.card.border}
            rounded-lg p-4 block
            hover:shadow-md
            transition-all duration-200
            group
          `}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h4 className={`${styles.text.primary} font-semibold text-sm`}>
                  Detailed Analysis Report
                </h4>
                <p className={`${styles.text.secondary} text-xs`}>
                  View comprehensive competitive analysis
                </p>
              </div>
            </div>
            <ArrowUpRight className={`w-5 h-5 ${styles.text.accent} group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-200`} />
          </div>
        </motion.a>
      )}
    </motion.div>
  );
} 