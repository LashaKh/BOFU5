import React, { createContext, useContext, useEffect, useState } from 'react';

// Defensive check for React availability
if (typeof React === 'undefined' || typeof React.createContext === 'undefined') {
  console.error('React or React.createContext is undefined. This indicates a bundling issue.');
  throw new Error('React is not properly imported or bundled');
}

// Theme detection and adaptive styling system
export interface ProductCardTheme {
  // Context detection
  background: 'light' | 'dark' | 'admin';
  contrast: 'high' | 'medium' | 'low';
  variant: 'modal' | 'inline' | 'featured';
  context: 'history' | 'product' | 'admin';
  
  // Visual properties
  glassEffect: boolean;
  animations: 'full' | 'reduced' | 'none';
  density: 'compact' | 'comfortable' | 'spacious';
}

// Adaptive color schemes for different contexts
export const adaptiveColors = {
  light: {
    // Simple white background for light contexts
    card: {
      background: 'bg-white',
      border: 'border-gray-300',
      shadow: 'shadow-md',
      hover: 'hover:shadow-lg',
    },
    text: {
      primary: 'text-gray-900',
      secondary: 'text-gray-600',
      accent: 'text-blue-600',
    },
    interactive: {
      button: 'bg-blue-500 hover:bg-blue-600 text-white',
      buttonSecondary: 'bg-gray-100 hover:bg-gray-200 text-gray-900',
      border: 'border-gray-300 focus:border-blue-500',
    }
  },
  
  dark: {
    // Consistent white background even in dark contexts
    card: {
      background: 'bg-white',
      border: 'border-gray-300',
      shadow: 'shadow-md',
      hover: 'hover:shadow-lg',
    },
    text: {
      primary: 'text-gray-900',
      secondary: 'text-gray-600',
      accent: 'text-blue-600',
    },
    interactive: {
      button: 'bg-blue-500 hover:bg-blue-600 text-white',
      buttonSecondary: 'bg-gray-100 hover:bg-gray-200 text-gray-900',
      border: 'border-gray-300 focus:border-blue-500',
    }
  },
  
  admin: {
    // Consistent white background for admin contexts
    card: {
      background: 'bg-white',
      border: 'border-gray-300',
      shadow: 'shadow-md',
      hover: 'hover:shadow-lg',
    },
    text: {
      primary: 'text-gray-900',
      secondary: 'text-gray-600',
      accent: 'text-blue-600',
    },
    interactive: {
      button: 'bg-blue-500 hover:bg-blue-600 text-white',
      buttonSecondary: 'bg-gray-100 hover:bg-gray-200 text-gray-900',
      border: 'border-gray-300 focus:border-blue-500',
    }
  }
};

// Context-specific configurations
export const contextConfigs = {
  history: {
    variant: 'inline' as const,
    density: 'comfortable' as const,
    glassEffect: false,
    animations: 'reduced' as const,
  },
  product: {
    variant: 'featured' as const,
    density: 'spacious' as const,
    glassEffect: false,
    animations: 'reduced' as const,
  },
  admin: {
    variant: 'modal' as const,
    density: 'compact' as const,
    glassEffect: false,
    animations: 'reduced' as const,
  }
};

// Theme context
interface ProductCardThemeContextType {
  theme: ProductCardTheme;
  updateTheme: (updates: Partial<ProductCardTheme>) => void;
  getAdaptiveStyles: () => typeof adaptiveColors[keyof typeof adaptiveColors];
  isReducedMotion: boolean;
}

const ProductCardThemeContext = React.createContext<ProductCardThemeContextType | undefined>(undefined);

// Auto-detect background context based on parent element
const detectBackgroundContext = (): ProductCardTheme['background'] => {
  const body = document.body;
  const computedStyle = window.getComputedStyle(body);
  const bgColor = computedStyle.backgroundColor;
  
  // Check for admin dashboard indicators
  if (document.querySelector('[data-admin-dashboard]') || 
      body.classList.contains('admin-mode')) {
    return 'admin';
  }
  
  // Parse background color to determine if light or dark
  if (bgColor && bgColor !== 'transparent') {
    const rgb = bgColor.match(/\d+/g);
    if (rgb && rgb.length >= 3) {
      const brightness = (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000;
      return brightness > 128 ? 'light' : 'dark';
    }
  }
  
  // Default to dark theme
  return 'dark';
};

// Detect user context based on URL or props
const detectUserContext = (): ProductCardTheme['context'] => {
  const path = window.location.pathname;
  
  if (path.includes('/admin')) return 'admin';
  if (path.includes('/history')) return 'history';
  if (path.includes('/product')) return 'product';
  
  // Default based on current component usage
  return 'product';
};

// Theme provider component
export function ProductCardThemeProvider({ children }: { children: React.ReactNode }) {
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  
  // Initialize theme with auto-detection
  const [theme, setTheme] = useState<ProductCardTheme>(() => {
    const background = detectBackgroundContext();
    const context = detectUserContext();
    const config = contextConfigs[context];
    
    return {
      background,
      context,
      contrast: background === 'admin' ? 'high' : 'medium',
      variant: config.variant,
      glassEffect: config.glassEffect,
      animations: config.animations,
      density: config.density,
    };
  });

  // Detect reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => {
      setIsReducedMotion(e.matches);
      setTheme(prev => ({
        ...prev,
        animations: e.matches ? 'none' : prev.animations
      }));
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Auto-detect background changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const newBackground = detectBackgroundContext();
      if (newBackground !== theme.background) {
        setTheme(prev => ({
          ...prev,
          background: newBackground,
          contrast: newBackground === 'admin' ? 'high' : 'medium'
        }));
      }
    });
    
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'data-admin-dashboard']
    });
    
    return () => observer.disconnect();
  }, [theme.background]);

  const updateTheme = (updates: Partial<ProductCardTheme>) => {
    setTheme(prev => ({ ...prev, ...updates }));
  };

  const getAdaptiveStyles = () => {
    return adaptiveColors[theme.background];
  };

  const contextValue: ProductCardThemeContextType = {
    theme,
    updateTheme,
    getAdaptiveStyles,
    isReducedMotion,
  };

  return (
    <ProductCardThemeContext.Provider value={contextValue}>
      {children}
    </ProductCardThemeContext.Provider>
  );
}

// Hook to use theme context
export function useProductCardTheme() {
  const context = useContext(ProductCardThemeContext);
  if (!context) {
    throw new Error('useProductCardTheme must be used within ProductCardThemeProvider');
  }
  return context;
}

// Utility hook for getting adaptive class names
export function useAdaptiveStyles() {
  const { getAdaptiveStyles, theme } = useProductCardTheme();
  const styles = getAdaptiveStyles();
  
  return {
    ...styles,
    theme,
    // Convenient computed classes
    cardContainer: `${styles.card.background} ${styles.card.border} ${styles.card.shadow} ${styles.card.hover} transition-all duration-300`,
    primaryText: styles.text.primary,
    secondaryText: styles.text.secondary,
    accentText: styles.text.accent,
    primaryButton: `${styles.interactive.button} transition-colors duration-200`,
    secondaryButton: `${styles.interactive.buttonSecondary} transition-colors duration-200`,
  };
} 