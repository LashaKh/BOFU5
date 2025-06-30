import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Toaster } from 'react-hot-toast';
import { supabase } from './lib/supabase';
import type { User } from '@supabase/supabase-js';
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
import { ProfileContextProvider } from './contexts/ProfileContext';
import ProductsListPage from './pages/ProductsListPage';
import DedicatedProductPage from './pages/DedicatedProductPage';
import LandingPage from './pages/LandingPage';
import ArticleEditorPage from './pages/ArticleEditorPage';
import { AdminContextProvider } from './contexts/AdminContext';
import { AdminRoute } from './components/admin/AdminRoute';

// Lazy load admin and heavy components
const GeneratedArticlesPage = lazy(() => import('./pages/GeneratedArticlesPage'));
const UserSettingsPage = lazy(() => import('./pages/UserSettingsPage'));
const AdminArticleEditorPage = lazy(() => import('./pages/AdminArticleEditorPage'));
const UserSelectorTest = lazy(() => import('./components/admin/UserSelectorTest').then(m => ({ default: m.UserSelectorTest })));
const AdminArticleListTest = lazy(() => import('./components/admin/AdminArticleListTest').then(m => ({ default: m.AdminArticleListTest })));
const ArticleEditorAdminTest = lazy(() => import('./components/admin/ArticleEditorAdminTest').then(m => ({ default: m.ArticleEditorAdminTest })));
const AuditLogViewerTest = lazy(() => import('./components/admin/AuditLogViewerTest').then(m => ({ default: m.AuditLogViewerTest })));
const ProfileTest = lazy(() => import('./components/profile/ProfileTest').then(m => ({ default: m.ProfileTest })));

// Loading component
const PageLoading = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
    <div className="text-white text-xl">Loading...</div>
  </div>
);

function App() {
  const [documents, setDocuments] = useState<ProcessedDocument[]>([]);
  const [blogLinks, setBlogLinks] = useState<string[]>([]);
  const [productLines, setProductLines] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAdminAuthModal, setShowAdminAuthModal] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
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
    console.log('[DEBUG] ========== LOGOUT STARTED ==========');
    console.log('[DEBUG] handleSignOut called from:', new Error().stack?.split('\n')[2]?.trim());
    console.log('[DEBUG] Current state before sign out:', {
      user: user?.email,
      currentPath: location.pathname,
      isAuthLoading,
      showAuthModal,
      showAdminAuthModal
    });
    
    try {
      console.log('[DEBUG] Calling supabase.auth.signOut()...');
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[DEBUG] Supabase signOut error:', error);
        throw error;
      }
      
      console.log('[DEBUG] Supabase sign out successful - waiting for auth state listener...');
      notify('success', 'Signed out successfully');
    } catch (error) {
      console.error('[ERROR] Sign out failed:', error);
      console.error('[DEBUG] Sign out error details:', {
        name: (error as Error)?.name,
        message: (error as Error)?.message,
        stack: (error as Error)?.stack
      });
      notify('error', 'Failed to sign out');
    }
    console.log('[DEBUG] ========== LOGOUT HANDLER FINISHED ==========');
  };

  

  // Function to automatically setup admin access if tables are empty
  const autoSetupAdmin = useCallback(async (userId: string, userEmail: string): Promise<boolean> => {
    try {
      console.log("[DEBUG] Auto-setting up admin access...");
      
      // First, populate user_profiles from content_briefs if user_profiles is empty
      await populateUserProfiles();
      
      // Check if admin_profiles is empty
      const { data: existingAdmins, error: adminError } = await supabase
        .from('admin_profiles')
        .select('id')
        .limit(1);
      
      if (adminError) {
        console.error("[DEBUG] Error checking admin_profiles:", adminError);
        return false;
      }
      
      // If no admins exist, make this user an admin
      if (!existingAdmins || existingAdmins.length === 0) {
        console.log("[DEBUG] No admins found. Creating admin user...");
        
        // First ensure user is in user_profiles
        const { error: userProfileError } = await supabase
          .from('user_profiles')
          .upsert({
            id: userId,
            email: userEmail,
            company_name: 'Admin Company',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'id'
          });
        
        if (userProfileError) {
          console.error("[DEBUG] Error creating user profile:", userProfileError);
        } else {
          console.log("[DEBUG] User profile created/updated");
        }
        
        // Then add to admin_profiles
        const { data: adminData, error: adminInsertError } = await supabase
          .from('admin_profiles')
          .insert({
            id: userId,
            email: userEmail,
            name: userEmail.split('@')[0],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (adminInsertError) {
          console.error("[DEBUG] Error creating admin:", adminInsertError);
          return false;
        } else {
          console.log("[DEBUG] Admin created successfully:", adminData);
          return true;
        }
      }
      
      return false; // Admin already exists
    } catch (error) {
      console.error("[DEBUG] Auto setup error:", error);
      return false;
    }
  }, []);

  // Function to populate user_profiles from content_briefs if user_profiles is empty
  const populateUserProfiles = async (): Promise<void> => {
    try {
      console.log("[DEBUG] Checking if user_profiles needs population...");
      
      // Add much shorter timeout protection and make it non-blocking
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Database query timeout')), 2000); // Reduced from 5000 to 2000
      });
      
      // Check if user_profiles is empty with very simple query
      const queryPromise = supabase
        .from('user_profiles')
        .select('id', { count: 'exact', head: true });
      
      await Promise.race([
        queryPromise,
        timeoutPromise
      ]);
      
      // If we get here without timeout, we can safely skip population
      console.log("[DEBUG] user_profiles table accessible, skipping population");
      return;
      
    } catch (error) {
      console.error("[DEBUG] Error in populateUserProfiles:", error);
      console.log("[DEBUG] populateUserProfiles failed, but continuing with admin setup");
      // Don't throw - just continue
      return;
    }
  };

  // Load user on initial render
  useEffect(() => {
    setIsAuthLoading(true); // Start loading
    // Check for initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('[INITIAL] Checking session on app load:', session?.user?.email);
      
      if (session) {
        setUser(session.user ?? null);
        setIsAuthLoading(false);
        
        // Run database setup in background without blocking UI
        populateUserProfiles().catch(err => {
          console.log('[BACKGROUND] User profiles population failed, but continuing:', err);
        });

        if (session.user.email === 'lashay@bofu.ai' && !location.pathname.startsWith('/admin')) {
          navigate('/admin', { replace: true });
        }
      } else {
        console.log('[INITIAL] No session found');
        setIsAuthLoading(false);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[AUTH_STATE] Event: ${event}, Session:`, session?.user?.email, 'Current path:', location.pathname);
      
      if (event === 'SIGNED_IN' && session) {
        console.log('[AUTH_STATE] Processing SIGNED_IN event');
        setUser(session.user);
        setIsAuthLoading(false);
        
        // Check if this is an admin user
        if (session.user.email === 'lashay@bofu.ai') {
          console.log('[AUTH] Admin user signed in');
          // Navigate to admin if not already on admin-related routes
          if (!location.pathname.startsWith('/admin')) {
            navigate('/admin', { replace: true });
          }
          
          // Run admin setup in background
          autoSetupAdmin(session.user.id, session.user.email).catch(err => {
            console.log('[BACKGROUND] Admin setup failed, but continuing:', err);
          });
        } else {
          console.log('[AUTH] Regular user signed in');
          // For regular users, run setup in background
          populateUserProfiles().catch(err => {
            console.log('[BACKGROUND] User profiles population failed, but continuing:', err);
          });
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('[AUTH_STATE] Processing SIGNED_OUT event');
        console.log('[AUTH] User signed out - clearing state and redirecting');
        setUser(null);
        setIsAuthLoading(false);
        setResearchResults([]);
        setHistoryResults([]);
        setCurrentHistoryId(undefined);
        
        // Close any open auth modals
        setShowAuthModal(false);
        setShowAdminAuthModal(false);
        
        // The actual navigation will be handled by the useEffect below
        console.log('[AUTH] State cleared, navigation will be triggered by user state change.');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, autoSetupAdmin, location.pathname]);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      if (location.pathname !== '/' && !location.pathname.startsWith('/reset-password')) {
        console.log(`[USER_EFFECT] User is null and not on landing/reset page. Redirecting from ${location.pathname} to /`);
        navigate('/', { replace: true });
      }
    }
  }, [user, isAuthLoading, location.pathname, navigate]);
  
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
    setResearchResults([]);
    setCurrentHistoryId(undefined);
  };

  // Handle selecting a history result
  const handleHistorySelect = async (result: ResearchResult) => {
    try {
      const fullResult = await getResearchResultById(result.id);
      if (fullResult && fullResult.data) {
        const productsArray = parseProductData(fullResult.data);
        setResearchResults(productsArray);
        setCurrentHistoryId(fullResult.id);
        navigate(`/product/${fullResult.id}`); 
      } else {
        notify('error', 'Could not load a parsable product from history.');
        setResearchResults([]);
      }
    } catch (error) {
      notify('error', 'Error loading history item: ' + (error as Error).message);
      setResearchResults([]);
    }
  };
  
  // Handle deleting a history result
  const handleHistoryDelete = async (id: string) => {
    try {
      await deleteResearchResult(id);
      notify('success', 'Research result deleted.');
      loadResearchHistory();
      if (currentHistoryId === id) {
        resetForm();
        navigate('/research', { replace: true });
      }
    } catch (error) {
      notify('error', 'Error deleting research result: ' + (error as Error).message);
    }
  };

  // Function to handle loading a product by ID
  const loadProductById = useCallback(async (id: string) => {
    if (!user || !id) return;
    setIsProcessing(true);
    try {
      const result = await getResearchResultById(id);
      if (result && result.data) {
        const productsArray = parseProductData(result.data);
        setResearchResults(productsArray);
        setCurrentHistoryId(id);
      } else {
        notify('error', 'Could not load product data.');
        setResearchResults([]);
        navigate('/research', { replace: true });
      }
    } catch (error) {
      notify('error', 'Error loading product: ' + (error as Error).message);
      setResearchResults([]);
      navigate('/research', { replace: true });
    } finally {
      setIsProcessing(false);
    }
  }, [user, navigate]);

  // Check if path has ID parameters to load when component mounts
  useEffect(() => {
    if (isProductPath) {
      const id = location.pathname.split('/product/')[1];
      if (id && id !== 'new') {
        loadProductById(id);
      }
    }
  }, [location.pathname, loadProductById, isProductPath]);

  // Determine what to show based on the current URL path
  const renderMainContent = (isAppRoute = false) => {
    // Admin dashboard
    if (isAdminPath) {
      return isAuthLoading ? (
        <div className="min-h-screen bg-secondary-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
            <p className="text-white">Checking authentication...</p>
          </div>
        </div>
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
        <div className="min-h-screen text-white" style={{ background: 'linear-gradient(to bottom right, #111827, #1f2937)' }}>
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
              navigate('/research', { replace: true });
            }}
            existingId={currentHistoryId}
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
        <div className="min-h-screen text-white" style={{ backgroundColor: '#1f2937' }}>
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
    <ProfileContextProvider user={user}>
      <AdminContextProvider user={user}>
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
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={
                (() => {
                  console.log('[ROUTE] Landing page route - isAuthLoading:', isAuthLoading, 'user:', user?.email);
                  if (isAuthLoading) {
                    console.log('[ROUTE] Showing loading screen');
                    return (
                      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1f2937' }}>
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
                          <p className="text-white">Loading...</p>
                        </div>
                      </div>
                    );
                  } else {
                    console.log('[ROUTE] Showing landing page');
                    return <LandingPage user={user} onShowAuthModal={() => setShowAuthModal(true)} onSignOut={handleSignOut} />;
                  }
                })()
              } />
              
              <Route path="/research" element={
                isAuthLoading ? (
                  <div className="min-h-screen bg-secondary-900 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
                      <p className="text-white">Loading...</p>
                    </div>
                  </div>
                ) : user ? (
                  renderMainContent(true)
                ) : (
                  <Navigate to="/" replace />
                )
              } />
              <Route path="/history" element={user ? (
                <div className="min-h-screen text-white" style={{ background: 'linear-gradient(to bottom right, #111827, #1f2937)' }}>
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
                  </div>
                </div>
              ) : <Navigate to="/" replace />} />
              <Route path="/product/:id" element={
                isAuthLoading ? (
                  <div className="min-h-screen bg-secondary-900 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
                      <p className="text-white">Loading...</p>
                    </div>
                  </div>
                ) : user ? (
                  <ProductResultsPage 
                    products={researchResults}
                    onStartNew={() => {
                      resetForm();
                      navigate('/research', { replace: true });
                    }}
                    existingId={currentHistoryId}
                    onHistorySave={loadResearchHistory}
                    onSaveComplete={(newId) => {
                      setCurrentHistoryId(newId);
                      loadResearchHistory();
                    }}
                  />
                ) : (
                  <Navigate to="/" replace />
                )
              } />
              <Route path="/products" element={
                isAuthLoading ? (
                  <div className="min-h-screen bg-secondary-900 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
                      <p className="text-white">Loading...</p>
                    </div>
                  </div>
                ) : user ? (
                  <ProductsListPage />
                ) : (
                  <Navigate to="/" replace />
                )
              } />
              <Route path="/products/:id" element={
                isAuthLoading ? (
                  <div className="min-h-screen bg-secondary-900 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
                      <p className="text-white">Loading...</p>
                    </div>
                  </div>
                ) : user ? (
                  <DedicatedProductPage />
                ) : (
                  <Navigate to="/" replace />
                )
              } />
              
              <Route path="/dashboard" element={
                isAuthLoading ? (
                  <div className="min-h-screen bg-secondary-900 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
                      <p className="text-white">Loading...</p>
                    </div>
                  </div>
                ) : user ? (
                  <UserDashboard />
                ) : (
                  <Navigate to="/" replace />
                )
              } />
              <Route path="/dashboard/content-briefs" element={
                isAuthLoading ? (
                  <div className="min-h-screen bg-secondary-900 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
                      <p className="text-white">Loading...</p>
                    </div>
                  </div>
                ) : user ? (
                  <UserContentBriefs />
                ) : (
                  <Navigate to="/" replace />
                )
              } />
              <Route path="/dashboard/content-briefs/edit/:id" element={
                isAuthLoading ? (
                  <div className="min-h-screen bg-secondary-900 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
                      <p className="text-white">Loading...</p>
                    </div>
                  </div>
                ) : user ? (
                  <EditContentBrief />
                ) : (
                  <Navigate to="/" replace />
                )
              } />
              <Route path="/dashboard/approved-content" element={
                isAuthLoading ? (
                  <div className="min-h-screen bg-secondary-900 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
                      <p className="text-white">Loading...</p>
                    </div>
                  </div>
                ) : user ? (
                  <ApprovedContent />
                ) : (
                  <Navigate to="/" replace />
                )
              } />
              <Route path="/dashboard/generated-articles" element={
                isAuthLoading ? (
                  <div className="min-h-screen bg-secondary-900 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
                      <p className="text-white">Loading...</p>
                    </div>
                  </div>
                ) : user ? (
                  <Suspense fallback={<PageLoading />}>
                    <GeneratedArticlesPage />
                  </Suspense>
                ) : (
                  <Navigate to="/" replace />
                )
              } />

              <Route path="/admin" element={
                isAuthLoading ? (
                  <div className="min-h-screen bg-secondary-900 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
                      <p className="text-white">Checking authentication...</p>
                    </div>
                  </div>
                ) : user ? (
                  <AdminRoute user={user} onLogout={handleSignOut} />
                ) : (
                  <Navigate to="/" replace />
                )
              } />
              <Route path="/admin/articles/:articleId" element={
                isAuthLoading ? (
                  <div className="min-h-screen bg-secondary-900 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
                      <p className="text-white">Checking authentication...</p>
                    </div>
                  </div>
                ) : user ? (
                  <Suspense fallback={<PageLoading />}>
                    <AdminArticleEditorPage />
                  </Suspense>
                ) : (
                  <Navigate to="/" replace />
                )
              } />

              <Route path="/reset-password" element={<ResetPassword />} />
              
              {/* Test Routes - To be removed before production */}
              <Route path="/user-selector-test" element={
                <Suspense fallback={<PageLoading />}>
                  <UserSelectorTest />
                </Suspense>
              } />
              <Route path="/admin-article-list-test" element={
                <Suspense fallback={<PageLoading />}>
                  <AdminArticleListTest />
                </Suspense>
              } />
              <Route path="/article-editor-admin-test" element={
                <Suspense fallback={<PageLoading />}>
                  <ArticleEditorAdminTest />
                </Suspense>
              } />
              <Route path="/audit-log-viewer-test" element={
                <Suspense fallback={<PageLoading />}>
                  <AuditLogViewerTest />
                </Suspense>
              } />

              <Route path="/article-editor/:id" element={
                isAuthLoading ? (
                  <div className="min-h-screen bg-secondary-900 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
                      <p className="text-white">Loading...</p>
                    </div>
                  </div>
                ) : user ? (
                  <ArticleEditorPage />
                ) : (
                  <Navigate to="/" replace />
                )
              } />

              <Route path="/profile-test" element={
                <Suspense fallback={<PageLoading />}>
                  <ProfileTest />
                </Suspense>
              } />

              <Route path="/user-settings" element={
                isAuthLoading ? (
                  <div className="min-h-screen bg-secondary-900 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
                      <p className="text-white">Loading...</p>
                    </div>
                  </div>
                ) : user ? (
                  <Suspense fallback={<PageLoading />}>
                    <UserSettingsPage />
                  </Suspense>
                ) : (
                  <Navigate to="/" replace />
                )
              } />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AnimatePresence>
          
          {/* Processing Modal */}
          <ProcessingModal isOpen={isProcessing} />
          
          {/* Global Authentication Modal - visible regardless of route */}
          <AuthModal 
            isOpen={showAuthModal} 
            onClose={() => setShowAuthModal(false)} 
            onShowAdminLogin={() => {
              setShowAuthModal(false);
              setShowAdminAuthModal(true);
            }}
          />
          
          {/* Admin Auth Modal */}
          <AdminAuthModal
            isOpen={showAdminAuthModal}
            onClose={() => setShowAdminAuthModal(false)}
            onAdminAuthenticated={() => {
              setShowAdminAuthModal(false);
              notify('success', 'Admin login successful');
              navigate('/admin', { replace: true });
            }}
          />
        </div>
        </ErrorBoundary>
        </ToastProvider>
      </AdminContextProvider>
    </ProfileContextProvider>
  );
}

export default App;