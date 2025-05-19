import { useState, useEffect, useCallback } from 'react';
import { Toaster } from 'react-hot-toast';
import { supabase } from './lib/supabase';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import { DocumentUploader, ProcessedDocument } from './components/DocumentUploader';
import { BlogLinkInput } from './components/BlogLinkInput';
import { ProductLineInput } from './components/ProductLineInput';
import { SubmitSection } from './components/SubmitSection';
import { Header } from './components/Header';
import { MainHeader } from './components/MainHeader';
import { ProcessingModal } from './components/ProcessingModal';
import ProductResultsPage from './components/ProductResultsPage';
import { ResearchHistory } from './components/ResearchHistory';
import { ResearchResult, getResearchResults, getResearchResultById, deleteResearchResult } from './lib/research';
import { makeWebhookRequest } from './utils/webhookUtils';
import { parseProductData } from './types/product';
import { ProductAnalysis } from './types/product/types';
import { AdminAuthModal } from './components/admin/AdminAuthModal';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthModal } from './components/auth/AuthModal';
import { ScrapedBlog } from './utils/blogScraper';
import { notify } from './utils/notificationUtils.tsx';
import UserDashboard from './pages/UserDashboard';
import UserContentBriefs from './pages/UserContentBriefs';
import EditContentBrief from './pages/EditContentBrief';
import ApprovedContent from './pages/ApprovedContent';
import { ResetPassword } from './components/auth/ResetPassword';
import { ToastProvider } from './contexts/ToastContext';
import ProductsListPage from './pages/ProductsListPage'; // Import the actual page
import DedicatedProductPage from './pages/DedicatedProductPage'; // Added import
import LandingPage from './pages/LandingPage'; // Import the new LandingPage

function App() {
  const [documents, setDocuments] = useState<ProcessedDocument[]>([]);
  const [blogLinks, setBlogLinks] = useState<string[]>([]);
  const [productLines, setProductLines] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAdminAuthModal, setShowAdminAuthModal] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [researchResults, setResearchResults] = useState<ProductAnalysis[]>([]);
  const [historyResults, setHistoryResults] = useState<ResearchResult[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [currentHistoryId, setCurrentHistoryId] = useState<string | undefined>(undefined);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Initialize the path-based router state
  // We'll use the path to determine what to show
  // Define path booleans based on location
  const isHistoryPath = location.pathname === '/history';
  const isProductPath = location.pathname.startsWith('/product/');
  const isAdminPath = location.pathname === '/admin';

  // Function to load research history (defined early)
  const loadResearchHistory = useCallback(async () => {
    if (!user) return;
    
    setIsHistoryLoading(true);
    try {
      const results = await getResearchResults();
      console.log(`Loaded ${results.length} research results`);
      setHistoryResults(results);
    } catch (error) {
      console.error('Error loading research history:', error);
    } finally {
      setIsHistoryLoading(false);
    }
  }, [user]);

  // Handle sign out and show auth modal
  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Navigate to home
      navigate('/', { replace: true });
      
      // Immediately show auth modal after sign out
      setShowAuthModal(true);
      
      notify('success', 'Signed out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
      notify('error', 'Failed to sign out');
    }
  };

  // Load user on initial render
  useEffect(() => {
    // Check for initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user ?? null);
        
        // Check if admin
        const userData = session.user.user_metadata;
        const isAdmin = userData && (userData.is_admin === true || userData.role === 'admin');
        
        // Update admin auth state
        setIsAdminAuthenticated(isAdmin);
        
        // If admin, redirect to admin page
        if (isAdmin && !isAdminPath) {
          navigate('/admin', { replace: true });
        }
      } else {
        // No active session - show auth modal
        setShowAuthModal(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      
      // When the event is SIGNED_OUT, show the auth modal
      if (event === 'SIGNED_OUT') {
        console.log('User signed out, redirecting to home and showing auth modal');
        
        // Reset admin authentication state
        setIsAdminAuthenticated(false);
        
        // Redirect to home (Landing Page)
        navigate('/', { replace: true });
        
        // Show the authentication modal immediately
        setShowAuthModal(true);
        
        return;
      }
      
      if (session) {
        // Check if the user has an admin role in metadata
        const userData = session.user.user_metadata;
        const isAdmin = userData && (userData.is_admin === true || userData.role === 'admin');
        
        console.log(`User logged in. Admin status: ${isAdmin ? 'IS ADMIN' : 'NOT ADMIN'}`);
        
        // If the user is already authenticated as an admin, maintain that state
        if (isAdmin) {
          setIsAdminAuthenticated(true);
          
          // If on admin path, no need to redirect
          if (!isAdminPath) {
            navigate('/admin', { replace: true });
          }
        } else {
          // Regular user logged in - redirect to home if on restricted pages
          if (isAdminPath) {
            navigate('/', { replace: true });
          }
        }
      } else {
        // User signed out but event wasn't SIGNED_OUT
        // Reset admin authentication state
        setIsAdminAuthenticated(false);
        
        // If they were on a restricted page, redirect to home
        if (isAdminPath) {
          navigate('/', { replace: true });
        }
      }
    });

    // Listen for the showAuthModal event from AdminDashboard
    const handleShowAuthModal = () => {
      setShowAuthModal(true);
    };
    
    // Global event for showing the auth modal from anywhere in the app
    window.addEventListener('showAuthModal', handleShowAuthModal);
    
    return () => {
      subscription.unsubscribe();
      window.removeEventListener('showAuthModal', handleShowAuthModal);
    };
  }, []);
  
  // This effect runs when the user state changes or loadResearchHistory callback changes
  useEffect(() => {
    if (user) {
      loadResearchHistory();
    } else {
      // Clear history results if user logs out
      setHistoryResults([]); 
    }
  }, [user, loadResearchHistory]);
  
  // Handle document processing
  const handleDocumentsProcessed = (processedDocs: ProcessedDocument[]) => {
    setDocuments(processedDocs);
  };

  // Handle blog links input
  const handleBlogLinksChange = (links: string[]) => {
    setBlogLinks(links);
  };

  // Handle product lines input
  const handleProductLinesChange = (productLines: string[]) => {
    setProductLines(productLines);
  };
  
  // Handle research form submission
  const handleSubmit = async () => {
    // Basic validation
    if (productLines.length === 0) {
      notify('error', 'Please enter at least one product line');
      return;
    }
    
    if (documents.length === 0 && blogLinks.length === 0) {
      notify('error', 'Please upload documents or enter blog links');
      return;
    }

    setIsSubmitting(true);
    setIsProcessing(true);
    
    try {
      // Prepare data for the webhook
      const processedDocuments = documents.map(doc => ({
        name: doc.name,
        content: doc.content,
        type: doc.type
      }));
      
      // Process blog links using OpenAI web search
      let processedBlogs: ScrapedBlog[] = [];
      if (blogLinks.length > 0) {
        try {
          // Import the blog scraper function
          const { scrapeBlogContent } = await import('./utils/blogScraper');
          
          // Process each blog link
          console.log(`Processing ${blogLinks.length} blog links with OpenAI web search...`);
          
          // Process blogs sequentially to avoid rate limits
          for (const url of blogLinks) {
            try {
              const scrapedBlog = await scrapeBlogContent(url);
              processedBlogs.push(scrapedBlog);
              console.log(`Successfully processed blog: ${url}`);
            } catch (error) {
              const blogError = error as Error;
              console.error(`Error processing blog ${url}:`, blogError);
              // Add the URL with error information
              processedBlogs.push({
                url,
                title: url,
                content: `Error processing blog content: ${blogError.message || 'Unknown error'}`,
                status: 'error' as const,
                error: blogError.message || 'Unknown error'
              });
            }
          }
        } catch (error) {
          console.error("Error importing or using blog scraper:", error);
          // Fall back to sending just the URLs if scraping fails
          processedBlogs = blogLinks.map(url => ({
            url,
            title: url,
            content: "URL submitted without processing due to scraper error",
            status: 'error' as const,
            error: "Blog scraping module failed to load"
          }));
        }
      }
      
      const requestPayload = {
        documents: processedDocuments,
        blogs: processedBlogs, // Send processed blog content
        blogLinks, // Also send original links as fallback
        productLines,
        timestamp: new Date().toISOString()
      };

      console.log("Sending research request:", requestPayload);
      
      // Send the data to the webhook
      const webhookResponse = await makeWebhookRequest(
        'https://hook.us2.make.com/dmgxx97dencaquxi9vr9khxrr71kotpm',
        requestPayload,
        {
          timeout: 600000,  // 10 minutes
          maxRetries: 2,
          retryDelay: 5000
        }
      );
      
      console.log("Received webhook response:", webhookResponse);
      
      // Parse the webhook response to extract product data
      const products = parseProductData(webhookResponse);
      
      console.log(`Parsed ${products.length} products:`, products);
      
      if (products && products.length > 0) {
        // Update the research results state
        setResearchResults(products);
        
        // Navigate to the results page
        navigate('/product/new', { replace: true });
      } else {
        throw new Error("Failed to parse product data from response");
      }
    } catch (error) {
      console.error('Error during research submission:', error);
      notify('error', `An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
      setIsProcessing(false);
    }
  };
  
  // Reset the research form
  const resetForm = () => {
    setDocuments([]);
    setBlogLinks([]);
    setProductLines([]);
    setCurrentHistoryId(undefined);
  };

  // Handle selecting a history result
  const handleHistorySelect = async (result: ResearchResult) => {
    try {
      console.log(`Selected research history item: ${result.id}`);
      
      // Clean any existing results
      resetForm();
      
      // Set the current history ID
      setCurrentHistoryId(result.id);
      
      // Update the research results state with the selected history item's data
      setResearchResults(result.data);
      
      // Navigate to the product view
      navigate(`/product/${result.id}`, { replace: true });
      
    } catch (error) {
      console.error('Error selecting history item:', error);
    }
  };
  
  // Handle deleting a history result
  const handleHistoryDelete = async (id: string) => {
    try {
      await deleteResearchResult(id);
      
      // If the current history item is deleted, reset the form
      if (id === currentHistoryId) {
        resetForm();
        navigate('/history', { replace: true });
      }
      
      // Refresh the history list
      loadResearchHistory();
    } catch (error) {
      console.error('Error deleting history item:', error);
    }
  };

  // Function to handle loading a product by ID
  const loadProductById = async (id: string) => {
    try {
      const result = await getResearchResultById(id);
      if (result) {
        setResearchResults(result.data);
        setCurrentHistoryId(id);
      } else {
        throw new Error('Research result not found');
      }
    } catch (error) {
      console.error(`Error loading product ${id}:`, error);
      navigate('/history', { replace: true });
    }
  };

  // Check if path has ID parameters to load when component mounts
  useEffect(() => {
    if (isProductPath) {
      const id = location.pathname.split('/product/')[1];
      if (id && id !== 'new') {
        loadProductById(id);
      }
    }
  }, [location.pathname]);

  // Determine what to show based on the current URL path
  const renderMainContent = (isAppRoute = false) => {
    // Admin dashboard
    if (isAdminPath) {
      return isAdminAuthenticated ? (
        <AdminDashboard onLogout={() => setIsAdminAuthenticated(false)} />
      ) : (
        <div className="min-h-screen bg-secondary-900">
          <MainHeader 
            user={user} 
            onShowAuthModal={() => setShowAuthModal(true)} 
            showHistory={isHistoryPath}
            setShowHistory={(show) => {
              if (show) {
                navigate('/history', { replace: true });
              } else {
                navigate('/', { replace: true });
              }
            }}
            onSignOut={handleSignOut}
          />
          <div className="container mx-auto px-4 py-12">
            <div className="max-w-md mx-auto bg-secondary-800 rounded-xl p-8 border-2 border-primary-500/20 shadow-glow">
              <h2 className="text-xl font-semibold text-primary-400 mb-4">Admin Access Required</h2>
              <p className="text-white mb-6">
                Please log in with an admin account to access the dashboard.
              </p>
              <button
                onClick={() => setShowAdminAuthModal(true)}
                className="w-full px-4 py-2 bg-primary-500 text-black font-medium rounded-lg hover:bg-primary-400 transition-colors"
              >
                Admin Login
              </button>
            </div>
          </div>
        </div>
      );
    }
    
    // History view
    if (isHistoryPath) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-secondary-900 text-white">
          <MainHeader 
            user={user} 
            onShowAuthModal={() => setShowAuthModal(true)} 
            showHistory={true}
            setShowHistory={(show) => {
              if (!show) {
                navigate('/', { replace: true });
                resetForm();
              }
            }}
            onSignOut={handleSignOut}
          />
          
          <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold text-primary-400 mb-6">Your Research History</h1>
            
            {!user && (
              <div className="bg-secondary-800 border-2 border-primary-500/20 rounded-xl p-6 mb-8 shadow-glow">
                <p className="text-white mb-4">
                  Sign in to access your research history.
                </p>
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="px-4 py-2 bg-primary-500 text-black font-medium rounded-lg hover:bg-primary-400 transition-colors"
                >
                  Sign In
                </button>
              </div>
            )}
            
            {user && (
              <ResearchHistory 
                results={historyResults}
                onSelect={handleHistorySelect}
                onDelete={handleHistoryDelete}
                isLoading={isHistoryLoading}
                onStartNew={() => {
                  resetForm();
                  navigate('/', { replace: true });
                }}
              />
            )}
          </div>
        </div>
      );
    }
    
    // Product results page or loading state for product path
    if (isProductPath && !isHistoryPath && !isAdminPath) {
      if (researchResults.length > 0) {
        return (
          <ProductResultsPage 
            products={researchResults}
            onStartNew={() => {
              resetForm();
              navigate('/app', { replace: true }); // Go to /app for new research
            }}
            existingId={currentHistoryId}
            showHistory={isHistoryPath} // This will be false here
            setShowHistory={(show) => {
              if (show) {
                navigate('/history', { replace: true });
              } else {
                navigate('/app', { replace: true }); // Back to /app
              }
            }}
            forceHistoryView={() => navigate('/history', { replace: true })}
            onHistorySave={loadResearchHistory}
            onSaveComplete={(newId) => {
              setCurrentHistoryId(newId);
              loadResearchHistory();
            }}
          />
        );
      } else {
        // If we don't have results but are on a product path, show loading
        return (
          <div className="min-h-screen bg-secondary-900 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
              <p className="text-white">Loading product data...</p>
            </div>
          </div>
        );
      }
    }

    // If on /app route and have results, show ProductResultsPage (this handles results after a submission on /app)
    if (isAppRoute && researchResults.length > 0 && !isHistoryPath && !isAdminPath) {
      return (
        <ProductResultsPage 
          products={researchResults}
          onStartNew={() => {
            resetForm();
            // researchResults should clear or navigate('/app') will show results again
            setResearchResults([]); // Clear results for a truly new start on /app
            navigate('/app', { replace: true });
          }}
          existingId={currentHistoryId} // This might be from a previous load or undefined
          showHistory={false} // Not showing history view on /app results page itself
          setShowHistory={(show) => { // Allow navigation to history
            if (show) navigate('/history', { replace: true });
          }}
          forceHistoryView={() => navigate('/history', { replace: true })}
          onHistorySave={loadResearchHistory}
          onSaveComplete={(newId) => {
            setCurrentHistoryId(newId);
            loadResearchHistory();
          }}
        />
      );
    }
    
    // App view (research form) - rendered for /app or if no other specific content matches on other routes handled by renderMainContent
    // Only render the main app layout if isAppRoute is true
    if (isAppRoute) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-secondary-900 text-white">
          <MainHeader 
            user={user} 
            onShowAuthModal={() => setShowAuthModal(true)}
            showHistory={false} // This might need to be dynamic based on /app's sub-routes if any evolve
            setShowHistory={(show) => {
              if (show) {
                navigate('/history', { replace: true }); // or /app/history if that becomes a thing
              }
            }}
            onSignOut={handleSignOut}
          />
          
          <div className="container mx-auto px-4 py-8">
            <Header /> {/* This is the BOFU AI Research Assistant header, specific to this page */}
            
            <div className="max-w-3xl mx-auto space-y-10">
              <DocumentUploader onDocumentsProcessed={handleDocumentsProcessed} />
              <BlogLinkInput onBlogLinksChange={handleBlogLinksChange} />
              <ProductLineInput onProductLinesChange={handleProductLinesChange} />
              <SubmitSection 
                isDisabled={productLines.length === 0 || (documents.length === 0 && blogLinks.length === 0)}
                isSubmitting={isSubmitting}
                onSubmit={handleSubmit}
              />
            </div>
          </div>
        </div>
      );
    }
    // Fallback for other paths that might call renderMainContent without isAppRoute=true, 
    // though routing should primarily handle this.
    // Or, if called for non-app routes that still need some common wrapper not provided by LandingPage etc.
    // For now, returning null if not isAppRoute and no other condition in renderMainContent matched.
    // This part of the logic might need refinement based on how other routes using renderMainContent behave.
    if (!isHistoryPath && !isProductPath && !isAdminPath && !isAppRoute) {
        // This case should ideally be handled by a specific component route like <LandingPage />
        // If renderMainContent is called for '/' without isAppRoute=true, it means we want the landing page.
        // However, the direct routing to <LandingPage /> is preferred.
        // This log helps identify if renderMainContent is being called unexpectedly for the root path.
        console.log("renderMainContent called for root path without isAppRoute, should be handled by <LandingPage /> route directly.");
        return null; 
    }
    
    // If none of the above conditions are met (e.g., it's /history, /product/:id, /admin and content for those is generated above this block)
    // or if it's /app but researchResults.length > 0 (handled by ProductResultsPage condition)
    // this return might not be hit if all paths are covered. Adding a fallback or ensuring all paths are covered is key.
    // The existing logic for history, product, admin already returns specific components.
    return null; // Fallback if no other content is rendered by this function for the given path/state.
  };

  return (
    <ToastProvider>
      <ErrorBoundary>
        <div className="App">
        <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#333',
            color: '#fff',
          },
          success: {
            iconTheme: {
              primary: '#FFE600',
              secondary: '#000',
            },
          },
          error: {
            iconTheme: {
              primary: '#ff4b4b',
              secondary: '#fff',
            },
          },
        }}
      />
      
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<LandingPage user={user} onShowAuthModal={() => setShowAuthModal(true)} onSignOut={handleSignOut} />} />
          <Route path="/app" element={renderMainContent(true)} />
          <Route path="/history" element={renderMainContent()} />
          <Route path="/product/:id" element={renderMainContent()} />
          <Route path="/admin" element={renderMainContent()} />
          <Route path="/dashboard" element={<UserDashboard />} />
          <Route path="/dashboard/content-briefs" element={<UserContentBriefs />} />
          <Route path="/dashboard/content-briefs/:id/edit" element={<EditContentBrief />} />
          <Route path="/dashboard/approved-content" element={<ApprovedContent />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/user-dashboard" element={<Navigate to="/dashboard" replace />} />
          <Route path="/user-dashboard/content-briefs" element={<Navigate to="/dashboard/content-briefs" replace />} />
          <Route path="/dashboard/products" element={<ProductsListPage />} />
          <Route path="/dashboard/products/:productId" element={<DedicatedProductPage />} />
          <Route path="/products" element={<ProductsListPage />} />
          <Route path="/products/:productId" element={<DedicatedProductPage />} />
        </Routes>
      </AnimatePresence>
      
      {/* Processing Modal */}
      <ProcessingModal isOpen={isProcessing} />
      
      {/* Global Authentication Modal - visible regardless of route */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        onShowAdminLogin={() => setShowAdminAuthModal(true)}
      />
      
      {/* Admin Auth Modal */}
      <AdminAuthModal
        isOpen={showAdminAuthModal}
        onClose={() => setShowAdminAuthModal(false)}
        onAdminAuthenticated={() => {
          setIsAdminAuthenticated(true);
          notify('success', 'Admin login successful');
          navigate('/admin', { replace: true });
        }}
      />
    </div>
    </ErrorBoundary>
    </ToastProvider>
  );
}

export default App;